import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, getImageUrl } from '../../services/api';
import { useTheme, Colors } from '../../theme';

export default function BroadcasterManagementScreen({ route }: any) {
  const { topicId } = route.params;
  const { colors, isDark } = useTheme();

  const [broadcasters, setBroadcasters] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [broadcasterRes, membersRes] = await Promise.all([
        api.getBroadcasters(topicId),
        api.getTopicMembers(topicId, 1),
      ]);
      setBroadcasters(broadcasterRes.broadcasters || []);
      setAdmins(broadcasterRes.admins || []);
      setMembers(membersRes.members || []);
    } catch (error) {
      console.error('Error loading broadcasters:', error);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemove = async (userId: string) => {
    Alert.alert('Remove Broadcaster', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setActionLoading(userId);
          try {
            await api.removeBroadcaster(topicId, userId);
            setBroadcasters(prev => prev.filter(b => b.id !== userId));
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to remove broadcaster');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  const handleAdd = async (userId: string) => {
    setActionLoading(userId);
    try {
      await api.addBroadcaster(topicId, userId);
      // Find the user from members and add to broadcasters
      const user = members.find(m => m.id === userId);
      if (user) {
        setBroadcasters(prev => [...prev, { ...user, role: 'broadcaster' }]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add broadcaster');
    } finally {
      setActionLoading(null);
    }
  };

  const broadcasterIds = new Set([...broadcasters.map(b => b.id), ...admins.map(a => a.id)]);

  const filteredMembers = members.filter(m =>
    !broadcasterIds.has(m.id) &&
    (!search || m.username?.toLowerCase().includes(search.toLowerCase()))
  );

  const renderUserRow = (user: any, role: string, onAction?: () => void, actionLabel?: string) => {
    const avatarUri = user.avatarUrl ? getImageUrl(user.avatarUrl) : null;
    const isLoading = actionLoading === user.id;

    return (
      <View key={user.id} style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.userInfo}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="person" size={18} color={colors.text.secondary} />
            </View>
          )}
          <View style={styles.userText}>
            <Text style={[styles.username, { color: colors.text.primary }]}>@{user.username}</Text>
            <Text style={[styles.roleText, { color: colors.text.secondary }]}>{role}</Text>
          </View>
        </View>
        {onAction && (
          isLoading ? (
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          ) : (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                actionLabel === 'Remove'
                  ? { borderColor: '#EF4444', borderWidth: 1 }
                  : { backgroundColor: Colors.brand.primary }
              ]}
              onPress={onAction}
            >
              <Text style={[
                styles.actionText,
                { color: actionLabel === 'Remove' ? '#EF4444' : '#FFFFFF' }
              ]}>{actionLabel}</Text>
            </TouchableOpacity>
          )
        )}
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
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {/* Admins (always can broadcast) */}
            {admins.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                  Admins (always can broadcast)
                </Text>
                {admins.map(a => renderUserRow(a, a.role))}
              </View>
            )}

            {/* Broadcasters */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Broadcasters</Text>
              {broadcasters.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                  No broadcasters added yet
                </Text>
              ) : (
                broadcasters.map(b => renderUserRow(b, 'Broadcaster', () => handleRemove(b.id), 'Remove'))
              )}
            </View>

            {/* Add Broadcaster */}
            <TouchableOpacity
              style={[styles.addBtn, { borderColor: Colors.brand.primary }]}
              onPress={() => setShowAddSection(!showAddSection)}
            >
              <Ionicons name={showAddSection ? 'chevron-up' : 'add'} size={20} color={Colors.brand.primary} />
              <Text style={[styles.addBtnText, { color: Colors.brand.primary }]}>
                {showAddSection ? 'Hide' : 'Add Broadcaster'}
              </Text>
            </TouchableOpacity>

            {showAddSection && (
              <View style={styles.section}>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.surfaceVariant, color: colors.text.primary, borderColor: colors.border }]}
                  placeholder="Search members..."
                  placeholderTextColor={colors.text.secondary}
                  value={search}
                  onChangeText={setSearch}
                />
                {filteredMembers.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                    No members to add
                  </Text>
                ) : (
                  filteredMembers.slice(0, 20).map(m =>
                    renderUserRow(m, 'Member', () => handleAdd(m.id), 'Add')
                  )
                )}
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  userText: { marginLeft: 10, flex: 1 },
  username: { fontSize: 14, fontWeight: '600' },
  roleText: { fontSize: 12, marginTop: 1 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 16, gap: 6,
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  searchInput: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10, fontSize: 14 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 12 },
});
