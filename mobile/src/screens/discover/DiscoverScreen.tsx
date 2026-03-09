import React, { useState, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Vibration,
  Platform,
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

export default function DiscoverScreen({ navigation }: DiscoverScreenProps) {
  const { colors, isDark } = useTheme();
  const { activeAccount, accounts, quickSwitch, setShowAccountSwitcher } = useAccountContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [guideVisible, setGuideVisible] = useState(false);

  // Current user profile data for avatar
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userActiveAvatar, setUserActiveAvatar] = useState<{
    customizations: AvatarCustomizations;
    style: 'cartoon' | 'anime' | 'minimalist';
  } | null>(null);
  const [username, setUsername] = useState<string | undefined>(activeAccount?.username);

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
  const categoryFiltersRef = useRef<View>(null);
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
      targetRef: categoryFiltersRef,
      icon: 'pricetags',
      title: 'Category Filters',
      description:
        'Browse communities by interest. Tap a category to filter, tap again to clear. Categories include Sports, Music, Art, and more.',
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

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View
        ref={searchBarRef}
        collapsable={false}
        style={[styles.searchContainer, { borderBottomColor: colors.border }]}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search communities..."
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Communities Content */}
      <CommunitiesTab
        searchQuery={searchQuery}
        navigation={navigation}
        guideRefs={{ typeFiltersRef, categoryFiltersRef, communityGridRef }}
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
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
});
