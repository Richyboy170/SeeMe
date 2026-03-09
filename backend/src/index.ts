import dotenv from 'dotenv';
// Load environment variables FIRST before other imports
dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { connectPostgreSQL, disconnectPostgreSQL } from './config/database';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { connectRedis, disconnectRedis } from './config/redis';
import { initializeFirebase } from './config/firebase';
import { initializeSocket } from './socket';
import { setSocketInstance } from './socket/socketInstance';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import feedRoutes from './routes/feed';
import internalRoutes from './routes/internal';
import userRoutes from './routes/users';
import followRoutes from './routes/follows';
import likeRoutes from './routes/likes';
import commentRoutes from './routes/comments';
import coinsRoutes from './routes/coins';
import uploadRoutes from './routes/upload';
import chatRoutes from './routes/messages';
import avatarRoutes from './routes/avatars';
// import fullBodyAvatarRoutes from './routes/fullBodyAvatar'; // TEMP DISABLED
// Phase 3.3: Community/Topic routes
import topicsRoutes from './routes/topics';
import favoritesRoutes from './routes/favorites';
import medalsRoutes from './routes/medals';
import savedPostsRoutes from './routes/savedPosts';
import repostsRoutes from './routes/reposts';
// Trust Score routes
import trustRoutes from './routes/trust';
// Story of Me routes
import storiesRoutes from './routes/stories';
// Decoration Store routes
import decorationsRoutes from './routes/decorations';
import { celeryClient } from './config/celery';
import { seedDefaultTopics } from './utils/seedDefaultTopics';
import { seedDecorations } from './utils/seedDecorations';
import { seedBots } from './utils/seedBots';
import { seedAdmin } from './utils/seedAdmin';
import { StoryOfMeService } from './services/StoryOfMeService';
import adminRoutes from './routes/admin';
// Friendship Meetup routes
import friendshipMeetupRoutes from './routes/friendshipMeetup';
// Corner Icon routes
import cornerIconsRoutes from './routes/cornerIcons';
// Activity Wheel routes
import activitiesRoutes from './routes/activities';
// Goals routes
import goalsRoutes from './routes/goals';

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS Configuration
// In development, allow all origins for mobile testing
// In production, restrict to specific origins
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN || 'http://localhost:3001'
    : true,  // Allow all origins in development
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for local storage (development)
const localStoragePath = path.join(process.cwd(), 'storage');
app.use('/storage', express.static(localStoragePath));
logger.info('Static file serving enabled', { path: localStoragePath });

// Request Logging Middleware
app.use((req: Request, _res: Response, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

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
app.use('/api/avatars', avatarRoutes);
// app.use('/api/full-body-avatar', fullBodyAvatarRoutes); // TEMP DISABLED
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api', likeRoutes);
app.use('/api', commentRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', chatRoutes);

// Phase 3.3: Community/Topic routes
app.use('/api/topics', topicsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/medals', medalsRoutes);
app.use('/api', savedPostsRoutes);
app.use('/api/reposts', repostsRoutes);

// Trust Score routes
app.use('/api/trust', trustRoutes);

// Story of Me routes
app.use('/api/stories', storiesRoutes);

// Decoration Store routes
app.use('/api/decorations', decorationsRoutes);

// Admin API routes
app.use('/api/admin', adminRoutes);

// Friendship Meetup routes
app.use('/api/friendship-meetup', friendshipMeetupRoutes);

// Corner Icon routes
app.use('/api/corner-icons', cornerIconsRoutes);

// Activity Wheel routes
app.use('/api/activities', activitiesRoutes);

// Goals routes
app.use('/api/goals', goalsRoutes);

// Admin panel static files
const adminPanelPath = path.join(__dirname, 'admin-panel');
app.use('/admin', express.static(adminPanelPath));

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

// Server Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.io
let io: ReturnType<typeof initializeSocket>;

// Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  try {
    // Close Socket.io server
    if (io) {
      io.close(() => {
        logger.info('Socket.io server closed');
      });
    }

    // Close database connections
    await disconnectPostgreSQL();
    await disconnectMongoDB();
    await disconnectRedis();
    await celeryClient.disconnect();
    logger.info('All database connections closed');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize Databases and Start Server
const startServer = async () => {
  try {
    // Initialize Firebase (optional)
    if (process.env.FIREBASE_PROJECT_ID) {
      initializeFirebase();
    }

    // Connect to databases
    logger.info('Connecting to databases...');

    // Connect to database (PostgreSQL or SQLite fallback)
    await connectPostgreSQL();
    await connectMongoDB();
    await connectRedis();
    logger.info('Database connections established');

    // Seed default communities if none exist
    await seedDefaultTopics();

    // Seed decoration store items if none exist
    await seedDecorations();

    // Seed bot users if they don't exist
    await seedBots();

    // Seed admin user if none exists
    await seedAdmin();

    // Initialize Socket.io
    io = initializeSocket(httpServer);
    setSocketInstance(io);
    logger.info('Socket.io initialized');

    // Start HTTP server with Socket.io
    httpServer.listen(PORT, HOST, () => {
      logger.info(`Server running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check available at http://${HOST}:${PORT}/health`);
      logger.info(`Auth API available at http://${HOST}:${PORT}/api/auth`);
      logger.info(`Socket.io available at ws://${HOST}:${PORT}`);
    });

    // Scheduled story generation - check hourly, generate on Sundays at 11 PM
    setInterval(async () => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 23) {
        logger.info('Running scheduled weekly story generation');
        await StoryOfMeService.generateAllWeeklyStories();
      }
    }, 60 * 60 * 1000); // every hour
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
