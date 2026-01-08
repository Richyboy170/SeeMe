import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import Post, { PostStatus } from '../models/Post';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, APIError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { celeryClient } from '../config/celery';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Created uploads directory', { path: uploadDir });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
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
 * POST /api/posts
 * Create a new post with image upload
 */
router.post(
  '/',
  authenticateToken,
  upload.single('image'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new APIError('User not authenticated', 401);
    }

    if (!req.file) {
      throw new APIError('Image file is required', 400);
    }

    const caption = req.body.caption || null;
    const avatarId = req.body.avatarId || 'default';

    // Create file URL (for now, just a local path reference)
    // In production, this would be an S3 URL
    const originalImageUrl = `file://${path.join(uploadDir, req.file.filename)}`;

    // Create post record in database
    const postId = uuidv4();
    const post = await Post.create({
      id: postId,
      userId: req.user.id,
      originalImageUrl,
      caption,
      status: PostStatus.PROCESSING,
      processingStartedAt: new Date(),
      avatarId
    });

    logger.info('Post created', {
      postId: post.id,
      userId: req.user.id,
      filename: req.file.filename
    });

    // Queue ML processing task
    try {
      const taskId = uuidv4();
      await celeryClient.queueImageProcessing(
        taskId,
        originalImageUrl,
        req.user.id,
        avatarId
      );

      logger.info('ML processing task queued', {
        postId: post.id,
        taskId,
        userId: req.user.id
      });

      // Note: In a real implementation, we would trigger the Celery task here
      // For Phase 0, we're just storing the task metadata in Redis
      // The ML service's Celery worker would pick it up automatically

      res.status(201).json({
        message: 'Post created successfully',
        post: {
          id: post.id,
          status: post.status,
          originalImageUrl: post.originalImageUrl,
          caption: post.caption,
          createdAt: post.createdAt
        },
        taskId
      });
    } catch (error) {
      // If queueing fails, mark post as failed
      await post.update({
        status: PostStatus.FAILED,
        processingError: 'Failed to queue processing task'
      });

      logger.error('Failed to queue ML processing', { error, postId: post.id });
      throw new APIError('Failed to queue image processing', 500);
    }
  })
);

/**
 * GET /api/posts/:id/status
 * Get processing status of a post
 */
router.get(
  '/:id/status',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new APIError('User not authenticated', 401);
    }

    const postId = req.params.id;

    const post = await Post.findByPk(postId);

    if (!post) {
      throw new APIError('Post not found', 404);
    }

    // Check if user owns this post (optional privacy check)
    // For Phase 0, we'll allow any authenticated user to check status
    // In production, you might want to restrict this

    // Calculate processing time if completed
    let processingTime = null;
    if (post.processingCompletedAt && post.processingStartedAt) {
      processingTime = (
        post.processingCompletedAt.getTime() - post.processingStartedAt.getTime()
      ) / 1000; // Convert to seconds
    }

    res.json({
      postId: post.id,
      status: post.status,
      originalImageUrl: post.originalImageUrl,
      processedImageUrl: post.processedImageUrl,
      caption: post.caption,
      processingStartedAt: post.processingStartedAt,
      processingCompletedAt: post.processingCompletedAt,
      processingTime,
      processingError: post.processingError,
      facesDetected: post.facesDetected,
      createdAt: post.createdAt
    });
  })
);

/**
 * GET /api/posts/:id
 * Get full post details
 */
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new APIError('User not authenticated', 401);
    }

    const postId = req.params.id;

    const post = await Post.findByPk(postId, {
      attributes: [
        'id',
        'userId',
        'originalImageUrl',
        'processedImageUrl',
        'thumbnailUrl',
        'caption',
        'status',
        'processingError',
        'processingStartedAt',
        'processingCompletedAt',
        'processingTimeSeconds',
        'avatarId',
        'likesCount',
        'commentsCount',
        'facesDetected',
        'createdAt',
        'updatedAt'
      ]
    });

    if (!post) {
      throw new APIError('Post not found', 404);
    }

    res.json({
      post: {
        id: post.id,
        userId: post.userId,
        originalImageUrl: post.originalImageUrl,
        processedImageUrl: post.processedImageUrl,
        thumbnailUrl: post.thumbnailUrl,
        caption: post.caption,
        status: post.status,
        processingError: post.processingError,
        processingStartedAt: post.processingStartedAt,
        processingCompletedAt: post.processingCompletedAt,
        processingTimeSeconds: post.processingTimeSeconds,
        avatarId: post.avatarId,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        facesDetected: post.facesDetected,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    });
  })
);

/**
 * GET /api/posts
 * Get feed of posts (paginated)
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new APIError('User not authenticated', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: posts } = await Post.findAndCountAll({
      where: {
        status: PostStatus.COMPLETED // Only show completed posts in feed
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: [
        'id',
        'userId',
        'processedImageUrl',
        'thumbnailUrl',
        'caption',
        'likesCount',
        'commentsCount',
        'createdAt'
      ]
    });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  })
);

export default router;
