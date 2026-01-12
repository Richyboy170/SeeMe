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

export default function LoginScreen({ navigation }: any) {
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await api.login(email, password);
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
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SeeMe</Text>

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
        onPress={handleLogin}
        disabled={loading || googleLoading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
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

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
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
