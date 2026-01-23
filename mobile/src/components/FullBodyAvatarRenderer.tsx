/**
 * Full Body Avatar Renderer (3D)
 * Phase 3.1: Full-Body 3D Avatar System
 *
 * Renders a 3D humanoid avatar with applied pose transforms.
 * Uses Three.js via @react-three/fiber for React Native.
 *
 * Note: For MVP, this component provides a 2D stylized visualization
 * since full 3D GLTF loading requires additional setup.
 * The 3D integration is structured to be easily upgraded.
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  Dimensions,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  G,
  Rect,
  Ellipse,
  Path,
  Text as SvgText,
} from 'react-native-svg';
import { BoneTransform } from '../services/contentCheck';

const { width } = Dimensions.get('window');

// Skin tone colors
const SKIN_TONES = [
  '#FFE0BD', // Light
  '#F5D0B0', // Fair
  '#D4A574', // Medium
  '#A67B5B', // Tan
  '#6B4423', // Dark
];

// Hair colors
const HAIR_COLORS = [
  '#1C1C1C', // Black
  '#4A3728', // Dark Brown
  '#8B4513', // Brown
  '#DAA520', // Golden
  '#FFD700', // Blonde
  '#FF6B35', // Red
  '#9B59B6', // Purple
  '#3498DB', // Blue
];

// Style configurations
const STYLES = {
  cartoon: {
    strokeWidth: 3,
    headSize: 35,
    bodyWidth: 50,
    limbWidth: 12,
  },
  anime: {
    strokeWidth: 2,
    headSize: 40,
    bodyWidth: 45,
    limbWidth: 10,
  },
  minimalist: {
    strokeWidth: 4,
    headSize: 30,
    bodyWidth: 40,
    limbWidth: 8,
  },
};

interface FullBodyAvatarRendererProps {
  rigTransforms: BoneTransform[];
  style?: 'cartoon' | 'anime' | 'minimalist';
  skinTone?: number;
  hairColor?: number;
  size?: number;
  autoRotate?: boolean;
  showSkeleton?: boolean;
  onLoaded?: () => void;
}

/**
 * Extract bone rotation angles from quaternion
 */
const quaternionToAngles = (
  q: [number, number, number, number]
): { x: number; y: number; z: number } => {
  const [x, y, z, w] = q;

  // Convert quaternion to euler angles (simplified)
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return {
    x: (roll * 180) / Math.PI,
    y: (pitch * 180) / Math.PI,
    z: (yaw * 180) / Math.PI,
  };
};

/**
 * Get bone transform by name
 */
const getBoneTransform = (
  bones: BoneTransform[],
  name: string
): BoneTransform | undefined => {
  return bones.find((b) => b.bone_name === name);
};

export const FullBodyAvatarRenderer: React.FC<FullBodyAvatarRendererProps> = ({
  rigTransforms,
  style = 'cartoon',
  skinTone = 2,
  hairColor = 1,
  size = width - 40,
  autoRotate = false,
  showSkeleton = false,
  onLoaded,
}) => {
  const styleConfig = STYLES[style];
  const skinColor = SKIN_TONES[Math.min(skinTone, SKIN_TONES.length - 1)];
  const hairColorValue = HAIR_COLORS[Math.min(hairColor, HAIR_COLORS.length - 1)];

  // Calculate pose angles from transforms
  const poseAngles = useMemo(() => {
    const angles: Record<string, { x: number; y: number; z: number }> = {};

    for (const bone of rigTransforms) {
      angles[bone.bone_name] = quaternionToAngles(bone.rotation);
    }

    return angles;
  }, [rigTransforms]);

  // Get hip position for centering
  const hipsBone = getBoneTransform(rigTransforms, 'Hips');
  const hipsY = hipsBone ? hipsBone.position[1] * 100 : 50;

  // Center point
  const centerX = size / 2;
  const centerY = size / 2;

  // Scale factor based on size
  const scale = size / 300;

  // Calculate limb positions based on pose
  const calculateLimbEndpoint = (
    startX: number,
    startY: number,
    length: number,
    boneName: string
  ) => {
    const angle = poseAngles[boneName]?.z || 0;
    const angleRad = (angle * Math.PI) / 180;

    return {
      x: startX + Math.sin(angleRad) * length,
      y: startY + Math.cos(angleRad) * length,
    };
  };

  // Trigger onLoaded after render
  React.useEffect(() => {
    if (onLoaded) {
      setTimeout(onLoaded, 100);
    }
  }, [onLoaded]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background (optional) */}
        <Rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill="#1A1A2E"
          rx={12}
        />

        <G transform={`translate(${centerX}, ${centerY * 0.3})`}>
          {/* Hair (behind head) */}
          <Ellipse
            cx={0}
            cy={-5 * scale}
            rx={styleConfig.headSize * scale * 1.1}
            ry={styleConfig.headSize * scale * 1.15}
            fill={hairColorValue}
          />

          {/* Head */}
          <Circle
            cx={0}
            cy={0}
            r={styleConfig.headSize * scale}
            fill={skinColor}
            stroke="#333"
            strokeWidth={styleConfig.strokeWidth}
          />

          {/* Eyes */}
          {style === 'anime' ? (
            <>
              {/* Anime style eyes */}
              <Ellipse
                cx={-12 * scale}
                cy={-5 * scale}
                rx={8 * scale}
                ry={10 * scale}
                fill="#FFF"
              />
              <Ellipse
                cx={12 * scale}
                cy={-5 * scale}
                rx={8 * scale}
                ry={10 * scale}
                fill="#FFF"
              />
              <Circle cx={-12 * scale} cy={-3 * scale} r={5 * scale} fill="#333" />
              <Circle cx={12 * scale} cy={-3 * scale} r={5 * scale} fill="#333" />
              <Circle cx={-10 * scale} cy={-5 * scale} r={2 * scale} fill="#FFF" />
              <Circle cx={14 * scale} cy={-5 * scale} r={2 * scale} fill="#FFF" />
            </>
          ) : (
            <>
              {/* Simple eyes */}
              <Circle cx={-10 * scale} cy={-5 * scale} r={4 * scale} fill="#333" />
              <Circle cx={10 * scale} cy={-5 * scale} r={4 * scale} fill="#333" />
            </>
          )}

          {/* Mouth */}
          <Path
            d={`M ${-8 * scale} ${15 * scale} Q 0 ${20 * scale} ${8 * scale} ${15 * scale}`}
            stroke="#333"
            strokeWidth={2}
            fill="none"
          />

          {/* Neck */}
          <Rect
            x={-8 * scale}
            y={styleConfig.headSize * scale - 5}
            width={16 * scale}
            height={20 * scale}
            fill={skinColor}
          />

          {/* Body/Torso */}
          <G transform={`translate(0, ${(styleConfig.headSize + 15) * scale})`}>
            {/* Torso */}
            <Path
              d={`
                M ${-styleConfig.bodyWidth / 2 * scale} 0
                L ${-styleConfig.bodyWidth / 2 * scale - 10 * scale} ${80 * scale}
                L ${styleConfig.bodyWidth / 2 * scale + 10 * scale} ${80 * scale}
                L ${styleConfig.bodyWidth / 2 * scale} 0
                Z
              `}
              fill={style === 'minimalist' ? '#6366F1' : '#4A90D9'}
              stroke="#333"
              strokeWidth={styleConfig.strokeWidth}
            />

            {/* Left Arm */}
            <G transform={`rotate(${poseAngles['LeftArm']?.z || 15})`}>
              <Rect
                x={-styleConfig.limbWidth / 2 * scale}
                y={0}
                width={styleConfig.limbWidth * scale}
                height={60 * scale}
                fill={skinColor}
                stroke="#333"
                strokeWidth={styleConfig.strokeWidth}
                rx={styleConfig.limbWidth / 2 * scale}
                transform={`translate(${-styleConfig.bodyWidth / 2 * scale - 5}, 0)`}
              />
              {/* Forearm */}
              <G transform={`translate(${-styleConfig.bodyWidth / 2 * scale - 5}, ${55 * scale}) rotate(${poseAngles['LeftForeArm']?.z || 0})`}>
                <Rect
                  x={-styleConfig.limbWidth / 2 * scale}
                  y={0}
                  width={styleConfig.limbWidth * scale}
                  height={50 * scale}
                  fill={skinColor}
                  stroke="#333"
                  strokeWidth={styleConfig.strokeWidth}
                  rx={styleConfig.limbWidth / 2 * scale}
                />
                {/* Hand */}
                <Circle
                  cx={0}
                  cy={55 * scale}
                  r={10 * scale}
                  fill={skinColor}
                  stroke="#333"
                  strokeWidth={styleConfig.strokeWidth}
                />
              </G>
            </G>

            {/* Right Arm */}
            <G transform={`rotate(${poseAngles['RightArm']?.z || -15})`}>
              <Rect
                x={-styleConfig.limbWidth / 2 * scale}
                y={0}
                width={styleConfig.limbWidth * scale}
                height={60 * scale}
                fill={skinColor}
                stroke="#333"
                strokeWidth={styleConfig.strokeWidth}
                rx={styleConfig.limbWidth / 2 * scale}
                transform={`translate(${styleConfig.bodyWidth / 2 * scale + 5}, 0)`}
              />
              {/* Forearm */}
              <G transform={`translate(${styleConfig.bodyWidth / 2 * scale + 5}, ${55 * scale}) rotate(${poseAngles['RightForeArm']?.z || 0})`}>
                <Rect
                  x={-styleConfig.limbWidth / 2 * scale}
                  y={0}
                  width={styleConfig.limbWidth * scale}
                  height={50 * scale}
                  fill={skinColor}
                  stroke="#333"
                  strokeWidth={styleConfig.strokeWidth}
                  rx={styleConfig.limbWidth / 2 * scale}
                />
                {/* Hand */}
                <Circle
                  cx={0}
                  cy={55 * scale}
                  r={10 * scale}
                  fill={skinColor}
                  stroke="#333"
                  strokeWidth={styleConfig.strokeWidth}
                />
              </G>
            </G>

            {/* Legs */}
            <G transform={`translate(0, ${80 * scale})`}>
              {/* Left Leg */}
              <G transform={`rotate(${poseAngles['LeftUpLeg']?.z || 5})`}>
                <Rect
                  x={-styleConfig.limbWidth / 2 * scale - 15 * scale}
                  y={0}
                  width={styleConfig.limbWidth * scale * 1.2}
                  height={65 * scale}
                  fill={style === 'minimalist' ? '#4A5568' : '#2C5282'}
                  stroke="#333"
                  strokeWidth={styleConfig.strokeWidth}
                  rx={styleConfig.limbWidth / 2 * scale}
                />
                {/* Lower leg */}
                <G transform={`translate(${-15 * scale}, ${60 * scale}) rotate(${poseAngles['LeftLeg']?.z || 0})`}>
                  <Rect
                    x={-styleConfig.limbWidth / 2 * scale}
                    y={0}
                    width={styleConfig.limbWidth * scale * 1.1}
                    height={60 * scale}
                    fill={style === 'minimalist' ? '#4A5568' : '#2C5282'}
                    stroke="#333"
                    strokeWidth={styleConfig.strokeWidth}
                    rx={styleConfig.limbWidth / 2 * scale}
                  />
                  {/* Foot */}
                  <Ellipse
                    cx={5 * scale}
                    cy={65 * scale}
                    rx={15 * scale}
                    ry={8 * scale}
                    fill="#333"
                  />
                </G>
              </G>

              {/* Right Leg */}
              <G transform={`rotate(${poseAngles['RightUpLeg']?.z || -5})`}>
                <Rect
                  x={-styleConfig.limbWidth / 2 * scale + 15 * scale}
                  y={0}
                  width={styleConfig.limbWidth * scale * 1.2}
                  height={65 * scale}
                  fill={style === 'minimalist' ? '#4A5568' : '#2C5282'}
                  stroke="#333"
                  strokeWidth={styleConfig.strokeWidth}
                  rx={styleConfig.limbWidth / 2 * scale}
                />
                {/* Lower leg */}
                <G transform={`translate(${15 * scale}, ${60 * scale}) rotate(${poseAngles['RightLeg']?.z || 0})`}>
                  <Rect
                    x={-styleConfig.limbWidth / 2 * scale}
                    y={0}
                    width={styleConfig.limbWidth * scale * 1.1}
                    height={60 * scale}
                    fill={style === 'minimalist' ? '#4A5568' : '#2C5282'}
                    stroke="#333"
                    strokeWidth={styleConfig.strokeWidth}
                    rx={styleConfig.limbWidth / 2 * scale}
                  />
                  {/* Foot */}
                  <Ellipse
                    cx={-5 * scale}
                    cy={65 * scale}
                    rx={15 * scale}
                    ry={8 * scale}
                    fill="#333"
                  />
                </G>
              </G>
            </G>
          </G>
        </G>

        {/* Style indicator */}
        <SvgText
          x={size - 10}
          y={size - 10}
          fill="#666"
          fontSize={10}
          textAnchor="end"
        >
          {style}
        </SvgText>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default FullBodyAvatarRenderer;
