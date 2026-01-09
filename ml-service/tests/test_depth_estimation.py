"""
Unit tests for depth estimation module
"""

import sys
import os
import unittest
import numpy as np
import cv2

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from pipeline import DepthEstimator


class TestDepthEstimator(unittest.TestCase):
    """Test cases for DepthEstimator class"""

    def setUp(self):
        """Set up test fixtures"""
        # Create a simple test image (gradient)
        self.test_image = np.zeros((480, 640, 3), dtype=np.uint8)
        # Create a gradient (top=dark, bottom=light)
        for i in range(480):
            self.test_image[i, :, :] = int(i * 255 / 480)

    def test_initialization_cpu(self):
        """Test DepthEstimator initialization on CPU"""
        estimator = DepthEstimator(device='cpu')
        self.assertIsNotNone(estimator)
        self.assertEqual(estimator.device, 'cpu')
        self.assertIsNotNone(estimator.model)
        self.assertIsNotNone(estimator.transform)
        print("✓ DepthEstimator CPU initialization successful")

    def test_initialization_auto_device(self):
        """Test DepthEstimator initialization with auto device selection"""
        estimator = DepthEstimator()
        self.assertIsNotNone(estimator)
        self.assertIn(estimator.device, ['cpu', 'cuda'])
        print(f"✓ DepthEstimator auto-initialized on {estimator.device}")

    def test_estimate_depth_shape(self):
        """Test depth map has correct shape"""
        estimator = DepthEstimator(device='cpu')
        depth_map = estimator.estimate_depth(self.test_image)

        # Should match input image dimensions (H, W)
        self.assertEqual(depth_map.shape, (480, 640))
        self.assertEqual(depth_map.dtype, np.uint8)
        print("✓ Depth map shape correct")

    def test_estimate_depth_range(self):
        """Test depth map values are in correct range"""
        estimator = DepthEstimator(device='cpu')
        depth_map = estimator.estimate_depth(self.test_image)

        # Should be in range [0, 255]
        self.assertTrue(np.all(depth_map >= 0))
        self.assertTrue(np.all(depth_map <= 255))
        print(f"✓ Depth map range: [{np.min(depth_map)}, {np.max(depth_map)}]")

    def test_normalize_depth(self):
        """Test depth normalization"""
        estimator = DepthEstimator(device='cpu')

        # Test with sample depth values
        raw_depth = np.array([[1.0, 2.0, 3.0],
                              [4.0, 5.0, 6.0],
                              [7.0, 8.0, 9.0]])

        normalized = estimator.normalize_depth(raw_depth)

        # Should be inverted and normalized to 0-255
        self.assertEqual(normalized.dtype, np.uint8)
        self.assertTrue(np.all(normalized >= 0))
        self.assertTrue(np.all(normalized <= 255))
        # Largest input (9.0) should map to lowest output (closest = 0 after inversion)
        # Smallest input (1.0) should map to highest output (farthest = 255 after inversion)
        self.assertEqual(normalized[0, 0], 255)  # Was 1.0 (farthest)
        self.assertEqual(normalized[2, 2], 0)    # Was 9.0 (closest)
        print("✓ Depth normalization correct")

    def test_extract_depth_features(self):
        """Test depth feature extraction"""
        estimator = DepthEstimator(device='cpu')

        # Create test depth map
        depth_map = np.random.randint(0, 256, (480, 640), dtype=np.uint8)

        features = estimator.extract_depth_features(depth_map)

        # Check all required features present
        required_keys = ['mean_depth', 'max_depth', 'min_depth', 'depth_range', 'depth_std']
        for key in required_keys:
            self.assertIn(key, features)
            self.assertIsInstance(features[key], float)

        # Validate feature values
        self.assertGreaterEqual(features['mean_depth'], 0)
        self.assertLessEqual(features['mean_depth'], 255)
        self.assertEqual(features['depth_range'], features['max_depth'] - features['min_depth'])

        print("✓ Depth features extracted correctly")
        print(f"  Features: {features}")

    def test_validate_depth_quality_good(self):
        """Test depth quality validation with good depth map"""
        estimator = DepthEstimator(device='cpu')

        # Create depth map with good variation
        depth_map = np.zeros((480, 640), dtype=np.uint8)
        depth_map[:240, :] = 200  # Close region
        depth_map[240:, :] = 50   # Far region

        is_valid = estimator.validate_depth_quality(depth_map)
        self.assertTrue(is_valid)
        print("✓ Good depth map validated correctly")

    def test_validate_depth_quality_bad(self):
        """Test depth quality validation with poor depth map"""
        estimator = DepthEstimator(device='cpu')

        # Create flat depth map (poor quality)
        depth_map = np.ones((480, 640), dtype=np.uint8) * 128

        is_valid = estimator.validate_depth_quality(depth_map)
        self.assertFalse(is_valid)
        print("✓ Poor depth map rejected correctly")

    def test_visualize_depth(self):
        """Test depth visualization"""
        estimator = DepthEstimator(device='cpu')

        # Create test depth map
        depth_map = np.random.randint(0, 256, (480, 640), dtype=np.uint8)

        visualization = estimator.visualize_depth(depth_map)

        # Should be RGB image
        self.assertEqual(visualization.shape, (480, 640, 3))
        self.assertEqual(visualization.dtype, np.uint8)
        print("✓ Depth visualization correct")

    def test_estimate_depth_for_face(self):
        """Test depth estimation for specific face region"""
        estimator = DepthEstimator(device='cpu')

        # Create test image
        image = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)

        # Define face bounding box
        bbox = {'x': 100, 'y': 100, 'width': 200, 'height': 200}

        # Estimate depth for face
        depth_map = estimator.estimate_depth_for_face(image, bbox, padding=20)

        # Should be cropped to face region with padding
        expected_height = 200 + 40  # height + 2*padding
        expected_width = 200 + 40   # width + 2*padding
        self.assertEqual(depth_map.shape, (expected_height, expected_width))
        print("✓ Face-specific depth estimation correct")


def run_performance_test():
    """Test performance of depth estimation"""
    print("\n" + "="*60)
    print("PERFORMANCE TEST")
    print("="*60)

    import time

    # Create test image
    image = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)

    # Test CPU performance
    print("\nTesting CPU performance...")
    estimator_cpu = DepthEstimator(device='cpu')

    times_cpu = []
    for i in range(3):
        start = time.time()
        depth_map = estimator_cpu.estimate_depth(image)
        elapsed = time.time() - start
        times_cpu.append(elapsed)
        print(f"  Run {i+1}: {elapsed:.2f}s")

    avg_cpu = np.mean(times_cpu)
    print(f"  Average: {avg_cpu:.2f}s")

    # Test GPU performance if available
    if estimator_cpu.device == 'cuda':
        print("\nTesting GPU performance...")
        estimator_gpu = DepthEstimator(device='cuda')

        times_gpu = []
        for i in range(3):
            start = time.time()
            depth_map = estimator_gpu.estimate_depth(image)
            elapsed = time.time() - start
            times_gpu.append(elapsed)
            print(f"  Run {i+1}: {elapsed:.2f}s")

        avg_gpu = np.mean(times_gpu)
        print(f"  Average: {avg_gpu:.2f}s")

        # Check if GPU meets target (<2s)
        if avg_gpu < 2.0:
            print(f"✓ GPU performance PASS (target: <2s)")
        else:
            print(f"⚠ GPU performance SLOW (target: <2s, actual: {avg_gpu:.2f}s)")
    else:
        print("\n⚠ CUDA not available, skipping GPU test")

    print("="*60)


if __name__ == '__main__':
    print("\n" + "="*60)
    print("DEPTH ESTIMATION UNIT TESTS")
    print("="*60 + "\n")

    # Run unit tests
    unittest.main(argv=[''], exit=False, verbosity=2)

    # Run performance test
    run_performance_test()
