/**
 * Full Body Avatar Routes
 * Phase 3.1: Full-Body 3D Avatar System
 */

import { Router } from 'express';
import multer from 'multer';
import FullBodyAvatarController from '../controllers/FullBodyAvatarController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ========== Avatar CRUD Endpoints ==========

// Create new full-body avatar
router.post('/', authenticateToken, FullBodyAvatarController.createAvatar);

// Get current user's active full-body avatar
router.get('/', authenticateToken, FullBodyAvatarController.getAvatar);

// Get another user's full-body avatar (for viewing profiles)
router.get('/user/:userId', authenticateToken, FullBodyAvatarController.getAvatar);

// Update avatar customization
router.patch('/', authenticateToken, FullBodyAvatarController.updateAvatar);

// Delete avatar
router.delete('/', authenticateToken, FullBodyAvatarController.deleteAvatar);

// Get avatar history
router.get('/history', authenticateToken, FullBodyAvatarController.getAvatarHistory);

// ========== ML Service Proxy Endpoints ==========

// Check if image contains a person (for content policy)
router.post(
  '/check-person',
  authenticateToken,
  upload.single('file'),
  FullBodyAvatarController.checkPerson
);

// Blur faces in image
router.post(
  '/blur-faces',
  authenticateToken,
  upload.single('file'),
  FullBodyAvatarController.blurFaces
);

// Detect multiple people in image
router.post(
  '/detect-people',
  authenticateToken,
  upload.single('file'),
  FullBodyAvatarController.detectPeople
);

// Process image to generate full body avatar
router.post(
  '/process',
  authenticateToken,
  upload.single('file'),
  FullBodyAvatarController.processImage
);

// Extract MediaPipe Holistic landmarks for KalidoKit (VRM pose solving)
router.post(
  '/extract-landmarks',
  authenticateToken,
  upload.single('file'),
  FullBodyAvatarController.extractLandmarks
);

export default router;
