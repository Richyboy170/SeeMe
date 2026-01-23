import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { ChatController } from '../controllers/ChatController';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Conversation routes
router.get('/conversations', authenticateToken, ChatController.getConversations);
router.post('/conversations', authenticateToken, ChatController.createConversation);
router.get('/conversations/:conversationId/messages', authenticateToken, ChatController.getMessages);
router.post('/conversations/:conversationId/messages', authenticateToken, ChatController.sendMessage);

// Image message routes
router.post('/messages/image', authenticateToken, upload.single('image'), ChatController.sendImageMessage);
router.post('/messages/:messageId/viewed', authenticateToken, ChatController.markImageViewed);

// Message routes
router.delete('/messages/:messageId', authenticateToken, ChatController.deleteMessage);
router.get('/messages/search', authenticateToken, ChatController.searchMessages);

// Unread count
router.get('/unread-count', authenticateToken, ChatController.getTotalUnreadCount);

// Blocking routes
router.post('/users/:userId/block', authenticateToken, ChatController.blockUser);
router.delete('/users/:userId/block', authenticateToken, ChatController.unblockUser);
router.get('/blocked-users', authenticateToken, ChatController.getBlockedUsers);

// Online status
router.get('/users/:userId/online-status', authenticateToken, ChatController.getOnlineStatus);

export default router;
