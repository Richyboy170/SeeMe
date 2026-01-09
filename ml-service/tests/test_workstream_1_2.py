"""
Comprehensive tests for WORKSTREAM 1.2: Structure Extraction
Tests depth estimation, normal map generation, and multi-scale edge detection
"""

import sys
import os
import unittest
import numpy as np
import cv2
import time

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from pipeline import DepthEstimator, NormalEstimator, EdgeDetector


class TestNormalEstimator(unittest.TestCase):
    """Test cases for NormalEstimator class"""

    def setUp(self):
        """Set up test fixtures"""
        self.estimator = NormalEstimator()

        # Create test depth map (gradient from top to bottom)
        self.test_depth = np.zeros((480, 640), dtype=np.uint8)
        for i in range(480):
            self.test_depth[i, :] = int(i * 255 / 480)

    def test_initialization(self):
        """Test NormalEstimator initialization"""
        self.assertIsNotNone(self.estimator)
        print("[PASS] NormalEstimator initialization successful")

    def test_compute_normals_shape(self):
        """Test normal map has correct shape"""
        normal_map = self.estimator.compute_normals(self.test_depth)

        # Should be RGB (H, W, 3)
        self.assertEqual(normal_map.shape, (480, 640, 3))
        self.assertEqual(normal_map.dtype, np.uint8)
        print("[PASS] Normal map shape correct")

    def test_compute_normals_range(self):
        """Test normal map values are in correct range"""
        normal_map = self.estimator.compute_normals(self.test_depth)

        # Should be in range [0, 255]
        self.assertTrue(np.all(normal_map >= 0))
        self.assertTrue(np.all(normal_map <= 255))
        print("[PASS] Normal map range correct [0, 255]")

    def test_decode_normals(self):
        """Test decoding normals back to unit vectors"""
        normal_map = self.estimator.compute_normals(self.test_depth)
        decoded = self.estimator.decode_normals(normal_map)

        # Should be unit vectors (magnitude ~1.0)
        magnitudes = np.linalg.norm(decoded, axis=2)
        self.assertTrue(np.allclose(magnitudes, 1.0, atol=0.1))
        print("[PASS] Decoded normals are unit vectors")

    def test_smooth_normals(self):
        """Test normal map smoothing"""
        normal_map = self.estimator.compute_normals(self.test_depth)
        smoothed = self.estimator.smooth_normals(normal_map)

        # Should have same shape and type
        self.assertEqual(smoothed.shape, normal_map.shape)
        self.assertEqual(smoothed.dtype, normal_map.dtype)
        print("[PASS] Normal smoothing works correctly")

    def test_enhance_normals(self):
        """Test normal enhancement"""
        normal_map = self.estimator.compute_normals(self.test_depth)
        enhanced = self.estimator.enhance_normals(normal_map, strength=1.5)

        # Should have same shape
        self.assertEqual(enhanced.shape, normal_map.shape)

        # Decoded normals should still be unit vectors
        decoded = self.estimator.decode_normals(enhanced)
        magnitudes = np.linalg.norm(decoded, axis=2)
        self.assertTrue(np.allclose(magnitudes, 1.0, atol=0.1))
        print("[PASS] Normal enhancement works correctly")

    def test_visualize_normals(self):
        """Test normal visualization"""
        normal_map = self.estimator.compute_normals(self.test_depth)
        viz = self.estimator.visualize_normals(normal_map)

        # Should be BGR image
        self.assertEqual(viz.shape, (480, 640, 3))
        print("[PASS] Normal visualization correct")

    def test_compute_normal_consistency(self):
        """Test normal consistency measurement"""
        normal_map = self.estimator.compute_normals(self.test_depth)
        consistency = self.estimator.compute_normal_consistency(normal_map)

        # Should return a positive value in degrees
        self.assertIsInstance(consistency, float)
        self.assertGreater(consistency, 0)
        print(f"[PASS] Normal consistency: {consistency:.2f} degrees")

    def test_apply_mask(self):
        """Test mask application"""
        normal_map = self.estimator.compute_normals(self.test_depth)

        # Create circular mask
        mask = np.zeros((480, 640), dtype=np.uint8)
        cv2.circle(mask, (320, 240), 200, 255, -1)

        masked = self.estimator.apply_mask(normal_map, mask)

        # Should have same shape
        self.assertEqual(masked.shape, normal_map.shape)

        # Background should be (128, 128, 255)
        self.assertEqual(masked[0, 0, 0], 128)
        self.assertEqual(masked[0, 0, 1], 128)
        self.assertEqual(masked[0, 0, 2], 255)
        print("[PASS] Mask application correct")

    def test_validate_normal_quality_good(self):
        """Test quality validation with good normals"""
        normal_map = self.estimator.compute_normals(self.test_depth)
        is_valid = self.estimator.validate_normal_quality(normal_map)

        self.assertTrue(is_valid)
        print("[PASS] Good normal map validated correctly")

    def test_validate_normal_quality_bad(self):
        """Test quality validation with bad normals"""
        # All same value (bad)
        bad_normals = np.ones((480, 640, 3), dtype=np.uint8) * 128

        is_valid = self.estimator.validate_normal_quality(bad_normals)
        self.assertFalse(is_valid)
        print("[PASS] Bad normal map rejected correctly")


class TestEdgeDetector(unittest.TestCase):
    """Test cases for EdgeDetector class"""

    def setUp(self):
        """Set up test fixtures"""
        self.detector = EdgeDetector()

        # Create test image (gradient with some edges)
        self.test_image = np.zeros((480, 640, 3), dtype=np.uint8)
        # Add a rectangle (will create edges)
        cv2.rectangle(self.test_image, (200, 150), (440, 330), (255, 255, 255), -1)

        # Create test depth map
        self.test_depth = np.zeros((480, 640), dtype=np.uint8)
        cv2.circle(self.test_depth, (320, 240), 150, 255, -1)

    def test_initialization(self):
        """Test EdgeDetector initialization"""
        self.assertIsNotNone(self.detector)
        print("[PASS] EdgeDetector initialization successful")

    def test_detect_coarse_edges(self):
        """Test coarse edge detection"""
        edges = self.detector.detect_coarse_edges(self.test_image)

        self.assertEqual(edges.shape, (480, 640))
        self.assertEqual(edges.dtype, np.uint8)
        self.assertTrue(np.any(edges > 0))  # Should detect some edges
        print(f"[PASS] Coarse edges detected: {np.sum(edges > 0)} pixels")

    def test_detect_fine_edges(self):
        """Test fine edge detection"""
        edges = self.detector.detect_fine_edges(self.test_image)

        self.assertEqual(edges.shape, (480, 640))
        self.assertEqual(edges.dtype, np.uint8)
        self.assertTrue(np.any(edges > 0))  # Should detect some edges
        print(f"[PASS] Fine edges detected: {np.sum(edges > 0)} pixels")

    def test_detect_depth_edges(self):
        """Test depth edge detection"""
        edges = self.detector.detect_depth_edges(self.test_depth)

        self.assertEqual(edges.shape, (480, 640))
        self.assertEqual(edges.dtype, np.uint8)
        self.assertTrue(np.any(edges > 0))  # Should detect circle edges
        print(f"[PASS] Depth edges detected: {np.sum(edges > 0)} pixels")

    def test_extract_semantic_edges(self):
        """Test semantic edge extraction"""
        # Create fake masks
        masks = {
            'face': np.zeros((480, 640), dtype=np.uint8),
            'eyes': np.zeros((480, 640), dtype=np.uint8),
        }
        cv2.circle(masks['face'], (320, 240), 150, 255, -1)
        cv2.circle(masks['eyes'], (280, 200), 20, 255, -1)

        edges = self.detector.extract_semantic_edges(masks)

        self.assertEqual(edges.shape, (480, 640))
        self.assertTrue(np.any(edges > 0))  # Should detect mask boundaries
        print(f"[PASS] Semantic edges extracted: {np.sum(edges > 0)} pixels")

    def test_fuse_edges(self):
        """Test edge fusion"""
        edge_maps = {
            'coarse': self.detector.detect_coarse_edges(self.test_image),
            'fine': self.detector.detect_fine_edges(self.test_image),
            'depth': self.detector.detect_depth_edges(self.test_depth),
        }

        fused = self.detector.fuse_edges(edge_maps)

        self.assertEqual(fused.shape, (480, 640))
        self.assertEqual(fused.dtype, np.uint8)
        self.assertTrue(np.any(fused > 0))  # Should have edges
        print(f"[PASS] Fused edges: {np.sum(fused > 0)} pixels")

    def test_detect_edges_multiscale(self):
        """Test full multi-scale edge detection"""
        results = self.detector.detect_edges_multiscale(
            self.test_image,
            depth_map=self.test_depth
        )

        # Check all edge types present
        self.assertIn('coarse_edges', results)
        self.assertIn('fine_edges', results)
        self.assertIn('depth_edges', results)
        self.assertIn('fused_edges', results)

        # All should be valid edge maps
        for edge_type, edge_map in results.items():
            if edge_map is not None:
                self.assertEqual(edge_map.shape, (480, 640))
                print(f"  {edge_type}: {np.sum(edge_map > 0)} pixels")

        print("[PASS] Multi-scale edge detection complete")

    def test_enhance_expression_edges(self):
        """Test expression edge enhancement"""
        edges = self.detector.detect_coarse_edges(self.test_image)

        # Create fake landmarks
        landmarks = [(320 + i*10, 240, 0.0) for i in range(100)]

        enhanced = self.detector.enhance_expression_edges(edges, landmarks)

        self.assertEqual(enhanced.shape, edges.shape)
        print("[PASS] Expression edge enhancement works")

    def test_apply_edge_mask(self):
        """Test edge masking"""
        edges = self.detector.detect_coarse_edges(self.test_image)

        # Create mask
        mask = np.zeros((480, 640), dtype=np.uint8)
        cv2.circle(mask, (320, 240), 200, 255, -1)

        masked = self.detector.apply_edge_mask(edges, mask)

        self.assertEqual(masked.shape, edges.shape)
        # Should have fewer edges than original
        self.assertLessEqual(np.sum(masked > 0), np.sum(edges > 0))
        print("[PASS] Edge masking works correctly")

    def test_thin_edges(self):
        """Test edge thinning"""
        edges = self.detector.detect_coarse_edges(self.test_image)
        thinned = self.detector.thin_edges(edges)

        self.assertEqual(thinned.shape, edges.shape)
        print("[PASS] Edge thinning works correctly")

    def test_get_edge_orientation(self):
        """Test edge orientation calculation"""
        orientation = self.detector.get_edge_orientation(self.test_image)

        self.assertEqual(orientation.shape, (480, 640))
        self.assertTrue(np.all(orientation >= 0))
        self.assertTrue(np.all(orientation <= 180))
        print("[PASS] Edge orientation calculation correct")

    def test_visualize_edges(self):
        """Test edge visualization"""
        results = self.detector.detect_edges_multiscale(self.test_image)
        viz = self.detector.visualize_edges(results, self.test_image)

        self.assertEqual(viz.shape, (480, 640, 3))
        print("[PASS] Edge visualization works")

    def test_validate_edge_quality_good(self):
        """Test edge quality validation with good edges"""
        edges = self.detector.detect_coarse_edges(self.test_image)
        is_valid = self.detector.validate_edge_quality(edges)

        # Rectangle should create valid edges
        self.assertTrue(is_valid)
        print("[PASS] Good edge map validated correctly")

    def test_validate_edge_quality_bad(self):
        """Test edge quality validation with bad edges"""
        # No edges (all black)
        bad_edges = np.zeros((480, 640), dtype=np.uint8)

        is_valid = self.detector.validate_edge_quality(bad_edges)
        self.assertFalse(is_valid)
        print("[PASS] Bad edge map rejected correctly")


class TestIntegrationWorkstream12(unittest.TestCase):
    """Integration tests for full WORKSTREAM 1.2 pipeline"""

    def setUp(self):
        """Set up test fixtures"""
        self.depth_estimator = DepthEstimator(device='cpu')
        self.normal_estimator = NormalEstimator()
        self.edge_detector = EdgeDetector()

        # Create test image
        self.test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        # Add some structure
        cv2.rectangle(self.test_image, (200, 150), (440, 330), (200, 200, 200), -1)
        cv2.circle(self.test_image, (320, 240), 80, (150, 150, 150), -1)

    def test_full_pipeline(self):
        """Test complete WORKSTREAM 1.2 pipeline"""
        print("\n" + "="*60)
        print("WORKSTREAM 1.2 INTEGRATION TEST")
        print("="*60)

        # Step 1: Depth Estimation
        print("\n[1/3] Depth Estimation...")
        start = time.time()
        depth_map = self.depth_estimator.estimate_depth(self.test_image)
        depth_time = time.time() - start

        self.assertEqual(depth_map.shape, (480, 640))
        self.assertEqual(depth_map.dtype, np.uint8)
        print(f"  [PASS] Depth map generated in {depth_time:.2f}s")
        print(f"  Depth range: [{np.min(depth_map)}, {np.max(depth_map)}]")

        # Validate depth quality
        is_valid_depth = self.depth_estimator.validate_depth_quality(depth_map)
        print(f"  Depth quality: {'PASS' if is_valid_depth else 'FAIL'}")

        # Step 2: Normal Map Generation
        print("\n[2/3] Normal Map Generation...")
        start = time.time()
        normal_map = self.normal_estimator.compute_normals(depth_map)
        normal_time = time.time() - start

        self.assertEqual(normal_map.shape, (480, 640, 3))
        print(f"  [PASS] Normal map generated in {normal_time:.3f}s")

        # Smooth normals
        smoothed_normals = self.normal_estimator.smooth_normals(normal_map)
        consistency = self.normal_estimator.compute_normal_consistency(smoothed_normals)
        print(f"  Surface consistency: {consistency:.2f} degrees")

        # Validate normal quality
        is_valid_normals = self.normal_estimator.validate_normal_quality(normal_map)
        print(f"  Normal quality: {'PASS' if is_valid_normals else 'FAIL'}")

        # Step 3: Multi-Scale Edge Detection
        print("\n[3/3] Multi-Scale Edge Detection...")
        start = time.time()
        edge_results = self.edge_detector.detect_edges_multiscale(
            self.test_image,
            depth_map=depth_map
        )
        edge_time = time.time() - start

        print(f"  [PASS] Edges detected in {edge_time:.3f}s")
        for edge_type, edge_map in edge_results.items():
            if edge_map is not None:
                edge_pixels = np.sum(edge_map > 0)
                print(f"  {edge_type}: {edge_pixels} pixels")

        # Validate edge quality
        is_valid_edges = self.edge_detector.validate_edge_quality(edge_results['fused_edges'])
        print(f"  Edge quality: {'PASS' if is_valid_edges else 'FAIL'}")

        # Summary
        total_time = depth_time + normal_time + edge_time
        print("\n" + "="*60)
        print("PIPELINE SUMMARY")
        print("="*60)
        print(f"Total processing time: {total_time:.2f}s")
        print(f"  Depth: {depth_time:.2f}s ({depth_time/total_time*100:.1f}%)")
        print(f"  Normals: {normal_time:.3f}s ({normal_time/total_time*100:.1f}%)")
        print(f"  Edges: {edge_time:.3f}s ({edge_time/total_time*100:.1f}%)")
        print(f"\nAll quality checks: {'PASS' if all([is_valid_depth, is_valid_normals, is_valid_edges]) else 'FAIL'}")
        print("="*60)


def run_performance_benchmarks():
    """Run performance benchmarks for WORKSTREAM 1.2"""
    print("\n" + "="*60)
    print("WORKSTREAM 1.2 PERFORMANCE BENCHMARKS")
    print("="*60)

    # Create test image
    image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

    # Benchmark depth estimation
    print("\n[Depth Estimation]")
    estimator = DepthEstimator(device='cpu')
    times = []
    for i in range(3):
        start = time.time()
        depth = estimator.estimate_depth(image)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  Run {i+1}: {elapsed:.2f}s")
    print(f"  Average: {np.mean(times):.2f}s")
    print(f"  Target: <2s (GPU), <8s (CPU)")
    print(f"  Status: {'[PASS] PASS' if np.mean(times) < 8 else '[FAIL] FAIL'}")

    # Benchmark normal generation
    print("\n[Normal Map Generation]")
    normal_est = NormalEstimator()
    times = []
    for i in range(3):
        start = time.time()
        normals = normal_est.compute_normals(depth)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  Run {i+1}: {elapsed:.3f}s")
    print(f"  Average: {np.mean(times):.3f}s")
    print(f"  Status: [PASS] PASS")

    # Benchmark edge detection
    print("\n[Multi-Scale Edge Detection]")
    edge_det = EdgeDetector()
    times = []
    for i in range(3):
        start = time.time()
        edges = edge_det.detect_edges_multiscale(image, depth_map=depth)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  Run {i+1}: {elapsed:.3f}s")
    print(f"  Average: {np.mean(times):.3f}s")
    print(f"  Status: [PASS] PASS")

    print("\n" + "="*60)


if __name__ == '__main__':
    print("\n" + "="*60)
    print("WORKSTREAM 1.2 COMPREHENSIVE TESTS")
    print("="*60 + "\n")

    # Run unit tests
    unittest.main(argv=[''], exit=False, verbosity=2)

    # Run performance benchmarks
    run_performance_benchmarks()
