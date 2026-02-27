import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { friendshipSocket } from '../../services/friendshipSocket';
import InviteCodeDisplay from '../../components/friendship/InviteCodeDisplay';

export default function CreateSessionScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [session, setSession] = useState<any>(null);
  const [creating, setCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    createSession();
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      friendshipSocket.removeAllListeners();
    };
  }, []);

  // Navigate to PhotoBooth (guarded to prevent double navigation)
  const goToPhotoBooth = (sess: any) => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (pollInterval.current) clearInterval(pollInterval.current);
    friendshipSocket.removeAllListeners();

    navigation.replace('PhotoBooth', {
      sessionId: sess.id,
      poses: sess.assignedPoses,
      isHost: true,
    });
  };

  // Listen for partner joining via socket
  useEffect(() => {
    if (!session?.id) return;

    const unsub = friendshipSocket.onPartnerJoined((data) => {
      if (data.sessionId === session.id) {
        goToPhotoBooth(session);
      }
    });

    return unsub;
  }, [session]);

  // Poll session status as fallback (every 2s)
  useEffect(() => {
    if (!session?.id) return;

    pollInterval.current = setInterval(async () => {
      if (navigatedRef.current) return;
      try {
        const result = await api.getFriendshipSession(session.id);
        if (result.success && result.session.status === 'active' && result.session.guestUserId) {
          goToPhotoBooth(session);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 2000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [session]);

  const createSession = async () => {
    try {
      setCreating(true);
      setError(null);

      // Get location
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }
      } catch (locError) {
        console.log('Location unavailable, proceeding without');
      }

      const result = await api.createFriendshipSession(lat, lng);

      if (result.success) {
        setSession(result.session);
        // Join the socket room
        friendshipSocket.joinSession(result.session.id);
      } else {
        setError('Failed to create session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async () => {
    if (session?.id) {
      try {
        await api.cancelFriendshipSession(session.id);
        friendshipSocket.cancelSession(session.id);
      } catch (err) {
        // Ignore cancel errors
      }
    }
    navigation.goBack();
  };

  if (creating) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.link} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Creating meetup session...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={[styles.errorText, { color: colors.text.primary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.text.link }]} onPress={createSession}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Waiting indicator */}
      <View style={styles.waitingSection}>
        <ActivityIndicator size="small" color={colors.text.link} />
        <Text style={[styles.waitingText, { color: colors.text.secondary }]}>
          Waiting for your friend to join...
        </Text>
      </View>

      {/* Invite Code Display */}
      {session && (
        <InviteCodeDisplay
          inviteCode={session.inviteCode}
          sessionId={session.id}
        />
      )}

      {/* Timer */}
      <Text style={[styles.expiryText, { color: colors.text.tertiary }]}>
        Session expires in 15 minutes
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  cancelBtn: {
    padding: 8,
  },
  waitingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  waitingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  expiryText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
