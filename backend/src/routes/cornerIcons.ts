import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CornerIconController } from '../controllers/CornerIconController';

const router = Router();

/**
 * @route   GET /api/corner-icons/mine
 * @desc    Get current user's corner icon purchases and placements
 * @access  Private
 */
router.get('/mine', authenticateToken, CornerIconController.getMyCornerIcons);

/**
 * @route   POST /api/corner-icons/purchase
 * @desc    Purchase a corner icon (5 Sky Coins)
 * @access  Private
 */
router.post('/purchase', authenticateToken, CornerIconController.purchaseCornerIcon);

/**
 * @route   PUT /api/corner-icons/place
 * @desc    Place a corner icon at a position
 * @access  Private
 */
router.put('/place', authenticateToken, CornerIconController.placeCornerIcon);

/**
 * @route   DELETE /api/corner-icons/place/:position
 * @desc    Remove a corner icon from a position
 * @access  Private
 */
router.delete('/place/:position', authenticateToken, CornerIconController.removeCornerIcon);

/**
 * @route   PATCH /api/corner-icons/place/:position/color
 * @desc    Update the color of a placed corner icon
 * @access  Private
 */
router.patch('/place/:position/color', authenticateToken, CornerIconController.updateCornerIconColor);

/**
 * @route   GET /api/corner-icons/user/:userId
 * @desc    Get a specific user's corner icon placements (public)
 * @access  Public
 */
router.get('/user/:userId', CornerIconController.getUserCornerIcons);

export default router;
