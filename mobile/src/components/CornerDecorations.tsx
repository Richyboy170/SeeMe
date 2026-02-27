import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { CornerDecorationConfig, CornerIconPlacement } from '../types/decorations';

interface CornerDecorationsProps {
  /** Legacy mode: same icon at all 4 corners */
  config?: CornerDecorationConfig;
  /** Per-corner mode: different icon per corner with individual colors */
  cornerIcons?: CornerIconPlacement[] | null;
  muted?: boolean;
}

const CORNER_POSITIONS = [
  { key: 'top-left', top: 4, left: 4 },
  { key: 'top-right', top: 4, right: 4 },
  { key: 'bottom-right', bottom: 4, right: 4 },
  { key: 'bottom-left', bottom: 4, left: 4 },
] as const;

const POSITION_STYLE_MAP: Record<string, { top?: number; bottom?: number; left?: number; right?: number }> = {
  'top-left': { top: 4, left: 4 },
  'top-right': { top: 4, right: 4 },
  'bottom-right': { bottom: 4, right: 4 },
  'bottom-left': { bottom: 4, left: 4 },
};

export default function CornerDecorations({ config, cornerIcons, muted }: CornerDecorationsProps) {
  const hasLegacy = !!config;
  const hasPerCorner = cornerIcons && cornerIcons.length > 0;

  if (!hasLegacy && !hasPerCorner) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Legacy mode: same icon at all 4 corners */}
      {hasLegacy && (
        <>
          {CORNER_POSITIONS.map((pos, index) => {
            const baseOpacity = config!.opacity ?? 0.8;
            const finalOpacity = muted ? baseOpacity * 0.4 : baseOpacity;
            const IconComponent = config!.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
            const { key, ...posStyle } = pos;

            return (
              <View
                key={`legacy-${key}`}
                style={[styles.corner, posStyle, { opacity: finalOpacity }]}
              >
                <IconComponent
                  name={config!.iconName as any}
                  size={config!.size}
                  color={config!.color}
                />
              </View>
            );
          })}
        </>
      )}

      {/* Per-corner mode: individual icons at higher z-index */}
      {hasPerCorner && cornerIcons!.map((icon) => {
        const posStyle = POSITION_STYLE_MAP[icon.position];
        if (!posStyle) return null;

        const IconComponent = icon.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
        const opacity = muted ? 0.4 : 0.9;

        return (
          <View
            key={`corner-${icon.position}`}
            style={[styles.corner, styles.perCorner, posStyle, { opacity }]}
          >
            <IconComponent
              name={icon.iconName as any}
              size={18}
              color={icon.color}
            />
          </View>
        );
      })}
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
  perCorner: {
    zIndex: 11,
  },
});
