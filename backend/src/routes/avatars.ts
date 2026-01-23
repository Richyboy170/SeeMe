import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AvatarController } from '../controllers/AvatarController';

const router = Router();

/**
 * @route   GET /api/avatars/me
 * @desc    Get all avatars for current user
 * @access  Private
 */
router.get('/me', authenticateToken, AvatarController.getMyAvatars);

/**
 * @route   GET /api/avatars/:avatarId
 * @desc    Get avatar by ID
 * @access  Private
 */
router.get('/:avatarId', authenticateToken, AvatarController.getAvatar);

/**
 * @route   POST /api/avatars
 * @desc    Create a new avatar
 * @access  Private
 */
router.post('/', authenticateToken, AvatarController.createAvatar);

/**
 * @route   PUT /api/avatars/:avatarId
 * @desc    Update an avatar
 * @access  Private
 */
router.put('/:avatarId', authenticateToken, AvatarController.updateAvatar);

/**
 * @route   DELETE /api/avatars/:avatarId
 * @desc    Delete an avatar
 * @access  Private
 */
router.delete('/:avatarId', authenticateToken, AvatarController.deleteAvatar);

/**
 * @route   POST /api/avatars/:avatarId/activate
 * @desc    Set an avatar as active
 * @access  Private
 */
router.post('/:avatarId/activate', authenticateToken, AvatarController.activateAvatar);

export default router;
