import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (optionalAuth allows logged-in users to see follow status)
router.get('/', optionalAuth, TopicController.getTopics);
router.get('/categories', TopicController.getCategories);
router.get('/invite/:inviteCode', optionalAuth, TopicController.getTopicByInviteCode);
router.get('/:topicSlug', optionalAuth, TopicController.getTopicPage);

// Authenticated routes
router.post('/', authenticateToken, TopicController.createTopic);
router.post('/:topicId/follow', authenticateToken, TopicController.followTopic);
router.delete('/:topicId/follow', authenticateToken, TopicController.unfollowTopic);
router.get('/:topicId/beginners', authenticateToken, TopicController.getTopicBeginners);
router.get('/:topicId/share', authenticateToken, TopicController.getShareableLinks);
router.get('/:topicId/leaderboard', optionalAuth, TopicController.getLeaderboard);
router.get('/:topicId/posts', optionalAuth, TopicController.getTopicPosts);

export default router;
