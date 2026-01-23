/**
 * Create Post Screen
 * Phase 3.1: Updated with Person Detection Policy
 *
 * Content Policy:
 * - Real people photos cannot be posted as-is
 * - If person detected: must convert to 3D avatar OR blur faces
 * - Landscapes, food, objects, pets can post directly
 */

import React, { useState, useCallback } from 'react';
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
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
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

    setLoading(true);
    try {
      await api.createPost(imageUri, caption);
      setImageUri(null);
      setOriginalImageUri(null);
      setCaption('');
      setContentStatus('unchecked');
      setPersonCheckResult(null);
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
        <Text style={styles.title}>Create Post</Text>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
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
});
