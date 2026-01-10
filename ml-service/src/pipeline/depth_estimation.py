"""
Depth Estimation using MiDaS v3.1
Generates depth maps from face images for 3D structure understanding
"""

import torch
import cv2
import numpy as np
from typing import Dict, Optional
import warnings

warnings.filterwarnings('ignore')


class DepthEstimator:
    """
    Depth map estimation using MiDaS v3.1 (DPT_BEiT_L_512)

    Generates normalized depth maps where:
    - High values (255) = closer to camera
    - Low values (0) = farther from camera
    """

    def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
        """
        Initialize MiDaS depth estimator

        Args:
            model_path: Path to pretrained MiDaS model (optional, uses torch hub by default)
            device: 'cuda' or 'cpu' (auto-detects if None)
        """
        # Determine device
        if device is None:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device

        print(f"Initializing DepthEstimator on {self.device}...")

        try:
            # Load MiDaS model
            # Using DPT_Large for better compatibility with newer PyTorch/timm versions
            if model_path is not None:
                # Load from local file
                self.model = torch.hub.load(
                    "intel-isl/MiDaS",
                    "DPT_Large",
                    pretrained=False,
                    trust_repo=True
                )
                state_dict = torch.load(model_path, map_location=self.device)
                self.model.load_state_dict(state_dict, strict=False)
                print(f"Loaded MiDaS model from {model_path}")
            else:
                # Download pretrained model
                # DPT_Large is more stable and compatible than DPT_BEiT_L_512
                self.model = torch.hub.load(
                    "intel-isl/MiDaS",
                    "DPT_Large",
                    pretrained=True,
                    trust_repo=True
                )
                print("Loaded pretrained MiDaS DPT_Large model")

            # Move model to device and set to eval mode
            self.model.to(self.device)
            self.model.eval()

            # Load transform (matching DPT_Large model)
            midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
            self.transform = midas_transforms.dpt_transform

            print(f"DepthEstimator initialized successfully on {self.device}")

        except Exception as e:
            print(f"Error initializing DepthEstimator: {e}")
            raise

    def estimate_depth(self, image: np.ndarray) -> np.ndarray:
        """
        Estimate depth map from image

        Args:
            image: RGB image (H, W, 3) as numpy array

        Returns:
            depth_map: Normalized depth map (H, W) in range [0, 255]
                      where 255 = closest, 0 = farthest
        """
        original_height, original_width = image.shape[:2]

        # Convert BGR to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            # Assume OpenCV BGR format, convert to RGB
            img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            img_rgb = image

        # Transform image for MiDaS
        input_batch = self.transform(img_rgb).to(self.device)

        # Predict depth
        with torch.no_grad():
            prediction = self.model(input_batch)

            # Resize to original image size
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=(original_height, original_width),
                mode="bicubic",
                align_corners=False,
            ).squeeze()

        # Convert to numpy
        depth = prediction.cpu().numpy()

        # Normalize to 0-255 (invert so close=high value)
        depth_normalized = self.normalize_depth(depth)

        return depth_normalized

    def normalize_depth(self, depth: np.ndarray) -> np.ndarray:
        """
        Normalize depth map to 0-255 range

        MiDaS outputs inverse depth (larger values = farther away)
        We invert this so larger values = closer (more intuitive)

        Args:
            depth: Raw depth map from MiDaS

        Returns:
            Normalized depth map (0-255) as uint8
        """
        # MiDaS outputs inverse depth (larger = farther)
        # We want (larger = closer) for easier interpretation
        depth_inverted = np.max(depth) - depth

        # Normalize to 0-255
        depth_min = np.min(depth_inverted)
        depth_max = np.max(depth_inverted)

        if depth_max - depth_min > 0:
            depth_normalized = (depth_inverted - depth_min) / (depth_max - depth_min) * 255
        else:
            # Flat depth map (all same value)
            depth_normalized = np.zeros_like(depth_inverted)

        return depth_normalized.astype(np.uint8)

    def extract_depth_features(self, depth_map: np.ndarray) -> Dict[str, float]:
        """
        Extract useful statistics from depth map

        Args:
            depth_map: Normalized depth map (0-255)

        Returns:
            Dictionary with depth statistics:
            - mean_depth: Average depth value
            - max_depth: Maximum (closest) depth
            - min_depth: Minimum (farthest) depth
            - depth_range: Range of depth values
            - depth_std: Standard deviation of depth
        """
        return {
            'mean_depth': float(np.mean(depth_map)),
            'max_depth': float(np.max(depth_map)),
            'min_depth': float(np.min(depth_map)),
            'depth_range': float(np.max(depth_map) - np.min(depth_map)),
            'depth_std': float(np.std(depth_map))
        }

    def estimate_depth_for_face(
        self,
        image: np.ndarray,
        bbox: Dict[str, int],
        padding: int = 20
    ) -> np.ndarray:
        """
        Estimate depth map for a specific face region

        Args:
            image: Full image (H, W, 3)
            bbox: Face bounding box dict with keys: x, y, width, height
            padding: Extra padding around face (pixels)

        Returns:
            Depth map for face region (cropped and padded)
        """
        h, w = image.shape[:2]

        # Extract bbox coordinates with padding
        x = max(0, bbox['x'] - padding)
        y = max(0, bbox['y'] - padding)
        x2 = min(w, bbox['x'] + bbox['width'] + padding)
        y2 = min(h, bbox['y'] + bbox['height'] + padding)

        # Crop face region
        face_region = image[y:y2, x:x2]

        # Estimate depth for face region
        depth_map = self.estimate_depth(face_region)

        return depth_map

    def visualize_depth(self, depth_map: np.ndarray) -> np.ndarray:
        """
        Create colored visualization of depth map

        Args:
            depth_map: Normalized depth map (0-255)

        Returns:
            RGB visualization using COLORMAP_INFERNO
        """
        # Apply colormap for better visualization
        depth_colored = cv2.applyColorMap(depth_map, cv2.COLORMAP_INFERNO)

        return depth_colored

    def validate_depth_quality(self, depth_map: np.ndarray) -> bool:
        """
        Check if depth map is of sufficient quality

        Args:
            depth_map: Normalized depth map (0-255)

        Returns:
            True if depth map passes quality checks
        """
        features = self.extract_depth_features(depth_map)

        # Check for sufficient depth variation
        if features['depth_range'] < 30:  # Not enough depth variation
            return False

        # Check for reasonable standard deviation
        if features['depth_std'] < 10:  # Too flat
            return False

        # Check for NaN or infinite values
        if np.isnan(depth_map).any() or np.isinf(depth_map).any():
            return False

        return True

    def __del__(self):
        """Cleanup resources"""
        try:
            if hasattr(self, 'model'):
                del self.model
            if torch is not None and hasattr(torch.cuda, 'is_available') and torch.cuda.is_available():
                torch.cuda.empty_cache()
        except:
            pass  # Ignore cleanup errors during shutdown


if __name__ == "__main__":
    """Quick test of depth estimation"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python depth_estimation.py <image_path>")
        sys.exit(1)

    # Load image
    image_path = sys.argv[1]
    image = cv2.imread(image_path)

    if image is None:
        print(f"Error: Could not load image from {image_path}")
        sys.exit(1)

    print(f"Loaded image: {image.shape}")

    # Initialize depth estimator
    estimator = DepthEstimator()

    # Estimate depth
    print("Estimating depth...")
    import time
    start = time.time()
    depth_map = estimator.estimate_depth(image)
    elapsed = time.time() - start

    print(f"Depth estimation completed in {elapsed:.2f}s")
    print(f"Depth map shape: {depth_map.shape}")

    # Extract features
    features = estimator.extract_depth_features(depth_map)
    print("\nDepth features:")
    for key, value in features.items():
        print(f"  {key}: {value:.2f}")

    # Validate quality
    is_valid = estimator.validate_depth_quality(depth_map)
    print(f"\nDepth quality: {'PASS' if is_valid else 'FAIL'}")

    # Visualize
    depth_colored = estimator.visualize_depth(depth_map)

    # Save results
    output_path = image_path.replace('.', '_depth.')
    cv2.imwrite(output_path, depth_map)
    print(f"\nSaved depth map to: {output_path}")

    output_colored_path = image_path.replace('.', '_depth_colored.')
    cv2.imwrite(output_colored_path, depth_colored)
    print(f"Saved colored depth map to: {output_colored_path}")
