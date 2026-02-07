import { Server, Socket } from 'socket.io';
import Message from '../models/Message';
import { MessageReaction } from '../models/MessageReaction';
import Conversation from '../models/Conversation';
import User from '../models/User';
import { redisClient, redisAvailable } from '../config/redis';
import { logger } from '../utils/logger';
import { PushNotificationService } from '../services/PushNotificationService';

/**
 * Chat event data interfaces
 */
interface SendMessageData {
  conversationId: string;
  receiverId: string;
  messageType: 'text' | 'image' | 'gif' | 'voice' | 'post_share' | 'system';
  content?: string;
  mediaUrl?: string;
  sharedPostId?: string;
  replyToId?: string;
  duration?: number;
  waveform?: string;
  tempId?: string;
}

interface ReactionData {
  messageId: string;
  emoji: string;
  conversationId: string;
}

interface UnsendData {
  messageId: string;
  conversationId: string;
}

interface MarkReadData {
  conversationId: string;
  messageIds: string[];
}

interface TypingData {
  conversationId: string;
  receiverId: string;
}

/**
 * Handle all chat-related Socket.io events
 */
export const handleChatEvents = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  // Send message
  socket.on('chat:send_message', async (data: SendMessageData) => {
    try {
      const { conversationId, receiverId, messageType, content, mediaUrl, sharedPostId, replyToId, duration, waveform, tempId } = data;

      logger.debug('Sending message', {
        userId,
        conversationId,
        receiverId,
        messageType
      });

      // Create message
      const message = await Message.create({
        conversationId,
        senderId: userId,
        receiverId,
        messageType: messageType || 'text',
        content: content || null,
        mediaUrl: mediaUrl || null,
        sharedPostId: sharedPostId || null,
        replyToId: replyToId || null,
        duration: duration || null,
        waveform: waveform || null,
      });

      // Update conversation last message
      await Conversation.update(
        {
          lastMessageId: message.id,
          lastMessageAt: message.createdAt
        },
        {
          where: { id: conversationId }
        }
      );

      // Emit to receiver
      io.to(`user:${receiverId}`).emit('chat:new_message', {
        conversationId,
        message: message.toJSON()
      });

      // Acknowledge sender
      socket.emit('chat:message_sent', {
        tempId,
        message: message.toJSON()
      });

      // Send push notification to receiver
      try {
        const sender = await User.findByPk(userId, {
          attributes: ['username']
        });

        if (sender) {
          const notificationContent = messageType === 'text'
            ? (content || '')
            : messageType === 'image'
              ? '📷 Sent an image'
              : messageType === 'gif'
                ? '🎞️ Sent a GIF'
                : messageType === 'voice'
                  ? '🎤 Voice message'
                  : messageType === 'post_share'
                    ? '📤 Shared a post'
                    : 'New message';

          await PushNotificationService.sendMessageNotification(
            receiverId,
            sender.username,
            notificationContent,
            conversationId,
            messageType || 'text'
          );
        }
      } catch (notifError) {
        // Log but don't fail the message send if notification fails
        logger.error('Failed to send push notification', {
          messageId: message.id,
          receiverId,
          error: notifError
        });
      }

      logger.info('Message sent successfully', {
        messageId: message.id,
        conversationId,
        senderId: userId,
        receiverId
      });
    } catch (error) {
      logger.error('Failed to send message', {
        userId,
        error
      });

      socket.emit('chat:error', {
        message: 'Failed to send message',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Mark messages as read
  socket.on('chat:mark_read', async (data: MarkReadData) => {
    try {
      const { conversationId, messageIds } = data;

      logger.debug('Marking messages as read', {
        userId,
        conversationId,
        messageCount: messageIds.length
      });

      // Update messages as read
      await Message.update(
        {
          isRead: true,
          readAt: new Date()
        },
        {
          where: {
            id: messageIds,
            receiverId: userId
          }
        }
      );

      // Get the other user in conversation
      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) {
        logger.warn('Conversation not found for mark_read', { conversationId });
        return;
      }

      const otherUserId =
        conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;

      // Notify sender that messages were read
      io.to(`user:${otherUserId}`).emit('chat:messages_read', {
        conversationId,
        messageIds,
        readBy: userId,
        readAt: new Date()
      });

      logger.info('Messages marked as read', {
        conversationId,
        readBy: userId,
        messageCount: messageIds.length
      });
    } catch (error) {
      logger.error('Failed to mark messages as read', {
        userId,
        error
      });
    }
  });

  // Typing indicator start
  socket.on('chat:typing_start', async (data: TypingData) => {
    try {
      const { conversationId, receiverId } = data;

      // Set typing indicator in Redis (expires in 5 seconds)
      if (redisAvailable && redisClient) {
        await redisClient.setEx(`typing:${conversationId}:${userId}`, 5, 'true');
      }

      // Notify receiver
      io.to(`user:${receiverId}`).emit('chat:user_typing', {
        conversationId,
        userId
      });

      logger.debug('Typing indicator started', {
        userId,
        conversationId,
        receiverId
      });
    } catch (error) {
      logger.error('Failed to set typing indicator', {
        userId,
        error
      });
    }
  });

  // Typing indicator stop
  socket.on('chat:typing_stop', async (data: TypingData) => {
    try {
      const { conversationId, receiverId } = data;

      // Remove typing indicator
      if (redisAvailable && redisClient) {
        await redisClient.del(`typing:${conversationId}:${userId}`);
      }

      // Notify receiver
      io.to(`user:${receiverId}`).emit('chat:user_stopped_typing', {
        conversationId,
        userId
      });

      logger.debug('Typing indicator stopped', {
        userId,
        conversationId,
        receiverId
      });
    } catch (error) {
      logger.error('Failed to remove typing indicator', {
        userId,
        error
      });
    }
  });

  // Join conversation room (for real-time updates)
  socket.on('chat:join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);

    logger.debug('User joined conversation room', {
      userId,
      conversationId,
      socketId: socket.id
    });
  });

  // Leave conversation room
  socket.on('chat:leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);

    logger.debug('User left conversation room', {
      userId,
      conversationId,
      socketId: socket.id
    });
  });

  // Add reaction to message
  socket.on('chat:add_reaction', async (data: ReactionData) => {
    try {
      const { messageId, emoji, conversationId } = data;

      const message = await Message.findByPk(messageId);
      if (!message) {
        socket.emit('chat:error', { message: 'Message not found' });
        return;
      }

      // Upsert: destroy existing then create new
      await MessageReaction.destroy({
        where: { messageId, userId }
      });

      const reaction = await MessageReaction.create({
        messageId,
        userId,
        emoji: emoji as any,
      });

      const user = await User.findByPk(userId, {
        attributes: ['id', 'username']
      });

      const reactionData = {
        ...reaction.toJSON(),
        user: user ? user.toJSON() : null,
      };

      // Get the other user in the conversation
      const conversation = await Conversation.findByPk(conversationId);
      if (conversation) {
        const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
        io.to(`user:${otherUserId}`).emit('chat:reaction_added', {
          conversationId,
          messageId,
          reaction: reactionData,
        });
      }

      // Acknowledge sender
      socket.emit('chat:reaction_added', {
        conversationId,
        messageId,
        reaction: reactionData,
      });

      logger.info('Reaction added', { messageId, userId, emoji });
    } catch (error) {
      logger.error('Failed to add reaction', { userId, error });
      socket.emit('chat:error', { message: 'Failed to add reaction' });
    }
  });

  // Remove reaction from message
  socket.on('chat:remove_reaction', async (data: ReactionData) => {
    try {
      const { messageId, conversationId } = data;

      await MessageReaction.destroy({
        where: { messageId, userId }
      });

      const conversation = await Conversation.findByPk(conversationId);
      if (conversation) {
        const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
        io.to(`user:${otherUserId}`).emit('chat:reaction_removed', {
          conversationId,
          messageId,
          userId,
        });
      }

      socket.emit('chat:reaction_removed', {
        conversationId,
        messageId,
        userId,
      });

      logger.info('Reaction removed', { messageId, userId });
    } catch (error) {
      logger.error('Failed to remove reaction', { userId, error });
      socket.emit('chat:error', { message: 'Failed to remove reaction' });
    }
  });

  // Unsend message
  socket.on('chat:unsend_message', async (data: UnsendData) => {
    try {
      const { messageId, conversationId } = data;

      const message = await Message.findByPk(messageId);
      if (!message) {
        socket.emit('chat:error', { message: 'Message not found' });
        return;
      }

      // Only the sender can unsend
      if (message.senderId !== userId) {
        socket.emit('chat:error', { message: 'You can only unsend your own messages' });
        return;
      }

      await message.update({
        isUnsent: true,
        content: null,
        mediaUrl: null,
      });

      const conversation = await Conversation.findByPk(conversationId);
      if (conversation) {
        const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
        io.to(`user:${otherUserId}`).emit('chat:message_unsent', {
          conversationId,
          messageId,
        });
      }

      socket.emit('chat:message_unsent', {
        conversationId,
        messageId,
      });

      logger.info('Message unsent', { messageId, userId });
    } catch (error) {
      logger.error('Failed to unsend message', { userId, error });
      socket.emit('chat:error', { message: 'Failed to unsend message' });
    }
  });
};
