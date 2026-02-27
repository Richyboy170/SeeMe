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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { accountManager } from '../../services/accountManager';
import { useGoogleSignIn, extractGoogleIdToken } from '../../services/googleAuth';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AccountStatusInfo {
  accountStatus: 'banned' | 'suspended';
  reason?: string;
  suspendedUntil?: string;
}

export default function LoginScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatusInfo | null>(null);

  // Entrance animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(-20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const input1Opacity = useRef(new Animated.Value(0)).current;
  const input1X = useRef(new Animated.Value(-40)).current;
  const input2Opacity = useRef(new Animated.Value(0)).current;
  const input2X = useRef(new Animated.Value(-40)).current;
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

    // Logo subtle rotation
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

    // Input 1 (email)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(input1Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(input1X, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 500);

    // Input 2 (password)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(input2Opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(input2X, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 650);

    // Login button
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
    }, 800);

    // Divider
    setTimeout(() => {
      Animated.timing(dividerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 950);

    // Google button
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(googleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(googleY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();
    }, 1050);

    // Link
    setTimeout(() => {
      Animated.timing(linkOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 1200);

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

  // Check if we arrived here from "Add Account" flow
  useEffect(() => {
    const checkAddingAccount = async () => {
      const adding = await AsyncStorage.getItem('adding_account');
      setIsAddingAccount(adding === 'true');
    };
    checkAddingAccount();
  }, []);

  // Check if user was redirected here due to mid-session ban/suspend
  useEffect(() => {
    const checkAccountAction = async () => {
      const stored = await AsyncStorage.getItem('account_action');
      if (stored) {
        try {
          const info = JSON.parse(stored) as AccountStatusInfo;
          setAccountStatus(info);
        } catch {}
        await AsyncStorage.removeItem('account_action');
      }
    };
    checkAccountAction();
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
        await AsyncStorage.setItem('show_welcome_motto', 'true');

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
        const errorData = error.response?.data;
        if (errorData?.accountStatus) {
          setAccountStatus({
            accountStatus: errorData.accountStatus,
            reason: errorData.reason,
            suspendedUntil: errorData.suspendedUntil,
          });
        } else {
          const errorMessage = errorData?.error ||
                              errorData?.message ||
                              'Google sign-in failed. Please try again.';
          Alert.alert('Error', errorMessage);
        }
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
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Check if account with this email already exists on the device
      const storedAccounts = await accountManager.getStoredAccounts();
      const existingAccount = storedAccounts.find(
        acc => acc.email?.toLowerCase() === trimmedEmail.toLowerCase()
      );

      await api.login(trimmedEmail, password);

      // Signal that login completed (needed for add-account flow with same account)
      await AsyncStorage.setItem('login_completed', 'true');
      await AsyncStorage.setItem('show_welcome_motto', 'true');

      // If account was already on device, navigate to Profile after auth
      if (existingAccount) {
        await AsyncStorage.setItem('navigate_to_profile', 'true');
      }
      // Auth state will be automatically detected by polling in RootNavigator
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.accountStatus) {
        setAccountStatus({
          accountStatus: errorData.accountStatus,
          reason: errorData.reason,
          suspendedUntil: errorData.suspendedUntil,
        });
      } else {
        const errorMessage = errorData?.error ||
                            errorData?.message ||
                            'Login failed. Please check your credentials.';
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Floating background particles */}
      <Animated.View style={[styles.particle, { top: '15%', left: '10%' }, { opacity: particle1Opacity, transform: [{ translateY: particle1Y }] }]}>
        <Ionicons name="heart" size={14} color={isDark ? 'rgba(251,191,36,0.5)' : 'rgba(131,58,180,0.3)'} />
      </Animated.View>
      <Animated.View style={[styles.particle, { top: '25%', right: '12%' }, { opacity: particle2Opacity, transform: [{ translateY: particle2Y }] }]}>
        <Ionicons name="sparkles" size={12} color={isDark ? 'rgba(134,239,172,0.4)' : 'rgba(64,93,230,0.3)'} />
      </Animated.View>
      <Animated.View style={[styles.particle, { bottom: '20%', left: '15%' }, { opacity: particle3Opacity, transform: [{ translateY: particle3Y }] }]}>
        <Ionicons name="leaf" size={13} color={isDark ? 'rgba(74,222,128,0.4)' : 'rgba(34,197,94,0.3)'} />
      </Animated.View>

      {isAddingAccount && (
        <TouchableOpacity style={styles.backButton} onPress={handleCancelAddAccount}>
          <Ionicons name="arrow-back" size={22} color={colors.text.link} />
          <Text style={[styles.backButtonText, { color: colors.text.link }]}>Back to app</Text>
        </TouchableOpacity>
      )}

      {/* Animated Logo */}
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: Animated.multiply(logoScale, logoPulse) }, { rotate: logoRotateInterpolate }] }]}>
        <View style={[styles.logoCircle, { backgroundColor: isDark ? 'rgba(131,58,180,0.15)' : 'rgba(131,58,180,0.08)' }]}>
          <Ionicons name="heart" size={44} color="#E1306C" />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[styles.title, { color: colors.text.primary }, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
      >
        {isAddingAccount ? 'Add Another Account' : 'Welcome to SeeMe'}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, { color: colors.text.secondary, opacity: subtitleOpacity }]}>
        Where positivity grows
      </Animated.Text>

      {/* Email input */}
      <Animated.View style={{ opacity: input1Opacity, transform: [{ translateX: input1X }] }}>
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
      <Animated.View style={{ opacity: input2Opacity, transform: [{ translateX: input2X }] }}>
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

      {/* Login button */}
      <Animated.View style={{ opacity: buttonOpacity, transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.text.link }]}
          onPress={handleLogin}
          disabled={loading || googleLoading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="log-in-outline" size={20} color={colors.text.inverse} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: colors.text.inverse }]}>Login</Text>
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

      {/* Register link */}
      <Animated.View style={{ opacity: linkOpacity }}>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.link, { color: colors.text.link }]}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Account Status Modal (Banned/Suspended) */}
      <Modal
        visible={accountStatus !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountStatus(null)}
      >
        <View style={statusStyles.overlay}>
          <View style={[statusStyles.card, { backgroundColor: colors.card }]}>
            {/* Icon */}
            <View style={[
              statusStyles.iconCircle,
              { backgroundColor: accountStatus?.accountStatus === 'banned' ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)' }
            ]}>
              <Ionicons
                name={accountStatus?.accountStatus === 'banned' ? 'ban' : 'time'}
                size={48}
                color={accountStatus?.accountStatus === 'banned' ? '#EF4444' : '#F59E0B'}
              />
            </View>

            {/* Title */}
            <Text style={[statusStyles.title, { color: colors.text.primary }]}>
              {accountStatus?.accountStatus === 'banned'
                ? 'Account Banned'
                : 'Account Suspended'}
            </Text>

            {/* Description */}
            <Text style={[statusStyles.description, { color: colors.text.secondary }]}>
              {accountStatus?.accountStatus === 'banned'
                ? 'Your account has been permanently banned from SeeMe.'
                : 'Your account has been temporarily suspended.'}
            </Text>

            {/* Reason */}
            {accountStatus?.reason ? (
              <View style={[statusStyles.reasonBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[statusStyles.reasonLabel, { color: colors.text.tertiary }]}>Reason</Text>
                <Text style={[statusStyles.reasonText, { color: colors.text.primary }]}>
                  {accountStatus.reason}
                </Text>
              </View>
            ) : null}

            {/* Suspension expiry */}
            {accountStatus?.accountStatus === 'suspended' && accountStatus?.suspendedUntil ? (
              <View style={[statusStyles.expiryBox, { backgroundColor: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.06)' }]}>
                <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
                <Text style={[statusStyles.expiryText, { color: colors.text.secondary }]}>
                  Suspended until{' '}
                  <Text style={{ fontWeight: '600', color: colors.text.primary }}>
                    {new Date(accountStatus.suspendedUntil).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Help text */}
            <Text style={[statusStyles.helpText, { color: colors.text.tertiary }]}>
              If you believe this is a mistake, please contact support.
            </Text>

            {/* Dismiss button */}
            <TouchableOpacity
              style={[
                statusStyles.dismissButton,
                { backgroundColor: accountStatus?.accountStatus === 'banned' ? '#EF4444' : '#F59E0B' }
              ]}
              onPress={() => setAccountStatus(null)}
              activeOpacity={0.8}
            >
              <Text style={statusStyles.dismissText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

const statusStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  reasonBox: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
  },
  expiryBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  expiryText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  dismissButton: {
    width: '100%',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
