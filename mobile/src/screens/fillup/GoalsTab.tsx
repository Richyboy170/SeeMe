import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_GOALS = 3;

interface Goal {
  id: string;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  showOnProfile: boolean;
  completedAt: string | null;
  postsCount: number;
  createdAt: string;
}

interface GoalPost {
  id: string;
  originalImageUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string };
}

interface GoalsTabProps {
  navigation: any;
}

export default function GoalsTab({ navigation }: GoalsTabProps) {
  const { colors, isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [goalPosts, setGoalPosts] = useState<Record<string, GoalPost[]>>({});
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishingGoal, setFinishingGoal] = useState<Goal | null>(null);
  const [finishShowOnProfile, setFinishShowOnProfile] = useState(false);

  const loadGoals = async () => {
    try {
      const result = await api.getMyGoals();
      setGoals(result.goals || []);
      setCompletedGoals(result.completedGoals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;

    try {
      Keyboard.dismiss();
      const result = await api.createGoal(newGoalTitle.trim());
      if (result.success) {
        setGoals(prev => [...prev, result.goal]);
        setShowCreateModal(false);
        setNewGoalTitle('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create goal');
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Remove Goal',
      `Remove "${goal.title}"? Posts tagged with this goal will keep their tag.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGoal(goal.id);
              setGoals(prev => prev.filter(g => g.id !== goal.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove goal');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingGoal || !editTitle.trim()) return;

    try {
      Keyboard.dismiss();
      const result = await api.updateGoal(editingGoal.id, { title: editTitle.trim() });
      if (result.success) {
        setGoals(prev =>
          prev.map(g => (g.id === editingGoal.id ? { ...g, title: editTitle.trim() } : g))
        );
        setEditingGoal(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update goal');
    }
  };

  const handleExpandGoal = async (goalId: string) => {
    if (expandedGoalId === goalId) {
      setExpandedGoalId(null);
      return;
    }
    setExpandedGoalId(goalId);

    if (!goalPosts[goalId]) {
      try {
        const result = await api.getGoalPosts(goalId);
        setGoalPosts(prev => ({ ...prev, [goalId]: result.posts || [] }));
      } catch (error) {
        console.error('Error loading goal posts:', error);
      }
    }
  };

  const handleOpenFinishModal = (goal: Goal) => {
    setFinishingGoal(goal);
    setFinishShowOnProfile(false);
    setShowFinishModal(true);
  };

  const handleFinishGoal = async () => {
    if (!finishingGoal) return;

    try {
      const result = await api.finishGoal(finishingGoal.id, finishShowOnProfile);
      if (result.success) {
        const finished: Goal = {
          ...finishingGoal,
          isCompleted: true,
          showOnProfile: finishShowOnProfile,
          completedAt: result.goal?.completedAt || new Date().toISOString(),
        };
        setGoals(prev => prev.filter(g => g.id !== finishingGoal.id));
        setCompletedGoals(prev => [finished, ...prev]);
        setShowFinishModal(false);
        setFinishingGoal(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to finish goal');
    }
  };

  const handleDeleteCollection = (goal: Goal) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${goal.title}" collection? Your tagged posts will still exist but will no longer be grouped under this goal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGoalCollection(goal.id);
              setCompletedGoals(prev => prev.filter(g => g.id !== goal.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete collection');
            }
          },
        },
      ]
    );
  };

  const formatCompletedDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderGoalCard = (goal: Goal) => {
    const isExpanded = expandedGoalId === goal.id;
    const posts = goalPosts[goal.id] || [];

    return (
      <View
        key={goal.id}
        style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {/* Goal Header */}
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            <Ionicons name="flag" size={18} color="#10B981" />
            <Text style={[styles.goalTitle, { color: colors.text.primary }]} numberOfLines={2}>
              {goal.title}
            </Text>
          </View>
          <View style={styles.goalActions}>
            <TouchableOpacity
              onPress={() => {
                setEditingGoal(goal);
                setEditTitle(goal.title);
              }}
              style={styles.goalActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteGoal(goal)}
              style={styles.goalActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post count */}
        {goal.postsCount > 0 && (
          <View style={styles.goalMeta}>
            <Text style={[styles.postCount, { color: colors.text.secondary }]}>
              {goal.postsCount} post{goal.postsCount !== 1 ? 's' : ''} tagged
            </Text>
          </View>
        )}

        {/* Expand/Collapse Posts */}
        <TouchableOpacity
          style={[styles.expandBtn, { borderTopColor: colors.border }]}
          onPress={() => handleExpandGoal(goal.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={16} color={colors.text.secondary} />
          <Text style={[styles.expandBtnText, { color: colors.text.secondary }]}>
            {isExpanded ? 'Hide Posts' : 'Show Posts'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {/* Posts Grid */}
        {isExpanded && (
          <View style={styles.postsGrid}>
            {posts.length > 0 ? (
              posts.map(post => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postThumb}
                  onPress={() =>
                    navigation.dispatch({
                      type: 'NAVIGATE',
                      payload: { name: 'Comments', params: { postId: post.id } },
                    })
                  }
                  activeOpacity={0.7}
                >
                  {(post.thumbnailUrl || post.originalImageUrl) ? (
                    <Image
                      source={{ uri: getImageUrl(post.thumbnailUrl || post.originalImageUrl)! }}
                      style={styles.postThumbImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.postThumbPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                      <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noPostsText, { color: colors.text.tertiary }]}>
                No posts tagged with this goal yet
              </Text>
            )}
          </View>
        )}

        {/* Complete Goal Button */}
        <TouchableOpacity
          style={[styles.completeGoalBtn, { borderTopColor: colors.border }]}
          onPress={() => handleOpenFinishModal(goal)}
          activeOpacity={0.7}
        >
          <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
          <Text style={styles.completeGoalBtnText}>Complete Goal</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCompletedGoalCard = (goal: Goal) => {
    const isExpanded = expandedGoalId === goal.id;
    const posts = goalPosts[goal.id] || [];

    return (
      <View
        key={goal.id}
        style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {/* Completed Goal Header */}
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={[styles.goalTitle, { color: colors.text.primary }]} numberOfLines={2}>
              {goal.title}
            </Text>
          </View>
          <View style={[styles.completedBadge, { backgroundColor: '#10B98120' }]}>
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        </View>

        {/* Completed date + post count */}
        <View style={styles.goalMeta}>
          {goal.completedAt && (
            <Text style={[styles.postCount, { color: colors.text.secondary }]}>
              Finished {formatCompletedDate(goal.completedAt)}
            </Text>
          )}
          {goal.postsCount > 0 && (
            <Text style={[styles.postCount, { color: colors.text.secondary }]}>
              {goal.postsCount} post{goal.postsCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Expand/Collapse Posts */}
        <TouchableOpacity
          style={[styles.expandBtn, { borderTopColor: colors.border }]}
          onPress={() => handleExpandGoal(goal.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={16} color={colors.text.secondary} />
          <Text style={[styles.expandBtnText, { color: colors.text.secondary }]}>
            {isExpanded ? 'Hide Posts' : 'Show Posts'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {/* Posts Grid */}
        {isExpanded && (
          <View style={styles.postsGrid}>
            {posts.length > 0 ? (
              posts.map(post => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postThumb}
                  onPress={() =>
                    navigation.dispatch({
                      type: 'NAVIGATE',
                      payload: { name: 'Comments', params: { postId: post.id } },
                    })
                  }
                  activeOpacity={0.7}
                >
                  {(post.thumbnailUrl || post.originalImageUrl) ? (
                    <Image
                      source={{ uri: getImageUrl(post.thumbnailUrl || post.originalImageUrl)! }}
                      style={styles.postThumbImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.postThumbPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                      <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noPostsText, { color: colors.text.tertiary }]}>
                No posts tagged with this goal
              </Text>
            )}
          </View>
        )}

        {/* Delete Collection Button */}
        {isExpanded && (
          <TouchableOpacity
            style={[styles.deleteCollectionBtn, { borderTopColor: colors.border }]}
            onPress={() => handleDeleteCollection(goal)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
            <Text style={styles.deleteCollectionText}>Delete Collection</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[1]}
        keyExtractor={() => 'goals-content'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={() => (
          <View style={styles.content}>
            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroEmoji}>{'\uD83C\uDFAF'}</Text>
              <Text style={[styles.heroTitle, { color: colors.text.primary }]}>My Goals</Text>
              <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
                Set up to {MAX_GOALS} goals and track your progress by tagging posts
              </Text>
            </View>

            {/* Goal Count Badge - only active goals count */}
            <View style={styles.countRow}>
              <View style={[styles.countBadge, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.countText, { color: colors.text.primary }]}>
                  {goals.length}/{MAX_GOALS}
                </Text>
              </View>
            </View>

            {/* Active Goal Cards */}
            {goals.map(renderGoalCard)}

            {/* Empty State */}
            {!loading && goals.length === 0 && completedGoals.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={48} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No goals set yet. Add your first goal to start tracking!
                </Text>
              </View>
            )}

            {/* Add Goal Button - only count active goals */}
            {goals.length < MAX_GOALS && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#10B981' }]}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={22} color="#FFF" />
                <Text style={styles.addBtnText}>Add Goal</Text>
              </TouchableOpacity>
            )}

            {/* Completed Goals Section */}
            {completedGoals.length > 0 && (
              <>
                <View style={styles.completedSectionHeader}>
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
                  <Text style={[styles.completedSectionTitle, { color: colors.text.primary }]}>
                    Completed Goals
                  </Text>
                  <View style={[styles.completedCountBadge, { backgroundColor: '#F59E0B20' }]}>
                    <Text style={styles.completedCountText}>{completedGoals.length}</Text>
                  </View>
                </View>
                {completedGoals.map(renderCompletedGoalCard)}
              </>
            )}
          </View>
        )}
      />

      {/* Create Goal Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); setShowCreateModal(false); }}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: isDark ? '#1e1e30' : '#ffffff' }]}
              onPress={() => Keyboard.dismiss()}
            >
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>New Goal</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: colors.text.primary,
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="What do you want to achieve?"
                placeholderTextColor={colors.text.tertiary}
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
                maxLength={200}
                multiline
                autoFocus
              />
              <Text style={[styles.charCount, { color: colors.text.tertiary }]}>
                {newGoalTitle.length}/200
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCreateModal(false);
                    setNewGoalTitle('');
                  }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalCreateBtn,
                    { backgroundColor: newGoalTitle.trim() ? '#10B981' : '#10B98140' },
                  ]}
                  onPress={handleCreateGoal}
                  disabled={!newGoalTitle.trim()}
                >
                  <Text style={styles.modalCreateText}>Create</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal visible={!!editingGoal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); setEditingGoal(null); }}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: isDark ? '#1e1e30' : '#ffffff' }]}
              onPress={() => Keyboard.dismiss()}
            >
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Edit Goal</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: colors.text.primary,
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                value={editTitle}
                onChangeText={setEditTitle}
                maxLength={200}
                multiline
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setEditingGoal(null); }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalCreateBtn,
                    { backgroundColor: editTitle.trim() ? '#10B981' : '#10B98140' },
                  ]}
                  onPress={handleSaveEdit}
                  disabled={!editTitle.trim()}
                >
                  <Text style={styles.modalCreateText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Finish Goal Modal */}
      <Modal visible={showFinishModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowFinishModal(false);
            setFinishingGoal(null);
          }}
        >
          <Pressable
            style={[styles.finishModalCard, { backgroundColor: isDark ? '#1e1e30' : '#ffffff' }]}
            onPress={() => {}}
          >
            {/* Big trophy top */}
            <Text style={styles.finishEmoji}>{'\uD83C\uDFC6'}</Text>

            <Text style={[styles.finishTitle, { color: colors.text.primary }]}>
              Mark as complete?
            </Text>
            <Text style={styles.finishUndoWarning}>This action cannot be undone</Text>

            {finishingGoal && (
              <Text style={[styles.finishGoalName, { color: colors.text.primary }]} numberOfLines={2}>
                "{finishingGoal.title}"
              </Text>
            )}

            <Text style={[styles.finishNote, { color: colors.text.tertiary }]}>
              This can't be undone. Your posts stay.
            </Text>

            {/* Simple toggle row for profile visibility */}
            <TouchableOpacity
              style={[
                styles.profileToggleRow,
                {
                  backgroundColor: finishShowOnProfile ? '#10B98115' : (isDark ? '#ffffff08' : '#00000005'),
                  borderColor: finishShowOnProfile ? '#10B98150' : colors.border,
                },
              ]}
              onPress={() => setFinishShowOnProfile(prev => !prev)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={finishShowOnProfile ? 'eye' : 'eye-off-outline'}
                size={20}
                color={finishShowOnProfile ? '#10B981' : colors.text.tertiary}
              />
              <Text style={[styles.profileToggleText, { color: colors.text.primary }]}>
                Show on my profile
              </Text>
              <View style={[
                styles.toggleTrack,
                { backgroundColor: finishShowOnProfile ? '#10B981' : (isDark ? '#555' : '#ccc') },
              ]}>
                <View style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: finishShowOnProfile ? 18 : 2 }] },
                ]} />
              </View>
            </TouchableOpacity>

            {/* Actions */}
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={handleFinishGoal}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.finishBtnText}>Complete Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishCancelBtn}
              onPress={() => {
                setShowFinishModal(false);
                setFinishingGoal(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.finishCancelText, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const THUMB_SIZE = (SCREEN_WIDTH - 48 - 16) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  countRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 8,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 6,
  },
  goalActionBtn: {
    padding: 4,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  postCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  expandBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 4,
  },
  postThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postThumbImg: {
    width: '100%',
    height: '100%',
  },
  postThumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPostsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCreateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Completed Goals Section
  completedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 14,
  },
  completedSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  completedCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  completedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  deleteCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  deleteCollectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  completeGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  completeGoalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  finishUndoWarning: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 10,
  },
  // Finish Goal Modal
  finishModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  finishEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  finishTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  finishGoalName: {
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  finishNote: {
    fontSize: 13,
    marginBottom: 20,
  },
  profileToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 20,
  },
  profileToggleText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
  },
  finishBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  finishCancelBtn: {
    paddingVertical: 10,
  },
  finishCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
