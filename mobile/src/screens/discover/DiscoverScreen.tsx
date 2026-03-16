import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Vibration,
  Platform,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useAccountContext } from '../../contexts/AccountContext';
import { api } from '../../services/api';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import CommunitiesTab from './CommunitiesTab';
import DiscoverGuide, { GuideStep } from '../../components/discover/DiscoverGuide';

interface DiscoverScreenProps {
  navigation: any;
}

const SEARCH_PROMPTS = [
  'Search communities...',
  'Find your tribe...',
  'Explore new interests...',
  'Discover something fun...',
];

export default function DiscoverScreen({ navigation }: DiscoverScreenProps) {
  const { colors, isDark } = useTheme();
  const { activeAccount, accounts, quickSwitch, setShowAccountSwitcher } = useAccountContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [guideVisible, setGuideVisible] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  // Current user profile data for avatar
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userActiveAvatar, setUserActiveAvatar] = useState<{
    customizations: AvatarCustomizations;
    style: 'cartoon' | 'anime' | 'minimalist';
  } | null>(null);
  const [username, setUsername] = useState<string | undefined>(activeAccount?.username);

  // Cycle search placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex(i => (i + 1) % SEARCH_PROMPTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Animate search bar focus glow
  useEffect(() => {
    Animated.timing(searchFocusAnim, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  // Load current user's profile for avatar
  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const response = await api.getProfile();
          const userData = response.user || response;
          setUserAvatarUrl(userData.avatarUrl || null);
          setUsername(userData.username);
          if (userData.activeAvatar) {
            setUserActiveAvatar({
              customizations: userData.activeAvatar.customizations,
              style: userData.activeAvatar.style,
            });
          } else {
            setUserActiveAvatar(null);
          }
        } catch (error) {
          console.error('Error loading profile for avatar:', error);
        }
      };
      loadProfile();
    }, [activeAccount?.id])
  );

  // Double-tap detection for profile button (account quick-switch)
  const DOUBLE_TAP_DELAY = 300;
  const lastTapTimeRef = useRef<number>(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProfilePress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      // Double tap → quick switch accounts
      lastTapTimeRef.current = 0;
      if (accounts.length < 2) {
        if (Platform.OS === 'android') Vibration.vibrate(50);
        navigation.navigate('MyProfile');
        return;
      }
      if (Platform.OS === 'android') Vibration.vibrate(30);
      quickSwitch();
    } else {
      // First tap → wait to confirm single tap, then navigate to profile
      lastTapTimeRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        navigation.navigate('MyProfile');
        tapTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  }, [accounts.length, quickSwitch, navigation]);

  const handleProfileLongPress = useCallback(() => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }
    lastTapTimeRef.current = 0;
    if (Platform.OS === 'android') Vibration.vibrate(50);
    setShowAccountSwitcher(true);
  }, [setShowAccountSwitcher]);

  // Guide refs
  const searchBarRef = useRef<View>(null);
  const typeFiltersRef = useRef<View>(null);
  const interestsButtonRef = useRef<View>(null);
  const communityGridRef = useRef<View>(null);

  // Build guide steps
  const guideSteps: GuideStep[] = useMemo(() => [
    {
      targetRef: searchBarRef,
      icon: 'search',
      title: 'Search Bar',
      description: 'Type here to search for communities by name. Results filter as you type.',
    },
    {
      targetRef: typeFiltersRef,
      icon: 'funnel',
      title: 'Type Filters',
      description:
        'Filter communities by type — browse All, public Communities, Private groups, or broadcast Channels.',
    },
    {
      targetRef: interestsButtonRef,
      icon: 'heart',
      title: 'Your Interests',
      description:
        'Tap any interest to select it. You can pick multiple — communities matching your choices will appear below. Your picks are saved automatically.',
    },
    {
      targetRef: communityGridRef,
      icon: 'grid',
      title: 'Community Cards',
      description:
        'Each card shows a community with its name, member count, and activity level. Tap a card to explore or hit Join to become a member.',
      tooltipSide: 'above',
    },
  ], []);

  // Header with Profile avatar (left) + Create Topic + Guide buttons (right)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerProfileButton}
          onPress={handleProfilePress}
          onLongPress={handleProfileLongPress}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <Avatar
            size={32}
            avatarUrl={userAvatarUrl}
            username={username}
            customizations={userActiveAvatar?.customizations}
            avatarStyle={userActiveAvatar?.style}
          />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setGuideVisible(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color="#14B8A6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('CreateTopic')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#7C3AED" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors, activeAccount, userAvatarUrl, userActiveAvatar, username, handleProfilePress, handleProfileLongPress]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View
        ref={searchBarRef}
        collapsable={false}
        style={styles.searchContainer}
      >
        <Animated.View style={[styles.searchBar, {
          backgroundColor: colors.inputBackground,
          borderWidth: 1.5,
          borderColor: searchFocusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', '#7C3AED'],
          }),
        }]}>
          <Animated.View style={{
            transform: [{
              scale: searchFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.15],
              }),
            }],
          }}>
            <Ionicons
              name="search"
              size={20}
              color={searchFocused ? '#7C3AED' : colors.text.secondary}
              style={styles.searchIcon}
            />
          </Animated.View>
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={SEARCH_PROMPTS[promptIndex]}
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {/* Communities Content */}
      <CommunitiesTab
        searchQuery={searchQuery}
        navigation={navigation}
        guideRefs={{ typeFiltersRef, interestsButtonRef, communityGridRef }}
      />

      {/* Guide Overlay */}
      <Modal
        visible={guideVisible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => setGuideVisible(false)}
      >
        <DiscoverGuide
          steps={guideSteps}
          visible={guideVisible}
          onClose={() => setGuideVisible(false)}
          isDark={isDark}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerProfileButton: {
    marginLeft: 8,
    padding: 4,
  },
  headerButton: {
    marginRight: 8,
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
});
