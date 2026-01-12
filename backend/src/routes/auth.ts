import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { asyncHandler, APIError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { googleAuthService, GoogleUserInfo } from '../utils/googleAuth';

const router = Router();

/**
 * Validation schemas
 */
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const googleSignInSchema = Joi.object({
  idToken: Joi.string().required()
});

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new APIError(error.details[0].message, 400);
    }

    const { username, email, password } = value;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        email
      }
    });

    if (existingUser) {
      throw new APIError('Email already registered', 409);
    }

    // Check if username is taken
    const existingUsername = await User.findOne({
      where: {
        username
      }
    });

    if (existingUsername) {
      throw new APIError('Username already taken', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      id: uuidv4(),
      username,
      email,
      passwordHash,
      ageVerified: false,
      activeAvatarId: null
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email
    });

    logger.info('User registered successfully', {
      userId: user.id,
      username: user.username
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ageVerified: user.ageVerified,
        activeAvatarId: user.activeAvatarId,
        createdAt: user.createdAt
      },
      token
    });
  })
);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new APIError(error.details[0].message, 400);
    }

    const { email, password } = value;

    // Find user by email
    const user = await User.findOne({
      where: {
        email
      }
    });

    if (!user) {
      throw new APIError('Invalid email or password', 401);
    }

    // Check if user is Google-only
    if (!user.passwordHash) {
      throw new APIError('This account uses Google Sign-In. Please sign in with Google.', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new APIError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ageVerified: user.ageVerified,
        activeAvatarId: user.activeAvatarId,
        createdAt: user.createdAt
      },
      token
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 * Note: JWT tokens are stateless, so logout is handled client-side
 */
router.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info('User logged out', { userId: req.user?.id });

    res.json({
      message: 'Logout successful'
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new APIError('User not found', 404);
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'ageVerified', 'activeAvatarId', 'createdAt', 'updatedAt']
    });

    if (!user) {
      throw new APIError('User not found', 404);
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ageVerified: user.ageVerified,
        activeAvatarId: user.activeAvatarId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  })
);

/**
 * POST /api/auth/verify-age
 * Mark user as age verified
 */
router.post(
  '/verify-age',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new APIError('User not found', 404);
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      throw new APIError('User not found', 404);
    }

    if (user.ageVerified) {
      throw new APIError('User already age verified', 400);
    }

    user.ageVerified = true;
    await user.save();

    logger.info('User age verified', { userId: user.id });

    res.json({
      message: 'Age verification successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ageVerified: user.ageVerified,
        activeAvatarId: user.activeAvatarId
      }
    });
  })
);

/**
 * POST /api/auth/google
 * Authenticate or register user via Google Sign-In
 */
router.post(
  '/google',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const { error, value } = googleSignInSchema.validate(req.body);
    if (error) {
      throw new APIError(error.details[0].message, 400);
    }

    const { idToken } = value;

    // Verify Google ID token
    const googleUser = await googleAuthService.verifyIdToken(idToken);

    if (!googleUser.emailVerified) {
      throw new APIError('Google account email not verified', 400);
    }

    // Check if user exists by email (for account linking)
    let user = await User.findOne({ where: { email: googleUser.email } });

    if (user) {
      // EXISTING USER - Link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        user.authProvider = user.passwordHash ? 'both' : 'google';
        await user.save();
        logger.info('Linked Google account to existing user', {
          userId: user.id,
          email: user.email
        });
      } else if (user.googleId !== googleUser.googleId) {
        // Email exists but linked to different Google account
        throw new APIError('Email already registered with different Google account', 409);
      }
    } else {
      // NEW USER - Create account from Google info
      const username = await generateUniqueUsername(googleUser);

      user = await User.create({
        id: uuidv4(),
        username,
        email: googleUser.email,
        passwordHash: null,
        googleId: googleUser.googleId,
        authProvider: 'google',
        ageVerified: false,
        activeAvatarId: null
      });

      logger.info('New user registered via Google', {
        userId: user.id,
        username: user.username,
        email: user.email
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email
    });

    res.status(user.createdAt.getTime() === user.updatedAt.getTime() ? 201 : 200).json({
      message: user.createdAt.getTime() === user.updatedAt.getTime()
        ? 'User registered successfully via Google'
        : 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ageVerified: user.ageVerified,
        activeAvatarId: user.activeAvatarId,
        authProvider: user.authProvider,
        createdAt: user.createdAt
      },
      token,
      isNewUser: user.createdAt.getTime() === user.updatedAt.getTime()
    });
  })
);

/**
 * Generate a unique username from Google user info
 * Tries: given name -> email prefix -> email prefix + random number
 */
async function generateUniqueUsername(googleUser: GoogleUserInfo): Promise<string> {
  // Try using given name (sanitized)
  if (googleUser.givenName) {
    const baseName = googleUser.givenName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (baseName.length >= 3) {
      const existing = await User.findOne({ where: { username: baseName } });
      if (!existing) return baseName;
    }
  }

  // Try email prefix
  const emailPrefix = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (emailPrefix.length >= 3) {
    const existing = await User.findOne({ where: { username: emailPrefix } });
    if (!existing) return emailPrefix;

    // Try email prefix + random numbers
    for (let i = 0; i < 10; i++) {
      const randomNum = Math.floor(Math.random() * 9999);
      const username = `${emailPrefix}${randomNum}`;
      const existing = await User.findOne({ where: { username } });
      if (!existing) return username;
    }
  }

  // Fallback: generate random username
  const randomUsername = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return randomUsername;
}

export default router;
