"""
Multi-Scale Edge Detection
Detects edges at multiple scales: coarse, fine, semantic, and depth-based
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional


class EdgeDetector:
    """
    Multi-scale edge detection combining:
    - Coarse edges (major features like face outline)
    - Fine edges (wrinkles, expression lines)
    - Semantic edges (region boundaries from segmentation)
    - Depth edges (discontinuities in depth)

    Fuses all edge maps with appropriate weighting for final edge map.
    """

    def __init__(self):
        """Initialize EdgeDetector"""
        print("EdgeDetector initialized successfully")

    def detect_edges_multiscale(
        self,
        image: np.ndarray,
        masks: Optional[Dict[str, np.ndarray]] = None,
        depth_map: Optional[np.ndarray] = None
    ) -> Dict[str, np.ndarray]:
        """
        Detect edges at multiple scales

        Args:
            image: Input image (H, W, 3) BGR format
            masks: Optional dict of segmentation masks
            depth_map: Optional depth map (H, W)

        Returns:
            Dict with:
            - coarse_edges: Major features (face outline, eyes, nose)
            - fine_edges: Expression lines, wrinkles
            - semantic_edges: Region boundaries from segmentation
            - depth_edges: Depth discontinuities
            - fused_edges: Combined edge map
        """
        # 1. Coarse edges (Sobel on grayscale)
        coarse_edges = self.detect_coarse_edges(image)

        # 2. Fine edges (Canny with low threshold)
        fine_edges = self.detect_fine_edges(image)

        # 3. Semantic edges (boundaries from segmentation)
        semantic_edges = None
        if masks is not None:
            semantic_edges = self.extract_semantic_edges(masks)

        # 4. Depth edges (discontinuities in depth)
        depth_edges = None
        if depth_map is not None:
            depth_edges = self.detect_depth_edges(depth_map)

        # 5. Fuse all edge maps
        edge_maps = {
            'coarse': coarse_edges,
            'fine': fine_edges,
        }

        if semantic_edges is not None:
            edge_maps['semantic'] = semantic_edges
        if depth_edges is not None:
            edge_maps['depth'] = depth_edges

        fused_edges = self.fuse_edges(edge_maps)

        return {
            'coarse_edges': coarse_edges,
            'fine_edges': fine_edges,
            'semantic_edges': semantic_edges if semantic_edges is not None else np.zeros_like(coarse_edges),
            'depth_edges': depth_edges if depth_edges is not None else np.zeros_like(coarse_edges),
            'fused_edges': fused_edges
        }

    def detect_coarse_edges(self, image: np.ndarray) -> np.ndarray:
        """
        Detect major edges using Sobel operator

        Args:
            image: Input image (H, W, 3) BGR format

        Returns:
            Binary edge map (H, W) with coarse edges
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Sobel in X and Y directions (larger kernel for coarse edges)
        sobel_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=5)
        sobel_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=5)

        # Compute magnitude
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)

        # Normalize to 0-255
        magnitude_normalized = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)

        # Threshold to get binary edges
        _, edges = cv2.threshold(magnitude_normalized, 100, 255, cv2.THRESH_BINARY)

        return edges.astype(np.uint8)

    def detect_fine_edges(self, image: np.ndarray) -> np.ndarray:
        """
        Detect fine edges (wrinkles, expression lines) using Canny

        Args:
            image: Input image (H, W, 3) BGR format

        Returns:
            Binary edge map (H, W) with fine edges
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply slight Gaussian blur
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)

        # Canny with low thresholds to catch subtle edges
        edges = cv2.Canny(blurred, threshold1=30, threshold2=100)

        return edges

    def extract_semantic_edges(self, masks: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Extract edges from segmentation boundaries

        Args:
            masks: Dict of segmentation masks (region_name -> binary mask)

        Returns:
            Binary edge map (H, W) with semantic boundaries
        """
        # Get first mask to determine size
        first_mask = next(iter(masks.values()))
        combined_mask = np.zeros_like(first_mask)

        # Combine all face region masks
        for region_name, mask in masks.items():
            if not region_name.startswith('_'):  # Skip metadata keys
                combined_mask = np.maximum(combined_mask, mask)

        # Find contours/edges
        edges = cv2.Canny(combined_mask, 100, 200)

        # Dilate slightly to make edges more visible
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)

        return edges

    def detect_depth_edges(self, depth_map: np.ndarray) -> np.ndarray:
        """
        Detect edges from depth discontinuities

        Args:
            depth_map: Depth map (H, W) with values 0-255

        Returns:
            Binary edge map (H, W) with depth discontinuities
        """
        # Apply slight blur to reduce noise
        depth_blurred = cv2.GaussianBlur(depth_map, (3, 3), 0)

        # Sobel on depth map
        sobel_x = cv2.Sobel(depth_blurred, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(depth_blurred, cv2.CV_64F, 0, 1, ksize=3)

        # Compute magnitude
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)

        # Normalize
        magnitude_normalized = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)

        # Threshold to get depth discontinuities
        _, edges = cv2.threshold(magnitude_normalized, 80, 255, cv2.THRESH_BINARY)

        return edges.astype(np.uint8)

    def fuse_edges(self, edge_maps: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Combine multiple edge maps with appropriate weighting

        Args:
            edge_maps: Dict of edge maps (type -> binary edge map)
                      Supported types: 'coarse', 'fine', 'semantic', 'depth'

        Returns:
            Fused binary edge map
        """
        # Define weights (higher = more important)
        default_weights = {
            'semantic': 0.4,  # Highest weight (most reliable)
            'depth': 0.3,     # Second highest
            'coarse': 0.2,    # Third
            'fine': 0.1       # Lowest (can be noisy)
        }

        # Get image size from first edge map
        first_map = next(iter(edge_maps.values()))
        fused = np.zeros_like(first_map, dtype=np.float32)

        # Weighted sum
        for edge_type, edge_map in edge_maps.items():
            if edge_map is None:
                continue

            weight = default_weights.get(edge_type, 0.1)
            fused += edge_map.astype(np.float32) * weight

        # Normalize to 0-255
        fused_normalized = cv2.normalize(fused, None, 0, 255, cv2.NORM_MINMAX)

        # Threshold to get binary edges
        _, fused_binary = cv2.threshold(fused_normalized, 127, 255, cv2.THRESH_BINARY)

        # Morphological operations to clean up
        kernel = np.ones((3, 3), np.uint8)
        fused_cleaned = cv2.morphologyEx(fused_binary, cv2.MORPH_CLOSE, kernel)

        return fused_cleaned.astype(np.uint8)

    def enhance_expression_edges(
        self,
        fused_edges: np.ndarray,
        landmarks: Optional[List[Tuple[float, float, float]]] = None
    ) -> np.ndarray:
        """
        Enhance edges around expression-critical areas (mouth, eyes)

        Args:
            fused_edges: Fused edge map to enhance
            landmarks: Optional list of facial landmarks (x, y, z) from MediaPipe

        Returns:
            Enhanced edge map with boosted expression regions
        """
        if landmarks is None or len(landmarks) == 0:
            return fused_edges

        # Create mask for important regions
        mask = np.zeros_like(fused_edges)

        # Mouth region (landmarks around lips)
        # MediaPipe face mesh: lips are landmarks 61, 291, 0, 17, 269, 405, 314, 39, 181, 82
        mouth_landmarks = [61, 291, 0, 17, 269, 405, 314, 39, 181, 82]

        # Eyes region (landmarks around eyes)
        # MediaPipe face mesh: eye corners are 33, 133, 362, 263, 155, 382
        eye_landmarks = [33, 133, 362, 263, 155, 382]

        # Draw circles around important landmarks
        for idx in mouth_landmarks + eye_landmarks:
            if idx < len(landmarks):
                x, y, _ = landmarks[idx]
                cv2.circle(mask, (int(x), int(y)), radius=15, color=255, thickness=-1)

        # Enhance edges in important regions
        enhanced = fused_edges.copy()
        enhanced[mask > 0] = np.maximum(enhanced[mask > 0], 200)  # Boost edge strength

        return enhanced

    def apply_edge_mask(
        self,
        edges: np.ndarray,
        mask: np.ndarray
    ) -> np.ndarray:
        """
        Apply mask to edge map (keep only edges within mask)

        Args:
            edges: Binary edge map (H, W)
            mask: Binary mask (H, W) where 255 = keep, 0 = remove

        Returns:
            Masked edge map
        """
        masked = cv2.bitwise_and(edges, mask)
        return masked

    def thin_edges(self, edges: np.ndarray) -> np.ndarray:
        """
        Thin edges to 1-pixel width using morphological thinning

        Args:
            edges: Binary edge map (H, W)

        Returns:
            Thinned edge map
        """
        # Morphological thinning (skeletonization)
        # OpenCV doesn't have built-in thinning, so we use erosion-based approximation
        kernel = np.ones((3, 3), np.uint8)
        thinned = cv2.morphologyEx(edges, cv2.MORPH_GRADIENT, kernel)

        return thinned

    def get_edge_orientation(self, image: np.ndarray) -> np.ndarray:
        """
        Compute edge orientation map

        Args:
            image: Input image (H, W, 3) BGR format

        Returns:
            Edge orientation map (H, W) in degrees [0, 180]
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Compute gradients
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        # Compute orientation (in degrees)
        orientation = np.arctan2(sobel_y, sobel_x) * 180 / np.pi

        # Map to [0, 180]
        orientation = (orientation + 180) % 180

        return orientation.astype(np.float32)

    def visualize_edges(
        self,
        edge_maps: Dict[str, np.ndarray],
        image: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Create multi-channel visualization of different edge types

        Args:
            edge_maps: Dict of edge maps (type -> edge map)
            image: Optional background image

        Returns:
            Colored visualization (H, W, 3)
        """
        # Get image size
        first_map = next(iter(edge_maps.values()))
        h, w = first_map.shape

        # Create colored visualization
        if image is not None:
            viz = image.copy()
        else:
            viz = np.zeros((h, w, 3), dtype=np.uint8)

        # Color scheme for different edge types
        colors = {
            'coarse': (255, 0, 0),      # Blue
            'fine': (0, 255, 0),        # Green
            'semantic': (0, 0, 255),    # Red
            'depth': (255, 255, 0),     # Cyan
            'fused': (255, 255, 255)    # White
        }

        # Overlay edges with different colors
        for edge_type, edge_map in edge_maps.items():
            if edge_map is None:
                continue

            color = colors.get(edge_type, (128, 128, 128))

            # Create colored edge overlay
            edge_colored = np.zeros((h, w, 3), dtype=np.uint8)
            edge_colored[edge_map > 0] = color

            # Blend with visualization
            viz = cv2.addWeighted(viz, 0.7, edge_colored, 0.3, 0)

        return viz

    def validate_edge_quality(self, edge_map: np.ndarray) -> bool:
        """
        Check if edge map is of sufficient quality

        Args:
            edge_map: Binary edge map to validate

        Returns:
            True if edge map passes quality checks
        """
        # Check for reasonable edge density
        edge_pixels = np.sum(edge_map > 0)
        total_pixels = edge_map.shape[0] * edge_map.shape[1]
        edge_ratio = edge_pixels / total_pixels

        # Should have some edges but not too many
        if edge_ratio < 0.01 or edge_ratio > 0.5:
            return False

        # Check for connected components (should have some structure)
        num_labels, _ = cv2.connectedComponents(edge_map)

        # Should have at least a few edge structures
        if num_labels < 5:
            return False

        return True


if __name__ == "__main__":
    """Quick test of edge detection"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python edge_detection.py <image_path> [depth_map_path]")
        sys.exit(1)

    # Load image
    image_path = sys.argv[1]
    image = cv2.imread(image_path)

    if image is None:
        print(f"Error: Could not load image from {image_path}")
        sys.exit(1)

    print(f"Loaded image: {image.shape}")

    # Load depth map if provided
    depth_map = None
    if len(sys.argv) > 2:
        depth_path = sys.argv[2]
        depth_map = cv2.imread(depth_path, cv2.IMREAD_GRAYSCALE)
        if depth_map is not None:
            print(f"Loaded depth map: {depth_map.shape}")

    # Initialize edge detector
    detector = EdgeDetector()

    # Detect edges
    print("\nDetecting edges at multiple scales...")
    edge_results = detector.detect_edges_multiscale(image, depth_map=depth_map)

    # Print results
    for edge_type, edge_map in edge_results.items():
        if edge_map is not None and np.sum(edge_map > 0) > 0:
            edge_pixels = np.sum(edge_map > 0)
            print(f"  {edge_type}: {edge_pixels} edge pixels")

    # Validate quality
    is_valid = detector.validate_edge_quality(edge_results['fused_edges'])
    print(f"\nEdge quality: {'PASS' if is_valid else 'FAIL'}")

    # Save results
    for edge_type, edge_map in edge_results.items():
        if edge_map is not None:
            output_path = image_path.replace('.', f'_edges_{edge_type}.')
            cv2.imwrite(output_path, edge_map)
            print(f"Saved {edge_type} edges to: {output_path}")

    # Create and save visualization
    viz = detector.visualize_edges(edge_results, image)
    viz_path = image_path.replace('.', '_edges_viz.')
    cv2.imwrite(viz_path, viz)
    print(f"Saved visualization to: {viz_path}")
