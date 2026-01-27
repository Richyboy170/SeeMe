/**
 * Pose data structures for VRM avatar rigging.
 */

export interface EulerRotation {
  x: number;
  y: number;
  z: number;
}

export interface SolvedPose {
  hips: EulerRotation;
  spine: EulerRotation;
  chest: EulerRotation;
  neck: EulerRotation;
  head: EulerRotation;

  leftShoulder: EulerRotation;
  leftUpperArm: EulerRotation;
  leftLowerArm: EulerRotation;
  leftHand: EulerRotation;

  rightShoulder: EulerRotation;
  rightUpperArm: EulerRotation;
  rightLowerArm: EulerRotation;
  rightHand: EulerRotation;

  leftUpperLeg: EulerRotation;
  leftLowerLeg: EulerRotation;
  leftFoot: EulerRotation;

  rightUpperLeg: EulerRotation;
  rightLowerLeg: EulerRotation;
  rightFoot: EulerRotation;

  face?: FaceExpressions;
}

export interface FaceExpressions {
  mouthOpen: number;
  mouthSmile: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  browUp: number;
  browDown: number;
}

export interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseToRigResponse {
  success: boolean;
  error?: string;
  rotations?: Record<string, EulerRotation>;
  face_landmarks?: MediaPipeLandmark[];
}

export function createDefaultPose(): SolvedPose {
  const zero = { x: 0, y: 0, z: 0 };
  return {
    hips: { ...zero }, spine: { ...zero }, chest: { ...zero },
    neck: { ...zero }, head: { ...zero },
    leftShoulder: { ...zero }, leftUpperArm: { ...zero },
    leftLowerArm: { ...zero }, leftHand: { ...zero },
    rightShoulder: { ...zero }, rightUpperArm: { ...zero },
    rightLowerArm: { ...zero }, rightHand: { ...zero },
    leftUpperLeg: { ...zero }, leftLowerLeg: { ...zero }, leftFoot: { ...zero },
    rightUpperLeg: { ...zero }, rightLowerLeg: { ...zero }, rightFoot: { ...zero },
  };
}
