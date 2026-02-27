import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, getImageUrl } from '../../services/api';
import { useTheme, Colors } from '../../theme';

export default function PendingRequestsScreen({ route, navigation }: any) {
  const { topicId } = route.params;
  const { colors, isDark } = useTheme();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const response = await api.getPendingRequests(topicId);
      setRequests(response.requests || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(userId);
    try {
      await api.handleMemberRequest(topicId, userId, action);
      setRequests(prev => prev.filter(r => r.user?.id !== userId));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  };

  const renderRequest = ({ item }: { item: any }) => {
    const user = item.user;
    if (!user) return null;
    const isLoading = actionLoading === user.id;
    const avatarUri = user.avatarUrl ? getImageUrl(user.avatarUrl) : null;

    return (
      <View style={[styles.requestRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.userInfo}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="person" size={20} color={colors.text.secondary} />
            </View>
          )}
          <View style={styles.userText}>
            <Text style={[styles.username, { color: colors.text.primary }]}>@{user.username}</Text>
            <Text style={[styles.requestDate, { color: colors.text.secondary }]}>
              Requested {new Date(item.requestedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleAction(user.id, 'approve')}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn, { borderColor: colors.border }]}
                onPress={() => handleAction(user.id, 'reject')}
              >
                <Ionicons name="close" size={18} color={colors.text.secondary} />
                <Text style={[styles.rejectBtnText, { color: colors.text.secondary }]}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {requests.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.text.secondary} />
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No pending requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  requestRow: {
    flexDirection: 'column',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  userText: { marginLeft: 12, flex: 1 },
  username: { fontSize: 15, fontWeight: '600' },
  requestDate: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  approveBtn: { backgroundColor: Colors.brand.primary },
  rejectBtn: { borderWidth: 1 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  rejectBtnText: { fontWeight: '600', fontSize: 13 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
