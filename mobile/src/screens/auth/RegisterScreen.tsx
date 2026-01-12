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
import { api } from '../../services/api';
import { useGoogleSignIn, extractGoogleIdToken } from '../../services/googleAuth';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        const result = await api.googleSignIn(idToken);

        if (result.isNewUser) {
          Alert.alert('Welcome!', 'Your account has been created successfully.');
        } else {
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

  const handleRegister = async () => {
    // Validate all fields are filled
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate username (alphanumeric, 3-30 characters)
    if (username.length < 3 || username.length > 30) {
      Alert.alert('Error', 'Username must be 3-30 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      Alert.alert('Error', 'Username can only contain letters and numbers');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password (minimum 8 characters to match backend)
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password.length > 128) {
      Alert.alert('Error', 'Password must be less than 128 characters');
      return;
    }

    setLoading(true);
    try {
      await api.register(username, email, password);
      // Auth state will be automatically detected by polling in RootNavigator
    } catch (error: any) {
      // Extract error message from backend response
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          'Registration failed. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading || googleLoading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Google Sign-In Button */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={!request || loading || googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
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
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  googleButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
