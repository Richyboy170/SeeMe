import { Router } from 'express';
import { FavoriteController } from '../controllers/FavoriteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.get('/', authenticateToken, FavoriteController.getFavorites);
router.post('/:favoriteUserId', authenticateToken, FavoriteController.addFavorite);
router.delete('/:favoriteUserId', authenticateToken, FavoriteController.removeFavorite);
router.get('/:favoriteUserId/status', authenticateToken, FavoriteController.isFavorited);

export default router;
