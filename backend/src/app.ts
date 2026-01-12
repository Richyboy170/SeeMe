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
