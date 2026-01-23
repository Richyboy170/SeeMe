/**
 * Full Body Avatar Controller
 * Phase 3.1: Full-Body 3D Avatar System
 *
 * Handles:
 * - Full body avatar creation and management
 * - Image processing proxy to ML service
 * - Avatar customization updates
 */

import { Request, Response } from 'express';
import { FullBodyAvatar } from '../models/FullBodyAvatar';
import { logger } from '../utils/logger';
import axios from 'axios';
import FormData from 'form-data';

// Extend Request type to include authenticated user
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class FullBodyAvatarController {

  /**
   * Create a new full-body avatar from processed pose data
   * POST /api/full-body-avatar
   */
  static async createAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        rig_transforms,
        model_id,
        style,
        skin_color,
        hair_color,
        eye_color,
        skin_tone,
        hair_color_index,
        eye_color_index,
        pose_type,
        facing_direction,
        confidence,
        preset_pose_id,
        source_image_key
      } = req.body;

      // Validate required fields - accept either KalidoKit format or legacy format
      if (!rig_transforms) {
        res.status(400).json({
          success: false,
          error: 'rig_transforms is required'
        });
        return;
      }

      // Deactivate existing avatars for this user
      await FullBodyAvatar.update(
        { isActive: false },
        { where: { userId, isActive: true } }
      );

      // Create new avatar with VRM model support
      const avatar = await FullBodyAvatar.create({
        userId,
        modelId: model_id || 'avatar_sakura',
        rigTransforms: rig_transforms,
        poseType: pose_type || 'standing',
        facingDirection: facing_direction || 'front',
        confidence: confidence || 0.9,
        style: style || 'anime',
        skinColor: skin_color || '#FFE0BD',
        hairColor: hair_color || '#2C1810',
        eyeColor: eye_color || '#4A3728',
        skinTone: skin_tone ?? 2,
        hairColorIndex: hair_color_index ?? 1,
        eyeColorIndex: eye_color_index ?? 0,
        presetPoseId: preset_pose_id || null,
        sourceImageKey: source_image_key || null,
        isActive: true,
      });

      logger.info(`Created full-body avatar for user ${userId}`, { avatarId: avatar.id });

      res.status(201).json({
        success: true,
        avatar: {
          id: avatar.id,
          modelId: avatar.modelId,
          style: avatar.style,
          skinColor: avatar.skinColor,
          hairColor: avatar.hairColor,
          eyeColor: avatar.eyeColor,
          skinTone: avatar.skinTone,
          hairColorIndex: avatar.hairColorIndex,
          eyeColorIndex: avatar.eyeColorIndex,
          poseType: avatar.poseType,
          facingDirection: avatar.facingDirection,
          presetPoseId: avatar.presetPoseId,
          createdAt: avatar.createdAt,
        },
      });

    } catch (error) {
      logger.error('Create full-body avatar error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create avatar'
      });
    }
  }

  /**
   * Get user's active full-body avatar
   * GET /api/full-body-avatar
   * GET /api/full-body-avatar/:userId
   */
  static async getAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user!.id;

      const avatar = await FullBodyAvatar.findOne({
        where: { userId, isActive: true },
      });

      if (!avatar) {
        res.json({
          success: true,
          avatar: null,
          message: 'No active full-body avatar found'
        });
        return;
      }

      res.json({
        success: true,
        avatar: {
          id: avatar.id,
          modelId: avatar.modelId,
          rigTransforms: avatar.rigTransforms,
          poseType: avatar.poseType,
          facingDirection: avatar.facingDirection,
          confidence: avatar.confidence,
          style: avatar.style,
          skinColor: avatar.skinColor,
          hairColor: avatar.hairColor,
          eyeColor: avatar.eyeColor,
          skinTone: avatar.skinTone,
          hairColorIndex: avatar.hairColorIndex,
          eyeColorIndex: avatar.eyeColorIndex,
          presetPoseId: avatar.presetPoseId,
          createdAt: avatar.createdAt,
          updatedAt: avatar.updatedAt,
        },
      });

    } catch (error) {
      logger.error('Get full-body avatar error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get avatar'
      });
    }
  }

  /**
   * Update avatar customization (style, colors, model, pose)
   * PATCH /api/full-body-avatar
   */
  static async updateAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        model_id,
        style,
        skin_color,
        hair_color,
        eye_color,
        skin_tone,
        hair_color_index,
        eye_color_index,
        preset_pose_id,
        rig_transforms
      } = req.body;

      const avatar = await FullBodyAvatar.findOne({
        where: { userId, isActive: true },
      });

      if (!avatar) {
        res.status(404).json({
          success: false,
          error: 'No active full-body avatar found'
        });
        return;
      }

      // Build update object with VRM fields
      const updateData: Partial<FullBodyAvatar> = {};

      if (model_id !== undefined) updateData.modelId = model_id;
      if (style !== undefined) updateData.style = style;
      if (skin_color !== undefined) updateData.skinColor = skin_color;
      if (hair_color !== undefined) updateData.hairColor = hair_color;
      if (eye_color !== undefined) updateData.eyeColor = eye_color;
      if (skin_tone !== undefined) updateData.skinTone = skin_tone;
      if (hair_color_index !== undefined) updateData.hairColorIndex = hair_color_index;
      if (eye_color_index !== undefined) updateData.eyeColorIndex = eye_color_index;
      if (preset_pose_id !== undefined) updateData.presetPoseId = preset_pose_id;
      if (rig_transforms !== undefined) updateData.rigTransforms = rig_transforms;

      await avatar.update(updateData);

      logger.info(`Updated full-body avatar for user ${userId}`, { avatarId: avatar.id });

      res.json({
        success: true,
        avatar: {
          id: avatar.id,
          modelId: avatar.modelId,
          style: avatar.style,
          skinColor: avatar.skinColor,
          hairColor: avatar.hairColor,
          eyeColor: avatar.eyeColor,
          skinTone: avatar.skinTone,
          hairColorIndex: avatar.hairColorIndex,
          eyeColorIndex: avatar.eyeColorIndex,
          poseType: avatar.poseType,
          presetPoseId: avatar.presetPoseId,
          updatedAt: avatar.updatedAt,
        },
      });

    } catch (error) {
      logger.error('Update full-body avatar error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update avatar'
      });
    }
  }

  /**
   * Delete user's full-body avatar
   * DELETE /api/full-body-avatar
   */
  static async deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await FullBodyAvatar.destroy({
        where: { userId, isActive: true },
      });

      if (result === 0) {
        res.status(404).json({
          success: false,
          error: 'No active full-body avatar found'
        });
        return;
      }

      logger.info(`Deleted full-body avatar for user ${userId}`);

      res.json({
        success: true,
        message: 'Avatar deleted successfully'
      });

    } catch (error) {
      logger.error('Delete full-body avatar error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete avatar'
      });
    }
  }

  /**
   * Get all user's full-body avatars (including inactive)
   * GET /api/full-body-avatar/history
   */
  static async getAvatarHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const avatars = await FullBodyAvatar.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
      });

      res.json({
        success: true,
        avatars: avatars.map(avatar => ({
          id: avatar.id,
          style: avatar.style,
          poseType: avatar.poseType,
          presetPoseId: avatar.presetPoseId,
          isActive: avatar.isActive,
          createdAt: avatar.createdAt,
        })),
      });

    } catch (error) {
      logger.error('Get avatar history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get avatar history'
      });
    }
  }

  // ========== ML Service Proxy Endpoints ==========

  /**
   * Check if image contains a person (content policy enforcement)
   * POST /api/full-body-avatar/check-person
   */
  static async checkPerson(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Image file required'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype,
      });

      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/api/body-avatar/person-check`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 10000, // 10 seconds (should be <200ms normally)
        }
      );

      res.json(mlResponse.data);

    } catch (error: any) {
      logger.error('Person check error:', error.message);

      if (error.response?.data) {
        res.status(error.response.status).json(error.response.data);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to check image for person',
        person_detected: false, // Default to false on error (allow posting)
        can_post_directly: true,
      });
    }
  }

  /**
   * Blur faces in image
   * POST /api/full-body-avatar/blur-faces
   */
  static async blurFaces(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Image file required'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype,
      });

      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/api/body-avatar/blur-faces`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000, // 30 seconds
          responseType: 'arraybuffer',
        }
      );

      // Forward the image response
      res.set({
        'Content-Type': 'image/jpeg',
        'X-Faces-Found': mlResponse.headers['x-faces-found'] || '0',
        'X-Processing-Time-Ms': mlResponse.headers['x-processing-time-ms'] || '0',
      });
      res.send(mlResponse.data);

    } catch (error: any) {
      logger.error('Face blur error:', error.message);

      if (error.response?.data) {
        res.status(error.response.status).json({
          success: false,
          error: 'Failed to blur faces'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to blur faces in image'
      });
    }
  }

  /**
   * Process image to extract skeleton and generate rig transforms
   * POST /api/full-body-avatar/process
   */
  static async processImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Image file required'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'body-photo.jpg',
        contentType: req.file.mimetype,
      });

      // Add optional person_bbox if provided
      if (req.body.person_bbox) {
        formData.append('person_bbox', req.body.person_bbox);
      }

      // Add style preference
      formData.append('style', req.body.style || 'cartoon');

      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/api/body-avatar/full-body-avatar`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 60000, // 60 seconds for full processing
        }
      );

      res.json(mlResponse.data);

    } catch (error: any) {
      logger.error('Process image error:', error.message);

      if (error.response?.data) {
        res.status(error.response.status).json(error.response.data);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process image'
      });
    }
  }

  /**
   * Extract MediaPipe Holistic landmarks for KalidoKit
   * POST /api/full-body-avatar/extract-landmarks
   *
   * Returns raw landmark data that the mobile app uses with KalidoKit
   * to solve pose and apply to VRM avatar.
   */
  static async extractLandmarks(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Image file required'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'pose-photo.jpg',
        contentType: req.file.mimetype,
      });

      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/api/body-avatar/extract-landmarks`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000, // 30 seconds for landmark extraction
        }
      );

      // Return KalidoKit-compatible landmark data
      res.json(mlResponse.data);

    } catch (error: any) {
      logger.error('Extract landmarks error:', error.message);

      if (error.response?.data) {
        res.status(error.response.status).json(error.response.data);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to extract landmarks from image'
      });
    }
  }

  /**
   * Detect multiple people in image
   * POST /api/full-body-avatar/detect-people
   */
  static async detectPeople(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Image file required'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype,
      });

      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/api/body-avatar/detect-people`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 15000, // 15 seconds
        }
      );

      res.json(mlResponse.data);

    } catch (error: any) {
      logger.error('Detect people error:', error.message);

      if (error.response?.data) {
        res.status(error.response.status).json(error.response.data);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to detect people in image',
        person_count: 0,
        people: [],
      });
    }
  }
}

export default FullBodyAvatarController;
