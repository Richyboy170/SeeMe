/**
 * API service for communicating with CV service.
 */

import { PoseToRigResponse, EulerRotation } from '../types/pose';

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
}

export class AvatarApiService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = { timeout: 30000, ...config };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async detectPerson(imageUri: string): Promise<{
    detected: boolean;
    confidence: number;
    boundingBox?: { xMin: number; yMin: number; xMax: number; yMax: number };
  }> {
    const response = await this.postImage('/api/body-avatar/detect-person', imageUri);
    return {
      detected: response.detected,
      confidence: response.confidence,
      boundingBox: response.bounding_box ? {
        xMin: response.bounding_box.x_min,
        yMin: response.bounding_box.y_min,
        xMax: response.bounding_box.x_max,
        yMax: response.bounding_box.y_max,
      } : undefined,
    };
  }

  async getPoseRotations(imageUri: string): Promise<PoseToRigResponse> {
    return this.postImage('/api/body-avatar/pose-to-rig', imageUri);
  }

  async fullPipeline(imageUri: string): Promise<{
    success: boolean;
    error?: string;
    rotations?: Record<string, EulerRotation>;
    faceLandmarks?: any[];
  }> {
    const response = await this.postImage('/api/body-avatar/full-pipeline', imageUri);
    if (!response.success) {
      return { success: false, error: response.error };
    }
    return {
      success: true,
      rotations: response.rig_rotations?.rotations,
      faceLandmarks: response.landmarks?.face_landmarks,
    };
  }

  private async postImage(endpoint: string, imageUri: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', { uri: imageUri, name: filename, type } as any);

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const avatarApi = new AvatarApiService({ baseUrl: 'http://localhost:8001' });
