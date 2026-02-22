import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DecorationController } from '../controllers/DecorationController';

const router = Router();

/**
 * @route   GET /api/decorations/store
 * @desc    Get available store items, optionally filtered by category
 * @access  Public
 */
router.get('/store', DecorationController.getStoreItems);

/**
 * @route   GET /api/decorations/mine
 * @desc    Get current user's owned decorations
 * @access  Private
 */
router.get('/mine', authenticateToken, DecorationController.getMyDecorations);

/**
 * @route   POST /api/decorations/purchase
 * @desc    Purchase a decoration from the store
 * @access  Private
 */
router.post('/purchase', authenticateToken, DecorationController.purchaseDecoration);

/**
 * @route   GET /api/decorations/active
 * @desc    Get current user's active decoration configuration
 * @access  Private
 */
router.get('/active', authenticateToken, DecorationController.getMyActiveDecoration);

/**
 * @route   PUT /api/decorations/active
 * @desc    Set the current user's active decoration configuration
 * @access  Private
 */
router.put('/active', authenticateToken, DecorationController.setActiveDecoration);

/**
 * @route   GET /api/decorations/user/:userId/active
 * @desc    Get a specific user's active decoration (public profile)
 * @access  Public
 */
router.get('/user/:userId/active', DecorationController.getUserActiveDecoration);

export default router;
