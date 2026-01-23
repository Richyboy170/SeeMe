/**
 * Full Body Avatar Screen
 * Phase 3.1: Full-Body 3D Avatar System
 *
 * Main screen for creating and customizing full-body avatars.
 * Features:
 * - Photo upload/capture for pose extraction
 * - Multi-person selection
 * - Style and color customization
 * - Preset pose selection
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { CreatePostStackParamList } from '../../navigation/types';

import FullBodyAvatarRenderer from '../../components/FullBodyAvatarRenderer';
import PoseSelector, { PoseSelectorInline } from '../../components/PoseSelector';
import {
  processFullBodyAvatar,
  saveFullBodyAvatar,
  detectPeopleInImage,
  FullBodyAvatarResult,
  DetectedPerson,
} from '../../services/contentCheck';
import { PRESET_POSES, PresetPose, getPoseById } from '../../data/presetPoses';

const { width } = Dimensions.get('window');
const PREVIEW_SIZE = (width - 48) / 2;

// Skin tone options
const SKIN_TONES = [
  { index: 0, color: '#FFE0BD', name: 'Light' },
  { index: 1, color: '#F5D0B0', name: 'Fair' },
  { index: 2, color: '#D4A574', name: 'Medium' },
  { index: 3, color: '#A67B5B', name: 'Tan' },
  { index: 4, color: '#6B4423', name: 'Dark' },
];

// Hair color options
const HAIR_COLORS = [
  { index: 0, color: '#1C1C1C', name: 'Black' },
  { index: 1, color: '#4A3728', name: 'Dark Brown' },
  { index: 2, color: '#8B4513', name: 'Brown' },
  { index: 3, color: '#DAA520', name: 'Golden' },
  { index: 4, color: '#FFD700', name: 'Blonde' },
  { index: 5, color: '#FF6B35', name: 'Red' },
  { index: 6, color: '#9B59B6', name: 'Purple' },
  { index: 7, color: '#3498DB', name: 'Blue' },
];

// Style options
const STYLES: Array<{ id: 'cartoon' | 'anime' | 'minimalist'; name: string }> = [
  { id: 'cartoon', name: 'Cartoon' },
  { id: 'anime', name: 'Anime' },
  { id: 'minimalist', name: 'Minimalist' },
];

type ProcessingStage = 'idle' | 'detecting' | 'selecting' | 'processing' | 'customizing' | 'saving';

type FullBodyAvatarScreenRouteProp = RouteProp<CreatePostStackParamList, 'FullBodyAvatar'>;

export const FullBodyAvatarScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<FullBodyAvatarScreenRouteProp>();
  const initialImageUri = route.params?.imageUri;

  // Image state
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [detectedPeople, setDetectedPeople] = useState<DetectedPerson[]>([]);
  const [selectedPersonIndex, setSelectedPersonIndex] = useState<number>(0);

  // Avatar data state
  const [avatarData, setAvatarData] = useState<FullBodyAvatarResult['avatarData'] | null>(null);

  // Customization state
  const [style, setStyle] = useState<'cartoon' | 'anime' | 'minimalist'>('cartoon');
  const [skinTone, setSkinTone] = useState(2);
  const [hairColor, setHairColor] = useState(1);
  const [selectedPoseId, setSelectedPoseId] = useState('standing');

  // UI state
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showPoseSelector, setShowPoseSelector] = useState(false);

  // Auto-process initial image if provided via route params
  React.useEffect(() => {
    if (initialImageUri && !sourceImage) {
      handleImageSelected(initialImageUri);
    }
  }, [initialImageUri]);

  // Pick image from gallery
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Pick image error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  // Take photo with camera
  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Take photo error:', err);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, []);

  // Handle image selection
  const handleImageSelected = async (imageUri: string) => {
    setSourceImage(imageUri);
    setError(null);
    setStage('detecting');

    try {
      // Detect people in image
      const detection = await detectPeopleInImage(imageUri);

      if (detection.personCount === 0) {
        setError('No person detected in the image. Please try a different photo.');
        setStage('idle');
        return;
      }

      setDetectedPeople(detection.people);

      if (detection.selectionRequired) {
        // Multiple people - need user to select
        setStage('selecting');
      } else {
        // Single person - proceed to processing
        setSelectedPersonIndex(0);
        await processImage(imageUri, detection.people[0]?.boundingBox);
      }
    } catch (err) {
      console.error('Detection error:', err);
      setError('Failed to analyze image. Please try again.');
      setStage('idle');
    }
  };

  // Process selected person
  const processImage = async (
    imageUri: string,
    personBbox?: DetectedPerson['boundingBox']
  ) => {
    setStage('processing');
    setError(null);

    try {
      const result = await processFullBodyAvatar(imageUri, personBbox, style);

      if (result.success && result.avatarData) {
        setAvatarData(result.avatarData);
        setStage('customizing');
      } else {
        setError(result.suggestions?.join('\n') || 'Failed to process image');
        setStage('idle');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to create avatar. Please try again.');
      setStage('idle');
    }
  };

  // Handle person selection
  const handlePersonSelected = (index: number) => {
    setSelectedPersonIndex(index);
    if (sourceImage) {
      processImage(sourceImage, detectedPeople[index]?.boundingBox);
    }
  };

  // Handle preset pose selection
  const handlePoseSelected = (pose: PresetPose) => {
    setSelectedPoseId(pose.id);
    setShowPoseSelector(false);

    // Apply preset pose transforms
    if (avatarData) {
      setAvatarData({
        ...avatarData,
        rigTransforms: {
          bones: pose.rigTransforms,
          boneCount: pose.rigTransforms.length,
        },
      });
    }
  };

  // Save avatar
  const handleSave = async () => {
    if (!avatarData) return;

    setStage('saving');

    try {
      const saved = await saveFullBodyAvatar(avatarData, {
        style,
        skinTone,
        hairColor,
        presetPoseId: selectedPoseId !== 'custom' ? selectedPoseId : undefined,
      });

      Alert.alert('Success', 'Your full-body avatar has been saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save avatar');
      setStage('customizing');
    }
  };

  // Reset and start over
  const handleReset = () => {
    setSourceImage(null);
    setDetectedPeople([]);
    setAvatarData(null);
    setError(null);
    setStage('idle');
    setSelectedPoseId('standing');
  };

  // Get current transforms (from avatar data or preset)
  const currentTransforms = avatarData?.rigTransforms.bones ||
    getPoseById(selectedPoseId)?.rigTransforms ||
    PRESET_POSES[0].rigTransforms;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Full Body Avatar</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Preview Section */}
        <View style={styles.previewContainer}>
          {/* Source Image */}
          <View style={styles.previewBox}>
            {sourceImage ? (
              <Image source={{ uri: sourceImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="image-outline" size={40} color="#666" />
                <Text style={styles.placeholderText}>Your Photo</Text>
              </View>
            )}

            {/* Person selection overlay */}
            {stage === 'selecting' && detectedPeople.length > 1 && (
              <View style={styles.selectionOverlay}>
                <Text style={styles.selectionTitle}>Select yourself:</Text>
                <View style={styles.selectionButtons}>
                  {detectedPeople.map((person, index) => (
                    <TouchableOpacity
                      key={person.id}
                      style={[
                        styles.personButton,
                        selectedPersonIndex === index && styles.personButtonSelected,
                      ]}
                      onPress={() => handlePersonSelected(index)}
                    >
                      <Text style={styles.personButtonText}>Person {index + 1}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Avatar Preview */}
          <View style={styles.previewBox}>
            {stage === 'processing' || stage === 'detecting' ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>
                  {stage === 'detecting' ? 'Analyzing...' : 'Creating avatar...'}
                </Text>
              </View>
            ) : avatarData || selectedPoseId ? (
              <FullBodyAvatarRenderer
                rigTransforms={currentTransforms}
                style={style}
                skinTone={skinTone}
                hairColor={hairColor}
                size={PREVIEW_SIZE}
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="person-outline" size={40} color="#666" />
                <Text style={styles.placeholderText}>3D Avatar</Text>
              </View>
            )}
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={20} color="#FF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Image Selection Buttons */}
        {(stage === 'idle' || error) && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
              <Ionicons name="images-outline" size={24} color="#FFF" />
              <Text style={styles.actionButtonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={24} color="#FFF" />
              <Text style={styles.actionButtonText}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customization Options */}
        {(stage === 'customizing' || avatarData) && (
          <View style={styles.customization}>
            {/* Style Selector */}
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Style</Text>
              <View style={styles.optionRow}>
                {STYLES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.styleButton, style === s.id && styles.styleButtonActive]}
                    onPress={() => setStyle(s.id)}
                  >
                    <Text style={[styles.styleButtonText, style === s.id && styles.styleButtonTextActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skin Tone Selector */}
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Skin Tone</Text>
              <View style={styles.colorRow}>
                {SKIN_TONES.map((tone) => (
                  <TouchableOpacity
                    key={tone.index}
                    style={[
                      styles.colorButton,
                      { backgroundColor: tone.color },
                      skinTone === tone.index && styles.colorButtonSelected,
                    ]}
                    onPress={() => setSkinTone(tone.index)}
                  />
                ))}
              </View>
            </View>

            {/* Hair Color Selector */}
            <View style={styles.optionSection}>
              <Text style={styles.optionLabel}>Hair Color</Text>
              <View style={styles.colorRow}>
                {HAIR_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.index}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color.color },
                      hairColor === color.index && styles.colorButtonSelected,
                    ]}
                    onPress={() => setHairColor(color.index)}
                  />
                ))}
              </View>
            </View>

            {/* Pose Selector */}
            <View style={styles.optionSection}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionLabel}>Pose</Text>
                <TouchableOpacity onPress={() => setShowPoseSelector(!showPoseSelector)}>
                  <Text style={styles.seeAllText}>
                    {showPoseSelector ? 'Hide' : 'See All'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showPoseSelector ? (
                <View style={styles.poseSelectorContainer}>
                  <PoseSelector
                    currentPoseId={selectedPoseId}
                    onSelectPose={handlePoseSelected}
                    compact
                  />
                </View>
              ) : (
                <PoseSelectorInline
                  currentPoseId={selectedPoseId}
                  onSelectPose={handlePoseSelected}
                />
              )}
            </View>

            {/* Save/Reset Buttons */}
            <View style={styles.bottomButtons}>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Ionicons name="refresh-outline" size={20} color="#FFF" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, stage === 'saving' && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={stage === 'saving'}
              >
                {stage === 'saving' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Avatar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  previewBox: {
    flex: 1,
    aspectRatio: 3 / 4,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    marginTop: 8,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#AAA',
    marginTop: 12,
    fontSize: 14,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  selectionTitle: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 12,
  },
  selectionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  personButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2A2A4A',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personButtonSelected: {
    borderColor: '#6366F1',
  },
  personButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF4444',
    flex: 1,
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2A2A4A',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  customization: {
    gap: 20,
  },
  optionSection: {
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#6366F1',
    fontSize: 13,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  styleButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#2A2A4A',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#252545',
  },
  styleButtonText: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '500',
  },
  styleButtonTextActive: {
    color: '#FFF',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#FFF',
  },
  poseSelectorContainer: {
    height: 200,
    marginTop: 8,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingBottom: 20,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2A2A4A',
    padding: 14,
    borderRadius: 10,
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    padding: 14,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default FullBodyAvatarScreen;
