/**
 * VRM Avatar Renderer Component.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

import { vrmLoader } from '../services/vrmLoaderService';
import { BoneController } from '../services/boneController';
import { SolvedPose } from '../types/pose';

interface VRMAvatarRendererProps {
  modelUrl: string;
  pose?: SolvedPose;
  backgroundColor?: string;
  enableSmoothing?: boolean;
  cameraTarget?: 'fullBody' | 'upperBody' | 'face';
  onModelLoaded?: () => void;
  onError?: (error: Error) => void;
}

const VRMModel: React.FC<{ vrm: VRM; pose?: SolvedPose; enableSmoothing: boolean }> = ({
  vrm, pose, enableSmoothing
}) => {
  const boneControllerRef = useRef<BoneController | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    scene.add(vrm.scene);
    boneControllerRef.current = new BoneController(vrm);
    return () => { scene.remove(vrm.scene); };
  }, [vrm, scene]);

  useFrame(() => {
    if (pose && boneControllerRef.current) {
      boneControllerRef.current.applyPose(pose, enableSmoothing);
    }
  });

  return null;
};

const Lighting: React.FC = () => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[0, 10, 5]} intensity={0.8} />
    <directionalLight position={[-5, 5, -5]} intensity={0.3} />
  </>
);

const CameraSetup: React.FC<{ target: 'fullBody' | 'upperBody' | 'face' }> = ({ target }) => {
  const { camera } = useThree();

  useEffect(() => {
    const configs = {
      fullBody: { pos: [0, 1, 3] as const, lookAt: [0, 1, 0] as const },
      upperBody: { pos: [0, 1.4, 1.5] as const, lookAt: [0, 1.4, 0] as const },
      face: { pos: [0, 1.5, 0.8] as const, lookAt: [0, 1.5, 0] as const },
    };
    const config = configs[target];
    camera.position.set(...config.pos);
    camera.lookAt(new THREE.Vector3(...config.lookAt));
  }, [camera, target]);

  return null;
};

export const VRMAvatarRenderer: React.FC<VRMAvatarRendererProps> = ({
  modelUrl, pose, backgroundColor = '#1a1a2e', enableSmoothing = true,
  cameraTarget = 'fullBody', onModelLoaded, onError,
}) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedVRM = await vrmLoader.loadVRM(modelUrl, (progress) => setLoadProgress(progress));
      setVrm(loadedVRM);
      onModelLoaded?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      setLoading(false);
    }
  }, [modelUrl, onModelLoaded, onError]);

  useEffect(() => {
    loadModel();
    return () => { vrmLoader.disposeVRM(modelUrl); };
  }, [modelUrl, loadModel]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading model... {loadProgress.toFixed(0)}%</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor }]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Canvas>
        <CameraSetup target={cameraTarget} />
        <Lighting />
        {vrm && <VRMModel vrm={vrm} pose={pose} enableSmoothing={enableSmoothing} />}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ffffff', marginTop: 12, fontSize: 14 },
  errorText: { color: '#ff6b6b', fontSize: 14, textAlign: 'center', padding: 20 },
});
