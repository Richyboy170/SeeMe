/**
 * RepostOptionsModal Component
 * Modal for choosing between simple repost and quote post
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { repostPost, quotePost, unrepostPost, RepostType } from '../../services/repostService';

interface RepostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  isReposted: boolean;
  repostType?: RepostType | null;
  onRepostSuccess: (reposted: boolean, type?: RepostType) => void;
  originalCaption?: string;
  originalUsername?: string;
}

export const RepostOptionsModal: React.FC<RepostOptionsModalProps> = ({
  visible,
  onClose,
  postId,
  isReposted,
  repostType,
  onRepostSuccess,
  originalCaption,
  originalUsername,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    surface: isDark ? '#1C1C1E' : '#F2F2F7',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#8E8E93' : '#6B6B6B',
    border: isDark ? '#38383A' : '#E5E5EA',
    accent: '#1DA1F2',
    danger: '#FF3B30',
  };

  const handleSimpleRepost = async () => {
    setIsLoading(true);
    try {
      const result = await repostPost(postId);
      if (result.success) {
        onRepostSuccess(true, 'repost');
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to repost');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to repost');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuotePost = async () => {
    if (!quoteText.trim()) {
      Alert.alert('Error', 'Please add your thoughts to quote this post');
      return;
    }

    setIsLoading(true);
    try {
      const result = await quotePost(postId, quoteText);
      if (result.success) {
        onRepostSuccess(true, 'quote');
        setQuoteText('');
        setShowQuoteInput(false);
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to create quote post');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create quote post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndoRepost = async () => {
    setIsLoading(true);
    try {
      const result = await unrepostPost(postId);
      if (result.success) {
        onRepostSuccess(false);
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to undo repost');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to undo repost');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowQuoteInput(false);
    setQuoteText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {showQuoteInput ? 'Quote Post' : isReposted ? 'Repost Options' : 'Repost'}
            </Text>
            {showQuoteInput && (
              <TouchableOpacity
                onPress={handleQuotePost}
                disabled={isLoading || !quoteText.trim()}
                style={[
                  styles.postButton,
                  {
                    backgroundColor: quoteText.trim() ? colors.accent : colors.border,
                    opacity: isLoading ? 0.6 : 1
                  }
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {showQuoteInput ? (
            /* Quote Input View */
            <View style={styles.quoteContainer}>
              <TextInput
                style={[
                  styles.quoteInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                  }
                ]}
                placeholder="Add your thoughts..."
                placeholderTextColor={colors.secondaryText}
                value={quoteText}
                onChangeText={setQuoteText}
                multiline
                maxLength={280}
                autoFocus
              />
              <Text style={[styles.charCount, { color: colors.secondaryText }]}>
                {quoteText.length}/280
              </Text>

              {/* Original Post Preview */}
              <View style={[styles.originalPostPreview, { borderColor: colors.border }]}>
                <Text style={[styles.previewUsername, { color: colors.secondaryText }]}>
                  @{originalUsername || 'user'}
                </Text>
                <Text
                  style={[styles.previewCaption, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {originalCaption || 'Original post content...'}
                </Text>
              </View>
            </View>
          ) : (
            /* Options View */
            <View style={styles.optionsContainer}>
              {isReposted ? (
                /* Already reposted - show undo option */
                <>
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: colors.border }]}
                    onPress={handleUndoRepost}
                    disabled={isLoading}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: colors.danger + '20' }]}>
                      <Ionicons name="repeat" size={22} color={colors.danger} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, { color: colors.danger }]}>
                        Undo Repost
                      </Text>
                      <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                        Remove your repost
                      </Text>
                    </View>
                    {isLoading && <ActivityIndicator size="small" color={colors.accent} />}
                  </TouchableOpacity>

                  {repostType !== 'quote' && (
                    <TouchableOpacity
                      style={[styles.option, { borderBottomColor: colors.border }]}
                      onPress={() => setShowQuoteInput(true)}
                      disabled={isLoading}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                        <Ionicons name="chatbubble-outline" size={22} color={colors.accent} />
                      </View>
                      <View style={styles.optionTextContainer}>
                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                          Quote Instead
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                          Add your thoughts and repost
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                /* Not reposted - show repost options */
                <>
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: colors.border }]}
                    onPress={handleSimpleRepost}
                    disabled={isLoading}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                      <Ionicons name="repeat" size={22} color={colors.accent} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        Repost
                      </Text>
                      <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                        Share this post to your profile
                      </Text>
                    </View>
                    {isLoading && <ActivityIndicator size="small" color={colors.accent} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: colors.border }]}
                    onPress={() => setShowQuoteInput(true)}
                    disabled={isLoading}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                      <Ionicons name="create-outline" size={22} color={colors.accent} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        Quote
                      </Text>
                      <Text style={[styles.optionDescription, { color: colors.secondaryText }]}>
                        Add your thoughts and share
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.cancelButton, { borderTopColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelText, { color: colors.secondaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  optionsContainer: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 8,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  quoteContainer: {
    padding: 16,
  },
  quoteInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  originalPostPreview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  previewUsername: {
    fontSize: 13,
    marginBottom: 4,
  },
  previewCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default RepostOptionsModal;
