import { Request, Response } from 'express';
import { SavedPost } from '../models/SavedPost';
import { Post } from '../models/Post';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: { id: string };
}

export const SavedPostController = {
  // Save a post
  async savePost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { postId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if post exists
      const post = await Post.findByPk(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if already saved - make it idempotent
      const existingSave = await SavedPost.findOne({
        where: { userId, postId }
      });

      if (existingSave) {
        // Return success anyway (idempotent)
        return res.status(200).json({
          message: 'Post already saved',
          saved: true
        });
      }

      // Create saved post
      await SavedPost.create({ userId, postId });

      return res.status(201).json({
        message: 'Post saved',
        saved: true
      });
    } catch (error) {
      console.error('Error saving post:', error);
      return res.status(500).json({ error: 'Failed to save post' });
    }
  },

  // Unsave a post
  async unsavePost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { postId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const deleted = await SavedPost.destroy({
        where: { userId, postId }
      });

      // Return success even if wasn't saved (idempotent)
      return res.json({
        message: deleted > 0 ? 'Post unsaved' : 'Post was not saved',
        saved: false
      });
    } catch (error) {
      console.error('Error unsaving post:', error);
      return res.status(500).json({ error: 'Failed to unsave post' });
    }
  },

  // Check if post is saved
  async checkSavedStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { postId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const savedPost = await SavedPost.findOne({
        where: { userId, postId }
      });

      return res.json({ saved: !!savedPost });
    } catch (error) {
      console.error('Error checking saved status:', error);
      return res.status(500).json({ error: 'Failed to check saved status' });
    }
  },

  // Get user's saved posts
  async getSavedPosts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { count, rows: savedPosts } = await SavedPost.findAndCountAll({
        where: { userId },
        include: [{
          model: Post,
          as: 'post',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
          }]
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const posts = savedPosts.map(sp => ({
        ...sp.post?.toJSON(),
        savedAt: sp.createdAt,
        savedByMe: true
      }));

      return res.json({
        posts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error getting saved posts:', error);
      return res.status(500).json({ error: 'Failed to get saved posts' });
    }
  }
};

export default SavedPostController;
