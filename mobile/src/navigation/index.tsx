import React from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import FeedScreen from '../screens/main/FeedScreen';
import SearchUsersScreen from '../screens/main/SearchUsersScreen';
import CreatePostScreen from '../screens/main/CreatePostScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CoinsScreen from '../screens/coins/CoinsScreen';
import GiveLeaderboardScreen from '../screens/coins/GiveLeaderboardScreen';
import CoinHistoryScreen from '../screens/coins/CoinHistoryScreen';
import GivingActivityScreen from '../screens/coins/GivingActivityScreen';

// Chat screens
import ConversationsScreen from '../screens/chat/ConversationsScreen';
import ChatScreen from '../screens/chat/ChatScreen';

// Socket service
import { socketService } from '../services/socket';

// Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type CoinsStackParamList = {
  CoinsHome: undefined;
  GiveLeaderboard: undefined;
  CoinHistory: undefined;
  GivingActivity: undefined;
};

export type ChatStackParamList = {
  Conversations: undefined;
  Chat: {
    conversationId: string;
    otherUser: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
  };
};

export type SearchStackParamList = {
  SearchUsers: undefined;
  UserProfile: {
    userId: string;
    username: string;
  };
};

export type MainTabParamList = {
  Feed: undefined;
  Search: undefined;
  CreatePost: undefined;
  Messages: undefined;
  Coins: undefined;
  Profile: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const CoinsStack = createStackNavigator<CoinsStackParamList>();
const ChatStack = createStackNavigator<ChatStackParamList>();
const SearchStack = createStackNavigator<SearchStackParamList>();
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

function MainNavigator() {
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
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
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
      <MainTab.Screen name="Feed" component={FeedScreen} />
      <MainTab.Screen
        name="Search"
        component={SearchNavigator}
        options={{ headerShown: false, title: 'Find Friends', unmountOnBlur: true }}
      />
      <MainTab.Screen name="CreatePost" component={CreatePostScreen} />
      <MainTab.Screen
        name="Messages"
        component={ChatNavigator}
        options={{ headerShown: false, unmountOnBlur: true }}
      />
      <MainTab.Screen
        name="Coins"
        component={CoinsNavigator}
        options={{ headerShown: false, unmountOnBlur: true }}
      />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check authentication status
  React.useEffect(() => {
    checkAuth();

    // Poll for auth changes every 500ms
    const interval = setInterval(checkAuth, 500);

    return () => clearInterval(interval);
  }, []);

  // Initialize socket connection when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

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

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
