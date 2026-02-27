import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import KindnessCoin from './KindnessCoin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = SCREEN_WIDTH - 32;

interface BotTheme {
  gradient: [string, string];
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  accentColor: string;
}

const BOT_THEMES: Record<string, BotTheme> = {
  SunnyBot: {
    gradient: ['#FFA726', '#FF7043'],
    iconName: 'sunny',
    iconColor: '#FFF',
    accentColor: '#FF9800',
  },
  StarBot: {
    gradient: ['#AB47BC', '#7E57C2'],
    iconName: 'star',
    iconColor: '#FFF',
    accentColor: '#9C27B0',
  },
  BloomBot: {
    gradient: ['#66BB6A', '#43A047'],
    iconName: 'leaf',
    iconColor: '#FFF',
    accentColor: '#4CAF50',
  },
};

const DEFAULT_THEME: BotTheme = {
  gradient: ['#42A5F5', '#1E88E5'],
  iconName: 'heart',
  iconColor: '#FFF',
  accentColor: '#2196F3',
};

interface BotCoinToastProps {
  visible: boolean;
  botUsername: string;
  amount: number;
  message: string;
  onDismiss: () => void;
}

export default function BotCoinToast({
  visible,
  botUsername,
  amount,
  message,
  onDismiss,
}: BotCoinToastProps) {
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const coinScale = useRef(new Animated.Value(0.5)).current;
  const amountScale = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-TOAST_WIDTH)).current;
  const dismissTimeout = useRef<NodeJS.Timeout | null>(null);

  const theme = BOT_THEMES[botUsername] || DEFAULT_THEME;

  useEffect(() => {
    if (visible) {
      playEntrance();
    }
    return () => {
      if (dismissTimeout.current) clearTimeout(dismissTimeout.current);
    };
  }, [visible]);

  const playEntrance = () => {
    // Reset
    slideY.setValue(-120);
    opacity.setValue(0);
    coinScale.setValue(0.5);
    amountScale.setValue(0);
    shimmerX.setValue(-TOAST_WIDTH);

    // Slide in from top
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Coin pop-in
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(coinScale, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Amount badge pop
    Animated.sequence([
      Animated.delay(350),
      Animated.spring(amountScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer sweep
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(shimmerX, {
        toValue: TOAST_WIDTH,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3s
    dismissTimeout.current = setTimeout(() => {
      playExit();
    }, 3000);
  };

  const playExit = () => {
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
      dismissTimeout.current = null;
    }

    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideY }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.toast}
      >
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerX }] },
          ]}
        />

        {/* Bot icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={theme.iconName} size={24} color={theme.iconColor} />
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.botName}>{botUsername}</Text>
          <Text style={styles.message} numberOfLines={1}>{message}</Text>
        </View>

        {/* Coin + amount */}
        <View style={styles.coinContainer}>
          <Animated.View style={{ transform: [{ scale: coinScale }] }}>
            <KindnessCoin size={32} />
          </Animated.View>
          <Animated.View
            style={[
              styles.amountBadge,
              { transform: [{ scale: amountScale }] },
            ]}
          >
            <Text style={styles.amountText}>+{amount}</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  botName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});
