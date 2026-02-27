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
router.put('/:topicId', authenticateToken, TopicController.updateTopic);
router.post('/:topicId/follow', authenticateToken, TopicController.followTopic);
router.delete('/:topicId/follow', authenticateToken, TopicController.unfollowTopic);
router.get('/:topicId/beginners', authenticateToken, TopicController.getTopicBeginners);
router.get('/:topicId/share', authenticateToken, TopicController.getShareableLinks);
router.get('/:topicId/leaderboard', optionalAuth, TopicController.getLeaderboard);
router.get('/:topicId/posts', optionalAuth, TopicController.getTopicPosts);
router.get('/:topicId/members', optionalAuth, TopicController.getTopicMembers);
router.get('/:topicId/admins', optionalAuth, TopicController.getTopicAdmins);
router.post('/:topicId/admins', authenticateToken, TopicController.addTopicAdmin);
router.delete('/:topicId/admins/:userId', authenticateToken, TopicController.removeTopicAdmin);

// Private group routes
router.post('/:topicId/request-join', authenticateToken, TopicController.requestJoin);
router.get('/:topicId/pending-requests', authenticateToken, TopicController.getPendingRequests);
router.post('/:topicId/handle-request', authenticateToken, TopicController.handleRequest);

// Broadcaster routes
router.get('/:topicId/broadcasters', optionalAuth, TopicController.getBroadcasters);
router.post('/:topicId/broadcasters', authenticateToken, TopicController.addBroadcaster);
router.delete('/:topicId/broadcasters/:userId', authenticateToken, TopicController.removeBroadcaster);

export default router;
