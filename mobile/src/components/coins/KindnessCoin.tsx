import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Scale coin proportionally but cap it so it doesn't blow up on tablets.
const BASE_WIDTH = 375;
export const COIN_SCALE = Math.min(Dimensions.get('window').width / BASE_WIDTH, 1.25);

interface KindnessCoinProps {
  /** Design-time size in points (based on 375px width). Automatically scaled to device. */
  size: number;
  /** Outer rim gradient (3 colors). Defaults to gold. */
  rimColors?: [string, string, string];
  /** Inner face gradient (3 colors). Defaults to gold. */
  faceColors?: [string, string, string];
  /** Show outer glow ring behind coin */
  showGlow?: boolean;
  /** Wrapping style (for Animated transforms, positioning, etc.) */
  style?: any;
}

const DEFAULT_RIM: [string, string, string] = ['#FDE68A', '#FBBF24', '#F59E0B'];
const DEFAULT_FACE: [string, string, string] = ['#FEF3C7', '#FDE68A', '#FBBF24'];

function KindnessCoin({
  size: rawSize,
  rimColors = DEFAULT_RIM,
  faceColors = DEFAULT_FACE,
  showGlow = false,
  style,
}: KindnessCoinProps) {
  const size = rawSize * COIN_SCALE;
  const innerSize = size * 0.85;
  const faceSize = size * 0.75;
  const heartSize = size * 0.35;
  const leafSize = size * 0.17;

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      {/* Optional outer glow */}
      {showGlow && (
        <View
          style={[
            styles.glow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: `${rimColors[1]}4D`, // 30% opacity
            },
          ]}
        />
      )}

      {/* Coin rim */}
      <LinearGradient
        colors={rimColors}
        style={[
          styles.rim,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {/* Inner circle */}
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          {/* Coin face */}
          <LinearGradient
            colors={[faceColors[0], faceColors[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.face,
              {
                width: faceSize,
                height: faceSize,
                borderRadius: faceSize / 2,
              },
            ]}
          >
            {/* Heart with leaves - Kindness symbol */}
            <View style={styles.symbolContainer}>
              <Ionicons
                name="leaf"
                size={leafSize}
                color="rgba(255,255,255,0.9)"
                style={{
                  transform: [{ scaleX: 1 }],
                  marginRight: -leafSize * 0.3,
                  marginTop: -leafSize * 0.5,
                }}
              />
              <Ionicons name="heart" size={heartSize} color="#FFF" />
              <Ionicons
                name="leaf"
                size={leafSize}
                color="rgba(255,255,255,0.9)"
                style={{
                  transform: [{ scaleX: -1 }],
                  marginLeft: -leafSize * 0.3,
                  marginTop: -leafSize * 0.5,
                }}
              />
            </View>

            {/* Shine effect */}
            <View
              style={[
                styles.shine,
                {
                  width: faceSize * 0.35,
                  height: faceSize * 0.6,
                },
              ]}
            />
          </LinearGradient>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export default React.memo(KindnessCoin);

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  rim: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  inner: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  face: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shine: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '35deg' }],
  },
});
