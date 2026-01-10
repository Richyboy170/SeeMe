import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CommentController } from '../controllers/CommentController';

const router = Router();

/**
 * @route   POST /api/posts/:postId/comments
 * @desc    Create a comment on a post
 * @access  Private
 */
router.post('/posts/:postId/comments', authenticateToken, CommentController.createComment);

/**
 * @route   GET /api/posts/:postId/comments
 * @desc    Get comments for a post
 * @access  Public
 */
router.get('/posts/:postId/comments', CommentController.getPostComments);

/**
 * @route   GET /api/comments/:commentId/replies
 * @desc    Get replies for a comment
 * @access  Public
 */
router.get('/comments/:commentId/replies', CommentController.getCommentReplies);

/**
 * @route   PUT /api/comments/:commentId
 * @desc    Update a comment
 * @access  Private (owner only)
 */
router.put('/comments/:commentId', authenticateToken, CommentController.updateComment);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete a comment
 * @access  Private (owner only)
 */
router.delete('/comments/:commentId', authenticateToken, CommentController.deleteComment);

/**
 * @route   GET /api/posts/:postId/comments/count
 * @desc    Get comment count for a post
 * @access  Public
 */
router.get('/posts/:postId/comments/count', CommentController.getCommentCount);

export default router;
