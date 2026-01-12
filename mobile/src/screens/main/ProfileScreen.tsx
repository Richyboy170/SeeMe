import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';
import GiveCoinsModal from '../../components/coins/GiveCoinsModal';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width / 3;

interface ProfileScreenProps {
  route?: {
    params?: {
      userId?: string;
      username?: string;
    };
  };
}

export default function ProfileScreen({ route }: ProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [giveModalVisible, setGiveModalVisible] = useState(false);

  const userId = route?.params?.userId;
  const username = route?.params?.username;

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
      loadPosts();
    }, [userId, username])
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile(userId);
      setUser(data);
      setIsOwnProfile(!userId || data.isOwnProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await api.getUserPosts(username);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            setLoading(true);
            try {
              await api.logout();
              // Navigation will be handled by auth state change
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user.avatarUrl || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
        </View>

        <View style={styles.userInfoHeader}>
          <Text style={styles.username}>@{user.username}</Text>
          {user.email && <Text style={styles.email}>{user.email}</Text>}
        </View>

        {/* Give Coins Button (only for other users' profiles) */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={styles.giveButton}
            onPress={() => setGiveModalVisible(true)}
          >
            <Ionicons name="gift" size={20} color="#FFF" />
            <Text style={styles.giveButtonText}>Give Coins</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{user.postsCount || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Give Counter Badge */}
        {user.positivityGiveCounter !== undefined && user.positivityRank && (
          <View style={styles.giveCounterContainer}>
            <GiveCounterBadge
              giveCounter={user.positivityGiveCounter}
              rank={user.positivityRank}
            />
          </View>
        )}
      </View>

      {/* Menu section (only for own profile) */}
      {isOwnProfile && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
            disabled={loading}
          >
            <Text style={styles.logoutText}>
              {loading ? 'Logging out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.postsSection}>
        <Text style={styles.sectionTitle}>
          {isOwnProfile ? 'My Posts' : 'Posts'}
        </Text>
        {loadingPosts ? (
          <ActivityIndicator size="small" color="#FBBF24" style={{ marginTop: 20 }} />
        ) : posts.length > 0 ? (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.gridItem}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              {isOwnProfile
                ? 'Start creating posts to see them here'
                : 'This user hasn\'t posted anything yet'}
            </Text>
          </View>
        )}
      </View>

      {/* Give Coins Modal */}
      <GiveCoinsModal
        visible={giveModalVisible}
        recipientId={user.id}
        recipientUsername={user.username}
        contextType="profile"
        onClose={() => setGiveModalVisible(false)}
        onSuccess={() => {
          setGiveModalVisible(false);
          loadProfile(); // Reload profile to update give counter
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  userInfoHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  giveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  giveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  giveCounterContainer: {
    width: '100%',
    marginTop: 10,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  postsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
});
