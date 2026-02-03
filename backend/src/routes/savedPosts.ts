import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { SavedPostController } from '../controllers/SavedPostController';

const router = Router();

// Save a post
router.post('/posts/:postId/save', authenticateToken, SavedPostController.savePost);

// Unsave a post
router.delete('/posts/:postId/save', authenticateToken, SavedPostController.unsavePost);

// Check if post is saved
router.get('/posts/:postId/saved', authenticateToken, SavedPostController.checkSavedStatus);

// Get user's saved posts
router.get('/saved-posts', authenticateToken, SavedPostController.getSavedPosts);

export default router;
