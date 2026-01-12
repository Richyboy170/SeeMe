import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { ChatController } from '../controllers/ChatController';

const router = express.Router();

// Conversation routes
router.get('/conversations', authenticateToken, ChatController.getConversations);
router.post('/conversations', authenticateToken, ChatController.createConversation);
router.get('/conversations/:conversationId/messages', authenticateToken, ChatController.getMessages);
router.post('/conversations/:conversationId/messages', authenticateToken, ChatController.sendMessage);

// Message routes
router.delete('/messages/:messageId', authenticateToken, ChatController.deleteMessage);
router.get('/messages/search', authenticateToken, ChatController.searchMessages);

// Blocking routes
router.post('/users/:userId/block', authenticateToken, ChatController.blockUser);
router.delete('/users/:userId/block', authenticateToken, ChatController.unblockUser);
router.get('/blocked-users', authenticateToken, ChatController.getBlockedUsers);

// Online status
router.get('/users/:userId/online-status', authenticateToken, ChatController.getOnlineStatus);

export default router;
