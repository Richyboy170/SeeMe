/**
 * VRM Preset Poses (KalidoKit Format)
 * Phase 3.1.2: 3D Rendering
 *
 * Pre-defined poses in KalidoKit-compatible format for VRM avatars.
 * These use Euler angles (radians) that map directly to VRM bone rotations.
 *
 * KalidoKit bone naming convention:
 * - RightUpperArm, LeftUpperArm
 * - RightLowerArm, LeftLowerArm
 * - RightHand, LeftHand
 * - Spine, Hips
 */

import { SolvedPose, Vector3 } from '../services/poseService';

// ============================================================
// TYPES
// ============================================================

export interface VRMPresetPose {
  id: string;
  name: string;
  icon: string;
  category: 'casual' | 'expressive' | 'action' | 'fun';
  pose: Partial<SolvedPose>;
}

// ============================================================
// HELPER - Create Vector3
// ============================================================

const v3 = (x: number, y: number, z: number): Vector3 => ({ x, y, z });

// ============================================================
// VRM PRESET POSES
// ============================================================

export const VRM_PRESET_POSES: VRMPresetPose[] = [
  {
    id: 'standing',
    name: 'Standing',
    icon: '🧍',
    category: 'casual',
    pose: {
      RightUpperArm: v3(0, 0, -0.3),
      LeftUpperArm: v3(0, 0, 0.3),
      RightLowerArm: v3(0, 0, 0),
      LeftLowerArm: v3(0, 0, 0),
      RightHand: v3(0, 0, 0),
      LeftHand: v3(0, 0, 0),
      Spine: v3(0, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
    },
  },
  {
    id: 'wave',
    name: 'Wave',
    icon: '👋',
    category: 'expressive',
    pose: {
      RightUpperArm: v3(0, 0, -2.0),
      LeftUpperArm: v3(0, 0, 0.3),
      RightLowerArm: v3(0, 0, -1.2),
      LeftLowerArm: v3(0, 0, 0),
      RightHand: v3(0, 0, 0),
      LeftHand: v3(0, 0, 0),
      Spine: v3(0, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
    },
  },
  {
    id: 'peace',
    name: 'Peace',
    icon: '✌️',
    category: 'expressive',
    pose: {
      RightUpperArm: v3(0, 0, -1.5),
      LeftUpperArm: v3(0, 0, 0.3),
      RightLowerArm: v3(0, 0, -0.8),
      LeftLowerArm: v3(0, 0, 0),
      Spine: v3(0.1, 0, 0),
      Hips: {
        rotation: v3(0, 0.1, 0),
        position: v3(0, 1, 0),
      },
    },
  },
  {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    icon: '👍',
    category: 'expressive',
    pose: {
      RightUpperArm: v3(0, 0.5, -1.0),
      LeftUpperArm: v3(0, 0, 0.3),
      RightLowerArm: v3(0, 0, -0.5),
      LeftLowerArm: v3(0, 0, 0),
      Spine: v3(0, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
    },
  },
  {
    id: 'flex',
    name: 'Flex',
    icon: '💪',
    category: 'action',
    pose: {
      RightUpperArm: v3(0, 0, -1.8),
      LeftUpperArm: v3(0, 0, 1.8),
      RightLowerArm: v3(0, 0, -2.0),
      LeftLowerArm: v3(0, 0, 2.0),
      Spine: v3(-0.1, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
    },
  },
  {
    id: 'shrug',
    name: 'Shrug',
    icon: '🤷',
    category: 'expressive',
    pose: {
      RightUpperArm: v3(0, 0, -0.8),
      LeftUpperArm: v3(0, 0, 0.8),
      RightLowerArm: v3(0, 0, -1.0),
      LeftLowerArm: v3(0, 0, 1.0),
      Spine: v3(0, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
    },
  },
  {
    id: 'heart',
    name: 'Heart',
    icon: '🫶',
    category: 'expressive',
    pose: {
      RightUpperArm: v3(0.5, 0, -1.2),
      LeftUpperArm: v3(0.5, 0, 1.2),
      RightLowerArm: v3(0.8, 0, -0.5),
      LeftLowerArm: v3(0.8, 0, 0.5),
      Spine: v3(0, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
    },
  },
  {
    id: 'dance',
    name: 'Dance',
    icon: '🕺',
    category: 'fun',
    pose: {
      RightUpperArm: v3(0.3, 0.2, -1.5),
      LeftUpperArm: v3(-0.2, 0.3, 1.2),
      RightLowerArm: v3(0.5, 0, -0.8),
      LeftLowerArm: v3(0.3, 0, 0.5),
      RightUpperLeg: v3(0.3, 0, -0.2),
      LeftUpperLeg: v3(-0.2, 0, 0.1),
      Spine: v3(0, 0.1, 0.05),
      Hips: {
        rotation: v3(0, 0.15, 0),
        position: v3(0, 0.95, 0),
      },
    },
  },
  {
    id: 'cool',
    name: 'Cool',
    icon: '😎',
    category: 'casual',
    pose: {
      RightUpperArm: v3(0.1, 0, -0.5),
      LeftUpperArm: v3(0, 0.2, 0.2),
      RightLowerArm: v3(0.3, 0, -0.3),
      LeftLowerArm: v3(0.1, 0, 0),
      Spine: v3(0.02, -0.05, 0.03),
      Hips: {
        rotation: v3(0, 0.05, 0),
        position: v3(0, 0.98, 0),
      },
      head: v3(0, 0.1, 0.05),
    },
  },
  {
    id: 'thinking',
    name: 'Thinking',
    icon: '🤔',
    category: 'expressive',
    pose: {
      RightUpperArm: v3(0.3, 0.4, -0.8),
      LeftUpperArm: v3(0, 0, 0.2),
      RightLowerArm: v3(1.2, 0.2, -0.3),
      LeftLowerArm: v3(0, 0, 0),
      Spine: v3(0.05, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
      head: v3(0.1, 0.1, 0),
    },
  },
  {
    id: 'prayer',
    name: 'Prayer',
    icon: '🙏',
    category: 'casual',
    pose: {
      RightUpperArm: v3(0.4, 0.3, -0.6),
      LeftUpperArm: v3(0.4, -0.3, 0.6),
      RightLowerArm: v3(0.8, 0.5, 0),
      LeftLowerArm: v3(0.8, -0.5, 0),
      Spine: v3(-0.05, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1, 0),
      },
      head: v3(-0.1, 0, 0),
    },
  },
  {
    id: 'victory',
    name: 'Victory',
    icon: '🎉',
    category: 'fun',
    pose: {
      RightUpperArm: v3(0, 0, -2.5),
      LeftUpperArm: v3(0, 0, 2.5),
      RightLowerArm: v3(0, 0, 0),
      LeftLowerArm: v3(0, 0, 0),
      Spine: v3(-0.1, 0, 0),
      Hips: {
        rotation: v3(0, 0, 0),
        position: v3(0, 1.02, 0),
      },
      head: v3(-0.1, 0, 0),
    },
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all VRM preset poses
 */
export const getAllVRMPoses = (): VRMPresetPose[] => VRM_PRESET_POSES;

/**
 * Get VRM poses by category
 */
export const getVRMPosesByCategory = (
  category: VRMPresetPose['category']
): VRMPresetPose[] => VRM_PRESET_POSES.filter((p) => p.category === category);

/**
 * Get VRM pose by ID
 */
export const getVRMPoseById = (id: string): VRMPresetPose | undefined =>
  VRM_PRESET_POSES.find((p) => p.id === id);

/**
 * Get all pose categories
 */
export const getVRMPoseCategories = () => [
  { id: 'all', label: 'All' },
  { id: 'casual', label: 'Casual' },
  { id: 'expressive', label: 'Expressive' },
  { id: 'action', label: 'Action' },
  { id: 'fun', label: 'Fun' },
];
