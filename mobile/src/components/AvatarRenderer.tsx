import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, G, Rect, Defs, ClipPath, Line } from 'react-native-svg';

let _avatarClipCounter = 0;

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
  gender?: 'male' | 'female' | null;
  faceShape?: 'oval' | 'round' | 'square' | 'heart' | null;
  facialHair?: string | null;
  eyebrowStyle?: string | null;
  mouthStyle?: string | null;
  noseStyle?: string | null;
}

interface AvatarRendererProps {
  size: number;
  customizations: AvatarCustomizations;
  style?: 'cartoon' | 'anime' | 'minimalist';
}

function AvatarRenderer({
  size,
  customizations,
  style = 'cartoon'
}: AvatarRendererProps) {
  const clipId = useRef(`ac${++_avatarClipCounter}`).current;
  const {
    skinTone,
    eyeColor,
    eyeSize,
    hairColor,
    hairStyle,
    accessories,
    gender,
    faceShape,
    facialHair,
    eyebrowStyle,
    mouthStyle,
    noseStyle,
  } = customizations;

  // Render face shape based on gender and faceShape selection
  const renderFace = () => {
    const skinDarker = `${skinTone}CC`;

    // Gender-specific face shapes
    if (gender === 'male') {
      switch (faceShape) {
        case 'square':
          return (
            <Path
              d="M20 30 Q20 18 35 15 Q50 12 65 15 Q80 18 80 30 L82 60 Q82 78 65 80 Q50 82 35 80 Q18 78 18 60 Z"
              fill={skinTone}
            />
          );
        case 'heart':
          return (
            <Path
              d="M22 35 Q22 15 50 14 Q78 15 78 35 L76 58 Q72 78 50 82 Q28 78 24 58 Z"
              fill={skinTone}
            />
          );
        case 'round':
          return <Ellipse cx="50" cy="50" rx="34" ry="36" fill={skinTone} />;
        case 'oval':
        default:
          // Male default: slightly angular jaw
          return (
            <Path
              d="M22 32 Q22 15 50 14 Q78 15 78 32 L80 55 Q80 75 65 80 Q50 84 35 80 Q20 75 20 55 Z"
              fill={skinTone}
            />
          );
      }
    }

    if (gender === 'female') {
      switch (faceShape) {
        case 'heart':
          return (
            <Path
              d="M24 35 Q24 16 50 15 Q76 16 76 35 L74 55 Q70 76 50 82 Q30 76 26 55 Z"
              fill={skinTone}
            />
          );
        case 'round':
          return <Ellipse cx="50" cy="50" rx="33" ry="35" fill={skinTone} />;
        case 'square':
          return (
            <Path
              d="M22 32 Q22 18 36 16 Q50 14 64 16 Q78 18 78 32 L79 58 Q78 76 64 79 Q50 81 36 79 Q22 76 21 58 Z"
              fill={skinTone}
            />
          );
        case 'oval':
        default:
          // Female default: softer, rounded chin
          return (
            <Path
              d="M24 33 Q24 16 50 15 Q76 16 76 33 L76 55 Q74 76 50 82 Q26 76 24 55 Z"
              fill={skinTone}
            />
          );
      }
    }

    // Legacy/unisex - original ellipse for backward compatibility
    if (faceShape === 'round') return <Ellipse cx="50" cy="50" rx="34" ry="36" fill={skinTone} />;
    if (faceShape === 'square') {
      return (
        <Path
          d="M20 30 Q20 18 35 15 Q50 12 65 15 Q80 18 80 30 L82 60 Q82 78 65 80 Q50 82 35 80 Q18 78 18 60 Z"
          fill={skinTone}
        />
      );
    }
    if (faceShape === 'heart') {
      return (
        <Path
          d="M23 35 Q23 15 50 14 Q77 15 77 35 L75 57 Q71 77 50 82 Q29 77 25 57 Z"
          fill={skinTone}
        />
      );
    }
    // Default: original ellipse
    return <Ellipse cx="50" cy="50" rx="32" ry="38" fill={skinTone} />;
  };

  // Render eyebrows with style variants
  const renderEyebrows = () => {
    const strokeW = gender === 'male' ? 2.5 : gender === 'female' ? 1.5 : 2;

    switch (eyebrowStyle) {
      case 'thin':
        return (
          <G>
            <Path d="M30 40 Q38 38 46 40" stroke={hairColor} strokeWidth="1.2" fill="none" />
            <Path d="M54 40 Q62 38 70 40" stroke={hairColor} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 'thick':
        return (
          <G>
            <Path d="M29 40 Q38 35 47 40" stroke={hairColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <Path d="M53 40 Q62 35 71 40" stroke={hairColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </G>
        );
      case 'arched':
        return (
          <G>
            <Path d="M30 42 Q34 35 46 39" stroke={hairColor} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
            <Path d="M54 39 Q66 35 70 42" stroke={hairColor} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
          </G>
        );
      case 'flat':
        return (
          <G>
            <Line x1="30" y1="40" x2="46" y2="40" stroke={hairColor} strokeWidth={strokeW} strokeLinecap="round" />
            <Line x1="54" y1="40" x2="70" y2="40" stroke={hairColor} strokeWidth={strokeW} strokeLinecap="round" />
          </G>
        );
      case 'bushy':
        return (
          <G>
            <Path d="M28 42 Q32 34 38 36 Q42 34 47 39" stroke={hairColor} strokeWidth="3" fill={hairColor} opacity="0.7" />
            <Path d="M53 39 Q58 34 62 36 Q68 34 72 42" stroke={hairColor} strokeWidth="3" fill={hairColor} opacity="0.7" />
          </G>
        );
      default:
        // Original default eyebrows
        return (
          <G>
            <Path d="M30 40 Q38 37 46 40" stroke={hairColor} strokeWidth={strokeW} fill="none" />
            <Path d="M54 40 Q62 37 70 40" stroke={hairColor} strokeWidth={strokeW} fill="none" />
          </G>
        );
    }
  };

  // Render mouth with style variants
  const renderMouth = () => {
    const lipColor = gender === 'female' ? '#D4736A' : '#C97B7B';

    switch (mouthStyle) {
      case 'neutral':
        return <Line x1="42" y1="68" x2="58" y2="68" stroke={lipColor} strokeWidth="2" strokeLinecap="round" />;
      case 'smirk':
        return <Path d="M42 68 Q48 68 54 66 Q58 65 60 66" stroke={lipColor} strokeWidth="2" fill="none" strokeLinecap="round" />;
      case 'open':
        return (
          <G>
            <Path d="M42 66 Q50 74 58 66" stroke={lipColor} strokeWidth="2" fill="#8B2020" />
            <Path d="M44 66 Q50 64 56 66" stroke="white" strokeWidth="1" fill="white" />
          </G>
        );
      case 'smile':
      default:
        return <Path d="M42 68 Q50 74 58 68" stroke={lipColor} strokeWidth="2" fill="none" />;
    }
  };

  // Render nose with style variants
  const renderNose = () => {
    const noseShadow = `${skinTone}99`;

    switch (noseStyle) {
      case 'small':
        return <Path d="M49 55 Q50 58 51 55" fill={skinTone} stroke={noseShadow} strokeWidth="1" />;
      case 'pointed':
        return <Path d="M50 50 L47 61 Q50 63 53 61 Z" fill={skinTone} stroke={noseShadow} strokeWidth="1" />;
      case 'button':
        return (
          <G>
            <Circle cx="50" cy="58" r="3.5" fill={skinTone} stroke={noseShadow} strokeWidth="1" />
          </G>
        );
      case 'medium':
      default:
        // Original nose
        return <Path d="M50 52 L48 60 Q50 62 52 60 L50 52" fill={skinTone} stroke={noseShadow} strokeWidth="1" />;
    }
  };

  // Render facial hair (male only)
  const renderFacialHair = () => {
    if (gender !== 'male' || !facialHair) return null;

    switch (facialHair) {
      case 'stubble':
        return (
          <G opacity="0.3">
            {/* Dotted stubble pattern around jaw */}
            {[
              [35, 72], [38, 74], [41, 75], [44, 76], [47, 76], [50, 76],
              [53, 76], [56, 76], [59, 75], [62, 74], [65, 72],
              [36, 69], [40, 71], [44, 73], [50, 73], [56, 73], [60, 71], [64, 69],
              [42, 69], [46, 70], [50, 70], [54, 70], [58, 69],
            ].map(([cx, cy], i) => (
              <Circle key={i} cx={cx} cy={cy} r="0.8" fill={hairColor} />
            ))}
          </G>
        );
      case 'mustache':
        return (
          <Path
            d="M40 65 Q42 62 46 64 Q50 66 54 64 Q58 62 60 65 Q58 67 54 66 Q50 68 46 66 Q42 67 40 65"
            fill={hairColor}
            opacity="0.85"
          />
        );
      case 'full-beard':
        return (
          <G opacity="0.85">
            {/* Mustache */}
            <Path
              d="M40 65 Q42 62 46 64 Q50 66 54 64 Q58 62 60 65 Q58 67 54 66 Q50 68 46 66 Q42 67 40 65"
              fill={hairColor}
            />
            {/* Beard */}
            <Path
              d="M30 65 Q28 70 30 78 Q35 86 50 88 Q65 86 70 78 Q72 70 70 65 Q68 72 62 75 Q50 80 38 75 Q32 72 30 65"
              fill={hairColor}
            />
          </G>
        );
      case 'goatee':
        return (
          <G opacity="0.85">
            <Path
              d="M44 68 Q44 72 46 76 Q50 80 54 76 Q56 72 56 68 Q54 70 50 71 Q46 70 44 68"
              fill={hairColor}
            />
          </G>
        );
      default:
        return null;
    }
  };

  // Render eyelashes (female only)
  const renderEyelashes = () => {
    if (gender !== 'female') return null;

    return (
      <G>
        {/* Left eye lashes */}
        <Line x1="30" y1="45" x2="28" y2="42" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <Line x1="33" y1="43" x2="32" y2="40" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <Line x1="36" y1="42" x2="36" y2="39" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        {/* Right eye lashes */}
        <Line x1="70" y1="45" x2="72" y2="42" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <Line x1="67" y1="43" x2="68" y2="40" stroke="#222" strokeWidth="1" strokeLinecap="round" />
        <Line x1="64" y1="42" x2="64" y2="39" stroke="#222" strokeWidth="1" strokeLinecap="round" />
      </G>
    );
  };

  // Render hair based on style
  const renderHairBack = () => {
    switch (hairStyle) {
      case 'long':
        return <Ellipse cx="50" cy="60" rx="42" ry="45" fill={hairColor} />;
      case 'medium':
        return <Ellipse cx="50" cy="60" rx="42" ry="45" fill={hairColor} />;
      case 'braids':
        return (
          <G>
            <Ellipse cx="50" cy="55" rx="40" ry="42" fill={hairColor} />
            {/* Braid left */}
            <Path d="M20 55 Q18 65 20 75 Q18 85 22 95" stroke={hairColor} strokeWidth="8" fill="none" />
            {/* Braid right */}
            <Path d="M80 55 Q82 65 80 75 Q82 85 78 95" stroke={hairColor} strokeWidth="8" fill="none" />
          </G>
        );
      case 'twin-tails':
        return (
          <G>
            <Ellipse cx="50" cy="50" rx="38" ry="35" fill={hairColor} />
            {/* Left tail */}
            <Ellipse cx="15" cy="60" rx="10" ry="30" fill={hairColor} />
            {/* Right tail */}
            <Ellipse cx="85" cy="60" rx="10" ry="30" fill={hairColor} />
          </G>
        );
      case 'side-swept':
        return <Ellipse cx="50" cy="55" rx="40" ry="40" fill={hairColor} />;
      case 'afro':
        return <Ellipse cx="50" cy="42" rx="46" ry="44" fill={hairColor} />;
      default:
        return null;
    }
  };

  const renderHairFront = () => {
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
          <Path
            d="M20 30 Q25 15 35 20 Q45 10 55 20 Q65 10 75 20 Q85 15 80 30 Q85 50 75 55 Q75 60 75 55 L25 55 Q25 60 25 55 Q15 50 20 30"
            fill={hairColor}
          />
        );
      case 'ponytail':
        return (
          <G>
            <Ellipse cx="50" cy="20" rx="35" ry="18" fill={hairColor} />
            <Ellipse cx="50" cy="8" rx="10" ry="15" fill={hairColor} />
            <Circle cx="50" cy="-5" r="8" fill={hairColor} />
          </G>
        );
      case 'bun':
        return (
          <G>
            <Ellipse cx="50" cy="22" rx="35" ry="18" fill={hairColor} />
            <Circle cx="50" cy="5" r="12" fill={hairColor} />
          </G>
        );
      // New male-oriented hairstyles
      case 'buzz':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="34" ry="17" fill={hairColor} opacity="0.7" />
          </G>
        );
      case 'fade':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 8} rx="33" ry="18" fill={hairColor} />
            {/* Faded sides */}
            <Ellipse cx="22" cy="40" rx="6" ry="15" fill={hairColor} opacity="0.3" />
            <Ellipse cx="78" cy="40" rx="6" ry="15" fill={hairColor} opacity="0.3" />
          </G>
        );
      case 'spiky':
        return (
          <G>
            <Path d="M25 28 L30 8 L35 25 L40 5 L45 22 L50 2 L55 22 L60 5 L65 25 L70 8 L75 28" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 12} rx="30" ry="14" fill={hairColor} />
          </G>
        );
      case 'mohawk':
        return (
          <G>
            <Path d="M40 30 L42 5 L46 25 L50 0 L54 25 L58 5 L60 30" fill={hairColor} />
            <Rect x="42" y="10" width="16" height="20" rx="4" fill={hairColor} />
            {/* Shaved sides */}
            <Ellipse cx="25" cy="35" rx="8" ry="12" fill={hairColor} opacity="0.15" />
            <Ellipse cx="75" cy="35" rx="8" ry="12" fill={hairColor} opacity="0.15" />
          </G>
        );
      case 'crew-cut':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="34" ry="18" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 6} rx="28" ry="12" fill={hairColor} />
          </G>
        );
      // New female-oriented hairstyles
      case 'pixie':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 8} rx="36" ry="19" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 3} rx="28" ry="14" fill={hairColor} />
            {/* Side sweep */}
            <Path d="M75 22 Q82 28 80 38" stroke={hairColor} strokeWidth="8" fill={hairColor} />
          </G>
        );
      case 'bob':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="38" ry="22" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 5} rx="32" ry="16" fill={hairColor} />
            <Rect x="16" y="30" width="68" height="25" rx="12" fill={hairColor} />
          </G>
        );
      case 'braids':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="38" ry="22" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 5} rx="32" ry="16" fill={hairColor} />
            {/* Braid texture lines */}
            <Path d="M22 55 Q20 60 22 65 Q20 70 22 75 Q20 80 22 85" stroke={hairColor} strokeWidth="7" fill="none" />
            <Path d="M78 55 Q80 60 78 65 Q80 70 78 75 Q80 80 78 85" stroke={hairColor} strokeWidth="7" fill="none" />
          </G>
        );
      case 'side-swept':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="38" ry="22" fill={hairColor} />
            {/* Swept to right side */}
            <Path d="M30 20 Q50 12 80 25 Q85 30 82 40" fill={hairColor} />
            <Ellipse cx="80" cy="45" rx="12" ry="22" fill={hairColor} />
          </G>
        );
      case 'twin-tails':
        return (
          <G>
            <Ellipse cx="50" cy={baseY + 10} rx="38" ry="22" fill={hairColor} />
            <Ellipse cx="50" cy={baseY + 5} rx="32" ry="16" fill={hairColor} />
            {/* Hair bands */}
            <Circle cx="20" cy="40" r="4" fill={hairColor} stroke="#E8456890" strokeWidth="2" />
            <Circle cx="80" cy="40" r="4" fill={hairColor} stroke="#E8456890" strokeWidth="2" />
          </G>
        );
      case 'afro':
        return (
          <G>
            <Circle cx="50" cy="35" r="40" fill={hairColor} />
            {/* Texture */}
            <Circle cx="30" cy="20" r="8" fill={hairColor} stroke={`${hairColor}AA`} strokeWidth="1" />
            <Circle cx="50" cy="10" r="8" fill={hairColor} stroke={`${hairColor}AA`} strokeWidth="1" />
            <Circle cx="70" cy="20" r="8" fill={hairColor} stroke={`${hairColor}AA`} strokeWidth="1" />
            <Circle cx="20" cy="38" r="7" fill={hairColor} stroke={`${hairColor}AA`} strokeWidth="1" />
            <Circle cx="80" cy="38" r="7" fill={hairColor} stroke={`${hairColor}AA`} strokeWidth="1" />
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
          <ClipPath id={clipId}>
            <Circle cx="50" cy="50" r="48" />
          </ClipPath>
        </Defs>

        <G clipPath={`url(#${clipId})`}>
          {/* Background */}
          <Circle cx="50" cy="50" r="50" fill="#E5E7EB" />

          {/* Hair back layer */}
          {renderHairBack()}

          {/* Neck */}
          <Rect x="40" y="70" width="20" height="20" fill={skinTone} />

          {/* Ears */}
          <Ellipse cx="18" cy="50" rx="6" ry="8" fill={skinTone} />
          <Ellipse cx="82" cy="50" rx="6" ry="8" fill={skinTone} />

          {/* Face */}
          {renderFace()}

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

          {/* Eyelashes (female only) */}
          {renderEyelashes()}

          {/* Eyebrows */}
          {renderEyebrows()}

          {/* Nose */}
          {renderNose()}

          {/* Mouth */}
          {renderMouth()}

          {/* Cheeks (blush) */}
          <Ellipse cx="30" cy="60" rx="6" ry="4" fill="#FFB6C180" />
          <Ellipse cx="70" cy="60" rx="6" ry="4" fill="#FFB6C180" />

          {/* Facial hair (male only) */}
          {renderFacialHair()}

          {/* Hair front layer */}
          {renderHairFront()}

          {/* Accessories */}
          {renderGlasses()}
          {renderHat()}
          {renderEarrings()}
        </G>
      </Svg>
    </View>
  );
}

export default React.memo(AvatarRenderer);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 999,
  },
});
