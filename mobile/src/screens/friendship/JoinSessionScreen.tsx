import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { friendshipSocket } from '../../services/friendshipSocket';
import QRScanner from '../../components/friendship/QRScanner';

export default function JoinSessionScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [joining, setJoining] = useState(false);

  const handleCodeScanned = async (code: string) => {
    if (joining) return;
    setJoining(true);

    try {
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
        console.log('Location unavailable');
      }

      const result = await api.joinFriendshipSession(code, lat, lng);

      if (result.success) {
        // Join socket room
        friendshipSocket.joinSession(result.session.id);
        // Signal ready
        friendshipSocket.signalReady(result.session.id);

        // Navigate to photo booth
        navigation.replace('PhotoBooth', {
          sessionId: result.session.id,
          poses: result.session.assignedPoses,
          isHost: false,
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to join session');
        setJoining(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to join session');
      setJoining(false);
    }
  };

  if (joining) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.link} />
        <Text style={[styles.joiningText, { color: colors.text.secondary }]}>
          Joining meetup...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <QRScanner onCodeScanned={handleCodeScanned} />
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
  },
  joiningText: {
    marginTop: 16,
    fontSize: 16,
  },
});
