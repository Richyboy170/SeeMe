/**
 * Full Body Avatar Screen (VRM Version)
 * Phase 3.1.3: Full Integration
 *
 * Complete avatar creation flow with:
 * - Photo upload → Backend extracts landmarks
 * - KalidoKit solves pose on client
 * - VRM avatar renders with applied pose
 * - Color customization and preset poses
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 3D Components
import { VRMAvatarRenderer, AvatarCustomization } from '../../components/3d/VRMAvatarRenderer';

// Services
import { solvePose, MediaPipeLandmarks, SolvedPose, getDefaultPose } from '../../services/poseService';
import { api } from '../../services/api';

// Data
import { DEFAULT_AVATARS, DefaultAvatar, SKIN_COLOR_PRESETS, HAIR_COLOR_PRESETS, EYE_COLOR_PRESETS } from '../../data/defaultAvatars';
import { VRM_PRESET_POSES, VRMPresetPose, getVRMPoseById } from '../../data/vrmPresetPoses';

const { width } = Dimensions.get('window');

// ============================================================
// TYPES
// ============================================================

type TabType = 'avatar' | 'colors' | 'pose';

interface ProcessingState {
  isProcessing: boolean;
  stage: 'idle' | 'uploading' | 'extracting' | 'solving' | 'ready' | 'saving';
  message: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function FullBodyAvatarScreenVRM() {
  const navigation = useNavigation();

  // Avatar model selection
  const [selectedAvatar, setSelectedAvatar] = useState<DefaultAvatar>(DEFAULT_AVATARS[0]);

  // Color customization
  const [customization, setCustomization] = useState<AvatarCustomization>({
    skinColor: SKIN_COLOR_PRESETS[0].color,
    hairColor: HAIR_COLOR_PRESETS[0].color,
    eyeColor: EYE_COLOR_PRESETS[0].color,
  });

  // Pose state
  const [currentPose, setCurrentPose] = useState<Partial<SolvedPose> | undefined>(undefined);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('standing');
  const [sourceImageUri, setSourceImageUri] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('avatar');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    stage: 'idle',
    message: '',
  });

  // Load default pose on mount
  useEffect(() => {
    const defaultPose = getVRMPoseById('standing');
    if (defaultPose) {
      setCurrentPose(defaultPose.pose);
    }
  }, []);

  // ============================================================
  // PHOTO HANDLING
  // ============================================================

  const handleUploadPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        await processPhotoForPose(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0]) {
        await processPhotoForPose(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, []);

  // ============================================================
  // POSE EXTRACTION PIPELINE
  // ============================================================

  const processPhotoForPose = async (imageUri: string) => {
    setSourceImageUri(imageUri);
    setProcessing({
      isProcessing: true,
      stage: 'uploading',
      message: 'Uploading image...',
    });

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'pose-photo.jpg',
      } as any);

      setProcessing({
        isProcessing: true,
        stage: 'extracting',
        message: 'Extracting pose landmarks...',
      });

      // Call backend to extract MediaPipe landmarks
      const response = await api.post('/full-body-avatar/extract-landmarks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to extract landmarks');
      }

      setProcessing({
        isProcessing: true,
        stage: 'solving',
        message: 'Solving pose with KalidoKit...',
      });

      // Convert landmarks to KalidoKit format
      const landmarks: MediaPipeLandmarks = {
        poseLandmarks: response.data.poseLandmarks,
        poseWorldLandmarks: response.data.poseWorldLandmarks,
        faceLandmarks: response.data.faceLandmarks,
        leftHandLandmarks: response.data.leftHandLandmarks,
        rightHandLandmarks: response.data.rightHandLandmarks,
      };

      // Use KalidoKit to solve pose (client-side)
      const solvedPose = solvePose(landmarks);

      setCurrentPose(solvedPose);
      setSelectedPresetId('custom'); // Mark as custom pose

      setProcessing({
        isProcessing: false,
        stage: 'ready',
        message: 'Pose extracted successfully!',
      });

    } catch (error: any) {
      console.error('Pose extraction error:', error);
      setProcessing({
        isProcessing: false,
        stage: 'idle',
        message: '',
      });

      const message = error.response?.data?.message || error.message || 'Failed to extract pose';
      Alert.alert('Pose Extraction Failed', message);
    }
  };

  // ============================================================
  // PRESET POSE SELECTION
  // ============================================================

  const handleSelectPreset = useCallback((preset: VRMPresetPose) => {
    setCurrentPose(preset.pose);
    setSelectedPresetId(preset.id);
    setSourceImageUri(null); // Clear source image when using preset
  }, []);

  // ============================================================
  // SAVE AVATAR
  // ============================================================

  const handleSaveAvatar = async () => {
    setProcessing({
      isProcessing: true,
      stage: 'saving',
      message: 'Saving avatar...',
    });

    try {
      await api.post('/full-body-avatar', {
        model_id: selectedAvatar.id,
        rig_transforms: currentPose,
        skin_color: customization.skinColor,
        hair_color: customization.hairColor,
        eye_color: customization.eyeColor,
        preset_pose_id: selectedPresetId !== 'custom' ? selectedPresetId : null,
        style: selectedAvatar.style,
      });

      setProcessing({
        isProcessing: false,
        stage: 'ready',
        message: 'Avatar saved!',
      });

      Alert.alert('Success', 'Your avatar has been saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);

    } catch (error: any) {
      console.error('Save avatar error:', error);
      setProcessing({
        isProcessing: false,
        stage: 'idle',
        message: '',
      });
      Alert.alert('Error', 'Failed to save avatar');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Full Body Avatar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 3D Avatar Preview */}
      <View style={styles.previewContainer}>
        <VRMAvatarRenderer
          modelUrl={selectedAvatar.modelUrl}
          pose={currentPose as SolvedPose}
          customization={customization}
          autoRotate={!currentPose}
        />

        {/* Processing Overlay */}
        {processing.isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.processingText}>{processing.message}</Text>
          </View>
        )}

        {/* Source Image Thumbnail */}
        {sourceImageUri && (
          <View style={styles.sourceThumbnail}>
            <Image source={{ uri: sourceImageUri }} style={styles.thumbnailImage} />
            <Text style={styles.thumbnailLabel}>Source</Text>
          </View>
        )}
      </View>

      {/* Customization Panel */}
      <View style={styles.customizationPanel}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {(['avatar', 'colors', 'pose'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <ScrollView
          style={styles.tabContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Tab */}
          {activeTab === 'avatar' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DEFAULT_AVATARS.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarOption,
                    selectedAvatar.id === avatar.id && styles.avatarSelected,
                  ]}
                  onPress={() => setSelectedAvatar(avatar)}
                >
                  <Text style={styles.avatarName}>{avatar.name}</Text>
                  <Text style={styles.avatarStyle}>{avatar.style}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <View style={styles.colorsContent}>
              {/* Skin Color */}
              <Text style={styles.colorLabel}>Skin</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                {SKIN_COLOR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.colorButton,
                      { backgroundColor: preset.color },
                      customization.skinColor === preset.color && styles.colorSelected,
                    ]}
                    onPress={() => setCustomization((c) => ({ ...c, skinColor: preset.color }))}
                  />
                ))}
              </ScrollView>

              {/* Hair Color */}
              <Text style={styles.colorLabel}>Hair</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                {HAIR_COLOR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.colorButton,
                      { backgroundColor: preset.color },
                      customization.hairColor === preset.color && styles.colorSelected,
                    ]}
                    onPress={() => setCustomization((c) => ({ ...c, hairColor: preset.color }))}
                  />
                ))}
              </ScrollView>

              {/* Eye Color */}
              <Text style={styles.colorLabel}>Eyes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                {EYE_COLOR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.colorButton,
                      { backgroundColor: preset.color },
                      customization.eyeColor === preset.color && styles.colorSelected,
                    ]}
                    onPress={() => setCustomization((c) => ({ ...c, eyeColor: preset.color }))}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Pose Tab */}
          {activeTab === 'pose' && (
            <View style={styles.poseContent}>
              {/* Photo Upload Buttons */}
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUploadPhoto}
                  disabled={processing.isProcessing}
                >
                  <Ionicons name="images-outline" size={20} color="#FFF" />
                  <Text style={styles.uploadText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleTakePhoto}
                  disabled={processing.isProcessing}
                >
                  <Ionicons name="camera-outline" size={20} color="#FFF" />
                  <Text style={styles.uploadText}>Camera</Text>
                </TouchableOpacity>
              </View>

              {/* Preset Poses */}
              <Text style={styles.sectionLabel}>Preset Poses</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {VRM_PRESET_POSES.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.poseOption,
                      selectedPresetId === preset.id && styles.poseSelected,
                    ]}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <Text style={styles.poseIcon}>{preset.icon}</Text>
                    <Text style={styles.poseName}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            const defaultPose = getVRMPoseById('standing');
            if (defaultPose) {
              setCurrentPose(defaultPose.pose);
              setSelectedPresetId('standing');
            }
            setSourceImageUri(null);
          }}
        >
          <Ionicons name="refresh-outline" size={20} color="#FFF" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, processing.isProcessing && styles.buttonDisabled]}
          onPress={handleSaveAvatar}
          disabled={processing.isProcessing}
        >
          {processing.stage === 'saving' ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveText}>Save Avatar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    flex: 1,
    minHeight: 300,
    position: 'relative',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 35, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  sourceThumbnail: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  thumbnailLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
  },
  customizationPanel: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    minHeight: 220,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 120,
  },
  avatarOption: {
    backgroundColor: '#2A2A4A',
    padding: 14,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: '#6366F1',
  },
  avatarName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarStyle: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  colorsContent: {
    paddingBottom: 16,
  },
  colorLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 12,
  },
  colorRow: {
    flexDirection: 'row',
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#FFFFFF',
  },
  poseContent: {
    paddingBottom: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 10,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
  },
  poseOption: {
    backgroundColor: '#2A2A4A',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 75,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  poseSelected: {
    borderColor: '#6366F1',
  },
  poseIcon: {
    fontSize: 24,
  },
  poseName: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1A1A2E',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2A2A4A',
    paddingVertical: 14,
    borderRadius: 12,
  },
  resetText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default FullBodyAvatarScreenVRM;
