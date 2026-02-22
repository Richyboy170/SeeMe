import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { CornerDecorationConfig } from '../types/decorations';

interface CornerDecorationsProps {
  config: CornerDecorationConfig;
  muted?: boolean;
}

const CORNER_POSITIONS = [
  { top: 4, left: 4 },   // top-left
  { top: 4, right: 4 },  // top-right
  { bottom: 4, right: 4 }, // bottom-right
  { bottom: 4, left: 4 }, // bottom-left
] as const;

export default function CornerDecorations({ config, muted }: CornerDecorationsProps) {
  const baseOpacity = config.opacity ?? 0.8;
  const finalOpacity = muted ? baseOpacity * 0.4 : baseOpacity;

  const IconComponent = config.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <View style={styles.container} pointerEvents="none">
      {CORNER_POSITIONS.map((pos, index) => (
        <View
          key={index}
          style={[
            styles.corner,
            pos,
            { opacity: finalOpacity },
          ]}
        >
          <IconComponent
            name={config.iconName as any}
            size={config.size}
            color={config.color}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  corner: {
    position: 'absolute',
  },
});
