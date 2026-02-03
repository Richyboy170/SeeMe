/**
 * Content Check Service
 * Phase 3.1: Full-Body 3D Avatar System
 *
 * Handles:
 * - Quick person detection for content policy (ON-DEVICE using ML Kit)
 * - Face blur functionality
 * - Multi-person detection for avatar creation
 * - Full body avatar processing
 */

import { api } from './api';
import { Paths, File } from 'expo-file-system';

/**
 * Response from person check endpoint
 */
export interface PersonCheckResult {
  personDetected: boolean;
  confidence: number;
  bodyCoverage: number;
  canPostDirectly: boolean;
  processingTimeMs: number;
  message: string;
}

/**
 * Response from face blur endpoint
 */
export interface FaceBlurResult {
  blurredImageUri: string;
  facesBlurred: number;
  processingTimeMs: number;
}

/**
 * Detected person from multi-person detection
 */
export interface DetectedPerson {
  id: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  bodyCoverage: number;
  landmarkPreview: Array<{
    name: string;
    x: number;
    y: number;
    visibility?: number;
  }>;
}

/**
 * Response from people detection endpoint
 */
export interface PeopleDetectionResult {
  personCount: number;
  people: DetectedPerson[];
  selectionRequired: boolean;
}

/**
 * Bone transform for 3D rig
 */
export interface BoneTransform {
  bone_name: string;
  rotation: [number, number, number, number]; // quaternion
  position: [number, number, number];
  scale: [number, number, number];
}

/**
 * Full body avatar processing result
 */
export interface FullBodyAvatarResult {
  success: boolean;
  avatarData?: {
    style: string;
    pose: {
      type: string;
      facing: string;
      confidence: number;
    };
    skeleton: any;
    rigTransforms: {
      bones: BoneTransform[];
      boneCount: number;
    };
  };
  processingTimeMs?: number;
  stage?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Check if image contains a person (for content policy enforcement)
 * Uses SERVER-SIDE ML detection via the backend ML service.
 * This runs automatically when user selects image for posting.
 *
 * @param imageUri Local URI of the image to check
 * @returns PersonCheckResult with detection info
 */
export const checkImageForPerson = async (
  imageUri: string
): Promise<PersonCheckResult> => {
  const startTime = Date.now();

  try {
    // Use server-side face detection via ML service
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'check.jpg',
    } as any);

    const response = await api.post('/full-body-avatar/check-person', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15000, // 15 seconds
    });

    const processingTimeMs = Date.now() - startTime;
    console.log(`Server face detection completed in ${processingTimeMs}ms`);

    return {
      personDetected: response.data.person_detected,
      confidence: response.data.confidence,
      bodyCoverage: response.data.body_coverage,
      canPostDirectly: response.data.can_post_directly,
      processingTimeMs,
      message: response.data.message,
    };
  } catch (error: any) {
    console.log('Server face detection unavailable - allowing post');

    // On error, allow post (don't block users if ML service is down)
    return {
      personDetected: false,
      confidence: 0,
      bodyCoverage: 0,
      canPostDirectly: true,
      processingTimeMs: Date.now() - startTime,
      message: 'Detection unavailable - ready to post',
    };
  }
};

/**
 * Blur all faces in an image using SERVER-SIDE processing
 *
 * @param imageUri Local URI of the image to blur
 * @returns Object with blurred image URI and face count
 */
export const blurFacesInImage = async (
  imageUri: string
): Promise<FaceBlurResult> => {
  const startTime = Date.now();

  try {
    // Use server-side face blur via ML service
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'blur.jpg',
    } as any);

    const response = await api.post('/full-body-avatar/blur-faces', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
      timeout: 30000,
    });

    const blurredUri = await saveBlobToFile(response.data, 'blurred.jpg');

    return {
      blurredImageUri: blurredUri,
      facesBlurred: parseInt(response.headers['x-faces-found'] || '0'),
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('Face blur error:', error);
    throw new Error('Failed to blur faces in image');
  }
};

/**
 * Detect all people in an image for avatar selection
 *
 * @param imageUri Local URI of the image
 * @returns Detection result with bounding boxes for each person
 */
export const detectPeopleInImage = async (
  imageUri: string
): Promise<PeopleDetectionResult> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'detect.jpg',
    } as any);

    const response = await api.post('/full-body-avatar/detect-people', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20000, // 20 seconds
    });

    return {
      personCount: response.data.person_count,
      people: response.data.people.map((p: any) => ({
        id: p.id,
        boundingBox: p.bounding_box,
        confidence: p.confidence,
        bodyCoverage: p.body_coverage,
        landmarkPreview: p.landmark_preview || p.preview_landmarks,
      })),
      selectionRequired: response.data.selection_required,
    };
  } catch (error: any) {
    console.error('People detection error:', error);
    throw new Error('Failed to detect people in image');
  }
};

/**
 * Process image to create full body avatar
 *
 * @param imageUri Local URI of the full-body photo
 * @param personBbox Optional bounding box if user selected specific person
 * @param style Avatar style (cartoon, anime, minimalist)
 * @returns Full avatar data with rig transforms
 */
export const processFullBodyAvatar = async (
  imageUri: string,
  personBbox?: DetectedPerson['boundingBox'],
  style: string = 'cartoon'
): Promise<FullBodyAvatarResult> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'body-photo.jpg',
    } as any);

    if (personBbox) {
      formData.append('person_bbox', JSON.stringify(personBbox));
    }

    formData.append('style', style);

    const response = await api.post('/full-body-avatar/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60 seconds for full processing
    });

    if (response.data.success) {
      return {
        success: true,
        avatarData: {
          style: response.data.avatar_data.style,
          pose: response.data.avatar_data.pose,
          skeleton: response.data.avatar_data.skeleton,
          rigTransforms: response.data.avatar_data.rig_transforms,
        },
        processingTimeMs: response.data.processing_time_ms,
      };
    } else {
      return {
        success: false,
        stage: response.data.stage,
        error: response.data.error,
        suggestions: response.data.suggestions,
      };
    }
  } catch (error: any) {
    console.error('Full body avatar processing error:', error);

    if (error.response?.data) {
      return {
        success: false,
        stage: error.response.data.stage,
        error: error.response.data.error,
        suggestions: error.response.data.suggestions,
      };
    }

    return {
      success: false,
      error: 'processing_failed',
      suggestions: ['Please try again with a different photo'],
    };
  }
};

/**
 * Save full body avatar to backend
 *
 * @param avatarData Avatar data from processing
 * @param customization User customization options
 * @returns Created avatar info
 */
export const saveFullBodyAvatar = async (
  avatarData: FullBodyAvatarResult['avatarData'],
  customization: {
    style?: string;
    skinTone?: number;
    hairColor?: number;
    eyeColor?: number;
    presetPoseId?: string;
  }
): Promise<{
  id: string;
  style: string;
  createdAt: string;
}> => {
  try {
    const response = await api.post('/full-body-avatar', {
      rig_transforms: avatarData?.rigTransforms,
      pose_type: avatarData?.pose.type,
      facing_direction: avatarData?.pose.facing,
      confidence: avatarData?.pose.confidence,
      style: customization.style || avatarData?.style || 'cartoon',
      skin_tone: customization.skinTone ?? 2,
      hair_color: customization.hairColor ?? 1,
      eye_color: customization.eyeColor ?? 0,
      preset_pose_id: customization.presetPoseId || null,
    });

    return {
      id: response.data.avatar.id,
      style: response.data.avatar.style,
      createdAt: response.data.avatar.createdAt,
    };
  } catch (error: any) {
    console.error('Save avatar error:', error);
    throw new Error('Failed to save avatar');
  }
};

/**
 * Get current user's full body avatar
 */
export const getMyFullBodyAvatar = async () => {
  try {
    const response = await api.get('/full-body-avatar');
    return response.data.avatar;
  } catch (error: any) {
    console.error('Get avatar error:', error);
    return null;
  }
};

/**
 * Update avatar customization
 */
export const updateFullBodyAvatar = async (
  updates: {
    style?: string;
    skinTone?: number;
    hairColor?: number;
    eyeColor?: number;
    presetPoseId?: string;
    rigTransforms?: any;
  }
): Promise<boolean> => {
  try {
    await api.patch('/full-body-avatar', {
      style: updates.style,
      skin_tone: updates.skinTone,
      hair_color: updates.hairColor,
      eye_color: updates.eyeColor,
      preset_pose_id: updates.presetPoseId,
      rig_transforms: updates.rigTransforms,
    });
    return true;
  } catch (error: any) {
    console.error('Update avatar error:', error);
    return false;
  }
};

// ========== Helper Functions ==========

/**
 * Save a blob response to a local file
 */
const saveBlobToFile = async (blob: Blob, filename: string): Promise<string> => {
  const file = new File(Paths.cache, filename);

  // Convert blob to text and write to file
  const text = await blob.text();
  await file.write(text);

  return file.uri;
};
