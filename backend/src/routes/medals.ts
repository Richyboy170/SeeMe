import { Router } from 'express';
import { MedalController } from '../controllers/MedalController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Get medals for current user
router.get('/me', authenticateToken, MedalController.getMyMedals);

// Get medals for a user (public - shown on profile)
// Support both /users/:userId (original) and /user/:userId (mobile compatibility)
router.get('/users/:userId', optionalAuth, MedalController.getUserMedals);
router.get('/user/:userId', optionalAuth, MedalController.getUserMedals);

export default router;
