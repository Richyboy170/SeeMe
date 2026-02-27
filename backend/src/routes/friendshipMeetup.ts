import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { FriendshipMeetupController } from '../controllers/FriendshipMeetupController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All routes require authentication
router.use(authenticateToken as any);

// Session management
router.post('/sessions', FriendshipMeetupController.createSession);
router.post('/sessions/join', FriendshipMeetupController.joinSession);
router.get('/sessions/:id', FriendshipMeetupController.getSession);
router.get('/sessions/:id/photos', FriendshipMeetupController.getSessionPhotos);
router.post('/sessions/:id/photos', upload.single('photo'), FriendshipMeetupController.submitPhoto);
router.post('/sessions/:id/validate-pose', upload.single('image'), FriendshipMeetupController.validatePose);
router.post('/sessions/:id/complete', FriendshipMeetupController.completeMeetup);
router.post('/sessions/:id/cancel', FriendshipMeetupController.cancelSession);

// Decorated strip
router.post('/sessions/:id/decorated-strip', upload.single('image'), FriendshipMeetupController.saveDecoratedStrip);

// History and daily check
router.get('/history', FriendshipMeetupController.getHistory);
router.get('/daily-check/:partnerId', FriendshipMeetupController.dailyCheck);

export default router;
