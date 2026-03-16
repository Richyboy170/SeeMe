import { Router } from 'express';
import { GoalController } from '../controllers/GoalController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, GoalController.getMyGoals);
router.post('/', authenticateToken, GoalController.createGoal);
router.put('/reorder', authenticateToken, GoalController.reorderGoals);
router.get('/:goalId', authenticateToken, GoalController.getGoal);
router.put('/:goalId', authenticateToken, GoalController.updateGoal);
router.delete('/:goalId', authenticateToken, GoalController.deleteGoal);
router.post('/:goalId/finish', authenticateToken, GoalController.finishGoal);
router.delete('/:goalId/collection', authenticateToken, GoalController.deleteCollection);
router.get('/:goalId/posts', authenticateToken, GoalController.getGoalPosts);

export default router;
