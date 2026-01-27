/**
 * VRM Bone Controller.
 */

import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { SolvedPose, EulerRotation } from '../types/pose';

const BONE_MAPPING: Record<string, VRMHumanBoneName> = {
  hips: 'hips', spine: 'spine', chest: 'chest', neck: 'neck', head: 'head',
  leftShoulder: 'leftShoulder', leftUpperArm: 'leftUpperArm',
  leftLowerArm: 'leftLowerArm', leftHand: 'leftHand',
  rightShoulder: 'rightShoulder', rightUpperArm: 'rightUpperArm',
  rightLowerArm: 'rightLowerArm', rightHand: 'rightHand',
  leftUpperLeg: 'leftUpperLeg', leftLowerLeg: 'leftLowerLeg', leftFoot: 'leftFoot',
  rightUpperLeg: 'rightUpperLeg', rightLowerLeg: 'rightLowerLeg', rightFoot: 'rightFoot',
};

export class BoneController {
  private vrm: VRM;
  private smoothingFactor: number = 0.3;
  private previousPose: SolvedPose | null = null;

  constructor(vrm: VRM) {
    this.vrm = vrm;
  }

  applyPose(pose: SolvedPose, smooth: boolean = true): void {
    let finalPose = pose;
    if (smooth && this.previousPose) {
      finalPose = this.smoothPose(pose, this.previousPose);
    }

    for (const [poseKey, boneName] of Object.entries(BONE_MAPPING)) {
      const rotation = (finalPose as any)[poseKey] as EulerRotation | undefined;
      if (rotation) {
        this.setBoneRotation(boneName, rotation);
      }
    }

    if (finalPose.face && this.vrm.expressionManager) {
      this.applyFaceExpressions(finalPose.face);
    }

    this.vrm.update(1 / 60);
    this.previousPose = { ...finalPose };
  }

  private setBoneRotation(boneName: VRMHumanBoneName, rotation: EulerRotation): void {
    const bone = this.vrm.humanoid?.getNormalizedBoneNode(boneName);
    if (bone) {
      bone.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }

  private applyFaceExpressions(face: SolvedPose['face']): void {
    if (!face || !this.vrm.expressionManager) return;
    this.vrm.expressionManager.setValue('aa', face.mouthOpen * 0.5);
    this.vrm.expressionManager.setValue('happy', face.mouthSmile);
    this.vrm.expressionManager.setValue('blinkLeft', face.eyeBlinkLeft);
    this.vrm.expressionManager.setValue('blinkRight', face.eyeBlinkRight);
  }

  private smoothPose(current: SolvedPose, previous: SolvedPose): SolvedPose {
    const lerp = (a: number, b: number) => a + (b - a) * this.smoothingFactor;
    const smoothRotation = (curr: EulerRotation, prev: EulerRotation): EulerRotation => ({
      x: lerp(prev.x, curr.x), y: lerp(prev.y, curr.y), z: lerp(prev.z, curr.z),
    });

    const result: any = { ...current };
    for (const key of Object.keys(BONE_MAPPING)) {
      const currVal = (current as any)[key];
      const prevVal = (previous as any)[key];
      if (currVal && prevVal) {
        result[key] = smoothRotation(currVal, prevVal);
      }
    }
    return result;
  }

  resetPose(): void {
    for (const boneName of Object.values(BONE_MAPPING)) {
      const bone = this.vrm.humanoid?.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.rotation.set(0, 0, 0);
      }
    }
    this.previousPose = null;
  }

  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
}
