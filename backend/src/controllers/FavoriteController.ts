import { Response } from 'express';
import { UserFavorite, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class FavoriteController {
    /**
     * GET /api/favorites
     * Get all favorited users
     */
    static async getFavorites(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;

            const favorites = await UserFavorite.findAll({
                where: { userId },
                include: [{
                    model: User,
                    as: 'favoriteUser',
                    attributes: ['id', 'username', 'activeAvatarId']
                }],
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                favorites: favorites.map(f => ({
                    ...f.favoriteUser?.toJSON(),
                    favoritedAt: f.createdAt
                }))
            });
        } catch (error) {
            logger.error('Error fetching favorites', { error });
            res.status(500).json({ error: 'Failed to fetch favorites' });
        }
    }

    /**
     * POST /api/favorites/:favoriteUserId
     * Add a user to favorites
     */
    static async addFavorite(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { favoriteUserId } = req.params;

            if (userId === favoriteUserId) {
                res.status(400).json({ error: 'Cannot favorite yourself' });
                return;
            }

            // Check if user exists
            const favoriteUser = await User.findByPk(favoriteUserId);
            if (!favoriteUser) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Check if already favorited
            const existingFavorite = await UserFavorite.findOne({
                where: { userId, favoriteUserId }
            });

            if (existingFavorite) {
                res.status(400).json({ error: 'User already favorited' });
                return;
            }

            // Create favorite
            await UserFavorite.create({ userId, favoriteUserId });

            res.json({
                success: true,
                isFavorited: true,
                message: `You'll now see all posts from @${favoriteUser.username} in your feed`
            });
        } catch (error) {
            logger.error('Error adding favorite', { error });
            res.status(500).json({ error: 'Failed to add favorite' });
        }
    }

    /**
     * DELETE /api/favorites/:favoriteUserId
     * Remove a user from favorites
     */
    static async removeFavorite(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { favoriteUserId } = req.params;

            const favorite = await UserFavorite.findOne({
                where: { userId, favoriteUserId }
            });

            if (!favorite) {
                res.status(400).json({ error: 'User not in favorites' });
                return;
            }

            await favorite.destroy();

            res.json({
                success: true,
                isFavorited: false
            });
        } catch (error) {
            logger.error('Error removing favorite', { error });
            res.status(500).json({ error: 'Failed to remove favorite' });
        }
    }

    /**
     * GET /api/favorites/:favoriteUserId/status
     * Check if a user is favorited
     */
    static async isFavorited(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { favoriteUserId } = req.params;

            const favorite = await UserFavorite.findOne({
                where: { userId, favoriteUserId }
            });

            res.json({
                success: true,
                isFavorited: !!favorite
            });
        } catch (error) {
            logger.error('Error checking favorite status', { error });
            res.status(500).json({ error: 'Failed to check favorite status' });
        }
    }
}

export default FavoriteController;
