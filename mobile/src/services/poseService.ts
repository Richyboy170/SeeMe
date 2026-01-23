/**
 * KalidoKit Pose Solving Service
 * Phase 3.1.2: 3D Rendering
 *
 * Converts MediaPipe landmarks (from backend) to bone rotations using KalidoKit.
 * KalidoKit handles the coordinate system conversion (MediaPipe Y-down -> Three.js Y-up).
 */

import * as Kalidokit from 'kalidokit';

// ============================================================
// TYPES - MediaPipe Landmark Data (from backend /extract-landmarks)
// ============================================================

export interface MediaPipeLandmarks {
  poseLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
  poseWorldLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
  faceLandmarks?: Array<{ x: number; y: number; z: number }>;
  leftHandLandmarks?: Array<{ x: number; y: number; z: number }>;
  rightHandLandmarks?: Array<{ x: number; y: number; z: number }>;
}

// ============================================================
// TYPES - KalidoKit Solved Pose Output
// ============================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface HipsData {
  rotation: Vector3;
  position: Vector3;
}

export interface FaceData {
  head: Vector3 & { width: number; height: number; position: Vector3 };
  eye: { l: number; r: number };
  brow: number;
  pupil: { x: number; y: number };
  mouth: {
    x: number;
    y: number;
    shape: { A: number; E: number; I: number; O: number; U: number };
  };
}

export interface HandData {
  [finger: string]: Vector3;
}

export interface SolvedPose {
  // Body rig (from Kalidokit.Pose.solve())
  RightUpperArm: Vector3;
  LeftUpperArm: Vector3;
  RightLowerArm: Vector3;
  LeftLowerArm: Vector3;
  RightHand: Vector3;
  LeftHand: Vector3;
  RightUpperLeg?: Vector3;
  LeftUpperLeg?: Vector3;
  RightLowerLeg?: Vector3;
  LeftLowerLeg?: Vector3;
  Spine: Vector3;
  Hips: HipsData;

  // Face rig (from Kalidokit.Face.solve()) - optional
  head?: Vector3;
  eye?: { l: number; r: number };
  brow?: number;
  pupil?: { x: number; y: number };
  mouth?: {
    x: number;
    y: number;
    shape: { A: number; E: number; I: number; O: number; U: number };
  };

  // Hand rigs (from Kalidokit.Hand.solve()) - optional
  leftHand?: HandData;
  rightHand?: HandData;
}

// ============================================================
// POSE SOLVING FUNCTIONS
// ============================================================

/**
 * Solve body pose from MediaPipe landmarks using KalidoKit.
 *
 * KalidoKit handles:
 * - Coordinate system conversion (MediaPipe Y-down -> Three.js Y-up)
 * - Euler angle calculations from landmark positions
 * - Hand/finger solving with proper joint hierarchy
 */
export function solvePose(landmarks: MediaPipeLandmarks): SolvedPose {
  // Solve body pose
  const poseRig = Kalidokit.Pose.solve(
    landmarks.poseWorldLandmarks,
    landmarks.poseLandmarks,
    {
      runtime: 'mediapipe',
      imageSize: { width: 1, height: 1 }, // Normalized coordinates
    }
  );

  // Solve face (if landmarks available)
  let faceRig: any = null;
  if (landmarks.faceLandmarks && landmarks.faceLandmarks.length > 0) {
    faceRig = Kalidokit.Face.solve(landmarks.faceLandmarks, {
      runtime: 'mediapipe',
      imageSize: { width: 1, height: 1 },
    });
  }

  // Solve hands (if landmarks available)
  let leftHandRig: HandData | undefined;
  let rightHandRig: HandData | undefined;

  if (landmarks.leftHandLandmarks && landmarks.leftHandLandmarks.length > 0) {
    leftHandRig = Kalidokit.Hand.solve(landmarks.leftHandLandmarks, 'Left') as HandData;
  }

  if (landmarks.rightHandLandmarks && landmarks.rightHandLandmarks.length > 0) {
    rightHandRig = Kalidokit.Hand.solve(landmarks.rightHandLandmarks, 'Right') as HandData;
  }

  // Default values
  const defaultVector: Vector3 = { x: 0, y: 0, z: 0 };
  const defaultHips: HipsData = {
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 1, z: 0 },
  };

  // Combine all solved rigs with null safety
  return {
    // Body pose
    RightUpperArm: poseRig?.RightUpperArm || defaultVector,
    LeftUpperArm: poseRig?.LeftUpperArm || defaultVector,
    RightLowerArm: poseRig?.RightLowerArm || defaultVector,
    LeftLowerArm: poseRig?.LeftLowerArm || defaultVector,
    RightHand: poseRig?.RightHand || defaultVector,
    LeftHand: poseRig?.LeftHand || defaultVector,
    RightUpperLeg: poseRig?.RightUpperLeg as Vector3 | undefined,
    LeftUpperLeg: poseRig?.LeftUpperLeg as Vector3 | undefined,
    RightLowerLeg: poseRig?.RightLowerLeg as Vector3 | undefined,
    LeftLowerLeg: poseRig?.LeftLowerLeg as Vector3 | undefined,
    Spine: poseRig?.Spine || defaultVector,
    Hips: poseRig?.Hips ? {
      rotation: poseRig.Hips.rotation || defaultVector,
      position: poseRig.Hips.position || { x: 0, y: 1, z: 0 },
    } : defaultHips,

    // Face (if available)
    head: faceRig?.head,
    eye: faceRig?.eye,
    brow: faceRig?.brow,
    pupil: faceRig?.pupil,
    mouth: faceRig?.mouth,

    // Hands (if available)
    leftHand: leftHandRig,
    rightHand: rightHandRig,
  };
}

/**
 * Solve only body pose (faster, for when face/hands not needed)
 */
export function solveBodyPose(
  poseLandmarks: MediaPipeLandmarks['poseLandmarks'],
  poseWorldLandmarks: MediaPipeLandmarks['poseWorldLandmarks']
): Partial<SolvedPose> {
  const poseRig = Kalidokit.Pose.solve(poseWorldLandmarks, poseLandmarks, {
    runtime: 'mediapipe',
    imageSize: { width: 1, height: 1 },
  });

  if (!poseRig) {
    return {};
  }

  const defaultVector: Vector3 = { x: 0, y: 0, z: 0 };

  return {
    RightUpperArm: poseRig.RightUpperArm || defaultVector,
    LeftUpperArm: poseRig.LeftUpperArm || defaultVector,
    RightLowerArm: poseRig.RightLowerArm || defaultVector,
    LeftLowerArm: poseRig.LeftLowerArm || defaultVector,
    RightHand: poseRig.RightHand || defaultVector,
    LeftHand: poseRig.LeftHand || defaultVector,
    RightUpperLeg: poseRig.RightUpperLeg as Vector3 | undefined,
    LeftUpperLeg: poseRig.LeftUpperLeg as Vector3 | undefined,
    RightLowerLeg: poseRig.RightLowerLeg as Vector3 | undefined,
    LeftLowerLeg: poseRig.LeftLowerLeg as Vector3 | undefined,
    Spine: poseRig.Spine || defaultVector,
    Hips: poseRig.Hips ? {
      rotation: poseRig.Hips.rotation || defaultVector,
      position: poseRig.Hips.position || { x: 0, y: 1, z: 0 },
    } : undefined,
  };
}

/**
 * Solve face expressions only
 */
export function solveFace(
  faceLandmarks: MediaPipeLandmarks['faceLandmarks']
): FaceData | null {
  if (!faceLandmarks || faceLandmarks.length === 0) {
    return null;
  }

  return Kalidokit.Face.solve(faceLandmarks, {
    runtime: 'mediapipe',
    imageSize: { width: 1, height: 1 },
  }) as FaceData;
}

/**
 * Check if landmarks have enough visibility for reliable pose solving
 */
export function checkLandmarkQuality(landmarks: MediaPipeLandmarks): {
  isGood: boolean;
  bodyConfidence: number;
  hasFace: boolean;
  hasLeftHand: boolean;
  hasRightHand: boolean;
} {
  // Calculate body confidence from visibility values
  const visibilities = landmarks.poseLandmarks
    .filter((lm) => lm.visibility !== undefined)
    .map((lm) => lm.visibility!);

  const avgVisibility =
    visibilities.length > 0
      ? visibilities.reduce((a, b) => a + b, 0) / visibilities.length
      : 0;

  // Key body parts that must be visible
  const keyIndices = [11, 12, 23, 24]; // shoulders and hips
  const keyVisible = keyIndices.every(
    (i) => landmarks.poseLandmarks[i]?.visibility !== undefined &&
      landmarks.poseLandmarks[i].visibility! > 0.5
  );

  return {
    isGood: avgVisibility > 0.6 && keyVisible,
    bodyConfidence: avgVisibility,
    hasFace: !!landmarks.faceLandmarks && landmarks.faceLandmarks.length > 0,
    hasLeftHand: !!landmarks.leftHandLandmarks && landmarks.leftHandLandmarks.length > 0,
    hasRightHand: !!landmarks.rightHandLandmarks && landmarks.rightHandLandmarks.length > 0,
  };
}

/**
 * Create a default T-pose
 */
export function getDefaultPose(): SolvedPose {
  return {
    RightUpperArm: { x: 0, y: 0, z: -1.5 },
    LeftUpperArm: { x: 0, y: 0, z: 1.5 },
    RightLowerArm: { x: 0, y: 0, z: 0 },
    LeftLowerArm: { x: 0, y: 0, z: 0 },
    RightHand: { x: 0, y: 0, z: 0 },
    LeftHand: { x: 0, y: 0, z: 0 },
    Spine: { x: 0, y: 0, z: 0 },
    Hips: {
      rotation: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 1, z: 0 },
    },
  };
}

/**
 * Interpolate between two poses (for smooth transitions)
 */
export function interpolatePose(
  from: Partial<SolvedPose>,
  to: Partial<SolvedPose>,
  t: number // 0 to 1
): Partial<SolvedPose> {
  const lerp = (a: number, b: number) => a + (b - a) * t;

  const lerpVector = (a?: Vector3, b?: Vector3): Vector3 | undefined => {
    if (!a || !b) return b || a;
    return {
      x: lerp(a.x, b.x),
      y: lerp(a.y, b.y),
      z: lerp(a.z, b.z),
    };
  };

  return {
    RightUpperArm: lerpVector(from.RightUpperArm, to.RightUpperArm),
    LeftUpperArm: lerpVector(from.LeftUpperArm, to.LeftUpperArm),
    RightLowerArm: lerpVector(from.RightLowerArm, to.RightLowerArm),
    LeftLowerArm: lerpVector(from.LeftLowerArm, to.LeftLowerArm),
    RightHand: lerpVector(from.RightHand, to.RightHand),
    LeftHand: lerpVector(from.LeftHand, to.LeftHand),
    Spine: lerpVector(from.Spine, to.Spine),
    head: lerpVector(from.head, to.head),
  };
}
