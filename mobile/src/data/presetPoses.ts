/**
 * Preset Poses Library
 * Phase 3.1: Full-Body 3D Avatar System
 *
 * Pre-defined poses users can apply to their avatar without needing
 * to take a new photo. Each pose is a set of bone transforms.
 */

import { BoneTransform } from '../services/contentCheck';

export interface PresetPose {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'casual' | 'expressive' | 'action' | 'fun';
  rigTransforms: BoneTransform[];
}

/**
 * Helper to create identity quaternion (no rotation)
 */
const identity = (): [number, number, number, number] => [0, 0, 0, 1];

/**
 * Helper to create a position
 */
const pos = (x: number, y: number, z: number): [number, number, number] => [x, y, z];

/**
 * Helper to create scale (always 1,1,1)
 */
const scale = (): [number, number, number] => [1, 1, 1];

/**
 * Collection of preset poses
 * Each pose includes transforms for major bones
 */
export const PRESET_POSES: PresetPose[] = [
  {
    id: 'standing',
    name: 'Standing',
    description: 'Neutral standing pose',
    icon: '🧍',
    category: 'casual',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0, 0, 0.1, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0, 0, -0.1, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Friendly wave hello',
    icon: '👋',
    category: 'expressive',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: [0, 0, 0.05, 0.999], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [0, 0.1, 0, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0, 0, 0.15, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.5, 0.2, -0.6, 0.6], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.3, 0, 0.2, 0.93], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'thumbs_up',
    name: 'Thumbs Up',
    description: 'Approval gesture',
    icon: '👍',
    category: 'expressive',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [0, 0.1, 0, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0, 0, 0.15, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.4, 0.1, -0.5, 0.75], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.4, 0, 0, 0.92], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'peace',
    name: 'Peace',
    description: 'Calm zen pose',
    icon: '🙏',
    category: 'casual',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [-0.1, 0, 0, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0.3, 0.2, 0.4, 0.84], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.3, 0.3, 0, 0.9], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.3, -0.2, -0.4, 0.84], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.3, -0.3, 0, 0.9], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'victory',
    name: 'Victory',
    description: 'Peace sign celebration',
    icon: '✌️',
    category: 'fun',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [0.05, 0.1, 0, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0, 0, 0.15, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.6, 0.1, -0.4, 0.68], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.2, 0, 0.1, 0.97], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'flex',
    name: 'Flex',
    description: 'Show your strength',
    icon: '💪',
    category: 'action',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: [0.05, 0, 0, 0.999], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0.4, 0.3, 0.4, 0.75], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.6, 0, 0, 0.8], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.4, -0.3, -0.4, 0.75], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.6, 0, 0, 0.8], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: [0, 0, 0.1, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: [0, 0, -0.1, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'shrug',
    name: 'Shrug',
    description: 'I dunno!',
    icon: '🤷',
    category: 'fun',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: identity(), position: pos(0, 0.02, 0), scale: scale() },
      { bone_name: 'Head', rotation: [0.05, 0, 0.05, 0.997], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0.2, 0.3, 0.5, 0.78], position: pos(0, 0.05, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.4, 0.2, 0, 0.89], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.2, -0.3, -0.5, 0.78], position: pos(0, 0.05, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.4, -0.2, 0, 0.89], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'dance',
    name: 'Dance',
    description: 'Fun dance move',
    icon: '🕺',
    category: 'fun',
    rigTransforms: [
      { bone_name: 'Hips', rotation: [0, 0.15, 0, 0.99], position: pos(0, 0.95, 0), scale: scale() },
      { bone_name: 'Spine', rotation: [0, -0.1, 0.05, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [0, 0.1, -0.05, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0.3, 0.4, 0.5, 0.69], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.3, 0.2, 0, 0.93], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.5, -0.2, -0.5, 0.68], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.4, -0.1, 0, 0.91], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: [0.2, 0, 0.1, 0.97], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: [-0.3, 0, 0, 0.95], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: [-0.1, 0, -0.2, 0.97], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: [0.1, 0, 0, 0.995], position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'sit',
    name: 'Sitting',
    description: 'Relaxed seated pose',
    icon: '🧘',
    category: 'casual',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 0.5, 0), scale: scale() },
      { bone_name: 'Spine', rotation: [-0.05, 0, 0, 0.999], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0.2, 0.1, 0.3, 0.93], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.3, 0, 0, 0.95], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.2, -0.1, -0.3, 0.93], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.3, 0, 0, 0.95], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: [0.7, 0, 0.1, 0.71], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: [-0.7, 0, 0, 0.71], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: [0.7, 0, -0.1, 0.71], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: [-0.7, 0, 0, 0.71], position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'run',
    name: 'Running',
    description: 'Action running pose',
    icon: '🏃',
    category: 'action',
    rigTransforms: [
      { bone_name: 'Hips', rotation: [0.1, 0, 0, 0.995], position: pos(0, 0.95, 0.1), scale: scale() },
      { bone_name: 'Spine', rotation: [-0.15, 0, 0, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [0.1, 0, 0, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [-0.3, 0.2, 0.4, 0.84], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.5, 0, 0, 0.87], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.4, -0.2, -0.3, 0.84], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.3, 0, 0, 0.95], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: [-0.4, 0, 0.1, 0.91], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: [0.3, 0, 0, 0.95], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: [0.5, 0, -0.1, 0.86], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: [-0.5, 0, 0, 0.87], position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'cool',
    name: 'Cool',
    description: 'Relaxed cool vibe',
    icon: '🤙',
    category: 'casual',
    rigTransforms: [
      { bone_name: 'Hips', rotation: [0, 0.05, 0, 0.999], position: pos(0, 0.98, 0), scale: scale() },
      { bone_name: 'Spine', rotation: [0.02, -0.05, 0.03, 0.998], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [0, 0.1, 0.05, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0, 0, 0.2, 0.98], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.1, 0, 0, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.3, -0.1, -0.4, 0.86], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.3, 0, 0.1, 0.95], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: [0, 0, 0.05, 0.999], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: [0, 0, -0.15, 0.99], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
  {
    id: 'heart',
    name: 'Heart',
    description: 'Heart hands gesture',
    icon: '🫶',
    category: 'expressive',
    rigTransforms: [
      { bone_name: 'Hips', rotation: identity(), position: pos(0, 1, 0), scale: scale() },
      { bone_name: 'Spine', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'Head', rotation: [-0.1, 0, 0, 0.995], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftArm', rotation: [0.5, 0.2, 0.4, 0.73], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftForeArm', rotation: [0.4, 0.3, 0.2, 0.84], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightArm', rotation: [0.5, -0.2, -0.4, 0.73], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightForeArm', rotation: [0.4, -0.3, -0.2, 0.84], position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'LeftLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightUpLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
      { bone_name: 'RightLeg', rotation: identity(), position: pos(0, 0, 0), scale: scale() },
    ],
  },
];

/**
 * Get all poses
 */
export const getAllPoses = (): PresetPose[] => PRESET_POSES;

/**
 * Get poses by category
 */
export const getPosesByCategory = (
  category: PresetPose['category']
): PresetPose[] => PRESET_POSES.filter((p) => p.category === category);

/**
 * Get pose by ID
 */
export const getPoseById = (id: string): PresetPose | undefined =>
  PRESET_POSES.find((p) => p.id === id);

/**
 * Get all categories
 */
export const getCategories = () => [
  { id: 'all', label: 'All' },
  { id: 'casual', label: 'Casual' },
  { id: 'expressive', label: 'Expressive' },
  { id: 'action', label: 'Action' },
  { id: 'fun', label: 'Fun' },
];
