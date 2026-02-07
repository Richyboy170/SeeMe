/**
 * Create Post Screen — Instagram-Style Camera-First
 *
 * Two modes:
 * 1. Camera Mode (default): Full-screen camera viewfinder with gallery, capture, flash, flip
 * 2. Compose Mode (after photo): Image preview + caption + visibility/topic + Post button
 *
 * Content Policy:
 * - Real people photos cannot be posted as-is
 * - If person detected: must convert to 3D avatar OR blur faces
 * - Landscapes, food, objects, pets can post directly
 *
 * Visibility Options:
 * - Friends Only: Only your followers see this
 * - Topics Only: Community members interested in the topic
 * - Topics + Friends: Both community and your followers
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList, CreatePostStackParamList } from '../../navigation/types';
import { api } from '../../services/api';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import { useTheme, Colors } from '../../theme';
import CoinInvestAnimation from '../../components/coins/CoinInvestAnimation';
import ImageEditor from '../../components/ImageEditor';
// Person detection disabled for now — imports kept for re-enable later
// import { checkImageForPerson, blurFacesInImage } from '../../services/contentCheck';
import type { PersonCheckResult } from '../../services/contentCheck';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Visibility = 'friends_only' | 'topics_only' | 'topics_and_friends';
type ScreenMode = 'camera' | 'compose';
type ContentStatus = 'unchecked' | 'checking' | 'person_detected' | 'ready' | 'blurring';

const isIoniconName = (value: string): boolean => /^[a-z][a-z0-9-]*$/.test(value);

interface Topic {
  id: string;
  name: string;
  iconEmoji: string | null;
  iconImageUrl?: string | null;
  isFollowing: boolean;
}

interface FullTopic extends Topic {
  slug?: string;
  description?: string;
  category?: string;
  followerCount?: number;
}

// ─── Smart Topic Suggestion Utilities ─────────────────────────────

interface TopicIndexEntry {
  topicId: string;
  slug: string;
  keywords: Map<string, number>; // keyword → weight
}

const TOPIC_EXTRA_KEYWORDS: Record<string, string[]> = {
  'pet-lovers': ['cat', 'cats', 'kitten', 'dog', 'dogs', 'puppy', 'hamster', 'parrot', 'fish', 'rabbit', 'turtle', 'bird'],
  'foodies': ['pizza', 'sushi', 'burger', 'baking', 'cook', 'cooking', 'recipe', 'dinner', 'lunch', 'breakfast', 'meal'],
  'gaming-hub': ['xbox', 'playstation', 'ps5', 'nintendo', 'switch', 'fortnite', 'minecraft', 'valorant', 'league', 'fps', 'rpg'],
  'coders-united': ['code', 'coding', 'javascript', 'python', 'react', 'typescript', 'github', 'bug', 'deploy', 'api', 'frontend', 'backend'],
  'gym-life': ['workout', 'bench', 'squat', 'deadlift', 'gains', 'weights', 'lifting', 'muscle', 'bulk', 'cut'],
  'photography': ['portrait', 'landscape', 'sunset', 'lens', 'dslr', 'mirrorless', 'edit', 'lightroom'],
  'digital-art': ['drawing', 'sketch', 'procreate', 'tablet', 'commission', 'digital', 'illustration', 'fanart'],
  'music-makers': ['song', 'guitar', 'piano', 'drums', 'singing', 'beat', 'producer', 'studio', 'album', 'track'],
  'anime-manga': ['anime', 'manga', 'otaku', 'cosplay', 'naruto', 'onepiece', 'dragonball', 'jujutsu', 'demon'],
  'runners-world': ['run', 'running', 'jog', 'jogging', 'marathon', '5k', '10k', 'treadmill', 'pace'],
  'coffee-tea': ['coffee', 'latte', 'espresso', 'tea', 'matcha', 'brew', 'cafe', 'cappuccino', 'barista'],
  'book-club': ['book', 'books', 'reading', 'novel', 'fiction', 'nonfiction', 'author', 'chapter', 'library'],
  'outdoor-adventures': ['hiking', 'hike', 'camping', 'trail', 'mountain', 'climbing', 'nature', 'backpacking'],
  'plant-parents': ['plant', 'plants', 'garden', 'succulent', 'cactus', 'flower', 'flowers', 'soil', 'watering'],
  'yoga-flow': ['yoga', 'meditation', 'stretch', 'flexibility', 'namaste', 'zen', 'pose', 'breathe'],
  'mindfulness': ['mental', 'wellness', 'selfcare', 'journal', 'journaling', 'anxiety', 'calm', 'mindful', 'therapy'],
  'fashion-forward': ['outfit', 'ootd', 'style', 'clothes', 'fashion', 'dress', 'sneakers', 'thrift', 'streetwear'],
  'ai-explorers': ['chatgpt', 'claude', 'openai', 'llm', 'neural', 'deeplearning', 'prompt', 'model'],
  'travel-diaries': ['travel', 'trip', 'vacation', 'flight', 'hotel', 'beach', 'city', 'explore', 'passport', 'abroad'],
  'sports-fans': ['football', 'basketball', 'soccer', 'baseball', 'nba', 'nfl', 'cricket', 'tennis', 'match'],
  'writers-corner': ['writing', 'write', 'poem', 'poetry', 'story', 'creative', 'draft', 'fiction', 'essay'],
  'diy-crafts': ['craft', 'crafts', 'handmade', 'knitting', 'sewing', 'woodwork', 'crochet', 'diy', 'build'],
  'startup-life': ['startup', 'founder', 'entrepreneur', 'business', 'launch', 'product', 'funding', 'investor'],
  'study-buddies': ['study', 'studying', 'exam', 'homework', 'school', 'university', 'college', 'class', 'lecture'],
  'science-nerds': ['science', 'physics', 'chemistry', 'biology', 'experiment', 'research', 'lab', 'space', 'nasa'],
  'martial-arts': ['karate', 'boxing', 'bjj', 'taekwondo', 'mma', 'kickboxing', 'sparring', 'belt', 'dojo'],
  'pc-builders': ['pc', 'gpu', 'cpu', 'ram', 'build', 'setup', 'battlestation', 'monitor', 'keyboard', 'rgb'],
  'tech-news': ['iphone', 'android', 'apple', 'samsung', 'google', 'gadget', 'app', 'update', 'release'],
  'cybersecurity': ['hack', 'hacking', 'security', 'privacy', 'vpn', 'encryption', 'password', 'phishing'],
  'cozy-home': ['decor', 'interior', 'furniture', 'room', 'apartment', 'organize', 'cozy', 'aesthetic'],
  'language-learners': ['spanish', 'french', 'japanese', 'korean', 'german', 'chinese', 'duolingo', 'vocabulary'],
  'history-buffs': ['history', 'ancient', 'roman', 'medieval', 'war', 'civilization', 'archaeology', 'museum'],
  'career-growth': ['career', 'job', 'interview', 'resume', 'promotion', 'salary', 'linkedin', 'networking'],
  'board-game-geeks': ['boardgame', 'tabletop', 'dungeons', 'dnd', 'chess', 'catan', 'monopoly', 'cards'],
  'collectors-club': ['collection', 'collect', 'sneakers', 'vinyl', 'cards', 'figures', 'funko', 'pokemon', 'trading'],
  'cosplay-costumes': ['cosplay', 'costume', 'comic', 'convention', 'comiccon', 'fandom', 'wig', 'armor'],
  'animation-station': ['animation', 'animate', 'cartoon', 'frame', 'motion', '2d', '3d', 'blender', 'pixar'],
  'web3-crypto': ['crypto', 'bitcoin', 'ethereum', 'nft', 'blockchain', 'wallet', 'defi', 'web3', 'token'],
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'am', 'are', 'was', 'were', 'be', 'to', 'of', 'and', 'in', 'on',
  'for', 'with', 'my', 'your', 'this', 'that', 'just', 'got', 'new', 'so', 'but', 'its',
  'really', 'very', 'been', 'have', 'has', 'had', 'did', 'get', 'can', 'all', 'out', 'not',
  'some', 'more', 'would', 'like', 'how', 'now', 'about', 'than', 'them', 'what', 'when',
  'from', 'made', 'up', 'one', 'do', 'here', 'too', 'much', 'first', 'after', 'before',
  'over', 'love', 'best', 'ever', 'day', 'good', 'great', 'today', 'back', 'going', 'went',
  'will', 'also', 'way', 'time', 'still',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

function buildTopicIndex(topics: FullTopic[]): TopicIndexEntry[] {
  return topics.map(topic => {
    const keywords = new Map<string, number>();
    const slug = topic.slug || topic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Name words — weight 3
    extractKeywords(topic.name).forEach(w => {
      keywords.set(w, (keywords.get(w) || 0) + 3);
    });

    // Description words — weight 1
    if (topic.description) {
      extractKeywords(topic.description).forEach(w => {
        keywords.set(w, (keywords.get(w) || 0) + 1);
      });
    }

    // Extra curated keywords — weight 2
    const extras = TOPIC_EXTRA_KEYWORDS[slug];
    if (extras) {
      extras.forEach(w => {
        keywords.set(w, (keywords.get(w) || 0) + 2);
      });
    }

    return { topicId: topic.id, slug, keywords };
  });
}

function findMatchingTopics(
  caption: string,
  index: TopicIndexEntry[],
  followedTopicIds: Set<string>,
): { topicId: string; score: number }[] {
  const words = extractKeywords(caption);
  if (words.length === 0) return [];

  const scored: { topicId: string; score: number }[] = [];

  for (const entry of index) {
    if (followedTopicIds.has(entry.topicId)) continue;
    let score = 0;
    for (const word of words) {
      // Exact match — full weight
      const exactWeight = entry.keywords.get(word);
      if (exactWeight) {
        score += exactWeight;
        continue;
      }
      // Prefix/stem matching for inflections (painting/paintings, cook/cooking, etc.)
      // Only when both word and keyword are >= 4 chars to avoid false positives
      for (const [kw, weight] of entry.keywords) {
        if (kw.length >= 4 && word.length >= 4) {
          if (kw.startsWith(word) || word.startsWith(kw)) {
            score += Math.ceil(weight / 2);
            break;
          }
        }
      }
    }
    if (score > 0) scored.push({ topicId: entry.topicId, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

type CreatePostScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<CreatePostStackParamList, 'CreatePostHome'>,
  BottomTabNavigationProp<MainTabParamList>
>;

export default function CreatePostScreen() {
  const navigation = useNavigation<CreatePostScreenNavigationProp>();
  const { showCelebration } = useCoinCelebration();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Screen mode
  const [mode, setMode] = useState<ScreenMode>('camera');

  // Camera state
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [galleryThumbnail, setGalleryThumbnail] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Post state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  // Content policy state
  const [contentStatus, setContentStatus] = useState<ContentStatus>('unchecked');
  const [personCheckResult, setPersonCheckResult] = useState<PersonCheckResult | null>(null);
  const [showPersonOptions, setShowPersonOptions] = useState(false);

  // Visibility and topic selection
  const [visibility, setVisibility] = useState<Visibility>('friends_only');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [followedTopics, setFollowedTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Smart topic suggestions
  const [allTopics, setAllTopics] = useState<FullTopic[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<FullTopic[]>([]);
  const [joiningTopicId, setJoiningTopicId] = useState<string | null>(null);
  const topicIndexRef = useRef<TopicIndexEntry[]>([]);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coin balance, invest animation, image editor
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [showInvestAnimation, setShowInvestAnimation] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [rawImageUri, setRawImageUri] = useState<string | null>(null);
  const pendingPostDataRef = useRef<{
    imageUri: string;
    originalImageUri: string | null;
    caption: string;
    visibility: Visibility;
    selectedTopics: string[];
  } | null>(null);

  // Reset to camera mode when tab is focused
  useFocusEffect(
    useCallback(() => {
      setMode('camera');
      setImageUri(null);
      setOriginalImageUri(null);
      setRawImageUri(null);
      setCaption('');
      setContentStatus('unchecked');
      setPersonCheckResult(null);
      setVisibility('friends_only');
      setSelectedTopics([]);
      setSuggestedTopics([]);
      setShowEditor(false);
      setShowInvestAnimation(false);
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
      loadFollowedTopics();
      loadAllTopics();
      loadGalleryThumbnail();
      loadCoinBalance();
    }, [])
  );

  // Cleanup suggestion timer on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    };
  }, []);

  // Load last gallery photo for thumbnail
  const loadGalleryThumbnail = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      const assets = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: 'photo',
        sortBy: ['creationTime'],
      });
      if (assets.assets.length > 0) {
        // Use getAssetInfoAsync to get localUri (file:// scheme)
        // because assets[0].uri may be ph:// or content:// which Image can't render
        const assetInfo = await MediaLibrary.getAssetInfoAsync(assets.assets[0]);
        setGalleryThumbnail(assetInfo.localUri || assets.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to load gallery thumbnail:', error);
    }
  };

  const loadCoinBalance = async () => {
    try {
      const coins = await api.getMyCoins();
      setCoinBalance(coins.totalCoins);
    } catch (error) {
      console.error('Failed to load coin balance:', error);
    }
  };

  const loadFollowedTopics = async () => {
    try {
      setLoadingTopics(true);
      const response = await api.getMyFollowedTopics();
      setFollowedTopics(response.topics || []);
    } catch (error) {
      console.error('Failed to load followed topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  const loadAllTopics = async () => {
    try {
      const response = await api.getTopics();
      const topics: FullTopic[] = response.topics || [];
      setAllTopics(topics);
      topicIndexRef.current = buildTopicIndex(topics);
    } catch (error) {
      console.error('Failed to load all topics:', error);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Debounced caption change for smart suggestions
  const handleCaptionChange = (text: string) => {
    setCaption(text);
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    suggestionTimerRef.current = setTimeout(() => {
      updateSuggestions(text);
    }, 500);
  };

  const updateSuggestions = (text: string) => {
    const followedIds = new Set(followedTopics.map(t => t.id));
    // Also exclude already-selected topics
    selectedTopics.forEach(id => followedIds.add(id));
    const matches = findMatchingTopics(text, topicIndexRef.current, followedIds);
    const matched = matches
      .map(m => allTopics.find(t => t.id === m.topicId))
      .filter((t): t is FullTopic => !!t);
    setSuggestedTopics(matched);
  };

  // Join & Post handler
  const handleJoinAndPost = async (topic: FullTopic) => {
    setJoiningTopicId(topic.id);
    try {
      await api.followTopic(topic.id);
      setFollowedTopics(prev => [...prev, { ...topic, isFollowing: true }]);
      setSelectedTopics(prev => [...prev, topic.id]);
      setSuggestedTopics(prev => prev.filter(t => t.id !== topic.id));
      if (visibility === 'friends_only') {
        setVisibility('topics_and_friends');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join community. Please try again.');
    } finally {
      setJoiningTopicId(null);
    }
  };

  // Handle image selection — opens editor first
  const handleImageSelected = useCallback(async (uri: string) => {
    setRawImageUri(uri);
    setShowEditor(true);
  }, []);

  // Called when image editor completes
  const handleEditorComplete = useCallback((croppedUri: string, origUri: string, wasCropped: boolean) => {
    setShowEditor(false);
    setImageUri(croppedUri);
    setOriginalImageUri(origUri);
    setPersonCheckResult(null);
    setMode('compose');
    setContentStatus('ready');

    if (wasCropped) {
      Alert.alert(
        'Cropping Info',
        'Others will see the full uncropped image when they tap your post.',
        [{ text: 'Got it' }]
      );
    }
  }, []);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
    setRawImageUri(null);
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      handleImageSelected(result.assets[0].uri);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        // Normalize EXIF orientation to fix landscape-when-portrait issue
        const normalized = await ImageManipulator.manipulateAsync(
          photo.uri,
          [],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        handleImageSelected(normalized.uri);
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(prev => (prev === 'off' ? 'on' : 'off'));
  };

  // Back to camera mode
  const backToCamera = () => {
    setMode('camera');
    setImageUri(null);
    setOriginalImageUri(null);
    setRawImageUri(null);
    setContentStatus('unchecked');
    setPersonCheckResult(null);
  };

  // Handle "Convert to 3D Avatar" option
  const handleConvertToAvatar = () => {
    setShowPersonOptions(false);
    navigation.navigate('FullBodyAvatar', { imageUri: originalImageUri || undefined });
  };

  // Handle "Blur Faces" option — disabled for now
  const handleBlurFaces = async () => {
    // Face blurring disabled — just go back to camera
    setShowPersonOptions(false);
    backToCamera();
  };

  // Handle cancel person options
  const handleCancelPersonOptions = () => {
    setShowPersonOptions(false);
    backToCamera();
  };

  const handlePost = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (contentStatus === 'person_detected') {
      Alert.alert(
        'Person Detected',
        'Please choose to convert to 3D avatar or blur faces before posting.',
        [{ text: 'OK', onPress: () => setShowPersonOptions(true) }]
      );
      return;
    }

    if (visibility !== 'friends_only' && selectedTopics.length === 0) {
      Alert.alert('Select Topics', 'Please select at least one topic for your community post.');
      return;
    }

    // Check coin balance
    if (coinBalance !== null && coinBalance < 3) {
      Alert.alert(
        'Need 3 Coins',
        `Posting costs 3 coins but you only have ${coinBalance}. Earn more by claiming cooldown coins or receiving gifts!`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Store pending post data and show invest animation
    pendingPostDataRef.current = {
      imageUri,
      originalImageUri,
      caption,
      visibility,
      selectedTopics: [...selectedTopics],
    };
    setShowInvestAnimation(true);
  };

  const submitPost = async () => {
    const postData = pendingPostDataRef.current;
    if (!postData) return;

    setLoading(true);
    try {
      const response = await api.createPost(
        postData.imageUri,
        postData.caption,
        postData.visibility,
        postData.selectedTopics,
        postData.originalImageUri || undefined
      );

      // Refresh coin balance
      loadCoinBalance();

      setImageUri(null);
      setOriginalImageUri(null);
      setRawImageUri(null);
      setCaption('');
      setContentStatus('unchecked');
      setPersonCheckResult(null);
      setVisibility('friends_only');
      setSelectedTopics([]);
      pendingPostDataRef.current = null;

      if (response.coinsEarned && response.coinsEarned > 0) {
        showCelebration(response.coinsEarned, 'post');
        setTimeout(() => navigation.navigate('Feed'), 3200);
      } else {
        Alert.alert('Success', 'Post created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Feed'),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Post creation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create post. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestAnimationComplete = () => {
    setShowInvestAnimation(false);
    submitPost();
  };

  const canPost = imageUri && contentStatus === 'ready' && !loading;

  // ─── CAMERA MODE ──────────────────────────────────────────────
  if (mode === 'camera') {
    // Permission not yet determined
    if (!cameraPermission) {
      return <View style={[styles.container, { backgroundColor: '#000' }]} />;
    }

    // Permission denied
    if (!cameraPermission.granted) {
      return (
        <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
          <Ionicons name="camera-outline" size={64} color={colors.text.secondary} />
          <Text style={[styles.permissionTitle, { color: colors.text.primary }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.text.secondary }]}>
            SeeMe needs camera access to take photos for your posts.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryFallbackButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={20} color={Colors.brand.blue} />
            <Text style={[styles.galleryFallbackText, { color: Colors.brand.blue }]}>
              Choose from Gallery
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
        />

        {/* Top Controls */}
        <View style={[styles.cameraTopBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.cameraTopButton}
            onPress={() => navigation.navigate('Feed')}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.cameraTopRight}>
            <TouchableOpacity style={styles.cameraTopButton} onPress={toggleFlash}>
              <Ionicons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraTopButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.cameraBottomBar, { paddingBottom: insets.bottom + 20 }]}>
          {/* Gallery Thumbnail */}
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            {galleryThumbnail ? (
              <Image source={{ uri: galleryThumbnail }} style={styles.galleryThumbnail} />
            ) : (
              <View style={styles.galleryPlaceholder}>
                <Ionicons name="images" size={22} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={capturePhoto}
            disabled={capturing}
            activeOpacity={0.7}
          >
            <View style={[
              styles.captureButtonInner,
              capturing && styles.captureButtonCapturing,
            ]} />
          </TouchableOpacity>

          {/* Spacer for symmetry */}
          <View style={styles.captureBottomSpacer} />
        </View>

        {/* Image Editor Modal */}
        {rawImageUri && (
          <ImageEditor
            imageUri={rawImageUri}
            visible={showEditor}
            onComplete={handleEditorComplete}
            onCancel={handleEditorCancel}
          />
        )}
      </View>
    );
  }

  // ─── COMPOSE MODE ─────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Bar */}
      <View style={[
        styles.composeTopBar,
        { paddingTop: insets.top + 4, borderBottomColor: colors.border },
      ]}>
        <TouchableOpacity style={styles.composeBackButton} onPress={backToCamera}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.composeTitle, { color: colors.text.primary }]}>New Post</Text>
        <View style={styles.shareArea}>
          {coinBalance !== null && (
            <View style={styles.coinBalanceBadge}>
              <Ionicons name="heart" size={12} color="#FBBF24" />
              <Text style={styles.coinBalanceText}>{coinBalance}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.shareButton, !canPost && styles.shareButtonDisabled]}
            onPress={handlePost}
            disabled={!canPost}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.composeScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Preview */}
          {imageUri && (
            <View style={styles.composeImageContainer}>
              <Image source={{ uri: imageUri }} style={styles.composeImage} />

              {/* Status Overlays */}
              {contentStatus === 'checking' && (
                <View style={styles.statusOverlay}>
                  <ActivityIndicator color="#FFF" size="large" />
                  <Text style={styles.statusText}>Checking image...</Text>
                </View>
              )}

              {contentStatus === 'blurring' && (
                <View style={styles.statusOverlay}>
                  <ActivityIndicator color="#FFF" size="large" />
                  <Text style={styles.statusText}>Blurring faces...</Text>
                </View>
              )}

              {contentStatus === 'person_detected' && (
                <View style={styles.personDetectedBanner}>
                  <Ionicons name="warning" size={16} color="#FFF" />
                  <Text style={styles.personDetectedText}>Person detected</Text>
                  <TouchableOpacity onPress={() => setShowPersonOptions(true)}>
                    <Text style={styles.chooseOptionText}>Options</Text>
                  </TouchableOpacity>
                </View>
              )}

              {contentStatus === 'ready' && (
                <View style={styles.readyBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                  <Text style={styles.readyText}>Ready</Text>
                </View>
              )}

              {/* Cropped indicator */}
              {originalImageUri && imageUri && originalImageUri !== imageUri && (
                <View style={styles.croppedBadge}>
                  <Ionicons name="crop" size={14} color="#FFF" />
                  <Text style={styles.croppedBadgeText}>Cropped</Text>
                </View>
              )}
            </View>
          )}

          {/* Caption Input */}
          <View style={[styles.captionSection, { borderBottomColor: colors.borderLight }]}>
            <TextInput
              style={[styles.captionInput, { color: colors.text.primary }]}
              placeholder="Write a caption..."
              placeholderTextColor={colors.text.tertiary}
              value={caption}
              onChangeText={handleCaptionChange}
              multiline
              numberOfLines={3}
            />
            <View style={styles.captionMeta}>
              <Text style={[
                styles.counterText,
                caption.trim().length >= 20 && { color: Colors.common.success },
              ]}>
                {caption.trim().length}/20
              </Text>
              {caption.trim().length >= 20 ? (
                <Text style={{ fontSize: 12, color: Colors.common.success, fontWeight: '600' }}>
                  +2 coins earned!
                </Text>
              ) : (
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                  {20 - caption.trim().length} more for +2 coins
                </Text>
              )}
            </View>

            {/* Coin cost info */}
            <View style={[styles.coinCostInfo, {
              backgroundColor: isDark ? '#2D2305' : '#FFFBEB',
            }]}>
              <Ionicons name="heart" size={14} color="#FBBF24" />
              <Text style={[styles.coinCostText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                Costs 3 coins to post
              </Text>
              {caption.trim().length >= 20 && (
                <Text style={{ fontSize: 12, color: Colors.common.success, fontWeight: '600' }}>
                  {' '}(+2 back!)
                </Text>
              )}
            </View>
          </View>

          {/* Smart Topic Suggestions */}
          {suggestedTopics.length > 0 && (
            <View style={[styles.suggestionsSection, {
              backgroundColor: isDark ? '#1A1525' : '#FAFAFE',
              borderBottomColor: colors.borderLight,
            }]}>
              <View style={styles.suggestionsHeader}>
                <Text style={[styles.suggestionsTitle, { color: colors.text.primary }]}>
                  Suggested Communities
                </Text>
                <Text style={[styles.suggestionsSubtitle, { color: colors.text.secondary }]}>
                  Based on your caption — tap to join
                </Text>
              </View>
              {suggestedTopics.map(topic => {
                const isJoining = joiningTopicId === topic.id;
                return (
                  <TouchableOpacity
                    key={topic.id}
                    style={[styles.suggestionCard, {
                      backgroundColor: isDark ? colors.surface : '#FFF',
                      borderColor: isDark ? colors.border : '#E5E7EB',
                    }]}
                    onPress={() => handleJoinAndPost(topic)}
                    disabled={isJoining}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionCardTop}>
                      <Text style={styles.suggestionEmoji}>
                        {topic.iconEmoji || '📌'}
                      </Text>
                      <View style={styles.suggestionInfo}>
                        <Text style={[styles.suggestionName, { color: colors.text.primary }]} numberOfLines={1}>
                          {topic.name}
                        </Text>
                        {topic.description ? (
                          <Text style={[styles.suggestionDesc, { color: colors.text.secondary }]} numberOfLines={1}>
                            {topic.description}
                          </Text>
                        ) : null}
                      </View>
                      {isJoining ? (
                        <ActivityIndicator size="small" color={Colors.brand.primary} />
                      ) : (
                        <Ionicons name="add-circle" size={24} color={Colors.brand.primary} />
                      )}
                    </View>
                    <View style={styles.suggestionAction}>
                      <Ionicons name="enter-outline" size={14} color={Colors.brand.primary} />
                      <Text style={[styles.suggestionActionText, { color: Colors.brand.primary }]}>
                        Join & Post
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Visibility Selector — Compact Pills */}
          <View style={styles.composeSection}>
            <Text style={[styles.composeSectionTitle, { color: colors.text.primary }]}>
              Post to
            </Text>
            <View style={styles.visibilityPills}>
              {([
                { key: 'friends_only', icon: 'people', label: 'Friends' },
                { key: 'topics_only', icon: 'grid', label: 'Topics' },
                { key: 'topics_and_friends', icon: 'globe', label: 'Both' },
              ] as const).map(opt => {
                const isActive = visibility === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.visibilityPill,
                      { borderColor: isActive ? Colors.brand.primary : colors.border },
                      isActive && { backgroundColor: isDark ? '#2D1A4E' : '#F5F3FF' },
                    ]}
                    onPress={() => setVisibility(opt.key)}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={isActive ? Colors.brand.primary : colors.text.secondary}
                    />
                    <Text style={[
                      styles.visibilityPillText,
                      { color: isActive ? Colors.brand.primary : colors.text.secondary },
                      isActive && { fontWeight: '600' },
                    ]}>
                      {opt.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={14} color={Colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Topic Selection */}
          {visibility !== 'friends_only' && (
            <View style={styles.composeSection}>
              <Text style={[styles.composeSectionTitle, { color: colors.text.primary }]}>
                Your Communities
              </Text>
              <Text style={[styles.composeSectionSubtitle, { color: colors.text.secondary }]}>
                Select topics to share with those communities
              </Text>

              {loadingTopics ? (
                <ActivityIndicator size="small" color={Colors.brand.primary} style={{ marginVertical: 16 }} />
              ) : followedTopics.length > 0 ? (
                <View style={styles.topicsGrid}>
                  {followedTopics.map(topic => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                      <TouchableOpacity
                        key={topic.id}
                        style={[
                          styles.topicChip,
                          { backgroundColor: isDark ? colors.surfaceVariant : '#F3F4F6' },
                          isSelected && {
                            backgroundColor: isDark ? '#2D1A4E' : '#EDE9FE',
                            borderWidth: 1,
                            borderColor: Colors.brand.primary,
                          },
                        ]}
                        onPress={() => toggleTopic(topic.id)}
                      >
                        {topic.iconEmoji && isIoniconName(topic.iconEmoji) ? (
                          <Ionicons name={`${topic.iconEmoji}-outline` as any} size={14} color={Colors.brand.primary} />
                        ) : (
                          <Text style={{ fontSize: 14 }}>{topic.iconEmoji || '📌'}</Text>
                        )}
                        <Text style={[
                          styles.topicName,
                          { color: isSelected ? Colors.brand.primary : colors.text.secondary },
                          isSelected && { fontWeight: '600' },
                        ]}>
                          {topic.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={14} color={Colors.brand.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.noTopicsContainer, {
                  backgroundColor: isDark ? colors.surface : '#F9FAFB',
                  borderColor: colors.border,
                }]}>
                  <Ionicons name="planet-outline" size={36} color={colors.text.tertiary} />
                  <Text style={[styles.noTopicsTitle, { color: colors.text.primary }]}>
                    Join communities to share here!
                  </Text>
                  <Text style={[styles.noTopicsText, { color: colors.text.secondary }]}>
                    Follow topics you're interested in, then your posts can reach people who share your passions.
                  </Text>
                  <TouchableOpacity
                    style={styles.browseTopicsButton}
                    onPress={() => (navigation as any).navigate('Topics', { screen: 'BrowseTopics' })}
                  >
                    <Ionicons name="compass" size={16} color="#FFF" />
                    <Text style={styles.browseTopicsButtonText}>Discover Communities</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Beginner info */}
              <View style={[styles.beginnerInfo, {
                backgroundColor: isDark ? '#2D2305' : '#FFFBEB',
              }]}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
                <Text style={[styles.beginnerText, {
                  color: isDark ? '#FCD34D' : '#92400E',
                }]}>
                  New to a topic? Your posts get a beginner badge and extra visibility!
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Person Detected Options Modal */}
      <Modal
        visible={showPersonOptions}
        transparent
        animationType="slide"
        onRequestClose={handleCancelPersonOptions}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: isDark ? colors.surface : '#FFF',
          }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.warningIcon, {
                backgroundColor: isDark ? '#3D2F05' : '#FEF3C7',
              }]}>
                <Ionicons name="person" size={32} color="#F59E0B" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Person Detected!
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
                To protect privacy, choose how to handle this image:
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, {
                backgroundColor: isDark ? colors.surfaceVariant : '#F5F5F5',
              }]}
              onPress={handleConvertToAvatar}
            >
              <View style={[styles.optionIconContainer, {
                backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
              }]}>
                <Ionicons name="person-circle" size={28} color={Colors.brand.secondary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.text.primary }]}>
                  Convert to 3D Avatar
                </Text>
                <Text style={[styles.optionDescription, { color: colors.text.secondary }]}>
                  Turn yourself into a cool 3D character!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, {
                backgroundColor: isDark ? colors.surfaceVariant : '#F5F5F5',
              }]}
              onPress={handleBlurFaces}
            >
              <View style={[styles.optionIconContainer, {
                backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
              }]}>
                <Ionicons name="eye-off" size={28} color={Colors.brand.secondary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.text.primary }]}>
                  Blur All Faces
                </Text>
                <Text style={[styles.optionDescription, { color: colors.text.secondary }]}>
                  Keep the photo but blur faces for privacy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelPersonOptions}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>
                Choose Different Image
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Coin Invest Animation */}
      <CoinInvestAnimation
        visible={showInvestAnimation}
        amount={3}
        onComplete={handleInvestAnimationComplete}
      />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Permission View ────────────────────────────────────────────
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: Colors.brand.blue,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 24,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  galleryFallbackText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Camera Mode ────────────────────────────────────────────────
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  cameraTopRight: {
    flexDirection: 'row',
    gap: 16,
  },
  cameraTopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 20,
    zIndex: 10,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  galleryThumbnail: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFF',
  },
  captureButtonCapturing: {
    backgroundColor: '#CCC',
    transform: [{ scale: 0.9 }],
  },
  captureBottomSpacer: {
    width: 48,
    height: 48,
  },

  // ── Compose Mode ───────────────────────────────────────────────
  composeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  composeBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composeTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: Colors.brand.blue,
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.4,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  composeScrollContent: {
    paddingBottom: 40,
  },

  // Image Preview
  composeImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  composeImage: {
    width: '100%',
    height: '100%',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 12,
  },
  personDetectedBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.92)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  personDetectedText: {
    color: '#FFF',
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
  },
  chooseOptionText: {
    color: '#FFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  readyBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.9)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  readyText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // Caption
  captionSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  captionInput: {
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  captionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  counterText: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Compose sections
  composeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  composeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  composeSectionSubtitle: {
    fontSize: 13,
    marginBottom: 10,
  },

  // Visibility pills
  visibilityPills: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 5,
  },
  visibilityPillText: {
    fontSize: 13,
  },

  // Topics
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 18,
    gap: 5,
  },
  topicName: {
    fontSize: 13,
  },
  noTopicsContainer: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  noTopicsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  noTopicsText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  browseTopicsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 5,
  },
  browseTopicsButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  beginnerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 11,
    borderRadius: 10,
    gap: 8,
    marginTop: 10,
  },
  beginnerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Smart Suggestions ──────────────────────────────────────────
  suggestionsSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionsHeader: {
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionsSubtitle: {
    fontSize: 12,
  },
  suggestionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  suggestionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionEmoji: {
    fontSize: 22,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  suggestionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingLeft: 32,
  },
  suggestionActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Person Options Modal ───────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
  },

  // ── Coin Balance & Cost ─────────────────────────────────────────
  shareArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinBalanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  coinBalanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
  },
  coinCostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  coinCostText: {
    fontSize: 12,
    fontWeight: '500',
  },
  croppedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  croppedBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
