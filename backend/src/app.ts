/**
 * Express Application Setup
 * Separating app configuration from server startup for testing
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import feedRoutes from './routes/feed';
import internalRoutes from './routes/internal';
import userRoutes from './routes/users';
import followRoutes from './routes/follows';
import likeRoutes from './routes/likes';
import commentRoutes from './routes/comments';
import coinsRoutes from './routes/coins';
import messagesRoutes from './routes/messages';
import avatarsRoutes from './routes/avatars';
import uploadRoutes from './routes/upload';
import wellbeingRoutes from './routes/wellbeing';
import fullBodyAvatarRoutes from './routes/fullBodyAvatar';
// Phase 3.3: Community/Topic routes
import topicsRoutes from './routes/topics';
import favoritesRoutes from './routes/favorites';
import medalsRoutes from './routes/medals';
import savedPostsRoutes from './routes/savedPosts';
import repostsRoutes from './routes/reposts';
// Trust Score routes
import trustRoutes from './routes/trust';
// Decoration Store routes
import decorationsRoutes from './routes/decorations';
// Admin routes
import adminRoutes from './routes/admin';
// Friendship Meetup routes
import friendshipMeetupRoutes from './routes/friendshipMeetup';
// Corner Icon routes
import cornerIconsRoutes from './routes/cornerIcons';

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN || 'http://localhost:3001'
    : true,
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging Middleware (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.use((req: Request, _res: Response, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    next();
  });
}

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', followRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api', likeRoutes);
app.use('/api', commentRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/avatars', avatarsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wellbeing', wellbeingRoutes);
app.use('/api/full-body-avatar', fullBodyAvatarRoutes);

// Phase 3.3: Community/Topic routes
app.use('/api/topics', topicsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/medals', medalsRoutes);
app.use('/api', savedPostsRoutes);
app.use('/api/reposts', repostsRoutes);

// Trust Score routes
app.use('/api/trust', trustRoutes);

// Decoration Store routes
app.use('/api/decorations', decorationsRoutes);

// Admin API routes
app.use('/api/admin', adminRoutes);

// Friendship Meetup routes
app.use('/api/friendship-meetup', friendshipMeetupRoutes);

// Corner Icon routes
app.use('/api/corner-icons', cornerIconsRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
