/**
 * VRM Avatar Renderer Component
 * Phase 3.1.2: 3D Rendering (Using Existing Libraries)
 *
 * Renders VRM avatars using Three.js and @pixiv/three-vrm.
 * Applies KalidoKit-solved poses to VRM bone structure.
 *
 * Libraries used:
 * - three: 3D rendering foundation
 * - @react-three/fiber: React bindings for Three.js
 * - @pixiv/three-vrm: VRM avatar loading and rendering
 * - expo-gl & expo-three: React Native OpenGL context
 */

import React, { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
// @ts-ignore - GLTFLoader types are in examples folder which TypeScript doesn't resolve
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMLoaderPlugin, VRMHumanBoneName } from '@pixiv/three-vrm';
import { SolvedPose } from '../../services/poseService';

// ============================================================
// TYPES
// ============================================================

export interface AvatarCustomization {
  skinColor: string;
  hairColor: string;
  eyeColor: string;
}

export interface VRMAvatarRendererProps {
  modelUrl: string;
  pose?: Partial<SolvedPose>;
  customization?: AvatarCustomization;
  autoRotate?: boolean;
  cameraPosition?: [number, number, number];
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

// ============================================================
// VRM LOADER HOOK
// ============================================================

function useVRMLoader(modelUrl: string) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loader = new GLTFLoader();

    // Register VRM plugin
    loader.register((parser: any) => new VRMLoaderPlugin(parser));

    setLoading(true);
    setError(null);
    setProgress(0);

    loader.load(
      modelUrl,
      // Success callback
      (gltf: GLTF) => {
        const loadedVrm = gltf.userData.vrm as VRM;

        if (!loadedVrm) {
          setError(new Error('Failed to load VRM data from model'));
          setLoading(false);
          return;
        }

        // Rotate VRM to face camera (VRM models face +Z by default)
        loadedVrm.scene.rotation.y = Math.PI;

        setVrm(loadedVrm);
        setLoading(false);
      },
      // Progress callback
      (xhr: ProgressEvent) => {
        if (xhr.lengthComputable) {
          setProgress((xhr.loaded / xhr.total) * 100);
        }
      },
      // Error callback
      (err: unknown) => {
        console.error('VRM load error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      if (vrm) {
        // VRM dispose may not exist on all versions
        (vrm as any).dispose?.();
      }
    };
  }, [modelUrl]);

  return { vrm, loading, error, progress };
}

// ============================================================
// KALIDOKIT TO VRM BONE MAPPING
// ============================================================

/**
 * Map KalidoKit bone names to VRM HumanBoneName enum
 */
const KALIDOKIT_TO_VRM_BONES: Record<string, VRMHumanBoneName> = {
  RightUpperArm: VRMHumanBoneName.RightUpperArm,
  LeftUpperArm: VRMHumanBoneName.LeftUpperArm,
  RightLowerArm: VRMHumanBoneName.RightLowerArm,
  LeftLowerArm: VRMHumanBoneName.LeftLowerArm,
  RightHand: VRMHumanBoneName.RightHand,
  LeftHand: VRMHumanBoneName.LeftHand,
  RightUpperLeg: VRMHumanBoneName.RightUpperLeg,
  LeftUpperLeg: VRMHumanBoneName.LeftUpperLeg,
  RightLowerLeg: VRMHumanBoneName.RightLowerLeg,
  LeftLowerLeg: VRMHumanBoneName.LeftLowerLeg,
  Spine: VRMHumanBoneName.Spine,
  Hips: VRMHumanBoneName.Hips,
  Head: VRMHumanBoneName.Head,
  Neck: VRMHumanBoneName.Neck,
  Chest: VRMHumanBoneName.Chest,
};

// ============================================================
// POSE APPLICATION
// ============================================================

/**
 * Apply KalidoKit-solved pose to VRM model.
 * VRM bone names map directly to KalidoKit output.
 */
function applyPoseToVRM(vrm: VRM, pose: Partial<SolvedPose>) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // Apply body pose rotations
  for (const [kalidoName, vrmBoneName] of Object.entries(KALIDOKIT_TO_VRM_BONES)) {
    const boneNode = humanoid.getNormalizedBoneNode(vrmBoneName);
    if (!boneNode) continue;

    const rotation = (pose as Record<string, any>)[kalidoName];
    if (!rotation) continue;

    // Handle Hips specially (has both rotation and position)
    if (kalidoName === 'Hips' && rotation.rotation) {
      boneNode.rotation.set(
        rotation.rotation.x,
        rotation.rotation.y,
        rotation.rotation.z
      );
      // Note: Position is handled by the root bone
    } else if (rotation.x !== undefined) {
      // KalidoKit outputs Euler angles in radians
      boneNode.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }

  // Apply head rotation if available
  if (pose.head) {
    const headBone = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
    if (headBone) {
      headBone.rotation.set(pose.head.x, pose.head.y, pose.head.z);
    }
  }

  // Apply facial expressions if available
  if (vrm.expressionManager && pose.mouth) {
    const mouthShape = pose.mouth.shape;
    // Map mouth shapes to VRM blend shapes
    vrm.expressionManager.setValue('aa', mouthShape.A);
    vrm.expressionManager.setValue('ee', mouthShape.E);
    vrm.expressionManager.setValue('ih', mouthShape.I);
    vrm.expressionManager.setValue('oh', mouthShape.O);
    vrm.expressionManager.setValue('ou', mouthShape.U);
  }

  // Apply eye blink
  if (vrm.expressionManager && pose.eye) {
    vrm.expressionManager.setValue('blinkLeft', 1 - pose.eye.l);
    vrm.expressionManager.setValue('blinkRight', 1 - pose.eye.r);
  }

  // Apply brow
  if (vrm.expressionManager && pose.brow !== undefined) {
    // Map brow value to expressions
    if (pose.brow > 0) {
      vrm.expressionManager.setValue('surprised', pose.brow);
    } else {
      vrm.expressionManager.setValue('angry', -pose.brow);
    }
  }
}

// ============================================================
// COLOR CUSTOMIZATION
// ============================================================

/**
 * Apply color customization to VRM materials.
 * Uses material name matching for skin, hair, and eye parts.
 */
function applyCustomization(vrm: VRM, customization: AvatarCustomization) {
  vrm.scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of materials) {
        const mat = material as THREE.MeshStandardMaterial;
        const name = (object.name + (mat.name || '')).toLowerCase();

        // Skin materials
        if (
          name.includes('skin') ||
          name.includes('face') ||
          name.includes('body') ||
          name.includes('arm') ||
          name.includes('leg')
        ) {
          if (mat.color) {
            mat.color.set(customization.skinColor);
          }
        }

        // Hair materials
        if (name.includes('hair')) {
          if (mat.color) {
            mat.color.set(customization.hairColor);
          }
        }

        // Eye materials (iris, not eyebrow/eyelash)
        if (
          name.includes('eye') &&
          !name.includes('eyebrow') &&
          !name.includes('eyelash') &&
          !name.includes('eyelid')
        ) {
          if (name.includes('iris') || name.includes('pupil')) {
            if (mat.color) {
              mat.color.set(customization.eyeColor);
            }
          }
        }
      }
    }
  });
}

// ============================================================
// AVATAR SCENE COMPONENT
// ============================================================

interface AvatarSceneProps {
  vrm: VRM;
  pose?: Partial<SolvedPose>;
  customization?: AvatarCustomization;
  autoRotate?: boolean;
}

function AvatarScene({ vrm, pose, customization, autoRotate }: AvatarSceneProps) {
  const { scene } = useThree();
  const rotationRef = useRef(0);

  // Add VRM to scene
  useEffect(() => {
    scene.add(vrm.scene);
    return () => {
      scene.remove(vrm.scene);
    };
  }, [vrm, scene]);

  // Apply pose when it changes
  useEffect(() => {
    if (pose) {
      applyPoseToVRM(vrm, pose);
    }
  }, [vrm, pose]);

  // Apply customization when it changes
  useEffect(() => {
    if (customization) {
      applyCustomization(vrm, customization);
    }
  }, [vrm, customization]);

  // Animation loop
  useFrame((state, delta) => {
    // Update VRM (for expression interpolation)
    vrm.update(delta);

    // Auto-rotate if enabled
    if (autoRotate) {
      rotationRef.current += delta * 0.5;
      vrm.scene.rotation.y = Math.PI + Math.sin(rotationRef.current) * 0.3;
    }
  });

  return null;
}

// ============================================================
// LOADING COMPONENT
// ============================================================

function LoadingOverlay({ progress }: { progress: number }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading avatar...</Text>
      {progress > 0 && progress < 100 && (
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function VRMAvatarRenderer({
  modelUrl,
  pose,
  customization,
  autoRotate = false,
  cameraPosition = [0, 1.5, 2],
  onLoadComplete,
  onLoadError,
}: VRMAvatarRendererProps) {
  const { vrm, loading, error, progress } = useVRMLoader(modelUrl);

  // Notify parent of load complete
  useEffect(() => {
    if (vrm && onLoadComplete) {
      onLoadComplete();
    }
  }, [vrm, onLoadComplete]);

  // Notify parent of load error
  useEffect(() => {
    if (error && onLoadError) {
      onLoadError(error);
    }
  }, [error, onLoadError]);

  if (loading) {
    return <LoadingOverlay progress={progress} />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load avatar</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Canvas
        camera={{
          position: cameraPosition,
          fov: 30,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 2, 3]} intensity={0.8} />
        <directionalLight position={[-1, 1, -1]} intensity={0.3} />

        {/* Avatar */}
        {vrm && (
          <AvatarScene
            vrm={vrm}
            pose={pose}
            customization={customization}
            autoRotate={autoRotate}
          />
        )}
      </Canvas>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  progressText: {
    color: '#888',
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetail: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default VRMAvatarRenderer;
