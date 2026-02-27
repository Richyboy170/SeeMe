import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
  Animated,
  Easing,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useTheme } from '../../theme';
import { getPoseByName } from '../../data/friendshipPoses';
import type { Sticker } from './StripDecorationBar';

interface PhotoStripProps {
  photos: string[];
  poses: string[];
  partnerUsername: string;
  date?: string;
  frameColor?: string;
  stickers?: Sticker[];
  onUpdateSticker?: (id: string, x: number, y: number) => void;
  onRemoveSticker?: (id: string) => void;
  onRotateSticker?: (id: string, rotation: number) => void;
  onCaptureReady?: (captureFn: () => Promise<string | null>) => void;
  onScrollEnabled?: (enabled: boolean) => void;
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getAngleBetweenTouches(touches: any[]): number {
  if (touches.length < 2) return 0;
  const dx = touches[1].pageX - touches[0].pageX;
  const dy = touches[1].pageY - touches[0].pageY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function DraggableSticker({
  sticker,
  onUpdate,
  onRemove,
  onRotate,
  onDragStart,
  onDragEnd,
}: {
  sticker: Sticker;
  onUpdate?: (id: string, x: number, y: number) => void;
  onRemove?: (id: string) => void;
  onRotate?: (id: string, rotation: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: sticker.x, y: sticker.y })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lastOffset = useRef({ x: sticker.x, y: sticker.y });
  const moved = useRef(false);
  const isRotating = useRef(false);
  const initialAngle = useRef(0);
  const rotationAtStart = useRef(sticker.rotation);

  // Keep refs updated for stale PanResponder closures
  const latestRotation = useRef(sticker.rotation);
  latestRotation.current = sticker.rotation;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;
  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  // Heartbeat pulse — plays for 3 seconds then stops
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    const timer = setTimeout(() => {
      pulse.stop();
      pulseAnim.setValue(1);
    }, 3000);
    return () => {
      pulse.stop();
      clearTimeout(timer);
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      // Capture gestures immediately to prevent parent ScrollView from stealing them
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        onDragStartRef.current?.();
        moved.current = false;
        isRotating.current = false;
        rotationAtStart.current = latestRotation.current;
        pan.setOffset({ x: lastOffset.current.x, y: lastOffset.current.y });
        pan.setValue({ x: 0, y: 0 });

        // Check if starting with 2 fingers already
        if (evt.nativeEvent.touches.length >= 2) {
          isRotating.current = true;
          initialAngle.current = getAngleBetweenTouches(evt.nativeEvent.touches);
        }
      },
      onPanResponderMove: (evt, gesture) => {
        const touches = evt.nativeEvent.touches;

        // Switch to rotation mode when second finger arrives
        if (touches.length >= 2 && !isRotating.current) {
          isRotating.current = true;
          initialAngle.current = getAngleBetweenTouches(touches);
          rotationAtStart.current = latestRotation.current;
        }

        if (isRotating.current && touches.length >= 2) {
          // Two-finger rotation mode
          const currentAngle = getAngleBetweenTouches(touches);
          const angleDelta = currentAngle - initialAngle.current;
          onRotateRef.current?.(sticker.id, rotationAtStart.current + angleDelta);
          moved.current = true;
        } else if (!isRotating.current) {
          // Single finger drag mode
          const hasMoved = Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
          if (hasMoved) moved.current = true;

          Animated.event([null, { dx: pan.x, dy: pan.y }], {
            useNativeDriver: false,
          })(evt, gesture);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        onDragEndRef.current?.();
        if (isRotating.current) {
          isRotating.current = false;
          return;
        }

        pan.flattenOffset();
        const newX = lastOffset.current.x + gesture.dx;
        const newY = lastOffset.current.y + gesture.dy;
        lastOffset.current = { x: newX, y: newY };

        if (!moved.current && onRemoveRef.current) {
          // Tap to remove with scale animation
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onRemoveRef.current?.(sticker.id);
          });
        } else {
          onUpdateRef.current?.(sticker.id, newX, newY);
        }
      },
    })
  ).current;

  const combinedScale = Animated.multiply(scaleAnim, pulseAnim);

  return (
    <Animated.View
      style={[
        styles.sticker,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: combinedScale },
            { rotate: `${sticker.rotation}deg` },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
    </Animated.View>
  );
}

export default function PhotoStrip({
  photos,
  poses,
  partnerUsername,
  date,
  frameColor = '#FFFFFF',
  stickers = [],
  onUpdateSticker,
  onRemoveSticker,
  onRotateSticker,
  onCaptureReady,
  onScrollEnabled,
}: PhotoStripProps) {
  const { colors } = useTheme();
  const viewShotRef = useRef<ViewShot>(null);

  const isLight = getLuminance(frameColor) >= 0.5;
  const textColor = isLight ? '#333' : '#FFF';
  const subtextColor = isLight ? '#999' : 'rgba(255,255,255,0.7)';
  const borderLineColor = isLight ? '#EEE' : 'rgba(255,255,255,0.2)';

  const captureStrip = useCallback(async (): Promise<string | null> => {
    try {
      if (viewShotRef.current?.capture) {
        return await viewShotRef.current.capture();
      }
      return null;
    } catch (error) {
      console.error('Error capturing photo strip:', error);
      return null;
    }
  }, []);

  const handleDragStart = useCallback(() => {
    onScrollEnabled?.(false);
  }, [onScrollEnabled]);

  const handleDragEnd = useCallback(() => {
    onScrollEnabled?.(true);
  }, [onScrollEnabled]);

  // Expose capture function to parent
  useEffect(() => {
    onCaptureReady?.(captureStrip);
  }, [captureStrip, onCaptureReady]);

  const displayDate = date || new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.wrapper}>
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.95 }}>
        <View style={[
          styles.strip,
          {
            backgroundColor: frameColor,
            borderWidth: frameColor !== '#FFFFFF' ? 3 : 0,
            borderColor: frameColor,
          },
        ]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderLineColor }]}>
            <Text style={[styles.headerTitle, { color: textColor }]}>SeeMe Friendship</Text>
            <Text style={[styles.headerDate, { color: subtextColor }]}>{displayDate}</Text>
          </View>

          {/* Photos */}
          {photos.map((photoUri, index) => {
            const pose = getPoseByName(poses[index]);
            return (
              <View key={index} style={styles.photoFrame}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <View style={styles.poseLabel}>
                  <Text style={styles.poseLabelText}>
                    {pose?.emoji} {pose?.displayName || poses[index]}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: borderLineColor }]}>
            <Text style={[styles.footerText, { color: isLight ? '#666' : 'rgba(255,255,255,0.85)' }]}>
              with @{partnerUsername}
            </Text>
          </View>

          {/* Stickers overlay */}
          {stickers.length > 0 && (
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {stickers.map(sticker => (
                <DraggableSticker
                  key={sticker.id}
                  sticker={sticker}
                  onUpdate={onUpdateSticker}
                  onRemove={onRemoveSticker}
                  onRotate={onRotateSticker}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </View>
          )}
        </View>
      </ViewShot>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  strip: {
    borderRadius: 12,
    padding: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerDate: {
    fontSize: 11,
    marginTop: 2,
  },
  photoFrame: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#F0F0F0',
  },
  poseLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  poseLabelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sticker: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  stickerEmoji: {
    fontSize: 32,
  },
});
