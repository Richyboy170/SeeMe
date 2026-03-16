import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get spinning wheel activities for current user
router.get('/wheel', authenticateToken, ActivityController.getWheelActivities);

// Wheel selection management
router.get('/wheel/selections', authenticateToken, ActivityController.getWheelSelections);
router.post('/wheel/add', authenticateToken, ActivityController.addToWheel);
router.post('/wheel/remove', authenticateToken, ActivityController.removeFromWheel);
router.delete('/wheel/selections', authenticateToken, ActivityController.clearWheelSelections);

// Browse available activities from joined communities
router.get('/available', authenticateToken, ActivityController.getAvailableActivities);

// Get all activities for a specific community
router.get('/community/:topicId', authenticateToken, ActivityController.getCommunityActivities);

// Admin: create an activity for their community
router.post('/community/:topicId', authenticateToken, ActivityController.createActivity);

// Admin: trigger AI generation for a community
router.post('/community/:topicId/generate', authenticateToken, ActivityController.generateActivities);

// Admin: update an activity
router.put('/:activityId', authenticateToken, ActivityController.updateActivity);

// Admin: delete (deactivate) an activity
router.delete('/:activityId', authenticateToken, ActivityController.deleteActivity);

// Complete an activity (link to post)
router.post('/:activityId/complete', authenticateToken, ActivityController.completeActivity);

export default router;
