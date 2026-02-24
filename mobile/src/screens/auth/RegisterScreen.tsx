import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { useGoogleSignIn, extractGoogleIdToken } from '../../services/googleAuth';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RegisterScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Entrance animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(-20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const input1Opacity = useRef(new Animated.Value(0)).current;
  const input1X = useRef(new Animated.Value(40)).current;
  const input2Opacity = useRef(new Animated.Value(0)).current;
  const input2X = useRef(new Animated.Value(40)).current;
  const input3Opacity = useRef(new Animated.Value(0)).current;
  const input3X = useRef(new Animated.Value(40)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const dividerOpacity = useRef(new Animated.Value(0)).current;
  const googleOpacity = useRef(new Animated.Value(0)).current;
  const googleY = useRef(new Animated.Value(20)).current;
  const linkOpacity = useRef(new Animated.Value(0)).current;

  // Floating particles
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle1Opacity = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;
  const particle2Opacity = useRef(new Animated.Value(0)).current;
  const particle3Y = useRef(new Animated.Value(0)).current;
  const particle3Opacity = useRef(new Animated.Value(0)).current;

  // Pulse for logo
  const logoPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    runEntranceAnimations();
  }, []);

  const runEntranceAnimations = () => {
    // Logo bounce in
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Logo subtle rotation (opposite direction from login for variety)
    Animated.timing(logoRotate, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Logo pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Title
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 200);

    // Subtitle
    setTimeout(() => {
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 400);

    // Input 1 (username) — slides from right
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(input1Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(input1X, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 500);

    // Input 2 (email)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(input2Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(input2X, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 630);

    // Input 3 (password)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(input3Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(input3X, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 760);

    // Register button
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
    }, 900);

    // Divider
    setTimeout(() => {
      Animated.timing(dividerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 1050);

    // Google button
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(googleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(googleY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 1150);

    // Link
    setTimeout(() => {
      Animated.timing(linkOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 1300);

    // Floating particles
    setTimeout(() => {
      startParticles();
    }, 800);
  };

  const startParticles = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle1Opacity, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
          Animated.timing(particle1Opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(particle1Y, { toValue: -60, duration: 4000, useNativeDriver: true }),
          Animated.timing(particle1Y, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle2Opacity, { toValue: 0.3, duration: 2500, useNativeDriver: true }),
          Animated.timing(particle2Opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(particle2Y, { toValue: -50, duration: 4000, useNativeDriver: true }),
          Animated.timing(particle2Y, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle3Opacity, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
          Animated.timing(particle3Opacity, { toValue: 0, duration: 2200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(particle3Y, { toValue: -70, duration: 4000, useNativeDriver: true }),
          Animated.timing(particle3Y, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
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
        const result = await api.googleSignIn(idToken);
        await AsyncStorage.setItem('show_welcome_motto', 'true');

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
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    // Validate all fields are filled
    if (!trimmedUsername || !trimmedEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate username (alphanumeric, 3-30 characters)
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      Alert.alert('Error', 'Username must be 3-30 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(trimmedUsername)) {
      Alert.alert('Error', 'Username can only contain letters and numbers');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
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
      await api.register(trimmedUsername, trimmedEmail, password);
      await AsyncStorage.setItem('show_welcome_motto', 'true');
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

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['15deg', '0deg'],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Floating background particles */}
      <Animated.View style={[styles.particle, { top: '12%', right: '10%' }, { opacity: particle1Opacity, transform: [{ translateY: particle1Y }] }]}>
        <Ionicons name="sparkles" size={14} color={isDark ? 'rgba(251,191,36,0.5)' : 'rgba(131,58,180,0.3)'} />
      </Animated.View>
      <Animated.View style={[styles.particle, { top: '30%', left: '8%' }, { opacity: particle2Opacity, transform: [{ translateY: particle2Y }] }]}>
        <Ionicons name="heart" size={12} color={isDark ? 'rgba(225,48,108,0.4)' : 'rgba(225,48,108,0.25)'} />
      </Animated.View>
      <Animated.View style={[styles.particle, { bottom: '18%', right: '14%' }, { opacity: particle3Opacity, transform: [{ translateY: particle3Y }] }]}>
        <Ionicons name="leaf" size={13} color={isDark ? 'rgba(74,222,128,0.4)' : 'rgba(34,197,94,0.3)'} />
      </Animated.View>

      {/* Animated Logo */}
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: Animated.multiply(logoScale, logoPulse) }, { rotate: logoRotateInterpolate }] }]}>
        <View style={[styles.logoCircle, { backgroundColor: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(74,222,128,0.08)' }]}>
          <Ionicons name="person-add" size={40} color="#4ade80" />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[styles.title, { color: colors.text.primary }, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
      >
        Create Account
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, { color: colors.text.secondary, opacity: subtitleOpacity }]}>
        Join a community that cares
      </Animated.Text>

      {/* Username input */}
      <Animated.View style={{ opacity: input1Opacity, transform: [{ translateX: input1X }] }}>
        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
          <Ionicons name="person-outline" size={18} color={colors.text.tertiary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text.primary }]}
            placeholder="Username"
            placeholderTextColor={colors.text.tertiary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>
      </Animated.View>

      {/* Email input */}
      <Animated.View style={{ opacity: input2Opacity, transform: [{ translateX: input2X }] }}>
        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
          <Ionicons name="mail-outline" size={18} color={colors.text.tertiary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text.primary }]}
            placeholder="Email"
            placeholderTextColor={colors.text.tertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </Animated.View>

      {/* Password input */}
      <Animated.View style={{ opacity: input3Opacity, transform: [{ translateX: input3X }] }}>
        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.text.tertiary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text.primary }]}
            placeholder="Password"
            placeholderTextColor={colors.text.tertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </Animated.View>

      {/* Register button */}
      <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.text.link }]}
          onPress={handleRegister}
          disabled={loading || googleLoading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="rocket-outline" size={20} color={colors.text.inverse} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: colors.text.inverse }]}>Register</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Divider */}
      <Animated.View style={[styles.divider, { opacity: dividerOpacity }]}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.text.secondary }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </Animated.View>

      {/* Google Sign-In Button */}
      <Animated.View style={{ opacity: googleOpacity, transform: [{ translateY: googleY }] }}>
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleGoogleSignIn}
          disabled={!request || loading || googleLoading}
          activeOpacity={0.8}
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
      </Animated.View>

      {/* Login link */}
      <Animated.View style={{ opacity: linkOpacity }}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.link, { color: colors.text.link }]}>Already have an account? Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  particle: {
    position: 'absolute',
    zIndex: 0,
  },
  logoContainer: {
    alignSelf: 'center',
    marginBottom: 18,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
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
    marginVertical: 18,
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
    borderRadius: 12,
    padding: 15,
    marginBottom: 6,
  },
  googleButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});
