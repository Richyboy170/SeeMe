import { Op } from 'sequelize';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import BlockedUser from '../models/BlockedUser';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { PushNotificationService } from './PushNotificationService';

/**
 * Service class for chat-related business logic
 */
export class ChatService {
  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string, limit: number = 50) {
    try {
      const conversations = await Conversation.findAll({
        where: {
          [Op.or]: [{ user1Id: userId }, { user2Id: userId }]
        },
        include: [
          {
            model: User,
            as: 'user1',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: User,
            as: 'user2',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: Message,
            as: 'lastMessage',
            attributes: ['id', 'content', 'messageType', 'createdAt', 'isRead', 'senderId']
          }
        ],
        order: [['lastMessageAt', 'DESC']],
        limit
      });

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unreadCount = await Message.count({
            where: {
              conversationId: conv.id,
              receiverId: userId,
              isRead: false
            }
          });

          return {
            ...conv.toJSON(),
            unreadCount
          };
        })
      );

      return conversationsWithUnread;
    } catch (error) {
      logger.error('Failed to get user conversations', { userId, error });
      throw error;
    }
  }

  /**
   * Create or get existing conversation between two users
   */
  static async getOrCreateConversation(user1Id: string, user2Id: string) {
    try {
      if (user1Id === user2Id) {
        throw new Error('Cannot create conversation with yourself');
      }

      // Check if conversation exists (either direction)
      let conversation = await Conversation.findOne({
        where: {
          [Op.or]: [
            { user1Id, user2Id },
            { user1Id: user2Id, user2Id: user1Id }
          ]
        },
        include: [
          {
            model: User,
            as: 'user1',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: User,
            as: 'user2',
            attributes: ['id', 'username', 'activeAvatarId']
          }
        ]
      });

      // Create if doesn't exist (always order IDs consistently)
      if (!conversation) {
        conversation = await Conversation.create({
          user1Id: user1Id < user2Id ? user1Id : user2Id,
          user2Id: user1Id < user2Id ? user2Id : user1Id
        });

        // Reload with user associations
        conversation = await Conversation.findByPk(conversation.id, {
          include: [
            {
              model: User,
              as: 'user1',
              attributes: ['id', 'username', 'activeAvatarId']
            },
            {
              model: User,
              as: 'user2',
              attributes: ['id', 'username', 'activeAvatarId']
            }
          ]
        });
      }

      return conversation;
    } catch (error) {
      logger.error('Failed to get or create conversation', { user1Id, user2Id, error });
      throw error;
    }
  }

  /**
   * Get messages in a conversation with pagination
   */
  static async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    before?: string
  ) {
    try {
      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        where: {
          id: conversationId,
          [Op.or]: [{ user1Id: userId }, { user2Id: userId }]
        }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Build where clause
      const whereClause: any = {
        conversationId,
        [Op.or]: [{ isDeletedBySender: false }, { isDeletedByReceiver: false }]
      };

      if (before) {
        whereClause.createdAt = { [Op.lt]: new Date(before) };
      }

      // Get messages
      const messages = await Message.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'activeAvatarId']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      logger.error('Failed to get conversation messages', { conversationId, userId, error });
      throw error;
    }
  }

  /**
   * Send a message via REST (fallback)
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    messageType: 'text' | 'image' | 'post_share' | 'system',
    content?: string,
    mediaUrl?: string,
    sharedPostId?: string
  ) {
    try {
      // Verify conversation exists
      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Determine receiver
      const receiverId = conversation.user1Id === senderId ? conversation.user2Id : conversation.user1Id;

      // Create message
      const message = await Message.create({
        conversationId,
        senderId,
        receiverId,
        messageType,
        content: content || null,
        mediaUrl: mediaUrl || null,
        sharedPostId: sharedPostId || null
      });

      // Update conversation last message
      await conversation.update({
        lastMessageId: message.id,
        lastMessageAt: message.createdAt
      });

      // Reload with associations
      const messageWithSender = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'activeAvatarId']
          }
        ]
      });

      // Send push notification to receiver (REST fallback)
      try {
        const sender = await User.findByPk(senderId, {
          attributes: ['username']
        });

        if (sender) {
          const notificationContent = messageType === 'text'
            ? (content || '')
            : messageType === 'image'
              ? '📷 Sent an image'
              : messageType === 'post_share'
                ? '📤 Shared a post'
                : 'New message';

          await PushNotificationService.sendMessageNotification(
            receiverId,
            sender.username,
            notificationContent,
            conversationId,
            messageType
          );
        }
      } catch (notifError) {
        // Log but don't fail the message send if notification fails
        logger.error('Failed to send push notification from REST endpoint', {
          messageId: message.id,
          receiverId,
          error: notifError
        });
      }

      return messageWithSender;
    } catch (error) {
      logger.error('Failed to send message', { conversationId, senderId, error });
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  static async deleteMessage(messageId: string, userId: string) {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new Error('Message not found');
      }

      // Determine if user is sender or receiver
      if (message.senderId === userId) {
        await message.update({ isDeletedBySender: true });
      } else if (message.receiverId === userId) {
        await message.update({ isDeletedByReceiver: true });
      } else {
        throw new Error('Access denied');
      }

      return message;
    } catch (error) {
      logger.error('Failed to delete message', { messageId, userId, error });
      throw error;
    }
  }

  /**
   * Search messages for a user
   */
  static async searchMessages(userId: string, query: string, limit: number = 50) {
    try {
      // Get all user conversations
      const conversations = await Conversation.findAll({
        where: {
          [Op.or]: [{ user1Id: userId }, { user2Id: userId }]
        },
        attributes: ['id']
      });

      const conversationIds = conversations.map((c) => c.id);

      // Search messages in user's conversations
      const messages = await Message.findAll({
        where: {
          conversationId: { [Op.in]: conversationIds },
          content: { [Op.iLike]: `%${query}%` },
          [Op.or]: [{ isDeletedBySender: false }, { isDeletedByReceiver: false }]
        },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: Conversation,
            as: 'conversation',
            attributes: ['id'],
            include: [
              {
                model: User,
                as: 'user1',
                attributes: ['id', 'username', 'activeAvatarId']
              },
              {
                model: User,
                as: 'user2',
                attributes: ['id', 'username', 'activeAvatarId']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      return messages;
    } catch (error) {
      logger.error('Failed to search messages', { userId, query, error });
      throw error;
    }
  }

  /**
   * Block a user
   */
  static async blockUser(blockerId: string, blockedId: string, reason?: string) {
    try {
      if (blockerId === blockedId) {
        throw new Error('Cannot block yourself');
      }

      // Check if already blocked
      const existingBlock = await BlockedUser.findOne({
        where: { blockerId, blockedId }
      });

      if (existingBlock) {
        throw new Error('User already blocked');
      }

      const block = await BlockedUser.create({
        blockerId,
        blockedId,
        reason: reason || null
      });

      logger.info('User blocked', { blockerId, blockedId });

      return block;
    } catch (error) {
      logger.error('Failed to block user', { blockerId, blockedId, error });
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(blockerId: string, blockedId: string) {
    try {
      const deleted = await BlockedUser.destroy({
        where: { blockerId, blockedId }
      });

      if (deleted === 0) {
        throw new Error('Block not found');
      }

      logger.info('User unblocked', { blockerId, blockedId });

      return true;
    } catch (error) {
      logger.error('Failed to unblock user', { blockerId, blockedId, error });
      throw error;
    }
  }

  /**
   * Get list of blocked users
   */
  static async getBlockedUsers(userId: string) {
    try {
      const blocks = await BlockedUser.findAll({
        where: { blockerId: userId },
        include: [
          {
            model: User,
            as: 'blocked',
            attributes: ['id', 'username', 'activeAvatarId']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return blocks;
    } catch (error) {
      logger.error('Failed to get blocked users', { userId, error });
      throw error;
    }
  }

  /**
   * Check if a user is online
   */
  static async isUserOnline(userId: string): Promise<boolean> {
    try {
      const exists = await redisClient.exists(`user:${userId}:online`);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check online status', { userId, error });
      return false;
    }
  }

  /**
   * Check if user is blocked by another user
   */
  static async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    try {
      const block = await BlockedUser.findOne({
        where: {
          [Op.or]: [
            { blockerId: userId, blockedId: otherUserId },
            { blockerId: otherUserId, blockedId: userId }
          ]
        }
      });

      return !!block;
    } catch (error) {
      logger.error('Failed to check block status', { userId, otherUserId, error });
      return false;
    }
  }
}
