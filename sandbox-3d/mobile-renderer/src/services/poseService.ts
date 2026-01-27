/**
 * Pose solving service.
 */

import { SolvedPose, EulerRotation, createDefaultPose } from '../types/pose';
import { AvatarApiService, avatarApi } from './avatarApiService';

export class PoseService {
  private api: AvatarApiService;

  constructor(api: AvatarApiService = avatarApi) {
    this.api = api;
  }

  async processImage(imageUri: string): Promise<SolvedPose | null> {
    try {
      const result = await this.api.getPoseRotations(imageUri);
      if (!result.success || !result.rotations) {
        console.warn('Pose extraction failed:', result.error);
        return null;
      }
      return this.convertToSolvedPose(result.rotations);
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  }

  private convertToSolvedPose(rotations: Record<string, EulerRotation>): SolvedPose {
    const zero = { x: 0, y: 0, z: 0 };
    return {
      hips: rotations.hips || zero,
      spine: rotations.spine || zero,
      chest: rotations.chest || zero,
      neck: rotations.neck || zero,
      head: rotations.head || zero,
      leftShoulder: rotations.leftShoulder || zero,
      leftUpperArm: rotations.leftUpperArm || zero,
      leftLowerArm: rotations.leftLowerArm || zero,
      leftHand: rotations.leftHand || zero,
      rightShoulder: rotations.rightShoulder || zero,
      rightUpperArm: rotations.rightUpperArm || zero,
      rightLowerArm: rotations.rightLowerArm || zero,
      rightHand: rotations.rightHand || zero,
      leftUpperLeg: rotations.leftUpperLeg || zero,
      leftLowerLeg: rotations.leftLowerLeg || zero,
      leftFoot: rotations.leftFoot || zero,
      rightUpperLeg: rotations.rightUpperLeg || zero,
      rightLowerLeg: rotations.rightLowerLeg || zero,
      rightFoot: rotations.rightFoot || zero,
    };
  }

  smoothPose(current: SolvedPose, target: SolvedPose, factor: number = 0.3): SolvedPose {
    const lerp = (a: number, b: number) => a + (b - a) * factor;
    const smoothRotation = (curr: EulerRotation, tgt: EulerRotation): EulerRotation => ({
      x: lerp(curr.x, tgt.x),
      y: lerp(curr.y, tgt.y),
      z: lerp(curr.z, tgt.z),
    });

    const result = createDefaultPose();
    const keys: (keyof SolvedPose)[] = [
      'hips', 'spine', 'chest', 'neck', 'head',
      'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
      'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
      'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
    ];

    for (const key of keys) {
      const currVal = current[key];
      const tgtVal = target[key];
      if (currVal && tgtVal && typeof currVal === 'object' && 'x' in currVal) {
        (result as any)[key] = smoothRotation(currVal as EulerRotation, tgtVal as EulerRotation);
      }
    }
    return result;
  }
}

export const poseService = new PoseService();
