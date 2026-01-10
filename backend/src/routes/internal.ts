import { Router, Request, Response } from 'express';
import { MLService } from '../services/MLService';
import { logger } from '../utils/logger';
import { asyncHandler, APIError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/internal/processing-callback
 * Callback endpoint for ML service to report processing results
 *
 * This endpoint is called by the Python ML service after it completes
 * processing an avatar image (success or failure)
 */
router.post(
  '/processing-callback',
  asyncHandler(async (req: Request, res: Response) => {
    // Verify request is from ML service
    const secret = req.headers['x-ml-secret'];

    if (secret !== process.env.ML_SERVICE_SECRET) {
      logger.warn('Unauthorized processing callback attempt', {
        ip: req.ip,
        headers: req.headers
      });
      throw new APIError('Unauthorized', 401);
    }

    const {
      postId,
      success,
      processedImageUrl,
      thumbnailUrl,
      error,
      metadata,
      processingTime
    } = req.body;

    // Validate required fields
    if (!postId || success === undefined) {
      throw new APIError('Missing required fields: postId, success', 400);
    }

    logger.info('Processing callback received', {
      postId,
      success,
      processingTime
    });

    // Handle the callback
    await MLService.handleProcessingCallback({
      postId,
      success,
      processedImageUrl,
      thumbnailUrl,
      error,
      metadata,
      processingTime
    });

    res.json({
      success: true,
      message: 'Callback processed successfully'
    });
  })
);

/**
 * GET /api/internal/processing-stats
 * Get processing statistics (admin endpoint)
 */
router.get(
  '/processing-stats',
  asyncHandler(async (req: Request, res: Response) => {
    // In production, this would require admin authentication
    const secret = req.headers['x-admin-secret'];

    if (secret !== process.env.ADMIN_SECRET) {
      throw new APIError('Unauthorized', 401);
    }

    const stats = await MLService.getProcessingStats();

    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/internal/retry-processing/:postId
 * Retry failed processing (admin endpoint)
 */
router.post(
  '/retry-processing/:postId',
  asyncHandler(async (req: Request, res: Response) => {
    const secret = req.headers['x-admin-secret'];

    if (secret !== process.env.ADMIN_SECRET) {
      throw new APIError('Unauthorized', 401);
    }

    const { postId } = req.params;

    await MLService.retryProcessing(postId);

    res.json({
      success: true,
      message: 'Processing retry initiated',
      postId
    });
  })
);

export default router;
