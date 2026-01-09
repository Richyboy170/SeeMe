"""
Test Face Detection Pipeline
Tests for WORKSTREAM 1.1: Face Detection & Segmentation
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import cv2
import numpy as np
from pipeline import (
    FaceDetector,
    FaceParser,
    FaceExtractor,
    NoFaceDetectedError,
    TooManyFacesError,
    FaceTooSmallError,
    FaceAngleTooExtremeError,
)


def create_test_image(width=640, height=480):
    """Create a simple test image"""
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    return img


def test_face_detector_initialization():
    """Test 1.1.1: FaceDetector initialization"""
    print("\n=== Test 1.1.1: FaceDetector Initialization ===")
    try:
        detector = FaceDetector()
        print("[OK] FaceDetector initialized successfully")
        return True
    except Exception as e:
        print(f"[FAIL] FaceDetector initialization failed: {e}")
        return False


def test_face_detection_no_face():
    """Test face detection with no face in image"""
    print("\n=== Test: No Face Detection ===")
    try:
        detector = FaceDetector()
        test_img = create_test_image()

        try:
            faces = detector.detect_faces(test_img)
            print("[FAIL] Should have raised NoFaceDetectedError")
            return False
        except NoFaceDetectedError as e:
            print(f"[OK] Correctly raised NoFaceDetectedError: {e}")
            return True
    except Exception as e:
        print(f"[FAIL] Unexpected error: {e}")
        return False


def test_face_angle_estimation():
    """Test face angle estimation (requires real face image)"""
    print("\n=== Test: Face Angle Estimation ===")
    try:
        detector = FaceDetector()

        # Create dummy landmarks for testing (478 landmarks in new API)
        dummy_landmarks = [(i, i, 0) for i in range(478)]
        angles = detector.estimate_face_angle(dummy_landmarks)

        assert 'yaw' in angles
        assert 'pitch' in angles
        assert 'roll' in angles

        print(f"[OK] Angle estimation working: {angles}")
        return True
    except Exception as e:
        print(f"[FAIL] Angle estimation failed: {e}")
        return False


def test_face_angle_validation():
    """Test face angle validation"""
    print("\n=== Test: Face Angle Validation ===")
    try:
        detector = FaceDetector()

        # Test acceptable angles
        good_angles = {'yaw': 10, 'pitch': 10, 'roll': 10}
        try:
            result = detector.is_acceptable_angle(good_angles)
            print(f"[OK] Acceptable angles passed: {good_angles}")
        except FaceAngleTooExtremeError:
            print(f"[FAIL] Good angles rejected: {good_angles}")
            return False

        # Test extreme yaw
        bad_yaw = {'yaw': 50, 'pitch': 0, 'roll': 0}
        try:
            detector.is_acceptable_angle(bad_yaw)
            print(f"[FAIL] Extreme yaw not rejected: {bad_yaw}")
            return False
        except FaceAngleTooExtremeError as e:
            print(f"[OK] Extreme yaw correctly rejected: {e}")

        # Test extreme pitch
        bad_pitch = {'yaw': 0, 'pitch': 35, 'roll': 0}
        try:
            detector.is_acceptable_angle(bad_pitch)
            print(f"[FAIL] Extreme pitch not rejected: {bad_pitch}")
            return False
        except FaceAngleTooExtremeError as e:
            print(f"[OK] Extreme pitch correctly rejected: {e}")

        # Test extreme roll
        bad_roll = {'yaw': 0, 'pitch': 0, 'roll': 35}
        try:
            detector.is_acceptable_angle(bad_roll)
            print(f"[FAIL] Extreme roll not rejected: {bad_roll}")
            return False
        except FaceAngleTooExtremeError as e:
            print(f"[OK] Extreme roll correctly rejected: {e}")

        return True
    except Exception as e:
        print(f"[FAIL] Unexpected error: {e}")
        return False


def test_face_size_validation():
    """Test face size validation"""
    print("\n=== Test: Face Size Validation ===")
    try:
        detector = FaceDetector()

        # Test acceptable size
        good_bbox = {'x': 100, 'y': 100, 'width': 200, 'height': 200}
        try:
            result = detector.validate_face_size(good_bbox, (480, 640, 3))
            print(f"[OK] Acceptable size passed: {good_bbox['width']}px")
        except FaceTooSmallError:
            print(f"[FAIL] Good size rejected")
            return False

        # Test too small
        small_bbox = {'x': 100, 'y': 100, 'width': 50, 'height': 50}
        try:
            detector.validate_face_size(small_bbox, (480, 640, 3))
            print(f"[FAIL] Small face not rejected: {small_bbox['width']}px")
            return False
        except FaceTooSmallError as e:
            print(f"[OK] Small face correctly rejected: {e}")

        return True
    except Exception as e:
        print(f"[FAIL] Unexpected error: {e}")
        return False


def test_face_parser_initialization():
    """Test 1.1.2: FaceParser initialization"""
    print("\n=== Test 1.1.2: FaceParser Initialization ===")
    try:
        # Initialize without pretrained weights (for testing)
        parser = FaceParser(model_path=None, device='cpu')
        print("[OK] FaceParser initialized successfully (no pretrained weights)")
        return True
    except Exception as e:
        print(f"[FAIL] FaceParser initialization failed: {e}")
        return False


def test_face_extractor_initialization():
    """Test 1.1.3: FaceExtractor initialization"""
    print("\n=== Test 1.1.3: FaceExtractor Initialization ===")
    try:
        extractor = FaceExtractor(feather_radius=5)
        print("[OK] FaceExtractor initialized successfully")
        return True
    except Exception as e:
        print(f"[FAIL] FaceExtractor initialization failed: {e}")
        return False


def test_feathered_mask_creation():
    """Test feathered mask creation"""
    print("\n=== Test: Feathered Mask Creation ===")
    try:
        extractor = FaceExtractor(feather_radius=5)

        # Create a simple binary mask
        mask = np.zeros((100, 100), dtype=np.uint8)
        mask[25:75, 25:75] = 255

        feathered = extractor.create_feathered_mask(mask)

        assert feathered.shape == mask.shape
        assert feathered.dtype == np.uint8
        assert np.max(feathered) <= 255
        assert np.min(feathered) >= 0

        print("[OK] Feathered mask created successfully")
        print(f"  Original mask range: [{np.min(mask)}, {np.max(mask)}]")
        print(f"  Feathered mask range: [{np.min(feathered)}, {np.max(feathered)}]")

        return True
    except Exception as e:
        print(f"[FAIL] Feathered mask creation failed: {e}")
        return False


def test_segmentation_quality_validation():
    """Test segmentation quality validation"""
    print("\n=== Test: Segmentation Quality Validation ===")
    try:
        extractor = FaceExtractor()

        # Create mock masks with all required regions
        good_masks = {
            'skin': np.ones((100, 100), dtype=np.uint8) * 255,
            'left_eye': np.ones((20, 20), dtype=np.uint8) * 255,
            'right_eye': np.ones((20, 20), dtype=np.uint8) * 255,
            'nose': np.ones((20, 20), dtype=np.uint8) * 255,
            'mouth_interior': np.ones((20, 20), dtype=np.uint8) * 255,
            '_crop_coords': (0, 0, 100, 100)
        }

        result = extractor.validate_segmentation_quality(good_masks)
        if result:
            print("[OK] Good segmentation passed validation")
        else:
            print("[FAIL] Good segmentation failed validation")
            return False

        # Test missing region
        bad_masks = {
            'skin': np.ones((100, 100), dtype=np.uint8) * 255,
            '_crop_coords': (0, 0, 100, 100)
        }

        result = extractor.validate_segmentation_quality(bad_masks)
        if not result:
            print("[OK] Bad segmentation correctly rejected")
        else:
            print("[FAIL] Bad segmentation incorrectly passed")
            return False

        return True
    except Exception as e:
        print(f"[FAIL] Unexpected error: {e}")
        return False


def test_combined_face_mask():
    """Test combined face mask creation"""
    print("\n=== Test: Combined Face Mask ===")
    try:
        extractor = FaceExtractor()

        # Create mock masks
        masks = {
            'skin': np.ones((100, 100), dtype=np.uint8) * 128,
            'left_eye': np.ones((100, 100), dtype=np.uint8) * 64,
            'right_eye': np.ones((100, 100), dtype=np.uint8) * 64,
            'nose': np.ones((100, 100), dtype=np.uint8) * 192,
            'background': np.zeros((100, 100), dtype=np.uint8),
            '_crop_coords': (0, 0, 100, 100)
        }

        combined = extractor.get_combined_face_mask(masks)

        assert combined.shape == (100, 100)
        assert combined.dtype == np.uint8
        # Combined should be maximum of all regions
        assert np.max(combined) == 192  # max from nose

        print("[OK] Combined face mask created successfully")
        print(f"  Combined mask range: [{np.min(combined)}, {np.max(combined)}]")

        return True
    except Exception as e:
        print(f"[FAIL] Combined mask creation failed: {e}")
        return False


def test_bbox_overlap_detection():
    """Test bounding box overlap detection"""
    print("\n=== Test: BBox Overlap Detection ===")
    try:
        extractor = FaceExtractor()

        # Overlapping boxes
        bbox1 = {'x': 10, 'y': 10, 'width': 50, 'height': 50}
        bbox2 = {'x': 30, 'y': 30, 'width': 50, 'height': 50}

        overlap = extractor._bboxes_overlap(bbox1, bbox2)
        if overlap:
            print("[OK] Overlapping boxes detected correctly")
        else:
            print("[FAIL] Overlapping boxes not detected")
            return False

        # Non-overlapping boxes
        bbox3 = {'x': 100, 'y': 100, 'width': 50, 'height': 50}

        overlap = extractor._bboxes_overlap(bbox1, bbox3)
        if not overlap:
            print("[OK] Non-overlapping boxes detected correctly")
        else:
            print("[FAIL] Non-overlapping boxes incorrectly marked as overlapping")
            return False

        # Test IoU calculation
        iou = extractor.get_iou(bbox1, bbox2)
        print(f"[OK] IoU calculation: {iou:.3f}")

        return True
    except Exception as e:
        print(f"[FAIL] BBox overlap test failed: {e}")
        return False


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("WORKSTREAM 1.1: FACE DETECTION & SEGMENTATION - TEST SUITE")
    print("=" * 60)

    tests = [
        ("Task 1.1.1: FaceDetector Initialization", test_face_detector_initialization),
        ("Task 1.1.1: No Face Detection", test_face_detection_no_face),
        ("Task 1.1.1: Face Angle Estimation", test_face_angle_estimation),
        ("Task 1.1.1: Face Angle Validation", test_face_angle_validation),
        ("Task 1.1.1: Face Size Validation", test_face_size_validation),
        ("Task 1.1.2: FaceParser Initialization", test_face_parser_initialization),
        ("Task 1.1.3: FaceExtractor Initialization", test_face_extractor_initialization),
        ("Task 1.1.3: Feathered Mask Creation", test_feathered_mask_creation),
        ("Task 1.1.3: Segmentation Quality Validation", test_segmentation_quality_validation),
        ("Task 1.1.3: Combined Face Mask", test_combined_face_mask),
        ("Task 1.1.3: BBox Overlap Detection", test_bbox_overlap_detection),
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n[FAIL] Test '{name}' crashed: {e}")
            results.append((name, False))

    # Print summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "[OK] PASS" if result else "[FAIL] FAIL"
        print(f"{status}: {name}")

    print("=" * 60)
    print(f"Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 60)

    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
