import React, { useState, useLayoutEffect, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import PeopleTab from './PeopleTab';
import CommunitiesTab from './CommunitiesTab';

type TabType = 'communities' | 'people';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 0.5;

interface DiscoverScreenProps {
  navigation: any;
}

export default function DiscoverScreen({ navigation }: DiscoverScreenProps) {
  const { colors, isDark } = useTheme();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState<TabType>('communities');
  const [searchQuery, setSearchQuery] = useState('');
  const wasOnChildScreen = useRef(false);

  // Animation: 0 = people (left), 1 = communities (right)
  const slideAnim = useRef(new Animated.Value(1)).current;
  const currentIndexRef = useRef(1);
  const activeTabRef = useRef<TabType>('communities');

  // When true, a nested horizontal scroll (e.g. "Your Friends") is being touched — pause tab swiping
  const nestedScrollActiveRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Track when we navigate to a child screen (e.g. UserProfile) vs switching tabs
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      const state = navigation.getState();
      wasOnChildScreen.current = state.routes.length > 1;
    });
    return unsubscribe;
  }, [navigation]);

  // On focus: use initialTab param if provided, reset to communities on tab switch,
  // but preserve the current tab when returning from a child screen (swipe back)
  useFocusEffect(
    useCallback(() => {
      const params = route.params as any;
      if (params?.initialTab) {
        setActiveTab(params.initialTab);
        navigation.setParams({ initialTab: undefined, _ts: undefined });
      } else if (!wasOnChildScreen.current) {
        setActiveTab('communities');
      }
      wasOnChildScreen.current = false;
    }, [route.params])
  );

  // Sync animation when activeTab changes from external sources (button press, focus effects)
  useEffect(() => {
    const targetIndex = activeTab === 'people' ? 0 : 1;
    if (currentIndexRef.current !== targetIndex) {
      currentIndexRef.current = targetIndex;
      Animated.spring(slideAnim, {
        toValue: targetIndex,
        useNativeDriver: true,
        tension: 100,
        friction: 15,
      }).start();
    }
  }, [activeTab]);

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !nestedScrollActiveRef.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderMove: (_, { dx }) => {
        const normalized = currentIndexRef.current - dx / SCREEN_WIDTH;
        slideAnim.setValue(Math.max(0, Math.min(1, normalized)));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        let targetIndex = currentIndexRef.current;

        if (Math.abs(vx) > VELOCITY_THRESHOLD) {
          targetIndex = vx < 0 ? 1 : 0;
        } else if (Math.abs(dx) > SWIPE_THRESHOLD) {
          targetIndex = dx < 0
            ? Math.min(1, currentIndexRef.current + 1)
            : Math.max(0, currentIndexRef.current - 1);
        }

        targetIndex = Math.max(0, Math.min(1, targetIndex));
        currentIndexRef.current = targetIndex;

        Animated.spring(slideAnim, {
          toValue: targetIndex,
          useNativeDriver: true,
          tension: 100,
          friction: 15,
        }).start();

        const newTab: TabType = targetIndex === 0 ? 'people' : 'communities';
        if (newTab !== activeTabRef.current) {
          setActiveTab(newTab);
          setSearchQuery('');
        }
      },
    })
  ).current;

  // Derived animated values
  const contentTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const indicatorTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH / 2],
  });

  // Update header with Create Topic button (only on Communities tab)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        activeTab === 'communities' ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('CreateTopic')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#7C3AED" />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Shared Search Bar */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={
              activeTab === 'people'
                ? 'Search users...'
                : 'Search communities...'
            }
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

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange('people')}
        >
          <Ionicons
            name={activeTab === 'people' ? 'people' : 'people-outline'}
            size={18}
            color={activeTab === 'people' ? '#14B8A6' : colors.text.secondary}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, { color: colors.text.secondary }, activeTab === 'people' && styles.activeTabText]}>
            People
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange('communities')}
        >
          <Ionicons
            name={activeTab === 'communities' ? 'compass' : 'compass-outline'}
            size={18}
            color={activeTab === 'communities' ? '#14B8A6' : colors.text.secondary}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, { color: colors.text.secondary }, activeTab === 'communities' && styles.activeTabText]}>
            Communities
          </Text>
        </TouchableOpacity>

        {/* Sliding indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              backgroundColor: '#14B8A6',
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />
      </View>

      {/* Tab Content - both mounted side by side, slides with gesture */}
      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.slidingContainer,
            { transform: [{ translateX: contentTranslateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.tabPage}>
            <PeopleTab searchQuery={searchQuery} navigation={navigation} nestedScrollActiveRef={nestedScrollActiveRef} />
          </View>
          <View style={styles.tabPage}>
            <CommunitiesTab searchQuery={searchQuery} navigation={navigation} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    marginRight: 16,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    position: 'relative',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH / 2,
    height: 2,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  slidingContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
    height: '100%',
  },
  tabPage: {
    width: SCREEN_WIDTH,
  },
});
