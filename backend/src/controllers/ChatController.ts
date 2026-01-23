import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ChatService } from '../services/ChatService';
import { S3Service } from '../services/S3Service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Controller for chat-related endpoints
 */
export class ChatController {
  /**
   * Get all conversations for current user
   * GET /api/chat/conversations
   */
  static async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const conversations = await ChatService.getUserConversations(userId, limit);

      res.json({
        success: true,
        conversations
      });
    } catch (error) {
      logger.error('Get conversations error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to load conversations'
      });
    }
  }

  /**
   * Create or get existing conversation with specific user
   * POST /api/chat/conversations
   * Body: { otherUserId: string }
   */
  static async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const { otherUserId } = req.body;

      if (!otherUserId) {
        res.status(400).json({
          success: false,
          message: 'otherUserId is required'
        });
        return;
      }

      if (userId === otherUserId) {
        res.status(400).json({
          success: false,
          message: 'Cannot create conversation with yourself'
        });
        return;
      }

      const conversation = await ChatService.getOrCreateConversation(userId, otherUserId);

      res.json({
        success: true,
        conversation
      });
    } catch (error) {
      logger.error('Create conversation error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation'
      });
    }
  }

  /**
   * Get messages in a conversation
   * GET /api/chat/conversations/:conversationId/messages
   * Query: { limit?: number, before?: string (ISO date) }
   */
  static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string | undefined;

      const messages = await ChatService.getConversationMessages(
        conversationId,
        userId,
        limit,
        before
      );

      res.json({
        success: true,
        messages
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      logger.error('Get messages error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to load messages'
      });
    }
  }

  /**
   * Send a message (REST fallback if socket fails)
   * POST /api/chat/conversations/:conversationId/messages
   * Body: { messageType: string, content?: string, mediaUrl?: string, sharedPostId?: string }
   */
  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const { conversationId } = req.params;
      const { messageType, content, mediaUrl, sharedPostId } = req.body;

      if (!messageType) {
        res.status(400).json({
          success: false,
          message: 'messageType is required'
        });
        return;
      }

      const message = await ChatService.sendMessage(
        conversationId,
        userId,
        messageType,
        content,
        mediaUrl,
        sharedPostId
      );

      res.json({
        success: true,
        message
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      logger.error('Send message error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  }

  /**
   * Delete a message
   * DELETE /api/chat/messages/:messageId
   */
  static async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const { messageId } = req.params;

      await ChatService.deleteMessage(messageId, userId);

      res.json({
        success: true,
        message: 'Message deleted'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      if (error instanceof Error && error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          message: error.message
        });
        return;
      }

      logger.error('Delete message error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to delete message'
      });
    }
  }

  /**
   * Search messages
   * GET /api/chat/messages/search
   * Query: { q: string, limit?: number }
   */
  static async searchMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      const messages = await ChatService.searchMessages(userId, query, limit);

      res.json({
        success: true,
        messages
      });
    } catch (error) {
      logger.error('Search messages error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to search messages'
      });
    }
  }

  /**
   * Block a user
   * POST /api/chat/users/:userId/block
   * Body: { reason?: string }
   */
  static async blockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const blockerId = req.user.id;
      const blockedId = req.params.userId;
      const { reason } = req.body;

      await ChatService.blockUser(blockerId, blockedId, reason);

      res.json({
        success: true,
        message: 'User blocked successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot block yourself')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      if (error instanceof Error && error.message.includes('already blocked')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      logger.error('Block user error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to block user'
      });
    }
  }

  /**
   * Unblock a user
   * DELETE /api/chat/users/:userId/block
   */
  static async unblockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const blockerId = req.user.id;
      const blockedId = req.params.userId;

      await ChatService.unblockUser(blockerId, blockedId);

      res.json({
        success: true,
        message: 'User unblocked successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      logger.error('Unblock user error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to unblock user'
      });
    }
  }

  /**
   * Get list of blocked users
   * GET /api/chat/blocked-users
   */
  static async getBlockedUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const blockedUsers = await ChatService.getBlockedUsers(userId);

      res.json({
        success: true,
        blockedUsers
      });
    } catch (error) {
      logger.error('Get blocked users error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get blocked users'
      });
    }
  }

  /**
   * Check if a user is online
   * GET /api/chat/users/:userId/online-status
   */
  static async getOnlineStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const isOnline = await ChatService.isUserOnline(userId);

      res.json({
        success: true,
        userId,
        isOnline
      });
    } catch (error) {
      logger.error('Get online status error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get online status'
      });
    }
  }

  /**
   * Send image message with view mode options
   * POST /api/chat/messages/image
   * Body (multipart): { image, conversationId, receiverId, messageType, imageViewMode, expiresInSeconds? }
   */
  static async sendImageMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const { conversationId, receiverId, imageViewMode, expiresInSeconds } = req.body;

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
        return;
      }

      if (!conversationId || !receiverId) {
        res.status(400).json({
          success: false,
          message: 'conversationId and receiverId are required'
        });
        return;
      }

      // Upload image to storage
      const imageKey = `chat/${conversationId}/${uuidv4()}.jpg`;
      const mediaUrl = await S3Service.uploadImage(
        req.file.buffer,
        imageKey,
        req.file.mimetype
      );

      // Calculate expires at for time_bomb messages
      let expiresAt: Date | undefined;
      if (imageViewMode === 'time_bomb' && expiresInSeconds) {
        expiresAt = new Date(Date.now() + parseInt(expiresInSeconds) * 1000);
      }

      // Create the message
      const message = await ChatService.sendImageMessage(
        conversationId,
        userId,
        receiverId,
        mediaUrl,
        imageViewMode || 'keep',
        expiresAt
      );

      res.json({
        success: true,
        message
      });
    } catch (error) {
      logger.error('Send image message error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to send image message'
      });
    }
  }

  /**
   * Mark image message as viewed
   * POST /api/chat/messages/:messageId/viewed
   */
  static async markImageViewed(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const { messageId } = req.params;

      await ChatService.markImageViewed(messageId, userId);

      res.json({
        success: true,
        message: 'Image marked as viewed'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      logger.error('Mark image viewed error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to mark image as viewed'
      });
    }
  }

  /**
   * Get total unread message count for current user
   * GET /api/chat/unread-count
   */
  static async getTotalUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const unreadCount = await ChatService.getTotalUnreadCount(userId);

      res.json({
        success: true,
        unreadCount
      });
    } catch (error) {
      logger.error('Get unread count error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count'
      });
    }
  }
}
