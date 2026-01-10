import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import FeedScreen from '../screens/main/FeedScreen';
import CreatePostScreen from '../screens/main/CreatePostScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CoinsScreen from '../screens/coins/CoinsScreen';
import GiveLeaderboardScreen from '../screens/coins/GiveLeaderboardScreen';
import CoinHistoryScreen from '../screens/coins/CoinHistoryScreen';
import GivingActivityScreen from '../screens/coins/GivingActivityScreen';

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

export type MainTabParamList = {
  Feed: undefined;
  CreatePost: undefined;
  Coins: undefined;
  Profile: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const CoinsStack = createStackNavigator<CoinsStackParamList>();
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

function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'CreatePost') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
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
      <MainTab.Screen name="CreatePost" component={CreatePostScreen} />
      <MainTab.Screen
        name="Coins"
        component={CoinsNavigator}
        options={{ headerShown: false }}
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
  }, []);

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
