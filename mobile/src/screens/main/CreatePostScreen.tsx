/**
 * Create Post Screen
 * Phase 3.1: Updated with Person Detection Policy
 * Phase 3.3: Updated with Topic/Community Visibility
 *
 * Content Policy:
 * - Real people photos cannot be posted as-is
 * - If person detected: must convert to 3D avatar OR blur faces
 * - Landscapes, food, objects, pets can post directly
 *
 * Visibility Options:
 * - Friends Only: Only your followers see this
 * - Topics Only: Community members interested in the topic
 * - Topics + Friends: Both community and your followers
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList, CreatePostStackParamList } from '../../navigation/types';
import { api } from '../../services/api';
import {
  checkImageForPerson,
  blurFacesInImage,
  PersonCheckResult,
} from '../../services/contentCheck';

type Visibility = 'friends_only' | 'topics_only' | 'topics_and_friends';

interface Topic {
  id: string;
  name: string;
  iconEmoji: string | null;
  isFollowing: boolean;
}

type CreatePostScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<CreatePostStackParamList, 'CreatePostHome'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type ContentStatus = 'unchecked' | 'checking' | 'person_detected' | 'ready' | 'blurring';

export default function CreatePostScreen() {
  const navigation = useNavigation<CreatePostScreenNavigationProp>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  // Content policy state
  const [contentStatus, setContentStatus] = useState<ContentStatus>('unchecked');
  const [personCheckResult, setPersonCheckResult] = useState<PersonCheckResult | null>(null);
  const [showPersonOptions, setShowPersonOptions] = useState(false);

  // Phase 3.3: Visibility and topic selection
  const [visibility, setVisibility] = useState<Visibility>('friends_only');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [followedTopics, setFollowedTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Load followed topics when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadFollowedTopics();
    }, [])
  );

  const loadFollowedTopics = async () => {
    try {
      setLoadingTopics(true);
      const response = await api.getMyFollowedTopics();
      setFollowedTopics(response.topics || []);
    } catch (error) {
      console.error('Failed to load followed topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Handle image selection with person check
  const handleImageSelected = useCallback(async (uri: string) => {
    setOriginalImageUri(uri);
    setImageUri(uri);
    setContentStatus('checking');
    setPersonCheckResult(null);

    try {
      const result = await checkImageForPerson(uri);
      setPersonCheckResult(result);

      if (result.personDetected) {
        setContentStatus('person_detected');
        setShowPersonOptions(true);
      } else {
        setContentStatus('ready');
      }
    } catch (error) {
      console.error('Person check error:', error);
      // On error, allow posting (don't block users)
      setContentStatus('ready');
    }
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      handleImageSelected(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera access to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      handleImageSelected(result.assets[0].uri);
    }
  };

  // Handle "Convert to 3D Avatar" option
  const handleConvertToAvatar = () => {
    setShowPersonOptions(false);
    // Navigate to full body avatar screen with the image
    navigation.navigate('FullBodyAvatar', { imageUri: originalImageUri || undefined });
  };

  // Handle "Blur Faces" option
  const handleBlurFaces = async () => {
    if (!originalImageUri) return;

    setShowPersonOptions(false);
    setContentStatus('blurring');

    try {
      const result = await blurFacesInImage(originalImageUri);
      setImageUri(result.blurredImageUri);
      setContentStatus('ready');

      if (result.facesBlurred > 0) {
        Alert.alert(
          'Faces Blurred',
          `${result.facesBlurred} face(s) have been blurred for privacy.`
        );
      }
    } catch (error) {
      console.error('Blur faces error:', error);
      Alert.alert('Error', 'Failed to blur faces. Please try again.');
      setContentStatus('person_detected');
      setShowPersonOptions(true);
    }
  };

  // Handle cancel person options
  const handleCancelPersonOptions = () => {
    setShowPersonOptions(false);
    setImageUri(null);
    setOriginalImageUri(null);
    setContentStatus('unchecked');
    setPersonCheckResult(null);
  };

  const handlePost = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (contentStatus === 'person_detected') {
      Alert.alert(
        'Person Detected',
        'Please choose to convert to 3D avatar or blur faces before posting.',
        [{ text: 'OK', onPress: () => setShowPersonOptions(true) }]
      );
      return;
    }

    // Validate topic selection for community posts
    if (visibility !== 'friends_only' && selectedTopics.length === 0) {
      Alert.alert('Select Topics', 'Please select at least one topic for your community post.');
      return;
    }

    setLoading(true);
    try {
      await api.createPost(imageUri, caption, visibility, selectedTopics);
      setImageUri(null);
      setOriginalImageUri(null);
      setCaption('');
      setContentStatus('unchecked');
      setPersonCheckResult(null);
      setVisibility('friends_only');
      setSelectedTopics([]);
      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Feed'),
        },
      ]);
    } catch (error: any) {
      console.error('Post creation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create post. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Determine if post button should be enabled
  const canPost = imageUri && contentStatus === 'ready' && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />

            {/* Content status indicator */}
            {contentStatus === 'checking' && (
              <View style={styles.statusOverlay}>
                <ActivityIndicator color="#6366F1" size="large" />
                <Text style={styles.statusText}>Checking image...</Text>
              </View>
            )}

            {contentStatus === 'blurring' && (
              <View style={styles.statusOverlay}>
                <ActivityIndicator color="#6366F1" size="large" />
                <Text style={styles.statusText}>Blurring faces...</Text>
              </View>
            )}

            {contentStatus === 'person_detected' && (
              <View style={styles.personDetectedBanner}>
                <Ionicons name="warning" size={18} color="#F59E0B" />
                <Text style={styles.personDetectedText}>Person detected</Text>
                <TouchableOpacity onPress={() => setShowPersonOptions(true)}>
                  <Text style={styles.chooseOptionText}>Choose option</Text>
                </TouchableOpacity>
              </View>
            )}

            {contentStatus === 'ready' && (
              <View style={styles.readyBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.readyText}>Ready to post</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
            >
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="images-outline" size={48} color="#9CA3AF" />
            <Text style={styles.placeholderText}>Select an image to post</Text>
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.button} onPress={pickImage}>
                <Ionicons name="image-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Write a caption..."
          value={caption}
          onChangeText={setCaption}
          multiline
          numberOfLines={3}
        />
        <View style={styles.captionCounter}>
          <Text style={[
            styles.counterText,
            caption.trim().length >= 20 && styles.counterTextSuccess
          ]}>
            {caption.trim().length}/20 characters
          </Text>
          {caption.trim().length >= 20 ? (
            <Text style={styles.coinHint}>+2 coins earned!</Text>
          ) : (
            <Text style={styles.coinHintPending}>
              {20 - caption.trim().length} more for +2 coins
            </Text>
          )}
        </View>

        {/* Phase 3.3: Visibility Options */}
        <Text style={styles.sectionTitle}>Who can see this?</Text>
        <View style={styles.visibilityOptions}>
          <TouchableOpacity
            style={[
              styles.visibilityOption,
              visibility === 'friends_only' && styles.visibilitySelected
            ]}
            onPress={() => setVisibility('friends_only')}
          >
            <Ionicons
              name="people"
              size={22}
              color={visibility === 'friends_only' ? '#7C3AED' : '#6B7280'}
            />
            <View style={styles.visibilityTextContainer}>
              <Text style={[
                styles.visibilityLabel,
                visibility === 'friends_only' && styles.visibilityLabelSelected
              ]}>Friends Only</Text>
              <Text style={styles.visibilityDesc}>Only your followers see this</Text>
            </View>
            {visibility === 'friends_only' && (
              <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.visibilityOption,
              visibility === 'topics_only' && styles.visibilitySelected
            ]}
            onPress={() => setVisibility('topics_only')}
          >
            <Ionicons
              name="grid"
              size={22}
              color={visibility === 'topics_only' ? '#7C3AED' : '#6B7280'}
            />
            <View style={styles.visibilityTextContainer}>
              <Text style={[
                styles.visibilityLabel,
                visibility === 'topics_only' && styles.visibilityLabelSelected
              ]}>Topics Only</Text>
              <Text style={styles.visibilityDesc}>Community members interested in the topic</Text>
            </View>
            {visibility === 'topics_only' && (
              <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.visibilityOption,
              visibility === 'topics_and_friends' && styles.visibilitySelected
            ]}
            onPress={() => setVisibility('topics_and_friends')}
          >
            <Ionicons
              name="globe"
              size={22}
              color={visibility === 'topics_and_friends' ? '#7C3AED' : '#6B7280'}
            />
            <View style={styles.visibilityTextContainer}>
              <Text style={[
                styles.visibilityLabel,
                visibility === 'topics_and_friends' && styles.visibilityLabelSelected
              ]}>Topics + Friends</Text>
              <Text style={styles.visibilityDesc}>Both community and your followers</Text>
            </View>
            {visibility === 'topics_and_friends' && (
              <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
            )}
          </TouchableOpacity>
        </View>

        {/* Topic Selection (shown when not friends_only) */}
        {visibility !== 'friends_only' && (
          <>
            <Text style={styles.sectionTitle}>Your Communities</Text>
            <Text style={styles.sectionSubtitle}>
              Select topics you follow to share with those communities
            </Text>

            {loadingTopics ? (
              <ActivityIndicator size="small" color="#7C3AED" style={{ marginVertical: 20 }} />
            ) : followedTopics.length > 0 ? (
              <View style={styles.topicsGrid}>
                {followedTopics.map(topic => (
                  <TouchableOpacity
                    key={topic.id}
                    style={[
                      styles.topicChip,
                      selectedTopics.includes(topic.id) && styles.topicSelected
                    ]}
                    onPress={() => toggleTopic(topic.id)}
                  >
                    <Text style={styles.topicEmoji}>{topic.iconEmoji || '📌'}</Text>
                    <Text style={[
                      styles.topicName,
                      selectedTopics.includes(topic.id) && styles.topicNameSelected
                    ]}>
                      {topic.name}
                    </Text>
                    {selectedTopics.includes(topic.id) && (
                      <Ionicons name="checkmark-circle" size={16} color="#7C3AED" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noTopicsContainer}>
                <Ionicons name="planet-outline" size={40} color="#9CA3AF" />
                <Text style={styles.noTopicsTitle}>Join communities to share here!</Text>
                <Text style={styles.noTopicsText}>
                  Follow topics you're interested in, then your posts can reach people who share your passions.
                </Text>
                <TouchableOpacity
                  style={styles.browseTopicsButton}
                  onPress={() => (navigation as any).navigate('Topics', { screen: 'BrowseTopics' })}
                >
                  <Ionicons name="compass" size={18} color="#FFFFFF" />
                  <Text style={styles.browseTopicsButtonText}>Discover Communities</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Beginner Badge Info */}
            <View style={styles.beginnerInfo}>
              <Ionicons name="sparkles" size={18} color="#F59E0B" />
              <Text style={styles.beginnerText}>
                New to a topic? Your posts get a beginner badge and extra visibility for encouragement!
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Person Detected Options Modal */}
      <Modal
        visible={showPersonOptions}
        transparent
        animationType="slide"
        onRequestClose={handleCancelPersonOptions}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.warningIcon}>
                <Ionicons name="person" size={32} color="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Person Detected!</Text>
              <Text style={styles.modalSubtitle}>
                To protect privacy, choose how to handle this image:
              </Text>
            </View>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleConvertToAvatar}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="person-circle" size={28} color="#6366F1" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Convert to 3D Avatar</Text>
                <Text style={styles.optionDescription}>
                  Turn yourself into a cool 3D character!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleBlurFaces}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="eye-off" size={28} color="#6366F1" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Blur All Faces</Text>
                <Text style={styles.optionDescription}>
                  Keep the photo but blur faces for privacy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelPersonOptions}
            >
              <Text style={styles.cancelButtonText}>Choose Different Image</Text>
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
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imagePlaceholder: {
    height: 300,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 20,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
  },
  personDetectedBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 8,
  },
  personDetectedText: {
    color: '#fff',
    flex: 1,
    fontWeight: '600',
  },
  chooseOptionText: {
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  readyBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 8,
  },
  readyText: {
    color: '#fff',
    fontWeight: '600',
  },
  changeImageButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#007AFF',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 8,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  captionCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  counterText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  counterTextSuccess: {
    color: '#10B981',
    fontWeight: '600',
  },
  coinHint: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  coinHintPending: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  postButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  // Phase 3.3: Visibility & Topic Selection styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  visibilityOptions: {
    gap: 10,
    marginBottom: 8,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  visibilitySelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  visibilityLabelSelected: {
    color: '#7C3AED',
  },
  visibilityDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  topicSelected: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  topicEmoji: {
    fontSize: 16,
  },
  topicName: {
    fontSize: 14,
    color: '#4B5563',
  },
  topicNameSelected: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  noTopicsContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  noTopicsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
    marginBottom: 6,
  },
  noTopicsText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  browseTopicsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  browseTopicsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  beginnerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
  },
  beginnerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
