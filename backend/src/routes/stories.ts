import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { StoryOfMeController } from '../controllers/StoryOfMeController';

const router = Router();

/**
 * @route   GET /api/stories/me
 * @desc    Get own stories, optionally filtered by periodType
 * @access  Private
 */
router.get('/me', authenticateToken, StoryOfMeController.getMyStories);

/**
 * @route   GET /api/stories/user/:userId
 * @desc    Get stories for any user (public profile)
 * @access  Public
 */
router.get('/user/:userId', StoryOfMeController.getUserStories);

/**
 * @route   GET /api/stories/user/:userId/latest
 * @desc    Get latest story for a user, optionally filtered by periodType
 * @access  Public
 */
router.get('/user/:userId/latest', StoryOfMeController.getLatestStory);

/**
 * @route   POST /api/stories/generate
 * @desc    Trigger story generation for the current user
 * @access  Private
 */
router.post('/generate', authenticateToken, StoryOfMeController.generateStory);

export default router;
