import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getImageUrl } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px padding each side + 16px gap
const CARD_HEIGHT = CARD_WIDTH * 1.6;
const BORDER_RADIUS = CARD_WIDTH * 0.2;
const PORTHOLE_SIZE = CARD_WIDTH * 0.36;

interface PreviewPost {
  id: string;
  processedImageUrl: string | null;
  originalImageUrl: string | null;
  coinsReceived: number;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconEmoji: string | null;
  iconImageUrl: string | null;
  category: string;
  followerCount: number;
  postCount: number;
  weeklyPostCount: number;
  isFollowing: boolean;
  previewPosts?: PreviewPost[];
}

// Detect if an icon value is an Ionicons name
const isIoniconName = (value: string): boolean => /^[a-z][a-z0-9-]*$/.test(value);

// Activeness based on posting frequency (postCount helps detect monthly activity):
// >= 5 posts/week ≈ daily posts           → Blazing
// >= 3 posts/week ≈ every 1-3 days        → Very active
// >= 1 post/week  ≈ every 3-7 days        → Active
// has posts but < 1/week ≈ within a month → Warming up
// 0 posts ever                            → New
const getActiveness = (weeklyPosts: number, totalPosts: number): { label: string; color: string } => {
  if (weeklyPosts >= 5) return { label: 'Blazing', color: '#F97316' };
  if (weeklyPosts >= 3) return { label: 'Very active', color: '#22C55E' };
  if (weeklyPosts >= 1) return { label: 'Active', color: '#60A5FA' };
  if (totalPosts > 0) return { label: 'Warming up', color: '#FBBF24' };
  return { label: 'New', color: '#94A3B8' };
};

interface Props {
  topic: Topic;
  onPress: () => void;
  onToggleFollow: (topicId: string, isFollowing: boolean) => void;
}

export default function CapsuleCommunityCard({ topic, onPress, onToggleFollow }: Props) {
  const fadeA = useRef(new Animated.Value(1)).current;
  const fadeB = useRef(new Animated.Value(0)).current;
  const showingA = useRef(true);
  const indexA = useRef(0);
  const indexB = useRef(1);
  const [, setTick] = useState(0); // triggers re-render to swap hidden layer's source

  const previewImages = (topic.previewPosts || [])
    .map(p => getImageUrl(p.processedImageUrl) || getImageUrl(p.originalImageUrl))
    .filter(Boolean) as string[];

  useEffect(() => {
    if (previewImages.length <= 1) return;
    indexA.current = 0;
    indexB.current = 1 % previewImages.length;
    showingA.current = true;
    fadeA.setValue(1);
    fadeB.setValue(0);

    const interval = setInterval(() => {
      const easing = Easing.inOut(Easing.ease);

      if (showingA.current) {
        // A is visible → cross-fade to B (already has the next image loaded)
        Animated.parallel([
          Animated.timing(fadeA, { toValue: 0, duration: 800, easing, useNativeDriver: true }),
          Animated.timing(fadeB, { toValue: 1, duration: 800, easing, useNativeDriver: true }),
        ]).start(() => {
          // B is now visible. Swap A (hidden, opacity 0) to the next image.
          indexA.current = (indexB.current + 1) % previewImages.length;
          setTick(t => t + 1);
        });
      } else {
        // B is visible → cross-fade to A (already has the next image loaded)
        Animated.parallel([
          Animated.timing(fadeB, { toValue: 0, duration: 800, easing, useNativeDriver: true }),
          Animated.timing(fadeA, { toValue: 1, duration: 800, easing, useNativeDriver: true }),
        ]).start(() => {
          // A is now visible. Swap B (hidden, opacity 0) to the next image.
          indexB.current = (indexA.current + 1) % previewImages.length;
          setTick(t => t + 1);
        });
      }
      showingA.current = !showingA.current;
    }, 1200);

    return () => clearInterval(interval);
  }, [previewImages.length]);

  const imageA = previewImages[indexA.current] || null;
  const imageB = previewImages[indexB.current] || null;

  const renderIcon = () => {
    if (topic.iconImageUrl) {
      return (
        <Image
          source={{ uri: getImageUrl(topic.iconImageUrl) || topic.iconImageUrl }}
          style={styles.portholeIcon}
        />
      );
    }
    if (topic.iconEmoji && isIoniconName(topic.iconEmoji)) {
      return (
        <Ionicons name={`${topic.iconEmoji}-outline` as any} size={22} color="#FFFFFF" />
      );
    }
    return <Text style={styles.portholeEmoji}>{topic.iconEmoji || '🏷️'}</Text>;
  };

  return (
    <TouchableOpacity
      style={styles.capsule}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Background layer - gradient placeholder */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Blurred background image A */}
      {imageA && (
        <Animated.Image
          source={{ uri: imageA }}
          style={[StyleSheet.absoluteFill, { opacity: fadeA }]}
          blurRadius={3}
          resizeMode="cover"
        />
      )}

      {/* Blurred background image B */}
      {imageB && (
        <Animated.Image
          source={{ uri: imageB }}
          style={[StyleSheet.absoluteFill, { opacity: fadeB }]}
          blurRadius={3}
          resizeMode="cover"
        />
      )}

      {/* Ceramic wet-coat: saturated sheen over the image */}
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.08)', 'transparent', 'rgba(0,0,0,0.12)']}
        locations={[0, 0.25, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Ceramic glaze: bright top-left light source */}
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)', 'transparent']}
        locations={[0, 0.2, 0.45, 0.7]}
        style={styles.glossyHighlight}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Ceramic specular streak: sharp horizontal light band */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)', 'transparent']}
        locations={[0, 0.18, 0.32, 0.5]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Ceramic diagonal shine: sweeping light across the surface */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
        locations={[0.3, 0.5, 0.7]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
      />

      {/* Ceramic bottom reflection: soft bounce light */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.16)']}
        style={styles.glossyBottomReflection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Dark vignette for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.45)']}
        style={styles.bottomGradient}
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Centered content: porthole + text + button */}
      <View style={styles.centerContent}>
        {/* Porthole window */}
        <View style={styles.portholeContainer}>
          {/* Metallic ring */}
          <LinearGradient
            colors={['#C0C0C0', '#FFFFFF', '#A0A0A0', '#D0D0D0']}
            style={styles.portholeRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Inner dark gap */}
            <View style={styles.portholeInnerGap}>
              {/* Icon circle */}
              <View style={styles.portholeCenter}>
                {renderIcon()}
              </View>
            </View>
          </LinearGradient>

          {/* Glow effect around porthole */}
          <View style={styles.portholeGlow} />
        </View>

        <Text style={styles.communityName} numberOfLines={1}>
          {topic.name}
        </Text>
        <Text style={styles.memberCount}>
          {topic.followerCount} {topic.followerCount === 1 ? 'member' : 'members'}
        </Text>

        {/* Activeness badge */}
        <View style={styles.activenessBadge}>
          <View style={[styles.activenessDot, { backgroundColor: getActiveness(topic.weeklyPostCount, topic.postCount).color }]} />
          <Text style={[styles.activenessLabel, { color: getActiveness(topic.weeklyPostCount, topic.postCount).color }]}>
            {getActiveness(topic.weeklyPostCount, topic.postCount).label}
          </Text>
        </View>

        {/* Join button */}
        <TouchableOpacity
          style={[
            styles.joinButton,
            topic.isFollowing && styles.joinedButton,
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFollow(topic.id, topic.isFollowing);
          }}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.joinButtonText,
            topic.isFollowing && styles.joinedButtonText,
          ]}>
            {topic.isFollowing ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Glass edge border */}
      <View style={styles.glassEdge} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  capsule: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },
  glossyHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH * 0.65,
    height: CARD_HEIGHT * 0.45,
    borderTopLeftRadius: BORDER_RADIUS,
  },
  glossyBottomReflection: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CARD_WIDTH * 0.5,
    height: CARD_HEIGHT * 0.3,
    borderBottomRightRadius: BORDER_RADIUS,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portholeContainer: {
    width: PORTHOLE_SIZE,
    height: PORTHOLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  portholeRing: {
    width: PORTHOLE_SIZE,
    height: PORTHOLE_SIZE,
    borderRadius: PORTHOLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  portholeInnerGap: {
    width: PORTHOLE_SIZE - 6,
    height: PORTHOLE_SIZE - 6,
    borderRadius: (PORTHOLE_SIZE - 6) / 2,
    backgroundColor: 'rgba(10,10,30,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portholeCenter: {
    width: PORTHOLE_SIZE - 14,
    height: PORTHOLE_SIZE - 14,
    borderRadius: (PORTHOLE_SIZE - 14) / 2,
    backgroundColor: 'rgba(30,20,60,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portholeGlow: {
    position: 'absolute',
    width: PORTHOLE_SIZE + 16,
    height: PORTHOLE_SIZE + 16,
    borderRadius: (PORTHOLE_SIZE + 16) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    top: -8,
    left: -8,
  },
  portholeIcon: {
    width: PORTHOLE_SIZE - 18,
    height: PORTHOLE_SIZE - 18,
    borderRadius: (PORTHOLE_SIZE - 18) / 2,
  },
  portholeEmoji: {
    fontSize: 24,
  },
  communityName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  memberCount: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activenessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  activenessDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  activenessLabel: {
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  joinButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
  },
  joinedButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  joinedButtonText: {
    color: 'rgba(255,255,255,0.85)',
  },
  glassEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BORDER_RADIUS,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
