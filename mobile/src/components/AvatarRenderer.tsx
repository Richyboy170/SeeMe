import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, G, Rect, Defs, ClipPath } from 'react-native-svg';

export interface AvatarCustomizations {
  skinTone: string;
  eyeColor: string;
  eyeSize: number;
  hairColor: string;
  hairStyle: string;
  accessories: {
    glasses: string | null;
    hat: string | null;
    earrings: string | null;
  };
}

interface AvatarRendererProps {
  size: number;
  customizations: AvatarCustomizations;
  style?: 'cartoon' | 'anime' | 'minimalist';
}

export default function AvatarRenderer({
  size,
  customizations,
  style = 'cartoon'
}: AvatarRendererProps) {
  const {
    skinTone,
    eyeColor,
    eyeSize,
    hairColor,
    hairStyle,
    accessories,
  } = customizations;

  // Scale factor based on size (base size is 100)
  const scale = size / 100;

  // Render hair based on style
  const renderHair = () => {
    const baseY = 15;

    switch (hairStyle) {
      case 'short':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="35" ry="20" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 5} rx="30" ry="15" fill={hairColor} />
          </G>
        );
      case 'medium':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="38" ry="22" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 5} rx="32" ry="18" fill={hairColor} />
            <Ellipse cx="25" cy="45" rx="12" ry="20" fill={hairColor} />
            <Ellipse cx="75" cy="45" rx="12" ry="20" fill={hairColor} />
          </G>
        );
      case 'long':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="40" ry="25" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 5} rx="35" ry="20" fill={hairColor} />
            <Ellipse cx="20" cy="50" rx="15" ry="35" fill={hairColor} />
            <Ellipse cx="80" cy="50" rx="15" ry="35" fill={hairColor} />
          </G>
        );
      case 'curly':
        return (
          <G>
            {/* Curly hair with multiple circles */}
            <Circle cx="30" cy="20" r="12" fill={hairColor} />
            <Circle cx="50" cy="15" r="14" fill={hairColor} />
            <Circle cx="70" cy="20" r="12" fill={hairColor} />
            <Circle cx="22" cy="35" r="10" fill={hairColor} />
            <Circle cx="78" cy="35" r="10" fill={hairColor} />
            <Circle cx="38" cy="12" r="10" fill={hairColor} />
            <Circle cx="62" cy="12" r="10" fill={hairColor} />
          </G>
        );
      case 'wavy':
        return (
          <G>
            <Path
              d="M20 30 Q25 15 35 20 Q45 10 55 20 Q65 10 75 20 Q85 15 80 30 Q85 50 75 55 Q75 60 75 55 L25 55 Q25 60 25 55 Q15 50 20 30"
              fill={hairColor}
            />
          </G>
        );
      case 'ponytail':
        return (
          <G>
            <Ellipse cx="50" cy="20" rx="35" ry="18" fill={hairColor} />
            {/* Ponytail */}
            <Ellipse cx="50" cy="8" rx="10" ry="15" fill={hairColor} />
            <Circle cx="50" cy="-5" r="8" fill={hairColor} />
          </G>
        );
      case 'bun':
        return (
          <G>
            <Ellipse cx="50" cy="22" rx="35" ry="18" fill={hairColor} />
            {/* Bun on top */}
            <Circle cx="50" cy="5" r="12" fill={hairColor} />
          </G>
        );
      case 'bald':
      default:
        return null;
    }
  };

  // Render glasses
  const renderGlasses = () => {
    if (!accessories.glasses) return null;

    const glassesColor = '#333333';
    const lensColor = 'rgba(200, 200, 255, 0.3)';

    switch (accessories.glasses) {
      case 'round':
        return (
          <G>
            <Circle cx="35" cy="48" r="10" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Circle cx="65" cy="48" r="10" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Path d="M45 48 L55 48" stroke={glassesColor} strokeWidth="2" />
            <Path d="M25 48 L20 45" stroke={glassesColor} strokeWidth="2" />
            <Path d="M75 48 L80 45" stroke={glassesColor} strokeWidth="2" />
          </G>
        );
      case 'square':
        return (
          <G>
            <Rect x="25" y="40" width="18" height="14" rx="2" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Rect x="57" y="40" width="18" height="14" rx="2" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Path d="M43 47 L57 47" stroke={glassesColor} strokeWidth="2" />
            <Path d="M25 47 L18 44" stroke={glassesColor} strokeWidth="2" />
            <Path d="M75 47 L82 44" stroke={glassesColor} strokeWidth="2" />
          </G>
        );
      case 'cat-eye':
        return (
          <G>
            <Path d="M25 52 L25 44 Q35 38 45 44 L45 52 Q35 48 25 52" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Path d="M55 52 L55 44 Q65 38 75 44 L75 52 Q65 48 55 52" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Path d="M45 48 L55 48" stroke={glassesColor} strokeWidth="2" />
          </G>
        );
      case 'aviator':
        return (
          <G>
            <Path d="M25 42 Q25 38 35 40 Q45 42 45 48 Q45 54 35 54 Q25 54 25 48 Z" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Path d="M55 42 Q55 38 65 40 Q75 42 75 48 Q75 54 65 54 Q55 54 55 48 Z" fill={lensColor} stroke={glassesColor} strokeWidth="2" />
            <Path d="M45 46 L55 46" stroke={glassesColor} strokeWidth="2" />
            <Path d="M25 45 L18 42" stroke={glassesColor} strokeWidth="2" />
            <Path d="M75 45 L82 42" stroke={glassesColor} strokeWidth="2" />
          </G>
        );
      default:
        return null;
    }
  };

  // Render hat
  const renderHat = () => {
    if (!accessories.hat) return null;

    switch (accessories.hat) {
      case 'cap':
        return (
          <G>
            <Ellipse cx="50" cy="18" rx="38" ry="12" fill="#3B82F6" />
            <Rect x="12" y="12" width="76" height="8" rx="2" fill="#3B82F6" />
            <Rect x="50" y="10" width="35" height="6" rx="2" fill="#2563EB" />
          </G>
        );
      case 'beanie':
        return (
          <G>
            <Path d="M15 35 Q15 5 50 5 Q85 5 85 35 L15 35" fill="#EF4444" />
            <Rect x="15" y="30" width="70" height="8" rx="2" fill="#DC2626" />
            <Circle cx="50" cy="5" r="5" fill="#DC2626" />
          </G>
        );
      case 'fedora':
        return (
          <G>
            <Ellipse cx="50" cy="22" rx="45" ry="8" fill="#78716C" />
            <Path d="M20 22 Q20 5 50 5 Q80 5 80 22" fill="#78716C" />
            <Rect x="25" y="18" width="50" height="4" fill="#57534E" />
          </G>
        );
      case 'headband':
        return (
          <G>
            <Path d="M18 32 Q50 25 82 32" stroke="#EC4899" strokeWidth="6" fill="none" />
          </G>
        );
      default:
        return null;
    }
  };

  // Render earrings
  const renderEarrings = () => {
    if (!accessories.earrings) return null;

    const earringColor = '#FBBF24';

    switch (accessories.earrings) {
      case 'studs':
        return (
          <G>
            <Circle cx="18" cy="55" r="3" fill={earringColor} />
            <Circle cx="82" cy="55" r="3" fill={earringColor} />
          </G>
        );
      case 'hoops':
        return (
          <G>
            <Circle cx="18" cy="58" r="6" fill="none" stroke={earringColor} strokeWidth="2" />
            <Circle cx="82" cy="58" r="6" fill="none" stroke={earringColor} strokeWidth="2" />
          </G>
        );
      case 'dangles':
        return (
          <G>
            <Circle cx="18" cy="55" r="2" fill={earringColor} />
            <Path d="M18 57 L18 68" stroke={earringColor} strokeWidth="2" />
            <Circle cx="18" cy="70" r="4" fill={earringColor} />
            <Circle cx="82" cy="55" r="2" fill={earringColor} />
            <Path d="M82 57 L82 68" stroke={earringColor} strokeWidth="2" />
            <Circle cx="82" cy="70" r="4" fill={earringColor} />
          </G>
        );
      default:
        return null;
    }
  };

  // Eye size adjustment
  const eyeBaseSize = 6;
  const adjustedEyeSize = eyeBaseSize * eyeSize;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="avatarClip">
            <Circle cx="50" cy="50" r="48" />
          </ClipPath>
        </Defs>

        <G clipPath="url(#avatarClip)">
          {/* Background */}
          <Circle cx="50" cy="50" r="50" fill="#E5E7EB" />

          {/* Hair (back layer for some styles) */}
          {(hairStyle === 'long' || hairStyle === 'medium') && (
            <G>
              <Ellipse cx="50" cy="60" rx="42" ry="45" fill={hairColor} />
            </G>
          )}

          {/* Neck */}
          <Rect x="40" y="70" width="20" height="20" fill={skinTone} />

          {/* Ears */}
          <Ellipse cx="18" cy="50" rx="6" ry="8" fill={skinTone} />
          <Ellipse cx="82" cy="50" rx="6" ry="8" fill={skinTone} />

          {/* Face */}
          <Ellipse cx="50" cy="50" rx="32" ry="38" fill={skinTone} />

          {/* Eyes */}
          <G>
            {/* Left eye white */}
            <Ellipse cx="38" cy="48" rx={adjustedEyeSize + 2} ry={adjustedEyeSize} fill="white" />
            {/* Left eye iris */}
            <Circle cx="38" cy="48" r={adjustedEyeSize * 0.7} fill={eyeColor} />
            {/* Left eye pupil */}
            <Circle cx="38" cy="48" r={adjustedEyeSize * 0.3} fill="#000" />
            {/* Left eye highlight */}
            <Circle cx="36" cy="46" r={adjustedEyeSize * 0.2} fill="white" />

            {/* Right eye white */}
            <Ellipse cx="62" cy="48" rx={adjustedEyeSize + 2} ry={adjustedEyeSize} fill="white" />
            {/* Right eye iris */}
            <Circle cx="62" cy="48" r={adjustedEyeSize * 0.7} fill={eyeColor} />
            {/* Right eye pupil */}
            <Circle cx="62" cy="48" r={adjustedEyeSize * 0.3} fill="#000" />
            {/* Right eye highlight */}
            <Circle cx="60" cy="46" r={adjustedEyeSize * 0.2} fill="white" />
          </G>

          {/* Eyebrows */}
          <Path d="M30 40 Q38 37 46 40" stroke={hairColor} strokeWidth="2" fill="none" />
          <Path d="M54 40 Q62 37 70 40" stroke={hairColor} strokeWidth="2" fill="none" />

          {/* Nose */}
          <Path d="M50 52 L48 60 Q50 62 52 60 L50 52" fill={skinTone} stroke={`${skinTone}99`} strokeWidth="1" />

          {/* Mouth */}
          <Path d="M42 68 Q50 74 58 68" stroke="#C97B7B" strokeWidth="2" fill="none" />

          {/* Cheeks (blush) */}
          <Ellipse cx="30" cy="60" rx="6" ry="4" fill="#FFB6C180" />
          <Ellipse cx="70" cy="60" rx="6" ry="4" fill="#FFB6C180" />

          {/* Hair (front layer) */}
          {renderHair()}

          {/* Accessories */}
          {renderGlasses()}
          {renderHat()}
          {renderEarrings()}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 999,
  },
});
