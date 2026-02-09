import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { accountManager } from '../../services/accountManager';
import { useGoogleSignIn, extractGoogleIdToken } from '../../services/googleAuth';
import { useTheme } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Check if we arrived here from "Add Account" flow
  useEffect(() => {
    const checkAddingAccount = async () => {
      const adding = await AsyncStorage.getItem('adding_account');
      setIsAddingAccount(adding === 'true');
    };
    checkAddingAccount();
  }, []);

  // Cancel adding account — go back to the app
  const handleCancelAddAccount = async () => {
    await AsyncStorage.setItem('cancel_add_account', 'true');
    await AsyncStorage.removeItem('adding_account');
  };

  // Google Sign-In setup
  const { request, response, promptAsync } = useGoogleSignIn();

  // Handle Google Sign-In response
  useEffect(() => {
    if (response) {
      handleGoogleResponse(response);
    }
  }, [response]);

  const handleGoogleResponse = async (response: any) => {
    if (response?.type === 'success') {
      const idToken = extractGoogleIdToken(response);

      if (!idToken) {
        Alert.alert('Error', 'Failed to get Google authentication token');
        return;
      }

      setGoogleLoading(true);
      try {
        // Check if any accounts already exist on the device before sign-in
        const storedAccounts = await accountManager.getStoredAccounts();
        const result = await api.googleSignIn(idToken);

        // Signal that login completed (needed for add-account flow with same account)
        await AsyncStorage.setItem('login_completed', 'true');

        if (result.isNewUser) {
          Alert.alert('Welcome!', 'Your account has been created successfully.');
        } else {
          // Returning user - check if this account was already on the device
          const existingAccount = storedAccounts.find(
            acc => acc.userId === result.user?.id
          );
          if (existingAccount) {
            await AsyncStorage.setItem('navigate_to_profile', 'true');
          }
          Alert.alert('Success', 'Signed in with Google!');
        }
        // Auth state will be automatically detected by polling in RootNavigator
      } catch (error: any) {
        const errorMessage = error.response?.data?.error ||
                            error.response?.data?.message ||
                            'Google sign-in failed. Please try again.';
        Alert.alert('Error', errorMessage);
      } finally {
        setGoogleLoading(false);
      }
    } else if (response?.type === 'error') {
      Alert.alert('Error', 'Google sign-in was cancelled or failed');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate Google sign-in');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Check if account with this email already exists on the device
      const storedAccounts = await accountManager.getStoredAccounts();
      const existingAccount = storedAccounts.find(
        acc => acc.email?.toLowerCase() === email.toLowerCase()
      );

      await api.login(email, password);

      // Signal that login completed (needed for add-account flow with same account)
      await AsyncStorage.setItem('login_completed', 'true');

      // If account was already on device, navigate to Profile after auth
      if (existingAccount) {
        await AsyncStorage.setItem('navigate_to_profile', 'true');
      }
      // Auth state will be automatically detected by polling in RootNavigator
    } catch (error: any) {
      // Extract error message from backend response
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          'Login failed. Please check your credentials.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isAddingAccount && (
        <TouchableOpacity style={styles.backButton} onPress={handleCancelAddAccount}>
          <Ionicons name="arrow-back" size={22} color={colors.text.link} />
          <Text style={[styles.backButtonText, { color: colors.text.link }]}>Back to app</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.title, { color: colors.text.primary }]}>
        {isAddingAccount ? 'Add Another Account' : 'Welcome to SeeMe'}
      </Text>

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text.primary, backgroundColor: colors.inputBackground }]}
        placeholder="Email"
        placeholderTextColor={colors.text.tertiary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text.primary, backgroundColor: colors.inputBackground }]}
        placeholder="Password"
        placeholderTextColor={colors.text.tertiary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.text.link }]}
        onPress={handleLogin}
        disabled={loading || googleLoading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>Login</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.text.secondary }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Google Sign-In Button */}
      <TouchableOpacity
        style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleGoogleSignIn}
        disabled={!request || loading || googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={[styles.googleButtonText, { color: colors.text.primary }]}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={[styles.link, { color: colors.text.link }]}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    marginTop: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  googleButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});
