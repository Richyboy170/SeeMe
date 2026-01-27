/**
 * VRM Model Loader Service.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';

export class VRMLoaderService {
  private loader: GLTFLoader;
  private cache: Map<string, VRM> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
  }

  async loadVRM(url: string, onProgress?: (percent: number) => void): Promise<VRM> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM;
          if (!vrm) {
            reject(new Error('Failed to load VRM from GLTF'));
            return;
          }
          vrm.scene.rotation.y = Math.PI;
          this.cache.set(url, vrm);
          resolve(vrm);
        },
        (progress) => {
          if (onProgress && progress.total > 0) {
            onProgress((progress.loaded / progress.total) * 100);
          }
        },
        (error) => reject(error)
      );
    });
  }

  disposeVRM(url: string): void {
    const vrm = this.cache.get(url);
    if (vrm) {
      vrm.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      this.cache.delete(url);
    }
  }

  clearCache(): void {
    for (const url of this.cache.keys()) {
      this.disposeVRM(url);
    }
  }
}

export const vrmLoader = new VRMLoaderService();
