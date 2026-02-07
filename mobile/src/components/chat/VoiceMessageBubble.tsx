import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Colors } from '../../theme';

const NUM_BARS = 30;

interface VoiceMessageBubbleProps {
  uri: string;
  duration: number;
  waveform?: string;
  isOwnMessage: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseWaveform(waveformStr?: string): number[] {
  if (!waveformStr) {
    return generateDefaultBars();
  }

  try {
    const parsed = JSON.parse(waveformStr);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return generateDefaultBars();
    }

    // Normalize the array to NUM_BARS length
    return normalizeBars(parsed);
  } catch {
    return generateDefaultBars();
  }
}

function generateDefaultBars(): number[] {
  const bars: number[] = [];
  for (let i = 0; i < NUM_BARS; i++) {
    // Create a natural-looking default waveform pattern
    const position = i / NUM_BARS;
    const base = 0.3;
    const variation = Math.sin(position * Math.PI) * 0.4;
    const noise = Math.sin(i * 2.7) * 0.15 + Math.cos(i * 1.3) * 0.1;
    bars.push(Math.max(0.1, Math.min(1, base + variation + noise)));
  }
  return bars;
}

function normalizeBars(data: number[]): number[] {
  if (data.length === NUM_BARS) {
    return data.map((v) => Math.max(0.1, Math.min(1, v)));
  }

  const bars: number[] = [];
  const ratio = data.length / NUM_BARS;

  for (let i = 0; i < NUM_BARS; i++) {
    const startIndex = Math.floor(i * ratio);
    const endIndex = Math.min(Math.floor((i + 1) * ratio), data.length);

    if (startIndex >= data.length) {
      bars.push(0.1);
      continue;
    }

    // Average samples within this bar's range
    let sum = 0;
    let count = 0;
    for (let j = startIndex; j < endIndex; j++) {
      sum += data[j];
      count++;
    }
    const avg = count > 0 ? sum / count : 0;
    bars.push(Math.max(0.1, Math.min(1, avg)));
  }

  return bars;
}

export default function VoiceMessageBubble({
  uri,
  duration,
  waveform,
  isOwnMessage,
}: VoiceMessageBubbleProps) {
  const { colors, isDark } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(duration * 1000);
  const soundRef = useRef<Audio.Sound | null>(null);

  const bars = useRef(parseWaveform(waveform)).current;

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setPositionMs(status.positionMillis);
    setIsPlaying(status.isPlaying);

    if (status.durationMillis) {
      setDurationMs(status.durationMillis);
    }

    // Reset when playback finishes
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
    }
  }, []);

  const handlePlayPause = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          // If finished, replay from start
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.positionMillis >= (status.durationMillis || 0) - 100) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
        }
      } else {
        // Set audio mode for playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );

        setSound(newSound);
        soundRef.current = newSound;
      }
    } catch (error) {
      console.error('Voice message playback error:', error);
    }
  };

  // Calculate progress as a fraction 0-1
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const progressBarIndex = Math.floor(progress * NUM_BARS);

  // Determine remaining time to display
  const remainingSeconds = isPlaying || positionMs > 0
    ? Math.max(0, (durationMs - positionMs) / 1000)
    : duration;

  // Colors based on ownership
  const playButtonColor = isOwnMessage
    ? Colors.common.white
    : Colors.brand.blue;

  const activeBarColor = isOwnMessage
    ? Colors.common.white
    : Colors.brand.blue;

  const inactiveBarColor = isOwnMessage
    ? 'rgba(255, 255, 255, 0.35)'
    : colors.text.secondary;

  const durationColor = isOwnMessage
    ? 'rgba(255, 255, 255, 0.8)'
    : colors.text.secondary;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={styles.playButton}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={22}
          color={playButtonColor}
        />
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.barsRow}>
          {bars.map((amplitude, index) => {
            const isActive = index < progressBarIndex;
            const barHeight = Math.max(4, amplitude * 20);

            return (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: isActive ? activeBarColor : inactiveBarColor,
                  },
                ]}
              />
            );
          })}
        </View>

        <Text style={[styles.durationText, { color: durationColor }]}>
          {formatDuration(remainingSeconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 200,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  waveformContainer: {
    flex: 1,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 1.5,
  },
  bar: {
    flex: 1,
    borderRadius: 1.5,
    minWidth: 2,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});
