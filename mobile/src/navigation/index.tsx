import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import FeedScreen from '../screens/main/FeedScreen';
import SearchUsersScreen from '../screens/main/SearchUsersScreen';
import CreatePostScreen from '../screens/main/CreatePostScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CommentsScreen from '../screens/main/CommentsScreen';
import AvatarCustomizationScreen from '../screens/main/AvatarCustomizationScreen';
import FollowRequestsScreen from '../screens/main/FollowRequestsScreen';
import FullBodyAvatarScreen from '../screens/main/FullBodyAvatarScreen';
import CoinsScreen from '../screens/coins/CoinsScreen';
import GiveLeaderboardScreen from '../screens/coins/GiveLeaderboardScreen';
import CoinHistoryScreen from '../screens/coins/CoinHistoryScreen';
import GivingActivityScreen from '../screens/coins/GivingActivityScreen';

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
  AuthStackParamList,
  CoinsStackParamList,
  ChatStackParamList,
  SearchStackParamList,
  FeedStackParamList,
  ProfileStackParamList,
  CreatePostStackParamList,
  MainTabParamList,
} from './types';

// Re-export types and hooks for backwards compatibility
export {
  useUnreadCount,
  UnreadContextType,
  AuthStackParamList,
  CoinsStackParamList,
  ChatStackParamList,
  SearchStackParamList,
  FeedStackParamList,
  ProfileStackParamList,
  CreatePostStackParamList,
  MainTabParamList,
} from './types';

const AuthStack = createStackNavigator<AuthStackParamList>();
const CoinsStack = createStackNavigator<CoinsStackParamList>();
const ChatStack = createStackNavigator<ChatStackParamList>();
const SearchStack = createStackNavigator<SearchStackParamList>();
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
  return (
    <CoinsStack.Navigator>
      <CoinsStack.Screen
        name="CoinsHome"
        component={CoinsScreen}
        options={{ headerShown: false }}
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
    </CoinsStack.Navigator>
  );
}

function ChatNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          title: 'Messages',
          headerShown: true
        }}
      />
      <ChatStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.otherUser.username,
          headerBackTitle: 'Back'
        })}
      />
    </ChatStack.Navigator>
  );
}

function SearchNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen
        name="SearchUsers"
        component={SearchUsersScreen}
        options={{
          title: 'Find Friends',
          headerShown: true
        }}
      />
      <SearchStack.Screen
        name="UserProfile"
        component={ProfileScreen}
        options={({ route }) => ({
          title: route.params.username,
          headerBackTitle: 'Back'
        })}
      />
    </SearchStack.Navigator>
  );
}

function FeedNavigator() {
  return (
    <FeedStack.Navigator>
      <FeedStack.Screen
        name="FeedHome"
        component={FeedScreen}
        options={{ headerShown: false }}
      />
      <FeedStack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          title: 'Comments',
          headerBackTitle: 'Back'
        }}
      />
    </FeedStack.Navigator>
  );
}

function CreatePostNavigator() {
  return (
    <CreatePostStack.Navigator>
      <CreatePostStack.Screen
        name="CreatePostHome"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />
      <CreatePostStack.Screen
        name="FullBodyAvatar"
        component={FullBodyAvatarScreen}
        options={{
          title: 'Create 3D Avatar',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#1A1A2E' },
          headerTintColor: '#FFF',
        }}
      />
    </CreatePostStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
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

// Custom badge component for tab bar
function TabBarBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

// Messages tab icon with badge
function MessagesTabIcon({ focused, color, size, unreadCount }: {
  focused: boolean;
  color: string;
  size: number;
  unreadCount: number;
}) {
  return (
    <View>
      <Ionicons
        name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
        size={size}
        color={color}
      />
      <TabBarBadge count={unreadCount} />
    </View>
  );
}

function MainNavigator({ unreadCount }: { unreadCount: number }) {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'CreatePost') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Messages') {
            // Use custom icon with badge
            return (
              <MessagesTabIcon
                focused={focused}
                color={color}
                size={size}
                unreadCount={unreadCount}
              />
            );
          } else if (route.name === 'Coins') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FBBF24',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <MainTab.Screen
        name="Feed"
        component={FeedNavigator}
        options={{ headerShown: false }}
      />
      <MainTab.Screen
        name="Search"
        component={SearchNavigator}
        options={{ headerShown: false, title: 'Find Friends', unmountOnBlur: true } as any}
      />
      <MainTab.Screen name="CreatePost" component={CreatePostNavigator} options={{ headerShown: false }} />
      <MainTab.Screen
        name="Messages"
        component={ChatNavigator}
        options={{ headerShown: false, unmountOnBlur: true } as any}
      />
      <MainTab.Screen
        name="Coins"
        component={CoinsNavigator}
        options={{ headerShown: false, unmountOnBlur: true } as any}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ headerShown: false }}
      />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

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
      socketService.connect();
      // Fetch unread count on auth
      refreshUnreadCount();
    } else {
      socketService.disconnect();
      setUnreadCount(0);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, refreshUnreadCount]);

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
      const token = await AsyncStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

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
      <NavigationContainer>
        {isAuthenticated ? <MainNavigator unreadCount={unreadCount} /> : <AuthNavigator />}
      </NavigationContainer>
    </UnreadContext.Provider>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
