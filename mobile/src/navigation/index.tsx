import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '../theme';

// Account management
import { AccountProvider, useAccountContext } from '../contexts/AccountContext';
import { accountManager, StoredAccount } from '../services/accountManager';
import AccountSwitcherModal from '../components/AccountSwitcherModal';
import ProfileTabButton from '../components/ProfileTabButton';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import FeedScreen from '../screens/main/FeedScreen';
import CreatePostScreen from '../screens/main/CreatePostScreen';

// Discover screens
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CommentsScreen from '../screens/main/CommentsScreen';
import AvatarCustomizationScreen from '../screens/main/AvatarCustomizationScreen';
import FollowRequestsScreen from '../screens/main/FollowRequestsScreen';
import FullBodyAvatarScreen from '../screens/main/FullBodyAvatarScreen';
import DraftsGalleryScreen from '../screens/main/DraftsGalleryScreen';
import CoinsScreen from '../screens/coins/CoinsScreen';
import GiveLeaderboardScreen from '../screens/coins/GiveLeaderboardScreen';
import CoinHistoryScreen from '../screens/coins/CoinHistoryScreen';
import GivingActivityScreen from '../screens/coins/GivingActivityScreen';
import FriendshipDetailScreen from '../screens/coins/FriendshipDetailScreen';

// Topic screens (used by DiscoverNavigator)
import TopicPageScreen from '../screens/topics/TopicPageScreen';
import CreateTopicScreen from '../screens/topics/CreateTopicScreen';

// Chat screens
import ConversationsScreen from '../screens/chat/ConversationsScreen';
import ChatScreen from '../screens/chat/ChatScreen';

// Socket service
import { socketService } from '../services/socket';

// API service
import { api } from '../services/api';

// Types and context from separate file to avoid circular dependencies
import {
  UnreadContext,
  UnreadContextType,
  useUnreadCount,
  AuthStackParamList,
  CoinsStackParamList,
  SearchStackParamList,
  DiscoverStackParamList,
  FeedStackParamList,
  ProfileStackParamList,
  CreatePostStackParamList,
  TopicsStackParamList,
  MainTabParamList,
} from './types';

// Re-export types and hooks for backwards compatibility
export {
  useUnreadCount,
  UnreadContextType,
  AuthStackParamList,
  CoinsStackParamList,
  SearchStackParamList,
  DiscoverStackParamList,
  FeedStackParamList,
  ProfileStackParamList,
  CreatePostStackParamList,
  TopicsStackParamList,
  MainTabParamList,
} from './types';

const AuthStack = createStackNavigator<AuthStackParamList>();
const CoinsStack = createStackNavigator<CoinsStackParamList>();
const DiscoverStack = createStackNavigator<DiscoverStackParamList>();
const FeedStack = createStackNavigator<FeedStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const CreatePostStack = createStackNavigator<CreatePostStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function CoinsNavigator() {
  const { colors } = useTheme();
  return (
    <CoinsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <CoinsStack.Screen
        name="CoinsHome"
        component={CoinsScreen}
        options={{
          title: 'Positivity Coins',
          headerShown: true
        }}
      />
      <CoinsStack.Screen
        name="GiveLeaderboard"
        component={GiveLeaderboardScreen}
        options={{
          title: 'Leaderboard',
          headerBackTitle: 'Back'
        }}
      />
      <CoinsStack.Screen
        name="CoinHistory"
        component={CoinHistoryScreen}
        options={{
          title: 'Transaction History',
          headerBackTitle: 'Back'
        }}
      />
      <CoinsStack.Screen
        name="GivingActivity"
        component={GivingActivityScreen}
        options={{
          title: 'Giving Activity',
          headerBackTitle: 'Back'
        }}
      />
      <CoinsStack.Screen
        name="FriendshipDetail"
        component={FriendshipDetailScreen}
        options={({ route }) => ({
          title: `@${route.params.otherUsername}`,
          headerBackTitle: 'Back'
        })}
      />
    </CoinsStack.Navigator>
  );
}

function DiscoverNavigator() {
  const { colors } = useTheme();
  return (
    <DiscoverStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <DiscoverStack.Screen
        name="DiscoverHome"
        component={DiscoverScreen}
        options={{
          title: 'Discover',
          headerShown: true
        }}
      />
      <DiscoverStack.Screen
        name="UserProfile"
        component={ProfileScreen}
        options={({ route }) => ({
          title: route.params.username,
          headerBackTitle: 'Back'
        })}
      />
      <DiscoverStack.Screen
        name="TopicPage"
        component={TopicPageScreen}
        options={({ route }) => ({
          title: '',
          headerBackTitle: 'Back',
          headerTransparent: true,
          headerTintColor: '#FFFFFF'
        })}
      />
      <DiscoverStack.Screen
        name="CreateTopic"
        component={CreateTopicScreen}
        options={{
          title: 'Create Community',
          headerBackTitle: 'Back'
        }}
      />
      <DiscoverStack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          title: 'Comments',
          headerBackTitle: 'Back'
        }}
      />
    </DiscoverStack.Navigator>
  );
}

function FeedNavigator() {
  const { colors } = useTheme();
  return (
    <FeedStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <FeedStack.Screen
        name="FeedHome"
        component={FeedScreen}
        options={{
          title: 'Home',
          headerShown: true,
          // Messages button is now on the LEFT side, handled by FeedScreen's headerLeft with ChatDrawer
        }}
      />
      <FeedStack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          title: 'Post',
          headerBackTitle: 'Back',
        }}
      />
      <FeedStack.Screen
        name="UserProfile"
        component={ProfileScreen}
        options={({ route }) => ({
          title: `@${route.params.username}`,
          headerBackTitle: 'Back',
        })}
      />
      <FeedStack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          title: 'Messages',
          headerBackTitle: 'Back',
        }}
      />
      <FeedStack.Screen
        name="TopicPage"
        component={TopicPageScreen}
        options={{
          title: '',
          headerBackTitle: 'Back',
        }}
      />
      <FeedStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.otherUser.username,
          headerBackTitle: 'Back',
        })}
      />
    </FeedStack.Navigator>
  );
}

function CreatePostNavigator() {
  const { colors } = useTheme();
  return (
    <CreatePostStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <CreatePostStack.Screen
        name="CreatePostHome"
        component={CreatePostScreen}
        options={{
          headerShown: false
        }}
      />
      <CreatePostStack.Screen
        name="DraftsGallery"
        component={DraftsGalleryScreen}
        options={{
          title: 'Drafts',
          headerBackTitle: 'Back',
        }}
      />
      <CreatePostStack.Screen
        name="FullBodyAvatar"
        component={FullBodyAvatarScreen}
        options={{
          title: 'Create 3D Avatar',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text.primary,
        }}
      />
    </CreatePostStack.Navigator>
  );
}

function ProfileNavigator() {
  const { colors } = useTheme();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { color: colors.text.primary },
      }}
    >
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: true
        }}
      />
      <ProfileStack.Screen
        name="AvatarCustomization"
        component={AvatarCustomizationScreen}
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <ProfileStack.Screen
        name="FollowRequests"
        component={FollowRequestsScreen}
        options={{
          title: 'Follow Requests',
          headerBackTitle: 'Back'
        }}
      />
    </ProfileStack.Navigator>
  );
}

function MainNavigator() {
  const { colors } = useTheme();
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'CreatePost') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Coins') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      })}
    >
      <MainTab.Screen
        name="Feed"
        component={FeedNavigator}
        options={{ headerShown: false }}
      />
      <MainTab.Screen
        name="Discover"
        component={DiscoverNavigator}
        options={{ headerShown: false }}
      />
      <MainTab.Screen name="CreatePost" component={CreatePostNavigator} options={{ headerShown: false }} />
      <MainTab.Screen
        name="Coins"
        component={CoinsNavigator}
        options={{ headerShown: false, unmountOnBlur: true } as any}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          headerShown: false,
          tabBarButton: (props) => <ProfileTabButton {...props} />,
        }}
      />
    </MainTab.Navigator>
  );
}

// Inner component that uses AccountContext
function RootNavigatorContent() {
  const { colors, isDark } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  // Track when user is adding a new account to prevent auto-login
  const isAddingAccountRef = useRef(false);
  // Track the account ID before adding new account
  const previousAccountIdRef = useRef<string | null>(null);
  const {
    showAccountSwitcher,
    setShowAccountSwitcher,
    refreshAccounts,
    activeAccount,
  } = useAccountContext();

  // Fetch unread count from API
  const refreshUnreadCount = useCallback(async () => {
    try {
      console.log('Fetching unread count...');
      const response = await api.getTotalUnreadCount();
      console.log('Unread count response:', response);
      if (response.success && typeof response.unreadCount === 'number') {
        setUnreadCount(response.unreadCount);
        console.log('Set unread count to:', response.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Decrement unread count locally (when reading messages)
  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  // Check authentication status
  useEffect(() => {
    checkAuth();

    // Poll for auth changes every 500ms
    const interval = setInterval(checkAuth, 500);

    return () => clearInterval(interval);
  }, []);

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Reset add account flag on successful login
      isAddingAccountRef.current = false;
      socketService.connect();
      // Fetch unread count on auth
      refreshUnreadCount();
      // Refresh accounts to pick up newly logged in account
      refreshAccounts();

      // Check if we should navigate to Profile (re-login of existing account)
      const checkNavigateToProfile = async () => {
        const shouldNavigate = await AsyncStorage.getItem('navigate_to_profile');
        if (shouldNavigate) {
          await AsyncStorage.removeItem('navigate_to_profile');
          setTimeout(() => {
            if (navigationRef.current) {
              navigationRef.current.navigate('Profile' as never);
            }
          }, 100);
        }
      };
      checkNavigateToProfile();
    } else {
      socketService.disconnect();
      setUnreadCount(0);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, refreshUnreadCount, refreshAccounts]);

  // Listen for new messages to update unread count
  useEffect(() => {
    if (!isAuthenticated) return;

    // When a new message arrives, refresh the unread count from API
    // This is more accurate than incrementing locally
    const handleNewMessage = (data: any) => {
      console.log('Socket: new message received, refreshing unread count');
      if (data && data.message) {
        // Refresh from API to get accurate count
        refreshUnreadCount();
      }
    };

    // When messages are read, refresh the count
    const handleMessagesRead = () => {
      console.log('Socket: messages read, refreshing unread count');
      refreshUnreadCount();
    };

    // Try to add listeners - socket might not be ready immediately
    const setupSocketListeners = () => {
      const socket = socketService.getSocket();
      if (socket) {
        console.log('Setting up socket listeners for unread count');
        socket.on('chat:new_message', handleNewMessage);
        socket.on('chat:messages_read', handleMessagesRead);
        return true;
      }
      return false;
    };

    // Try immediately, then retry after a delay if needed
    if (!setupSocketListeners()) {
      const retryTimeout = setTimeout(() => {
        setupSocketListeners();
      }, 1000);

      return () => {
        clearTimeout(retryTimeout);
        const socket = socketService.getSocket();
        if (socket) {
          socket.off('chat:new_message', handleNewMessage);
          socket.off('chat:messages_read', handleMessagesRead);
        }
      };
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('chat:new_message', handleNewMessage);
        socket.off('chat:messages_read', handleMessagesRead);
      }
    };
  }, [isAuthenticated, refreshUnreadCount]);

  async function checkAuth() {
    try {
      // First check multi-account system
      const activeAcc = await accountManager.getActiveAccount();

      // If user is adding a new account
      if (isAddingAccountRef.current) {
        // Check if user cancelled — go back to the app
        const cancelled = await AsyncStorage.getItem('cancel_add_account');
        if (cancelled) {
          await AsyncStorage.removeItem('cancel_add_account');
          await AsyncStorage.removeItem('adding_account');
          isAddingAccountRef.current = false;
          if (activeAcc) {
            setIsAuthenticated(true);
          }
          setIsLoading(false);
          return;
        }

        // Check if a login just completed (handles same account re-login)
        const loginCompleted = await AsyncStorage.getItem('login_completed');
        if (loginCompleted && activeAcc) {
          await AsyncStorage.removeItem('login_completed');
          await AsyncStorage.removeItem('adding_account');
          isAddingAccountRef.current = false;
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Also check if a different account is now active (original check)
        if (activeAcc && activeAcc.id !== previousAccountIdRef.current) {
          await AsyncStorage.removeItem('adding_account');
          isAddingAccountRef.current = false;
          setIsAuthenticated(true);
        }

        // Otherwise, don't auto-login with the previous account
        setIsLoading(false);
        return;
      }

      // Clean up login_completed flag if not in add-account mode
      await AsyncStorage.removeItem('login_completed');

      if (activeAcc) {
        setIsAuthenticated(true);
        return;
      }

      // Fallback to old AsyncStorage token (for migration)
      const token = await AsyncStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  // Track previous account to detect actual switches (not just initial load)
  const lastActiveAccountIdRef = useRef<string | null>(null);

  // Handle account switch - force remount of MainNavigator to refresh all data
  useEffect(() => {
    if (activeAccount) {
      const previousId = lastActiveAccountIdRef.current;
      lastActiveAccountIdRef.current = activeAccount.id;

      // If this is an actual switch (not initial load), force remount
      if (previousId && previousId !== activeAccount.id) {
        console.log('Account switched, forcing app refresh...');
        // Briefly set to false to unmount MainNavigator, then back to true
        setIsAuthenticated(false);
        setTimeout(() => {
          setIsAuthenticated(true);
          // Navigate to Profile tab so user knows which account they're on
          setTimeout(() => {
            if (navigationRef.current) {
              navigationRef.current.navigate('Profile' as never);
            }
          }, 100);
        }, 50);
      }
    }
  }, [activeAccount]);

  // Navigate to login for adding account
  const handleAddAccount = async () => {
    // Store current account ID to detect when a new account is added
    const currentAccount = await accountManager.getActiveAccount();
    previousAccountIdRef.current = currentAccount?.id || null;
    // Set flag to prevent auto-login from existing account
    isAddingAccountRef.current = true;
    // Let LoginScreen know we're in add-account mode (for cancel button)
    await AsyncStorage.setItem('adding_account', 'true');
    setIsAuthenticated(false);
  };

  const navigationTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.text.link,
      background: colors.background,
      card: colors.background,
      text: colors.text.primary,
      border: colors.border,
      notification: colors.gift,
    },
  }), [isDark, colors]);

  if (isLoading) {
    return null; // Or a loading screen
  }

  const contextValue: UnreadContextType = {
    unreadCount,
    refreshUnreadCount,
    decrementUnreadCount,
  };

  return (
    <UnreadContext.Provider value={contextValue}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>

      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        visible={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
        onAddAccount={handleAddAccount}
      />
    </UnreadContext.Provider>
  );
}

// Main export with AccountProvider wrapper
export function RootNavigator() {
  const handleAccountSwitch = async (account: StoredAccount) => {
    console.log('Switched to account:', account.username);
  };

  return (
    <AccountProvider onAccountSwitch={handleAccountSwitch}>
      <RootNavigatorContent />
    </AccountProvider>
  );
}

const styles = StyleSheet.create({});
