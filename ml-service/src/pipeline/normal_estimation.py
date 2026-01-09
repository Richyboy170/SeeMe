"""
Normal Map Generation from Depth Maps
Computes surface normals for 3D structure understanding
"""

import cv2
import numpy as np
from typing import Tuple, Optional


class NormalEstimator:
    """
    Surface normal estimation from depth maps

    Normals are encoded as RGB images where:
    - R channel = X component of normal vector
    - G channel = Y component of normal vector
    - B channel = Z component of normal vector
    - Values in range [0, 255] mapped from normalized vectors [-1, 1]
    """

    def __init__(self):
        """Initialize NormalEstimator"""
        print("NormalEstimator initialized successfully")

    def compute_normals(self, depth_map: np.ndarray) -> np.ndarray:
        """
        Compute surface normal map from depth map

        Args:
            depth_map: Depth map (H, W) with values 0-255
                      where 255 = closest, 0 = farthest

        Returns:
            normal_map: RGB image (H, W, 3) where:
                       R = X component of normal
                       G = Y component of normal
                       B = Z component of normal
                       Values in range [0, 255]
        """
        # Convert to float and normalize to [0, 1]
        depth_float = depth_map.astype(np.float32) / 255.0

        # Compute gradients using Sobel operator
        # Sobel kernels are better than simple differences for noisy data
        grad_x = cv2.Sobel(depth_float, cv2.CV_32F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(depth_float, cv2.CV_32F, 0, 1, ksize=3)

        # Build normal vectors
        # Surface normal = (-dz/dx, -dz/dy, 1)
        # The partial derivatives tell us how the surface slopes
        # We negate them because increasing depth should point outward
        normals = np.zeros((depth_map.shape[0], depth_map.shape[1], 3), dtype=np.float32)
        normals[:, :, 0] = -grad_x  # X component
        normals[:, :, 1] = -grad_y  # Y component
        normals[:, :, 2] = 1.0      # Z component (always points toward camera)

        # Normalize vectors to unit length
        # ||n|| = 1 for all normal vectors
        norm = np.linalg.norm(normals, axis=2, keepdims=True)
        normals = normals / (norm + 1e-8)  # Avoid division by zero

        # Convert from [-1, 1] to [0, 255] for RGB encoding
        # This makes normals visualizable as an image
        normal_map = ((normals + 1.0) / 2.0 * 255).astype(np.uint8)

        return normal_map

    def smooth_normals(
        self,
        normal_map: np.ndarray,
        kernel_size: int = 5,
        sigma_color: float = 75,
        sigma_space: float = 75
    ) -> np.ndarray:
        """
        Apply bilateral filter to smooth normals while preserving edges

        Bilateral filter smooths flat regions but preserves sharp edges,
        which is perfect for normal maps where we want smooth surfaces
        but sharp feature boundaries.

        Args:
            normal_map: Normal map (H, W, 3) to smooth
            kernel_size: Filter kernel size (must be odd)
            sigma_color: Filter sigma in color space
            sigma_space: Filter sigma in coordinate space

        Returns:
            Smoothed normal map (H, W, 3)
        """
        # Ensure kernel size is odd
        if kernel_size % 2 == 0:
            kernel_size += 1

        # Apply bilateral filter
        smoothed = cv2.bilateralFilter(
            normal_map,
            kernel_size,
            sigmaColor=sigma_color,
            sigmaSpace=sigma_space
        )

        return smoothed

    def enhance_normals(
        self,
        normal_map: np.ndarray,
        strength: float = 1.5
    ) -> np.ndarray:
        """
        Enhance normal map contrast for sharper features

        Args:
            normal_map: Normal map to enhance
            strength: Enhancement strength (1.0 = no change, >1.0 = sharper)

        Returns:
            Enhanced normal map
        """
        # Convert to float [-1, 1]
        normals_float = (normal_map.astype(np.float32) / 255.0 * 2.0) - 1.0

        # Apply contrast enhancement to X and Y components
        normals_float[:, :, 0] *= strength
        normals_float[:, :, 1] *= strength

        # Re-normalize to unit length
        norm = np.linalg.norm(normals_float, axis=2, keepdims=True)
        normals_float = normals_float / (norm + 1e-8)

        # Convert back to [0, 255]
        enhanced = ((normals_float + 1.0) / 2.0 * 255).astype(np.uint8)

        return enhanced

    def visualize_normals(self, normal_map: np.ndarray) -> np.ndarray:
        """
        Create visualization of normals (useful for debugging)

        Normal maps are already in RGB format where colors represent
        surface orientation:
        - Red: X-axis orientation (left/right)
        - Green: Y-axis orientation (up/down)
        - Blue: Z-axis orientation (forward/back)

        Args:
            normal_map: Normal map (H, W, 3) in RGB format

        Returns:
            BGR image for OpenCV display
        """
        # Normal map is already in RGB format, convert to BGR for OpenCV
        return cv2.cvtColor(normal_map, cv2.COLOR_RGB2BGR)

    def decode_normals(self, normal_map: np.ndarray) -> np.ndarray:
        """
        Decode normal map from RGB encoding back to normalized vectors

        Args:
            normal_map: RGB-encoded normal map (H, W, 3) in range [0, 255]

        Returns:
            Decoded normals (H, W, 3) as unit vectors in range [-1, 1]
        """
        # Convert from [0, 255] to [-1, 1]
        normals = (normal_map.astype(np.float32) / 255.0 * 2.0) - 1.0

        # Re-normalize to ensure unit length
        norm = np.linalg.norm(normals, axis=2, keepdims=True)
        normals = normals / (norm + 1e-8)

        return normals

    def compute_normal_consistency(self, normal_map: np.ndarray) -> float:
        """
        Measure consistency/smoothness of normal map

        Computes average angular difference between adjacent normals.
        Lower values = smoother surface, higher values = rougher surface.

        Args:
            normal_map: Normal map (H, W, 3)

        Returns:
            Average angular difference in degrees
        """
        # Decode to vectors
        normals = self.decode_normals(normal_map)

        # Compute differences with neighbors
        # Right neighbor
        diff_x = normals[:, :-1, :] - normals[:, 1:, :]
        # Bottom neighbor
        diff_y = normals[:-1, :, :] - normals[1:, :, :]

        # Compute magnitudes (angular differences)
        ang_x = np.linalg.norm(diff_x, axis=2)
        ang_y = np.linalg.norm(diff_y, axis=2)

        # Average angular difference
        avg_diff = (np.mean(ang_x) + np.mean(ang_y)) / 2.0

        # Convert to degrees (approximate)
        avg_diff_degrees = avg_diff * 180.0 / np.pi

        return float(avg_diff_degrees)

    def apply_mask(
        self,
        normal_map: np.ndarray,
        mask: np.ndarray,
        background_normal: Tuple[int, int, int] = (128, 128, 255)
    ) -> np.ndarray:
        """
        Apply mask to normal map, setting background to specified normal

        Args:
            normal_map: Normal map (H, W, 3)
            mask: Binary mask (H, W) where 255 = face, 0 = background
            background_normal: RGB color for background normals
                             Default (128, 128, 255) = facing camera (0, 0, 1)

        Returns:
            Masked normal map
        """
        # Create 3-channel mask
        mask_3ch = np.stack([mask, mask, mask], axis=2) / 255.0

        # Create background
        background = np.full_like(normal_map, background_normal, dtype=np.uint8)

        # Blend
        masked = (normal_map * mask_3ch + background * (1 - mask_3ch)).astype(np.uint8)

        return masked

    def validate_normal_quality(self, normal_map: np.ndarray) -> bool:
        """
        Check if normal map is of sufficient quality

        Args:
            normal_map: Normal map to validate

        Returns:
            True if normal map passes quality checks
        """
        # Check for NaN or infinite values
        if np.isnan(normal_map).any() or np.isinf(normal_map).any():
            return False

        # Decode normals
        normals = self.decode_normals(normal_map)

        # Check if normals are approximately unit length
        norms = np.linalg.norm(normals, axis=2)
        if not np.allclose(norms, 1.0, atol=0.1):
            return False

        # Check for reasonable variation (not all normals the same)
        std_x = np.std(normal_map[:, :, 0])
        std_y = np.std(normal_map[:, :, 1])
        std_z = np.std(normal_map[:, :, 2])

        if std_x < 5 and std_y < 5 and std_z < 5:  # Too uniform
            return False

        return True


if __name__ == "__main__":
    """Quick test of normal estimation"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python normal_estimation.py <depth_map_path>")
        print("Or: python normal_estimation.py <image_path> --from-image")
        sys.exit(1)

    estimator = NormalEstimator()

    if "--from-image" in sys.argv:
        # Estimate depth first, then compute normals
        print("Computing depth from image, then normals...")
        from depth_estimation import DepthEstimator

        image_path = sys.argv[1]
        image = cv2.imread(image_path)

        if image is None:
            print(f"Error: Could not load image from {image_path}")
            sys.exit(1)

        # Estimate depth
        depth_estimator = DepthEstimator(device='cpu')
        print("Estimating depth...")
        depth_map = depth_estimator.estimate_depth(image)
        print(f"Depth map shape: {depth_map.shape}")

    else:
        # Load depth map directly
        depth_path = sys.argv[1]
        depth_map = cv2.imread(depth_path, cv2.IMREAD_GRAYSCALE)

        if depth_map is None:
            print(f"Error: Could not load depth map from {depth_path}")
            sys.exit(1)

        print(f"Loaded depth map: {depth_map.shape}")

    # Compute normals
    print("\nComputing normals...")
    normal_map = estimator.compute_normals(depth_map)
    print(f"Normal map shape: {normal_map.shape}")

    # Smooth normals
    print("Smoothing normals...")
    smoothed_normals = estimator.smooth_normals(normal_map)

    # Validate quality
    is_valid = estimator.validate_normal_quality(normal_map)
    print(f"\nNormal quality: {'PASS' if is_valid else 'FAIL'}")

    # Measure consistency
    consistency = estimator.compute_normal_consistency(normal_map)
    print(f"Normal consistency: {consistency:.2f}° (lower = smoother)")

    # Save results
    output_path = sys.argv[1].replace('.', '_normals.')
    cv2.imwrite(output_path, normal_map)
    print(f"\nSaved normal map to: {output_path}")

    smoothed_path = sys.argv[1].replace('.', '_normals_smooth.')
    cv2.imwrite(smoothed_path, smoothed_normals)
    print(f"Saved smoothed normals to: {smoothed_path}")

    # Save visualization
    viz_path = sys.argv[1].replace('.', '_normals_viz.')
    viz = estimator.visualize_normals(normal_map)
    cv2.imwrite(viz_path, viz)
    print(f"Saved visualization to: {viz_path}")
