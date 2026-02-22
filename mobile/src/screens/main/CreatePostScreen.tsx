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
import { useNavigation, useRoute, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList, CreatePostStackParamList } from '../../navigation/types';
import { api } from '../../services/api';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import { useTheme, Colors } from '../../theme';
import SkyCoinIcon, { SKY_COIN_COLORS } from '../../components/coins/SkyCoinIcon';
import CoinInvestAnimation from '../../components/coins/CoinInvestAnimation';
import ImageEditor from '../../components/ImageEditor';
import { analyzeImage } from '../../services/imageAnalyzer';
import * as draftService from '../../services/draftService';
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
  'pet-lovers': ['cat', 'cats', 'kitten', 'kittens', 'dog', 'dogs', 'puppy', 'puppies', 'hamster', 'parrot', 'fish', 'rabbit', 'turtle', 'bird', 'paw', 'paws', 'furry', 'fluffy', 'adorable', 'rescue', 'adopted', 'vet', 'walk', 'walks', 'fetch', 'treats', 'snuggle', 'cuddle', 'meow', 'woof', 'bark', 'purr', 'goldfish', 'aquarium', 'ferret', 'guinea', 'hedgehog', 'lizard', 'snake', 'pet', 'pets', 'animal', 'animals', 'cute', 'cutest', 'precious', 'buddy', 'companion', 'shelter'],
  'foodies': ['pizza', 'sushi', 'burger', 'baking', 'cook', 'cooking', 'recipe', 'dinner', 'lunch', 'breakfast', 'meal', 'food', 'foodie', 'yummy', 'delicious', 'tasty', 'hungry', 'craving', 'snack', 'restaurant', 'homemade', 'brunch', 'dessert', 'cake', 'pasta', 'ramen', 'tacos', 'bbq', 'grill', 'steak', 'salad', 'smoothie', 'vegan', 'vegetarian', 'glutenfree', 'spicy', 'seafood', 'noodles', 'fried', 'roasted', 'fresh', 'plating', 'kitchen', 'chef', 'eat', 'eating', 'ate', 'ice', 'cream', 'chocolate', 'fries', 'chicken', 'sandwich', 'bowl', 'plate', 'dish'],
  'gaming-hub': ['xbox', 'playstation', 'ps5', 'nintendo', 'switch', 'fortnite', 'minecraft', 'valorant', 'league', 'fps', 'rpg', 'gamer', 'gaming', 'game', 'games', 'stream', 'streaming', 'twitch', 'esports', 'controller', 'console', 'coop', 'multiplayer', 'singleplayer', 'boss', 'raid', 'loot', 'ranked', 'competitive', 'elden', 'zelda', 'mario', 'apex', 'overwatch', 'gta', 'roblox', 'steam', 'headset', 'clan', 'squad', 'grind', 'level', 'quest', 'spawn', 'playing', 'played'],
  'coders-united': ['code', 'coding', 'javascript', 'python', 'react', 'typescript', 'github', 'bug', 'deploy', 'api', 'frontend', 'backend', 'developer', 'programming', 'software', 'debug', 'debugging', 'terminal', 'vscode', 'fullstack', 'html', 'css', 'node', 'database', 'server', 'commit', 'merge', 'pull', 'repo', 'algorithm', 'function', 'class', 'framework', 'library', 'npm', 'docker', 'devops', 'rust', 'java', 'swift', 'kotlin', 'csharp', 'sql', 'linux', 'stack', 'overflow'],
  'gym-life': ['workout', 'bench', 'squat', 'deadlift', 'gains', 'weights', 'lifting', 'muscle', 'bulk', 'cut', 'gym', 'fitness', 'exercise', 'training', 'cardio', 'reps', 'sets', 'pump', 'shredded', 'lean', 'protein', 'preworkout', 'dumbbell', 'barbell', 'crossfit', 'bodybuilding', 'abs', 'chest', 'legs', 'arms', 'shoulders', 'legday', 'pushup', 'pullup', 'plank', 'hiit', 'sweat', 'grind', 'strong', 'strength', 'flex'],
  'photography': ['portrait', 'landscape', 'sunset', 'sunrise', 'lens', 'dslr', 'mirrorless', 'edit', 'lightroom', 'photo', 'photos', 'picture', 'pictures', 'pic', 'pics', 'camera', 'shot', 'shots', 'shoot', 'shooting', 'capture', 'captured', 'golden', 'hour', 'exposure', 'shutter', 'aperture', 'bokeh', 'macro', 'telephoto', 'raw', 'candid', 'composition', 'framing', 'photoshoot', 'snapped', 'snap', 'film', 'analog', 'fujifilm', 'canon', 'nikon', 'sony', 'tripod', 'flash', 'depth', 'focus', 'selfie', 'selfies', 'angle', 'angles', 'scenery', 'scenic', 'view', 'views', 'beautiful', 'gorgeous', 'stunning', 'aesthetic', 'vibes', 'lighting', 'filter', 'edited', 'image', 'images'],
  'digital-art': ['drawing', 'sketch', 'procreate', 'tablet', 'commission', 'digital', 'illustration', 'fanart', 'art', 'artist', 'artwork', 'draw', 'drew', 'painting', 'painted', 'design', 'graphic', 'doodle', 'lineart', 'coloring', 'shading', 'concept', 'character', 'canvas', 'brush', 'layer', 'wacom', 'ipad', 'pixel', 'vector', 'creative', 'wip', 'timelapse', 'inktober'],
  'music-makers': ['song', 'guitar', 'piano', 'drums', 'singing', 'beat', 'producer', 'studio', 'album', 'track', 'music', 'musician', 'band', 'concert', 'live', 'perform', 'performing', 'melody', 'chord', 'lyrics', 'vocal', 'bass', 'synth', 'dj', 'remix', 'playlist', 'spotify', 'vinyl', 'recording', 'mixing', 'mastering', 'jam', 'jamming', 'practice', 'ukulele', 'violin', 'saxophone', 'flute', 'compose', 'composing', 'cover', 'listening', 'listen', 'headphones'],
  'anime-manga': ['anime', 'manga', 'otaku', 'cosplay', 'naruto', 'onepiece', 'dragonball', 'jujutsu', 'demon', 'slayer', 'attack', 'titan', 'hero', 'academia', 'ghibli', 'shonen', 'shojo', 'waifu', 'senpai', 'kawaii', 'chibi', 'weeb', 'sub', 'dub', 'episode', 'season', 'crunchyroll', 'figure', 'figurine', 'mecha', 'isekai', 'seinen', 'haikyuu', 'chainsaw', 'spy', 'family'],
  'runners-world': ['run', 'running', 'jog', 'jogging', 'marathon', '5k', '10k', 'treadmill', 'pace', 'runner', 'runners', 'sprint', 'sprinting', 'trail', 'race', 'racing', 'half', 'ultra', 'strava', 'garmin', 'mile', 'miles', 'splits', 'tempo', 'fartlek', 'intervals', 'stride', 'laps', 'finish', 'finisher', 'medal', 'personal', 'record'],
  'coffee-tea': ['coffee', 'latte', 'espresso', 'tea', 'matcha', 'brew', 'cafe', 'cappuccino', 'barista', 'caffeine', 'beans', 'roast', 'pour', 'drip', 'chemex', 'aeropress', 'mocha', 'iced', 'cold', 'cortado', 'americano', 'herbal', 'chai', 'earl', 'grey', 'mug', 'cup', 'morning', 'cozy'],
  'book-club': ['book', 'books', 'reading', 'novel', 'fiction', 'nonfiction', 'author', 'chapter', 'library', 'read', 'bookshelf', 'kindle', 'ebook', 'hardcover', 'paperback', 'bestseller', 'thriller', 'mystery', 'romance', 'fantasy', 'scifi', 'memoir', 'biography', 'bookworm', 'bookish', 'bookmark', 'pages', 'finished', 'recommend', 'tbr', 'genre', 'literary', 'series'],
  'outdoor-adventures': ['hiking', 'hike', 'camping', 'trail', 'mountain', 'climbing', 'nature', 'backpacking', 'outdoor', 'outdoors', 'adventure', 'wilderness', 'forest', 'woods', 'summit', 'peak', 'lake', 'river', 'waterfall', 'canyon', 'park', 'national', 'tent', 'campfire', 'kayak', 'canoe', 'explore', 'exploring', 'scenic', 'overlook', 'views', 'vista', 'trek', 'trekking', 'sky', 'clouds', 'trees', 'sunset', 'sunrise', 'beach', 'ocean', 'sea'],
  'plant-parents': ['plant', 'plants', 'garden', 'succulent', 'cactus', 'flower', 'flowers', 'soil', 'watering', 'gardening', 'houseplant', 'houseplants', 'pothos', 'monstera', 'fern', 'bloom', 'blooming', 'growing', 'growth', 'seedling', 'seed', 'seeds', 'repot', 'propagate', 'propagation', 'planter', 'pot', 'pots', 'leaf', 'leaves', 'green', 'greenery', 'herb', 'herbs', 'botanical', 'rose', 'roses', 'tulip', 'sunflower'],
  'yoga-flow': ['yoga', 'meditation', 'stretch', 'flexibility', 'namaste', 'zen', 'pose', 'breathe', 'mat', 'flow', 'vinyasa', 'asana', 'chakra', 'mindful', 'relax', 'relaxing', 'balance', 'core', 'pilates', 'savasana', 'warrior', 'downdog', 'breathwork', 'centering', 'grounding', 'inner', 'peace'],
  'mindfulness': ['mental', 'wellness', 'selfcare', 'journal', 'journaling', 'anxiety', 'calm', 'mindful', 'therapy', 'health', 'healing', 'gratitude', 'grateful', 'thankful', 'affirmation', 'positive', 'positivity', 'selflove', 'boundaries', 'growth', 'burnout', 'rest', 'recharge', 'detox', 'meditate', 'breathe', 'peace', 'peaceful', 'reflection', 'intention', 'coping', 'stress', 'wellbeing', 'happy', 'happiness', 'blessed', 'vibes', 'mood', 'feeling', 'feelings', 'smile', 'smiling', 'grateful', 'appreciate', 'moment', 'moments', 'enjoy', 'enjoying', 'life', 'living'],
  'fashion-forward': ['outfit', 'ootd', 'style', 'clothes', 'fashion', 'dress', 'sneakers', 'thrift', 'streetwear', 'drip', 'fit', 'fits', 'wear', 'wearing', 'wore', 'wardrobe', 'vintage', 'designer', 'brand', 'boots', 'jacket', 'hoodie', 'jeans', 'accessories', 'jewelry', 'rings', 'necklace', 'watch', 'sunglasses', 'haul', 'shopping', 'lookbook', 'aesthetic', 'trendy', 'grunge', 'preppy', 'casual', 'formal', 'runway', 'hair', 'nails', 'look', 'looking', 'cute', 'pretty'],
  'ai-explorers': ['chatgpt', 'claude', 'openai', 'llm', 'neural', 'deeplearning', 'prompt', 'model', 'artificial', 'intelligence', 'machine', 'learning', 'gpt', 'gemini', 'copilot', 'midjourney', 'dalle', 'stable', 'diffusion', 'transformer', 'finetune', 'training', 'dataset', 'tokens', 'inference', 'automation', 'robot', 'robotics', 'computer', 'vision'],
  'travel-diaries': ['travel', 'trip', 'vacation', 'flight', 'hotel', 'beach', 'city', 'explore', 'passport', 'abroad', 'traveling', 'travelling', 'wanderlust', 'backpack', 'hostel', 'airbnb', 'resort', 'island', 'roadtrip', 'destination', 'sightseeing', 'tourist', 'tourism', 'airport', 'luggage', 'souvenir', 'itinerary', 'adventure', 'europe', 'asia', 'japan', 'paris', 'bali', 'london', 'nyc', 'mexico', 'thailand'],
  'sports-fans': ['football', 'basketball', 'soccer', 'baseball', 'nba', 'nfl', 'cricket', 'tennis', 'match', 'sport', 'sports', 'team', 'game', 'score', 'win', 'won', 'lost', 'season', 'playoffs', 'championship', 'finals', 'league', 'player', 'coach', 'referee', 'goal', 'touchdown', 'homerun', 'dunk', 'slam', 'stadium', 'fan', 'fans', 'jersey', 'highlights', 'replay', 'mvp', 'hockey', 'volleyball', 'rugby', 'golf', 'swimming'],
  'writers-corner': ['writing', 'write', 'poem', 'poetry', 'story', 'creative', 'draft', 'fiction', 'essay', 'writer', 'wrote', 'written', 'prose', 'narrative', 'plot', 'character', 'dialogue', 'manuscript', 'publish', 'published', 'blog', 'blogging', 'article', 'wip', 'wordcount', 'editing', 'revision', 'nanowrimo', 'haiku', 'sonnet', 'verse', 'freewrite', 'storytelling', 'memoir', 'funny', 'joke', 'jokes', 'humor', 'hilarious', 'comedy', 'meme', 'memes', 'lol', 'lmao', 'haha', 'hahaha', 'rofl', 'pun', 'puns', 'sarcasm', 'witty', 'laugh', 'laughing'],
  'diy-crafts': ['craft', 'crafts', 'handmade', 'knitting', 'sewing', 'woodwork', 'crochet', 'diy', 'build', 'crafting', 'project', 'homemade', 'upcycle', 'recycle', 'paint', 'glue', 'stitch', 'yarn', 'fabric', 'embroidery', 'pottery', 'clay', 'resin', 'macrame', 'scrapbook', 'origami', 'weaving', 'quilt', 'beads', 'jewelry', 'candle', 'soap', 'maker', 'makers'],
  'startup-life': ['startup', 'founder', 'entrepreneur', 'business', 'launch', 'product', 'funding', 'investor', 'pitch', 'mvp', 'saas', 'revenue', 'customers', 'scale', 'scaling', 'growth', 'hustle', 'grind', 'venture', 'capital', 'seed', 'series', 'valuation', 'bootstrapped', 'cofounders', 'pivot', 'market', 'traction', 'equity', 'shares', 'ipo'],
  'study-buddies': ['study', 'studying', 'exam', 'homework', 'school', 'university', 'college', 'class', 'lecture', 'student', 'notes', 'textbook', 'grades', 'gpa', 'finals', 'midterm', 'quiz', 'assignment', 'essay', 'thesis', 'degree', 'major', 'tutor', 'tutoring', 'campus', 'dorm', 'library', 'semester', 'graduate', 'scholarship', 'cramming', 'flashcards'],
  'science-nerds': ['science', 'physics', 'chemistry', 'biology', 'experiment', 'research', 'lab', 'space', 'nasa', 'scientist', 'molecule', 'atom', 'quantum', 'theory', 'hypothesis', 'telescope', 'microscope', 'dna', 'genome', 'evolution', 'mars', 'moon', 'planet', 'galaxy', 'universe', 'cosmos', 'astronomy', 'rocket', 'satellite', 'climate', 'ecology', 'cells', 'neuroscience', 'stem'],
  'martial-arts': ['karate', 'boxing', 'bjj', 'taekwondo', 'mma', 'kickboxing', 'sparring', 'belt', 'dojo', 'fighter', 'fighting', 'martial', 'judo', 'muay', 'thai', 'wrestling', 'grappling', 'punch', 'kick', 'submission', 'ufc', 'knockout', 'round', 'ring', 'training', 'sensei', 'kata'],
  'pc-builders': ['pc', 'gpu', 'cpu', 'ram', 'build', 'setup', 'battlestation', 'monitor', 'keyboard', 'rgb', 'computer', 'desktop', 'custom', 'overclock', 'cooling', 'ssd', 'motherboard', 'case', 'nvidia', 'amd', 'intel', 'rtx', 'radeon', 'mechanical', 'mouse', 'display', 'ultrawide', 'fps', 'benchmark', 'upgrade', 'specs', 'rig', 'cable', 'management'],
  'tech-news': ['iphone', 'android', 'apple', 'samsung', 'google', 'gadget', 'app', 'update', 'release', 'tech', 'technology', 'device', 'devices', 'pixel', 'watch', 'smartwatch', 'earbuds', 'airpods', 'tablet', 'laptop', 'macbook', 'windows', 'ios', 'feature', 'review', 'unboxing', 'specs', 'leaked', 'rumor', 'launch', 'upgrade', 'software', 'hardware', 'wearable', 'phone', 'screen'],
  'cybersecurity': ['hack', 'hacking', 'security', 'privacy', 'vpn', 'encryption', 'password', 'phishing', 'cyber', 'firewall', 'malware', 'virus', 'infosec', 'pentest', 'ctf', 'exploit', 'vulnerability', 'patch', 'zero', 'day', 'authentication', 'token', 'ssl', 'https', 'breach', 'data', 'ransomware', 'ethical', 'hacker'],
  'cozy-home': ['decor', 'interior', 'furniture', 'room', 'apartment', 'organize', 'cozy', 'aesthetic', 'home', 'house', 'living', 'bedroom', 'kitchen', 'bathroom', 'minimalist', 'modern', 'rustic', 'farmhouse', 'shelf', 'shelves', 'rug', 'pillow', 'curtains', 'lamp', 'candle', 'makeover', 'renovation', 'remodel', 'clean', 'cleaning', 'tidy', 'declutter', 'storage', 'vibes'],
  'language-learners': ['spanish', 'french', 'japanese', 'korean', 'german', 'chinese', 'duolingo', 'vocabulary', 'language', 'learning', 'fluent', 'bilingual', 'multilingual', 'pronunciation', 'grammar', 'immersion', 'native', 'speaker', 'translate', 'translation', 'accent', 'practice', 'lesson', 'tutor', 'mandarin', 'italian', 'portuguese', 'arabic', 'hindi', 'russian', 'polyglot', 'flashcards', 'anki'],
  'history-buffs': ['history', 'ancient', 'roman', 'medieval', 'war', 'civilization', 'archaeology', 'museum', 'historical', 'empire', 'dynasty', 'century', 'historic', 'artifact', 'ruins', 'castle', 'pyramid', 'pharaoh', 'greek', 'viking', 'samurai', 'revolution', 'colonial', 'renaissance', 'victorian', 'wwii', 'civil', 'battle', 'kingdom', 'monument'],
  'career-growth': ['career', 'job', 'interview', 'resume', 'promotion', 'salary', 'linkedin', 'networking', 'work', 'hired', 'hiring', 'remote', 'office', 'meeting', 'manager', 'leadership', 'skills', 'professional', 'intern', 'internship', 'corporate', 'freelance', 'freelancing', 'portfolio', 'raise', 'negotiation', 'mentor', 'mentorship', 'switch', 'transition'],
  'board-game-geeks': ['boardgame', 'tabletop', 'dungeons', 'dnd', 'chess', 'catan', 'monopoly', 'cards', 'board', 'dice', 'roleplay', 'campaign', 'dungeon', 'master', 'pathfinder', 'warhammer', 'miniatures', 'strategy', 'cooperative', 'card', 'deck', 'shuffle', 'poker', 'magic', 'gathering', 'uno', 'scrabble', 'trivia', 'game', 'night'],
  'collectors-club': ['collection', 'collect', 'sneakers', 'vinyl', 'cards', 'figures', 'funko', 'pokemon', 'trading', 'collector', 'rare', 'limited', 'edition', 'mint', 'graded', 'vintage', 'antique', 'stamps', 'coins', 'memorabilia', 'display', 'shelf', 'unboxing', 'haul', 'find', 'thrift', 'lego', 'hottoys', 'action', 'figure'],
  'cosplay-costumes': ['cosplay', 'costume', 'comic', 'convention', 'comiccon', 'fandom', 'wig', 'armor', 'cosplayer', 'props', 'makeup', 'transform', 'character', 'outfit', 'handmade', 'foam', 'skit', 'con', 'marvel', 'dc', 'disney', 'halloween'],
  'animation-station': ['animation', 'animate', 'cartoon', 'frame', 'motion', '2d', '3d', 'blender', 'pixar', 'animated', 'animating', 'storyboard', 'keyframe', 'render', 'rendering', 'maya', 'aftereffects', 'mograph', 'rigging', 'modeling', 'vfx', 'cgi', 'shortfilm', 'loop', 'gif'],
  'web3-crypto': ['crypto', 'bitcoin', 'ethereum', 'nft', 'blockchain', 'wallet', 'defi', 'web3', 'token', 'mining', 'staking', 'hodl', 'altcoin', 'solana', 'cardano', 'exchange', 'trading', 'bull', 'bear', 'market', 'portfolio', 'decentralized', 'smart', 'contract', 'metaverse', 'dao'],
};

// Emoji → topic slug mapping for caption emoji detection (only real DB topics)
const EMOJI_TOPIC_MAP: Record<string, string[]> = {
  '🐱': ['pet-lovers'], '🐶': ['pet-lovers'], '🐕': ['pet-lovers'], '🐈': ['pet-lovers'],
  '🐾': ['pet-lovers'], '🐰': ['pet-lovers'], '🐢': ['pet-lovers'], '🐦': ['pet-lovers'],
  '🐟': ['pet-lovers'], '🐠': ['pet-lovers'],
  '🍕': ['foodies'], '🍔': ['foodies'], '🍣': ['foodies'], '🍰': ['foodies'],
  '🍜': ['foodies'], '🍳': ['foodies'], '🥗': ['foodies'], '🧁': ['foodies'],
  '☕': ['coffee-tea'], '🍵': ['coffee-tea'], '🫖': ['coffee-tea'],
  '🎮': ['gaming-hub'], '🕹️': ['gaming-hub'], '🎲': ['board-game-geeks'],
  '💻': ['coders-united', 'pc-builders'], '⌨️': ['coders-united', 'pc-builders'],
  '💪': ['gym-life'], '🏋️': ['gym-life'], '🏃': ['runners-world'],
  '📸': ['photography'], '📷': ['photography'],
  '🎨': ['digital-art'], '🖌️': ['digital-art'], '✏️': ['digital-art'],
  '🎵': ['music-makers'], '🎸': ['music-makers'], '🎹': ['music-makers'], '🎤': ['music-makers'],
  '🎬': ['anime-manga'], '📺': ['anime-manga'],
  '📚': ['book-club'], '📖': ['book-club'],
  '⛰️': ['outdoor-adventures'], '🏕️': ['outdoor-adventures'], '🥾': ['outdoor-adventures'],
  '🌿': ['plant-parents'], '🪴': ['plant-parents'], '🌸': ['plant-parents'], '🌻': ['plant-parents'],
  '🧘': ['yoga-flow', 'mindfulness'], '🙏': ['mindfulness'],
  '😂': ['writers-corner'], '🤣': ['writers-corner'], '😆': ['writers-corner'],
  '😊': ['mindfulness'], '🥰': ['mindfulness'], '💕': ['mindfulness'],
  '👗': ['fashion-forward'], '👟': ['fashion-forward'], '👠': ['fashion-forward'],
  '🤖': ['ai-explorers'], '🧠': ['ai-explorers', 'science-nerds'],
  '✈️': ['travel-diaries'], '🏖️': ['travel-diaries'], '🗺️': ['travel-diaries'],
  '⚽': ['sports-fans'], '🏀': ['sports-fans'], '🏈': ['sports-fans'], '⚾': ['sports-fans'],
  '✍️': ['writers-corner'], '📝': ['writers-corner'],
  '🧶': ['diy-crafts'], '🪡': ['diy-crafts'], '🔨': ['diy-crafts'],
  '🚀': ['startup-life', 'science-nerds'],
  '📐': ['study-buddies'], '🎓': ['study-buddies'],
  '🔬': ['science-nerds'], '🧪': ['science-nerds'], '🔭': ['science-nerds'],
  '🥊': ['martial-arts'],
  '🖥️': ['pc-builders', 'tech-news'], '📱': ['tech-news'],
  '🔒': ['cybersecurity'], '🛡️': ['cybersecurity'],
  '🏠': ['cozy-home'], '🛋️': ['cozy-home'], '🕯️': ['cozy-home'],
  '🗣️': ['language-learners'],
  '🏛️': ['history-buffs'],
  '💼': ['career-growth'],
  '♟️': ['board-game-geeks'], '🎯': ['board-game-geeks'],
  '💎': ['collectors-club'],
  '🎭': ['cosplay-costumes'],
  '🎞️': ['animation-station'],
  '₿': ['web3-crypto'],
};

// Bigram phrases that map to topic slugs (multi-word concepts — only real DB topics)
const PHRASE_TOPIC_MAP: Record<string, string[]> = {
  'road trip': ['travel-diaries'], 'leg day': ['gym-life'], 'self care': ['mindfulness'],
  'meal prep': ['foodies'], 'golden hour': ['photography'], 'game night': ['board-game-geeks', 'gaming-hub'],
  'book club': ['book-club'], 'dog walk': ['pet-lovers'], 'cat mom': ['pet-lovers'],
  'dog mom': ['pet-lovers'], 'cat dad': ['pet-lovers'], 'dog dad': ['pet-lovers'],
  'date night': ['foodies'], 'work out': ['gym-life'], 'home gym': ['gym-life'],
  'ice cream': ['foodies'], 'bubble tea': ['coffee-tea'], 'plant based': ['foodies', 'plant-parents'],
  'national park': ['outdoor-adventures'], 'thrift store': ['fashion-forward', 'collectors-club'],
  'code review': ['coders-united'], 'side project': ['coders-united', 'startup-life'],
  'board game': ['board-game-geeks'], 'card game': ['board-game-geeks'],
  'digital art': ['digital-art'], 'fan art': ['digital-art'],
  'street food': ['foodies', 'travel-diaries'], 'food truck': ['foodies'],
  'gym session': ['gym-life'], 'pr today': ['gym-life', 'runners-world'],
  'new recipe': ['foodies'], 'just finished': ['book-club', 'runners-world'],
  'morning run': ['runners-world'], 'long run': ['runners-world'],
  'mental health': ['mindfulness'], 'deep breath': ['yoga-flow', 'mindfulness'],
  'hair day': ['fashion-forward'], 'new fit': ['fashion-forward'],
  'fit check': ['fashion-forward'], 'thrift haul': ['fashion-forward'],
  'good picture': ['photography'], 'nice picture': ['photography'], 'great picture': ['photography'],
  'good photo': ['photography'], 'nice photo': ['photography'], 'great photo': ['photography'],
  'good shot': ['photography'], 'nice shot': ['photography'], 'great shot': ['photography'],
  'so funny': ['writers-corner'], 'too funny': ['writers-corner'], 'im dead': ['writers-corner'],
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
    .replace(/#(\w+)/g, '$1') // strip hashtag symbols but keep the word
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

// Extract emojis from text
function extractEmojis(text: string): string[] {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{2B55}\u{200D}\u{FE0F}\u{20E3}\u{E0020}-\u{E007F}♟₿]/gu;
  return [...(text.match(emojiRegex) || [])];
}

// Find bigram phrase matches in raw caption text
function findPhraseMatches(caption: string): Set<string> {
  const lower = caption.toLowerCase();
  const matched = new Set<string>();
  for (const [phrase, slugs] of Object.entries(PHRASE_TOPIC_MAP)) {
    if (lower.includes(phrase)) {
      slugs.forEach(s => matched.add(s));
    }
  }
  return matched;
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
  selectedTopicIds: Set<string>,
): { followed: { topicId: string; score: number }[]; newTopics: { topicId: string; score: number }[] } {
  const words = extractKeywords(caption);
  const emojis = extractEmojis(caption);
  const phraseSlugs = findPhraseMatches(caption);

  if (words.length === 0 && emojis.length === 0 && phraseSlugs.size === 0) {
    return { followed: [], newTopics: [] };
  }

  // Collect emoji-matched slugs with bonus score
  const emojiSlugBonus = new Map<string, number>();
  for (const emoji of emojis) {
    const slugs = EMOJI_TOPIC_MAP[emoji];
    if (slugs) {
      slugs.forEach(slug => {
        emojiSlugBonus.set(slug, (emojiSlugBonus.get(slug) || 0) + 3);
      });
    }
  }

  const followedScored: { topicId: string; score: number }[] = [];
  const newScored: { topicId: string; score: number }[] = [];

  for (const entry of index) {
    // Skip topics already selected for this post
    if (selectedTopicIds.has(entry.topicId)) continue;

    let score = 0;

    // Keyword matching
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

    // Emoji bonus — match by slug
    const emojiBonus = emojiSlugBonus.get(entry.slug) || 0;
    score += emojiBonus;

    // Phrase bonus — match by slug
    if (phraseSlugs.has(entry.slug)) {
      score += 4; // Strong signal — user typed an exact phrase
    }

    if (score > 0) {
      if (followedTopicIds.has(entry.topicId)) {
        followedScored.push({ topicId: entry.topicId, score });
      } else {
        newScored.push({ topicId: entry.topicId, score });
      }
    }
  }

  followedScored.sort((a, b) => b.score - a.score);
  newScored.sort((a, b) => b.score - a.score);
  return { followed: followedScored.slice(0, 3), newTopics: newScored.slice(0, 3) };
}

type CreatePostScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<CreatePostStackParamList, 'CreatePostHome'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type CreatePostScreenRouteProp = RouteProp<CreatePostStackParamList, 'CreatePostHome'>;

export default function CreatePostScreen() {
  const navigation = useNavigation<CreatePostScreenNavigationProp>();
  const route = useRoute<CreatePostScreenRouteProp>();
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
  const [followedSuggestedTopics, setFollowedSuggestedTopics] = useState<FullTopic[]>([]);
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

  // Topic suggestions toggle (photo + caption)
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [imageSuggestedTopics, setImageSuggestedTopics] = useState<FullTopic[]>([]);

  // Draft state
  const [draftCount, setDraftCount] = useState(0);
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const activeDraftIdRef = useRef<string | null>(null);

  // Refresh background data when tab is focused — preserve draft state
  useFocusEffect(
    useCallback(() => {
      loadFollowedTopics();
      loadAllTopics();
      loadGalleryThumbnail();
      loadCoinBalance();
      refreshDraftCount();

      // Check for resumeDraftId from DraftsGallery navigation
      const resumeId = route.params?.resumeDraftId;
      if (resumeId) {
        loadDraftById(resumeId);
        // Clear the param so it doesn't re-trigger
        navigation.setParams({ resumeDraftId: undefined });
      }
    }, [route.params?.resumeDraftId])
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
      const response = await api.getMyCoins();
      setCoinBalance(response.coins.skyCoins);
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

  // ─── Draft helpers ─────────────────────────────────────────────

  const resetComposeState = () => {
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
    setImageSuggestedTopics([]);
    setShowSuggestions(true);
    activeDraftIdRef.current = null;
  };

  const refreshDraftCount = async () => {
    const count = await draftService.getDraftCount();
    setDraftCount(count);
  };

  const loadDraftById = async (id: string) => {
    const draft = await draftService.loadDraft(id);
    if (!draft) {
      refreshDraftCount();
      return;
    }

    // Restore all compose state
    setImageUri(draft.imageUri);
    setOriginalImageUri(draft.originalImageUri);
    setCaption(draft.caption);
    setVisibility(draft.visibility);
    setSelectedTopics(draft.selectedTopics);
    setContentStatus('ready');
    setMode('compose');

    // Track which draft is active so we can clean it up after posting
    activeDraftIdRef.current = draft.id;

    // Draft is now "live" — remove metadata but keep image files
    await draftService.clearDraftMeta(draft.id);
    refreshDraftCount();
    setDraftBannerDismissed(false);
  };

  const saveDraftAndReset = async () => {
    if (!imageUri) return;

    setSavingDraft(true);
    try {
      await draftService.saveDraft({
        imageUri,
        originalImageUri: originalImageUri || null,
        caption,
        visibility,
        selectedTopics: [...selectedTopics],
      });
      activeDraftIdRef.current = null;
      resetComposeState();
      refreshDraftCount();
      setDraftBannerDismissed(false);
      Alert.alert('Draft Saved', 'Your draft will be kept for 30 days.');
    } catch (error: any) {
      console.error('[CreatePost] saveDraft error:', error);
      if (error?.code === 'DRAFT_LIMIT_REACHED') {
        Alert.alert(
          'Draft Limit Reached',
          `You can save up to ${draftService.DRAFT_LIMIT} drafts. Delete some to make room.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Drafts', onPress: () => navigation.navigate('DraftsGallery') },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save draft. Please try again.');
      }
    } finally {
      setSavingDraft(false);
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
    if (!showSuggestions) {
      console.log('[SUGGEST] blocked: showSuggestions is OFF');
      return;
    }
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    suggestionTimerRef.current = setTimeout(() => {
      updateSuggestions(text);
    }, 500);
  };

  const updateSuggestions = (text: string) => {
    const followedIds = new Set(followedTopics.map(t => t.id));
    const selectedIds = new Set(selectedTopics);
    const { followed, newTopics } = findMatchingTopics(text, topicIndexRef.current, followedIds, selectedIds);
    const matchedNew = newTopics
      .map(m => allTopics.find(t => t.id === m.topicId))
      .filter((t): t is FullTopic => !!t);
    const matchedFollowed = followed
      .map(m => allTopics.find(t => t.id === m.topicId))
      .filter((t): t is FullTopic => !!t);
    console.log('[SUGGEST] caption:', JSON.stringify(text), 'followed:', matchedFollowed.map(t => t.name), 'new:', matchedNew.map(t => t.name));
    setSuggestedTopics(matchedNew);
    setFollowedSuggestedTopics(matchedFollowed);
  };

  // Add already-followed topic to post selection
  const handleAddFollowedTopic = (topic: FullTopic) => {
    setSelectedTopics(prev => [...prev, topic.id]);
    setFollowedSuggestedTopics(prev => prev.filter(t => t.id !== topic.id));
    if (visibility === 'friends_only') {
      setVisibility('topics_and_friends');
    }
  };

  // Join & Post handler
  const handleJoinAndPost = async (topic: FullTopic) => {
    setJoiningTopicId(topic.id);
    try {
      await api.followTopic(topic.id);
      setFollowedTopics(prev => [...prev, { ...topic, isFollowing: true }]);
      setSelectedTopics(prev => [...prev, topic.id]);
      setSuggestedTopics(prev => prev.filter(t => t.id !== topic.id));
      setImageSuggestedTopics(prev => prev.filter(t => t.id !== topic.id));
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

    // Run lightweight image analysis for topic suggestions (if allowed)
    if (showSuggestions) {
      analyzeImageForTopics(croppedUri);
    }

    if (wasCropped) {
      Alert.alert(
        'Cropping Info',
        'Others will see the full uncropped image when they tap your post.',
        [{ text: 'Got it' }]
      );
    }
  }, [showSuggestions, allTopics, followedTopics, selectedTopics]);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
    setRawImageUri(null);
  }, []);

  // Lightweight on-device image analysis for topic suggestions
  const analyzeImageForTopics = async (uri: string) => {
    try {
      const result = await analyzeImage(uri);
      if (result.suggestedSlugs.length === 0) {
        setImageSuggestedTopics([]);
        return;
      }

      // Map slugs to actual topic objects, excluding already followed/selected
      const followedIds = new Set(followedTopics.map(t => t.id));
      selectedTopics.forEach(id => followedIds.add(id));

      const matched = result.suggestedSlugs
        .map(slug => allTopics.find(t => {
          const topicSlug = t.slug || t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return topicSlug === slug;
        }))
        .filter((t): t is FullTopic => !!t && !followedIds.has(t.id));

      setImageSuggestedTopics(matched);
    } catch (error) {
      console.error('Image analysis failed:', error);
      setImageSuggestedTopics([]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      exif: false,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      // Convert HEIC/HEIF to JPEG so the server can always process it
      if (uri.toLowerCase().endsWith('.heic') || uri.toLowerCase().endsWith('.heif')) {
        const converted = await ImageManipulator.manipulateAsync(
          uri,
          [],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        handleImageSelected(converted.uri);
      } else {
        handleImageSelected(uri);
      }
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

  // Back to camera mode — offer to save draft if there's meaningful content
  const backToCamera = () => {
    const hasContent = imageUri && (caption.trim().length > 0 || selectedTopics.length > 0);
    if (hasContent) {
      Alert.alert(
        'Save Draft?',
        'You have unsaved changes. Would you like to save this as a draft?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: resetComposeState },
          { text: 'Save Draft', onPress: saveDraftAndReset },
        ],
      );
    } else {
      resetComposeState();
    }
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

    // Store pending post data and submit directly
    pendingPostDataRef.current = {
      imageUri,
      originalImageUri,
      caption,
      visibility,
      selectedTopics: [...selectedTopics],
    };
    submitPost();
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

      // Clean up the active draft (if we resumed one)
      if (activeDraftIdRef.current) {
        draftService.deleteDraft(activeDraftIdRef.current).catch(() => {});
        activeDraftIdRef.current = null;
      }

      // Reset all draft state so next visit starts fresh
      resetComposeState();
      setShowEditor(false);
      setShowInvestAnimation(false);
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

        {/* Draft Resume Banner */}
        {draftCount > 0 && !draftBannerDismissed && (
          <View style={styles.draftBanner}>
            <Ionicons name="document-text-outline" size={18} color="#FFF" />
            <Text style={styles.draftBannerText}>
              You have {draftCount} draft{draftCount !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={styles.draftResumeButton}
              onPress={() => navigation.navigate('DraftsGallery')}
            >
              <Text style={styles.draftResumeText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.draftDismissButton}
              onPress={() => setDraftBannerDismissed(true)}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        )}

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

          {/* Drafts Button (symmetric with gallery button) */}
          <TouchableOpacity
            style={styles.draftsButton}
            onPress={() => navigation.navigate('DraftsGallery')}
          >
            <View style={styles.draftsButtonInner}>
              <Ionicons name="documents-outline" size={22} color="#FFF" />
            </View>
            {draftCount > 0 && (
              <View style={styles.draftsBadge}>
                <Text style={styles.draftsBadgeText}>{draftCount}</Text>
              </View>
            )}
          </TouchableOpacity>
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
              <SkyCoinIcon size={12} variant="inline" />
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
                  +4 coins earned!
                </Text>
              ) : (
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                  {20 - caption.trim().length} more for +4 coins
                </Text>
              )}
            </View>

            {/* Encouragement for meaningful captions */}
            {caption.trim().length >= 20 && (
              <View style={[styles.coinCostInfo, {
                backgroundColor: isDark ? '#2D2305' : '#FFFBEB',
              }]}>
                <Ionicons name="heart" size={14} color="#FBBF24" />
                <Text style={{ fontSize: 12, color: Colors.common.success, fontWeight: '600' }}>
                  +4 coins for a meaningful caption!
                </Text>
              </View>
            )}
          </View>

          {/* Image-Based Topic Suggestions */}
          {showSuggestions && imageSuggestedTopics.length > 0 && (
            <View style={[styles.suggestionsSection, {
              backgroundColor: isDark ? '#0F1A15' : '#F0FFF4',
              borderBottomColor: colors.borderLight,
            }]}>
              <View style={styles.suggestionsHeader}>
                <View style={styles.suggestionsTitleRow}>
                  <Ionicons name="image" size={16} color="#10B981" />
                  <Text style={[styles.suggestionsTitle, { color: colors.text.primary }]}>
                    Photo Suggestions
                  </Text>
                </View>
                <Text style={[styles.suggestionsSubtitle, { color: colors.text.secondary }]}>
                  Based on your photo — tap to join
                </Text>
              </View>
              {imageSuggestedTopics.map(topic => {
                const isJoining = joiningTopicId === topic.id;
                return (
                  <TouchableOpacity
                    key={`img-${topic.id}`}
                    style={[styles.suggestionCard, {
                      backgroundColor: isDark ? colors.surface : '#FFF',
                      borderColor: isDark ? colors.border : '#D1FAE5',
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
                      </View>
                      {isJoining ? (
                        <ActivityIndicator size="small" color="#10B981" />
                      ) : (
                        <Ionicons name="add-circle" size={24} color="#10B981" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Toggle for topic suggestions (photo + caption) */}
          <View style={[styles.privacyToggle, {
            borderBottomColor: colors.borderLight,
          }]}>
            <TouchableOpacity
              style={styles.privacyToggleRow}
              onPress={() => {
                const next = !showSuggestions;
                setShowSuggestions(next);
                if (next) {
                  // Re-run both analyses when toggled back on
                  if (imageUri) analyzeImageForTopics(imageUri);
                  updateSuggestions(caption);
                } else {
                  setImageSuggestedTopics([]);
                  setSuggestedTopics([]);
                  setFollowedSuggestedTopics([]);
                }
              }}
            >
              <Ionicons
                name={showSuggestions ? 'bulb' : 'bulb-outline'}
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={[styles.privacyToggleText, { color: colors.text.tertiary }]}>
                {showSuggestions ? 'Topic suggestions on' : 'Topic suggestions off — tap to show'}
              </Text>
              <View style={[
                styles.privacyToggleDot,
                { backgroundColor: showSuggestions ? '#10B981' : '#6B7280' },
              ]} />
            </TouchableOpacity>
          </View>

          {/* Followed Topic Suggestions (caption-based — already joined) */}
          {showSuggestions && followedSuggestedTopics.length > 0 && (
            <View style={[styles.suggestionsSection, {
              backgroundColor: isDark ? '#151A25' : '#F0F5FF',
              borderBottomColor: colors.borderLight,
            }]}>
              <View style={styles.suggestionsHeader}>
                <View style={styles.suggestionsTitleRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.brand.primary} />
                  <Text style={[styles.suggestionsTitle, { color: colors.text.primary }]}>
                    Your Communities
                  </Text>
                </View>
                <Text style={[styles.suggestionsSubtitle, { color: colors.text.secondary }]}>
                  Based on your caption — tap to add
                </Text>
              </View>
              {followedSuggestedTopics.map(topic => (
                <TouchableOpacity
                  key={`followed-${topic.id}`}
                  style={[styles.suggestionCard, {
                    backgroundColor: isDark ? colors.surface : '#FFF',
                    borderColor: isDark ? colors.border : '#BFDBFE',
                  }]}
                  onPress={() => handleAddFollowedTopic(topic)}
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
                      <Text style={[styles.suggestionDesc, { color: Colors.brand.primary }]} numberOfLines={1}>
                        Joined
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={Colors.brand.primary} />
                  </View>
                  <View style={styles.suggestionAction}>
                    <Ionicons name="paper-plane-outline" size={14} color={Colors.brand.primary} />
                    <Text style={[styles.suggestionActionText, { color: Colors.brand.primary }]}>
                      Add to Post
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Smart Topic Suggestions (caption-based — new communities) */}
          {showSuggestions && suggestedTopics.length > 0 && (
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
  draftsButton: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  draftsButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.brand.blue,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  draftsBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
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

  // ── Privacy Toggle ──────────────────────────────────────────────
  privacyToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  privacyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyToggleText: {
    fontSize: 12,
    flex: 1,
  },
  privacyToggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Suggestions Title Row ───────────────────────────────────────
  suggestionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },

  // ── Draft Banner ─────────────────────────────────────────────────
  draftBanner: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    zIndex: 20,
  },
  draftBannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  draftResumeButton: {
    backgroundColor: Colors.brand.blue,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  draftResumeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  draftDismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
