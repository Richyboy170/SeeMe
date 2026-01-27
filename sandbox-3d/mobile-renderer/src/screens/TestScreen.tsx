/**
 * Test Screen for 3D Avatar Rendering.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { VRMAvatarRenderer } from '../components/VRMAvatarRenderer';
import { SolvedPose, createDefaultPose } from '../types/pose';
import { poseService } from '../services/poseService';
import { avatarApi } from '../services/avatarApiService';

const SAMPLE_VRM_URL = 'https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAvatarSample_B.vrm';

const TEST_POSES: { name: string; pose: SolvedPose }[] = [
  { name: 'T-Pose', pose: createDefaultPose() },
  {
    name: 'Wave',
    pose: {
      ...createDefaultPose(),
      rightUpperArm: { x: 0, y: 0, z: -Math.PI / 3 },
      rightLowerArm: { x: 0, y: Math.PI / 4, z: 0 },
    },
  },
  {
    name: 'Arms Up',
    pose: {
      ...createDefaultPose(),
      leftUpperArm: { x: 0, y: 0, z: Math.PI / 2 },
      rightUpperArm: { x: 0, y: 0, z: -Math.PI / 2 },
    },
  },
];

export const TestScreen: React.FC = () => {
  const [currentPose, setCurrentPose] = useState<SolvedPose>(createDefaultPose());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => { checkApiHealth(); }, []);

  const checkApiHealth = async () => {
    setApiStatus('checking');
    const healthy = await avatarApi.healthCheck();
    setApiStatus(healthy ? 'online' : 'offline');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (imageUri: string) => {
    if (apiStatus !== 'online') {
      Alert.alert('Error', 'CV Service is offline');
      return;
    }

    setProcessing(true);
    try {
      const pose = await poseService.processImage(imageUri);
      if (pose) {
        setCurrentPose(pose);
      } else {
        Alert.alert('Error', 'Could not extract pose from image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  };

  const selectTestPose = (index: number) => {
    setCurrentPose(TEST_POSES[index].pose);
    setSelectedImage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.title}>3D Avatar Test</Text>
        <View style={styles.apiStatus}>
          <View style={[styles.statusDot, {
            backgroundColor: apiStatus === 'online' ? '#4ade80' : apiStatus === 'offline' ? '#f87171' : '#fbbf24'
          }]} />
          <Text style={styles.statusText}>CV: {apiStatus}</Text>
        </View>
      </View>

      <View style={styles.avatarContainer}>
        <VRMAvatarRenderer
          modelUrl={SAMPLE_VRM_URL}
          pose={currentPose}
          backgroundColor="#1a1a2e"
          enableSmoothing={true}
          onModelLoaded={() => console.log('Model loaded')}
          onError={(err) => console.error('Model error:', err)}
        />
      </View>

      {selectedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          {processing && (
            <View style={styles.processingOverlay}>
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.controls}>
        <Text style={styles.sectionTitle}>Test Poses</Text>
        <View style={styles.buttonRow}>
          {TEST_POSES.map((testPose, index) => (
            <TouchableOpacity key={index} style={styles.poseButton} onPress={() => selectTestPose(index)}>
              <Text style={styles.buttonText}>{testPose.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>From Image</Text>
        <TouchableOpacity
          style={[styles.imageButton, apiStatus !== 'online' && styles.disabledButton]}
          onPress={pickImage}
          disabled={apiStatus !== 'online' || processing}
        >
          <Text style={styles.buttonText}>{processing ? 'Processing...' : 'Pick Image'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshButton} onPress={checkApiHealth}>
          <Text style={styles.refreshText}>Refresh API Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  apiStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#a1a1aa', fontSize: 12 },
  avatarContainer: { flex: 1, minHeight: 300 },
  previewContainer: { position: 'absolute', top: 70, right: 16, width: 100, height: 100, borderRadius: 8, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  processingText: { color: '#ffffff', fontSize: 10 },
  controls: { padding: 16, backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sectionTitle: { color: '#a1a1aa', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  buttonRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  poseButton: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  imageButton: { backgroundColor: '#8b5cf6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  disabledButton: { backgroundColor: '#4b5563' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  refreshButton: { alignItems: 'center', paddingVertical: 8 },
  refreshText: { color: '#6b7280', fontSize: 12 },
});
