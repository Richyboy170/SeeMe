import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { FriendshipMeetupService } from '../services/FriendshipMeetupService';
import { FriendshipMeetup } from '../models/FriendshipMeetup';
import { getSocketInstance } from '../socket/socketInstance';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8001';

export class FriendshipMeetupController {

  static async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { lat, lng } = req.body;

      const session = await FriendshipMeetupService.createSession(userId, lat, lng);

      const assignedPoses = typeof session.assignedPoses === 'string'
        ? JSON.parse(session.assignedPoses)
        : session.assignedPoses;

      res.status(201).json({
        success: true,
        session: {
          id: session.id,
          inviteCode: session.inviteCode,
          assignedPoses,
          status: session.status,
          expiresAt: session.expiresAt
        }
      });
    } catch (error: any) {
      logger.error('Error creating friendship session', { error });
      next(error);
    }
  }

  static async joinSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { code, lat, lng } = req.body;

      if (!code) {
        res.status(400).json({ success: false, message: 'Invite code is required' });
        return;
      }

      const session = await FriendshipMeetupService.joinSession(userId, code, lat, lng);

      const assignedPoses = typeof session.assignedPoses === 'string'
        ? JSON.parse(session.assignedPoses)
        : session.assignedPoses;

      res.json({
        success: true,
        session: {
          id: session.id,
          assignedPoses,
          status: session.status,
          hostUserId: session.hostUserId,
          guestUserId: session.guestUserId
        }
      });
    } catch (error: any) {
      logger.error('Error joining friendship session', { error: error.message });
      const knownErrors = ['Invalid', 'expired', 'far', 'already', 'Cannot', 'Too far', 'own session'];
      if (knownErrors.some(keyword => error.message?.includes(keyword))) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  }

  static async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const session = await FriendshipMeetupService.getSession(id);

      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      let assignedPoses: string[];
      try {
        assignedPoses = typeof session.assignedPoses === 'string'
          ? JSON.parse(session.assignedPoses)
          : session.assignedPoses;
      } catch {
        assignedPoses = [];
      }

      res.json({
        success: true,
        session: {
          ...session.toJSON(),
          assignedPoses
        }
      });
    } catch (error: any) {
      logger.error('Error getting friendship session', { error: error.message, sessionId: req.params.id });
      next(error);
    }
  }

  static async submitPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Photo is required' });
        return;
      }

      const { poseIndex, poseName } = req.body;

      // Save photo to storage
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${uuidv4()}${ext}`;
      const storagePath = path.join(__dirname, '../../storage/meetups', id);

      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const filePath = path.join(storagePath, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      const photoUrl = `/storage/meetups/${id}/${filename}`;

      const photo = await FriendshipMeetupService.submitPhoto(
        id,
        parseInt(poseIndex),
        poseName,
        photoUrl
      );

      res.json({
        success: true,
        photo
      });
    } catch (error: any) {
      logger.error('Error submitting meetup photo', { error });
      next(error);
    }
  }

  static async getSessionPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const photos = await FriendshipMeetupService.getSessionPhotos(id);
      res.json({ success: true, photos });
    } catch (error: any) {
      logger.error('Error getting session photos', { error });
      next(error);
    }
  }

  static async completeMeetup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await FriendshipMeetupService.completeMeetup(id);

      res.json({
        success: true,
        meetup: result.meetup,
        coinsAwarded: result.coinsAwarded
      });
    } catch (error: any) {
      logger.error('Error completing meetup', { error });
      next(error);
    }
  }

  static async cancelSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      await FriendshipMeetupService.cancelSession(id, userId);

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await FriendshipMeetupService.getHistory(userId, page, limit);

      res.json({
        success: true,
        meetups: result.meetups,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit)
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async validatePose(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Image is required' });
        return;
      }

      const { poseName, minPeople } = req.body;

      if (!poseName) {
        res.status(400).json({ success: false, message: 'poseName is required' });
        return;
      }

      // Forward to vision-service
      const form = new FormData();
      form.append('image', req.file.buffer, {
        filename: 'frame.jpg',
        contentType: req.file.mimetype || 'image/jpeg',
      });
      form.append('pose_name', poseName);
      form.append('min_people', String(minPeople || 2));

      const visionRes = await axios.post(
        `${VISION_SERVICE_URL}/api/friendship/validate-pose`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 5000,
        }
      );

      res.json({
        success: true,
        ...visionRes.data,
      });
    } catch (error: any) {
      // If vision-service is unreachable, return a graceful fallback
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        logger.warn('Vision service unavailable, returning fallback validation');
        res.json({
          success: true,
          people_detected: 0,
          pose_match_score: 0,
          is_valid: false,
          details: { error: 'vision_service_unavailable' },
        });
        return;
      }
      logger.error('Error validating pose', { error });
      next(error);
    }
  }

  static async saveDecoratedStrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Image is required' });
        return;
      }

      // Find the meetup by sessionId
      const meetup = await FriendshipMeetup.findOne({ where: { sessionId: id } });

      if (!meetup) {
        res.status(404).json({ success: false, message: 'Meetup not found' });
        return;
      }

      // Verify the user is part of this meetup
      if (meetup.userAId !== userId && meetup.userBId !== userId) {
        res.status(403).json({ success: false, message: 'Not authorized' });
        return;
      }

      // Save decorated strip image
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `decorated_${uuidv4()}${ext}`;
      const storagePath = path.join(__dirname, '../../storage/meetups', id);

      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const filePath = path.join(storagePath, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      const decoratedStripUrl = `/storage/meetups/${id}/${filename}`;
      await meetup.update({ decoratedStripUrl });

      // Notify the other user in real-time
      const partnerId = meetup.userAId === userId ? meetup.userBId : meetup.userAId;
      const io = getSocketInstance();
      if (io) {
        io.to(`user:${partnerId}`).emit('friendship:strip_decorated', {
          sessionId: id,
          decoratedStripUrl,
        });
      }

      logger.info('Decorated strip saved', { sessionId: id, userId });

      res.json({
        success: true,
        decoratedStripUrl,
      });
    } catch (error: any) {
      logger.error('Error saving decorated strip', { error });
      next(error);
    }
  }

  static async dailyCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { partnerId } = req.params;

      const canMeet = await FriendshipMeetupService.canMeetToday(userId, partnerId);

      res.json({ success: true, canMeetToday: canMeet });
    } catch (error: any) {
      next(error);
    }
  }
}

export default FriendshipMeetupController;
