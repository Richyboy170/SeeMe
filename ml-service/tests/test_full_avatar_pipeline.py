"""
Full Avatar Generation Pipeline Integration Test

Tests the complete pipeline from WORKSTREAM 1.1, 1.2, and 1.3:
- Face detection and segmentation (1.1)
- Depth, normal, and edge extraction (1.2)
- Avatar style application (1.3)
"""

import os
import sys
import time
import argparse
import cv2
import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from pipeline import (
    FaceDetector,
    FaceParser,
    FaceExtractor,
    DepthEstimator,
    NormalEstimator,
    EdgeDetector
)
from styles import StyleApplicator, list_styles


def test_full_avatar_pipeline(
    image_path: str,
    style_name: str = 'cartoon',
    output_dir: str = 'test_output/avatar_pipeline',
    bisenet_model_path: str = None
):
    """
    Test complete avatar generation pipeline

    Args:
        image_path: Path to input image
        style_name: Avatar style to apply
        output_dir: Directory for output images
        bisenet_model_path: Path to BiSeNet model weights

    Returns:
        bool: True if test passed
    """
    print("="*70)
    print("FULL AVATAR GENERATION PIPELINE TEST")
    print("="*70)
    print(f"Input image: {image_path}")
    print(f"Avatar style: {style_name}")
    print(f"Output directory: {output_dir}")
    print()

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Load image
    print("[0/6] Loading image...")
    image = cv2.imread(image_path)
    if image is None:
        print(f"❌ Failed to load image: {image_path}")
        return False

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    print(f"  ✓ Image loaded: {image_rgb.shape}")

    # Save original
    cv2.imwrite(os.path.join(output_dir, '0_original.jpg'), image)

    # ========================================================================
    # WORKSTREAM 1.1: Face Detection & Segmentation
    # ========================================================================
    print("\n[1/6] WORKSTREAM 1.1: Face Detection & Segmentation")

    # Initialize detectors
    start = time.time()
    face_detector = FaceDetector()
    print(f"  ✓ FaceDetector initialized")

    # Detect faces
    faces = face_detector.detect_faces(image_rgb)
    print(f"  ✓ Detected {len(faces)} face(s) in {time.time()-start:.2f}s")

    if len(faces) == 0:
        print("❌ No faces detected")
        return False

    # Use first face
    face = faces[0]
    print(f"  ✓ Face bbox: {face['bbox']}")
    print(f"  ✓ Face confidence: {face['confidence']:.3f}")
    print(f"  ✓ Landmarks: {len(face['landmarks'])} points")

    # Draw face detection
    vis_detection = image_rgb.copy()
    bbox = face['bbox']
    cv2.rectangle(vis_detection, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
    cv2.imwrite(
        os.path.join(output_dir, '1_face_detection.jpg'),
        cv2.cvtColor(vis_detection, cv2.COLOR_RGB2BGR)
    )

    # Parse face
    if bisenet_model_path and os.path.exists(bisenet_model_path):
        start = time.time()
        face_parser = FaceParser(model_path=bisenet_model_path)
        print(f"  ✓ FaceParser initialized")

        masks = face_parser.parse_face(image_rgb, face['bbox'])
        print(f"  ✓ Face parsed in {time.time()-start:.2f}s")
        print(f"  ✓ Generated {len(masks)} region masks")

        # Visualize parsing
        vis_parsing = face_parser.visualize_parsing(masks)
        cv2.imwrite(
            os.path.join(output_dir, '1_face_parsing.jpg'),
            cv2.cvtColor(vis_parsing, cv2.COLOR_RGB2BGR)
        )
    else:
        print("  ⚠ BiSeNet model not found, creating dummy masks")
        # Create dummy masks for demonstration
        h, w = image_rgb.shape[:2]
        masks = {
            'skin': np.zeros((h, w), dtype=np.uint8),
            'left_eye': np.zeros((h, w), dtype=np.uint8),
            'right_eye': np.zeros((h, w), dtype=np.uint8),
            'hair': np.zeros((h, w), dtype=np.uint8),
        }
        # Fill with dummy data
        y1, x1, y2, x2 = face['bbox']
        masks['skin'][y1:y2, x1:x2] = 255

    # ========================================================================
    # WORKSTREAM 1.2: Structure Extraction
    # ========================================================================
    print("\n[2/6] WORKSTREAM 1.2: Depth Estimation")
    start = time.time()

    depth_estimator = DepthEstimator()
    print(f"  ✓ DepthEstimator initialized")

    depth_map = depth_estimator.estimate_depth(image_rgb)
    print(f"  ✓ Depth map generated in {time.time()-start:.2f}s")
    print(f"  ✓ Depth shape: {depth_map.shape}")

    # Visualize depth
    depth_colored = depth_estimator.visualize_depth(depth_map)
    cv2.imwrite(
        os.path.join(output_dir, '2_depth_map.jpg'),
        cv2.cvtColor(depth_colored, cv2.COLOR_RGB2BGR)
    )

    print("\n[3/6] WORKSTREAM 1.2: Normal Map Generation")
    start = time.time()

    normal_estimator = NormalEstimator()
    normal_map = normal_estimator.compute_normals(depth_map)
    smoothed_normals = normal_estimator.smooth_normals(normal_map)
    print(f"  ✓ Normal map generated in {time.time()-start:.2f}s")
    print(f"  ✓ Normal shape: {smoothed_normals.shape}")

    # Visualize normals
    normal_vis = normal_estimator.visualize_normals(smoothed_normals)
    cv2.imwrite(
        os.path.join(output_dir, '2_normal_map.jpg'),
        normal_vis
    )

    print("\n[4/6] WORKSTREAM 1.2: Multi-Scale Edge Detection")
    start = time.time()

    edge_detector = EdgeDetector()
    edge_results = edge_detector.detect_edges_multiscale(
        image_rgb,
        masks=masks,
        depth_map=depth_map
    )
    print(f"  ✓ Edges detected in {time.time()-start:.2f}s")
    print(f"  ✓ Edge types: {list(edge_results.keys())}")

    # Visualize edges
    cv2.imwrite(
        os.path.join(output_dir, '2_edges_coarse.jpg'),
        edge_results['coarse_edges']
    )
    cv2.imwrite(
        os.path.join(output_dir, '2_edges_fine.jpg'),
        edge_results['fine_edges']
    )
    cv2.imwrite(
        os.path.join(output_dir, '2_edges_fused.jpg'),
        edge_results['fused_edges']
    )

    # Use fused edges for styling
    edge_map = edge_results['fused_edges']

    # ========================================================================
    # WORKSTREAM 1.3: Avatar Style Application
    # ========================================================================
    print(f"\n[5/6] WORKSTREAM 1.3: Avatar Style Application ({style_name})")
    start = time.time()

    style_applicator = StyleApplicator(style_name)
    print(f"  ✓ StyleApplicator initialized with {style_name} style")

    # Apply style to full face
    styled_face = style_applicator.apply_style_to_full_face(
        image_rgb,
        masks=masks,
        edge_map=edge_map
    )
    print(f"  ✓ Style applied in {time.time()-start:.2f}s")
    print(f"  ✓ Styled face shape: {styled_face.shape}")

    # Save styled result
    cv2.imwrite(
        os.path.join(output_dir, f'3_avatar_{style_name}.jpg'),
        cv2.cvtColor(styled_face, cv2.COLOR_RGB2BGR)
    )

    # ========================================================================
    # Generate comparison
    # ========================================================================
    print("\n[6/6] Generating comparison image")

    # Create side-by-side comparison
    comparison = np.hstack([image_rgb, styled_face])
    cv2.imwrite(
        os.path.join(output_dir, f'4_comparison_{style_name}.jpg'),
        cv2.cvtColor(comparison, cv2.COLOR_RGB2BGR)
    )

    # ========================================================================
    # Summary
    # ========================================================================
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"✅ Face detection: {len(faces)} face(s)")
    print(f"✅ Face parsing: {len(masks)} regions")
    print(f"✅ Depth estimation: {depth_map.shape}")
    print(f"✅ Normal mapping: {smoothed_normals.shape}")
    print(f"✅ Edge detection: {len(edge_results)} edge types")
    print(f"✅ Style application: {style_name} style applied")
    print(f"\nOutput files saved to: {output_dir}")
    print("="*70)

    return True


def test_all_styles(
    image_path: str,
    output_dir: str = 'test_output/avatar_pipeline',
    bisenet_model_path: str = None
):
    """
    Test all available styles

    Args:
        image_path: Path to input image
        output_dir: Directory for output images
        bisenet_model_path: Path to BiSeNet model weights
    """
    print("="*70)
    print("TESTING ALL AVATAR STYLES")
    print("="*70)

    styles = list_styles()
    print(f"Available styles: {', '.join(styles)}\n")

    results = {}
    for style in styles:
        print(f"\n{'='*70}")
        print(f"Testing {style.upper()} style")
        print(f"{'='*70}")

        style_output_dir = os.path.join(output_dir, style)
        success = test_full_avatar_pipeline(
            image_path,
            style_name=style,
            output_dir=style_output_dir,
            bisenet_model_path=bisenet_model_path
        )
        results[style] = success

    # Print final summary
    print("\n" + "="*70)
    print("FINAL SUMMARY - ALL STYLES")
    print("="*70)
    for style, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {style}")

    all_passed = all(results.values())
    if all_passed:
        print("\n✅ ALL STYLES TESTED SUCCESSFULLY!")
    else:
        print("\n❌ SOME STYLES FAILED")

    return all_passed


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Test full avatar generation pipeline')
    parser.add_argument('image_path', help='Path to input image')
    parser.add_argument('--style', default='cartoon', choices=list_styles(),
                      help='Avatar style to apply')
    parser.add_argument('--all-styles', action='store_true',
                      help='Test all available styles')
    parser.add_argument('--output-dir', default='test_output/avatar_pipeline',
                      help='Output directory for test results')
    parser.add_argument('--bisenet-model', default=None,
                      help='Path to BiSeNet model weights')

    args = parser.parse_args()

    if args.all_styles:
        success = test_all_styles(
            args.image_path,
            args.output_dir,
            args.bisenet_model
        )
    else:
        success = test_full_avatar_pipeline(
            args.image_path,
            args.style,
            args.output_dir,
            args.bisenet_model
        )

    sys.exit(0 if success else 1)
