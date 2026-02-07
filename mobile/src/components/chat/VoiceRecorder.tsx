import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  PanResponderGestureState,
} from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceRecorderProps {
  onSend: (uri: string, duration: number, waveform: number[]) => void;
  onCancel: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a duration given in seconds as "m:ss".
 *
 * @example
 * formatDuration(0)   // "0:00"
 * formatDuration(65)  // "1:05"
 * formatDuration(600) // "10:00"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANCEL_THRESHOLD = -80; // px – slide left distance to cancel
const METERING_INTERVAL = 150; // ms – how often we sample metering levels

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSend,
  onCancel,
  isRecording,
  onStartRecording,
  onStopRecording,
}) => {
  const { colors, isDark } = useTheme();

  // Refs -------------------------------------------------------------------

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationRef = useRef(0);
  const waveformRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meteringRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  // Animated values ---------------------------------------------------------

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const durationAnim = useRef(new Animated.Value(0)).current; // drives re-render for display
  const [displayDuration, setDisplayDuration] = React.useState(0);

  // Pulsing red dot animation -----------------------------------------------

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording, pulseAnim]);

  // Start / stop recording based on isRecording prop ------------------------

  useEffect(() => {
    if (isRecording) {
      startRecording();
    }

    return () => {
      // Cleanup on unmount while recording
      if (recordingRef.current) {
        cleanupRecording();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Recording logic ---------------------------------------------------------

  const startRecording = useCallback(async () => {
    try {
      cancelledRef.current = false;
      durationRef.current = 0;
      waveformRef.current = [];
      setDisplayDuration(0);
      slideX.setValue(0);

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.warn('VoiceRecorder: audio permission not granted');
        onCancel();
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording – HIGH_QUALITY, .m4a
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        METERING_INTERVAL,
      );

      recordingRef.current = recording;

      // Haptic feedback on start
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Duration timer
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDisplayDuration(durationRef.current);
      }, 1000);

      // Metering sampler for waveform data
      meteringRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Metering values are in dBFS (negative). Normalise to 0-1 range.
            // Typical range: -160 (silence) to 0 (max). We clamp to -60..0 for useful range.
            const db = Math.max(status.metering, -60);
            const normalised = (db + 60) / 60; // 0..1
            waveformRef.current.push(parseFloat(normalised.toFixed(2)));
          }
        } catch {
          // Recording may have been stopped between interval fires – ignore.
        }
      }, METERING_INTERVAL);
    } catch (error) {
      console.error('VoiceRecorder: failed to start recording', error);
      onCancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel]);

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (meteringRef.current) {
      clearInterval(meteringRef.current);
      meteringRef.current = null;
    }
  }, []);

  const stopAndSend = useCallback(async () => {
    if (!recordingRef.current) return;

    cleanupRecording();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode so playback works normally
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (uri && !cancelledRef.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSend(uri, durationRef.current, [...waveformRef.current]);
      }
    } catch (error) {
      console.error('VoiceRecorder: failed to stop recording', error);
    }

    onStopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupRecording, onSend, onStopRecording]);

  const cancelRecording = useCallback(async () => {
    cancelledRef.current = true;

    if (!recordingRef.current) return;

    cleanupRecording();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('VoiceRecorder: failed to cancel recording', error);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onCancel();
    onStopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupRecording, onCancel, onStopRecording]);

  // PanResponder – slide left to cancel, release to send --------------------

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) =>
        Math.abs(gestureState.dx) > 5,

      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        // Only allow sliding to the left
        if (gestureState.dx < 0) {
          slideX.setValue(gestureState.dx);
        }
      },

      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (gestureState.dx < CANCEL_THRESHOLD) {
          // Slid far enough – cancel
          cancelRecording();
        } else {
          // Release without sufficient slide – send
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          stopAndSend();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  // Styles (theme-aware) ----------------------------------------------------

  const themed = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.chat.inputBackground,
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: colors.chat.inputBorder,
        },
        redDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#ED4956',
          marginRight: 10,
        },
        durationText: {
          color: colors.text.primary,
          fontSize: 16,
          fontWeight: '600',
          fontVariant: ['tabular-nums'],
          minWidth: 42,
        },
        slideHint: {
          flex: 1,
          alignItems: 'center',
        },
        slideHintText: {
          color: colors.text.secondary,
          fontSize: 13,
        },
        sendIcon: {
          marginLeft: 8,
        },
      }),
    [colors],
  );

  // Render ------------------------------------------------------------------

  if (!isRecording) return null;

  return (
    <Animated.View
      style={[themed.container, { transform: [{ translateX: slideX }] }]}
      {...panResponder.panHandlers}
    >
      {/* Pulsing red dot */}
      <Animated.View style={[themed.redDot, { opacity: pulseAnim }]} />

      {/* Duration counter */}
      <Text style={themed.durationText}>{formatDuration(displayDuration)}</Text>

      {/* Slide to cancel hint */}
      <View style={themed.slideHint}>
        <Text style={themed.slideHintText}>
          <Ionicons name="chevron-back" size={13} color={colors.text.secondary} />
          {'  Slide to cancel'}
        </Text>
      </View>

      {/* Send icon */}
      <Ionicons
        name="send"
        size={22}
        color={colors.text.link}
        style={themed.sendIcon}
      />
    </Animated.View>
  );
};

export default VoiceRecorder;
