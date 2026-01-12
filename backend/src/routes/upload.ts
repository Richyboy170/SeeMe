import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { S3Service } from '../services/S3Service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Configure multer for file uploads
 * Using memory storage for direct buffer access
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

/**
 * @route   POST /api/upload/chat-image
 * @desc    Upload an image for chat messaging
 * @access  Private
 */
router.post(
  '/chat-image',
  authenticateToken,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Generate unique filename for chat image
      const imageId = uuidv4();
      const extension = req.file.mimetype.split('/')[1];
      const key = `chat-images/${userId}/${imageId}.${extension}`;

      // Upload to S3 or local storage
      const imageUrl = await S3Service.uploadImage(
        req.file.buffer,
        key,
        req.file.mimetype
      );

      logger.info('Chat image uploaded', {
        userId,
        imageId,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      return res.status(200).json({
        success: true,
        url: imageUrl,
        imageId
      });

    } catch (error: any) {
      logger.error('Chat image upload failed', {
        error: error.message,
        userId: (req as any).user?.userId
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to upload image'
      });
    }
  }
);

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload an avatar image
 * @access  Private
 */
router.post(
  '/avatar',
  authenticateToken,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Generate unique filename for avatar
      const imageId = uuidv4();
      const extension = req.file.mimetype.split('/')[1];
      const key = `avatars/${userId}/${imageId}.${extension}`;

      // Upload to S3 or local storage
      const imageUrl = await S3Service.uploadImage(
        req.file.buffer,
        key,
        req.file.mimetype
      );

      logger.info('Avatar uploaded', {
        userId,
        imageId,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      return res.status(200).json({
        success: true,
        url: imageUrl,
        imageId
      });

    } catch (error: any) {
      logger.error('Avatar upload failed', {
        error: error.message,
        userId: (req as any).user?.userId
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to upload avatar'
      });
    }
  }
);

export default router;
