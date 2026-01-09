"""
End-to-End Pipeline Test
Tests the complete face detection and segmentation pipeline with real images
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import cv2
import numpy as np
import time
from pipeline import (
    FaceDetector,
    FaceParser,
    FaceExtractor,
    NoFaceDetectedError,
    TooManyFacesError,
    FaceTooSmallError,
    FaceAngleTooExtremeError,
)


def test_pipeline_with_image(image_path: str, bisenet_model_path: str = None):
    """
    Test complete pipeline with a real image

    Args:
        image_path: Path to test image
        bisenet_model_path: Path to BiSeNet pretrained weights (optional)
    """
    print("\n" + "=" * 60)
    print(f"Testing Pipeline with: {os.path.basename(image_path)}")
    print("=" * 60)

    # Load image
    if not os.path.exists(image_path):
        print(f"[FAIL] Image not found: {image_path}")
        return False

    image = cv2.imread(image_path)
    if image is None:
        print(f"[FAIL] Failed to load image: {image_path}")
        return False

    print(f"[OK] Loaded image: {image.shape[1]}x{image.shape[0]}")

    # Initialize pipeline components
    print("\nInitializing pipeline components...")

    try:
        detector = FaceDetector()
        print("[OK] FaceDetector initialized")

        parser = FaceParser(model_path=bisenet_model_path, device='cpu')
        print("[OK] FaceParser initialized")

        extractor = FaceExtractor(feather_radius=5)
        print("[OK] FaceExtractor initialized")

    except Exception as e:
        print(f"[FAIL] Initialization failed: {e}")
        return False

    # Step 1: Detect faces
    print("\n--- Step 1: Face Detection ---")
    try:
        start_time = time.time()
        faces = detector.detect_faces(image)
        detection_time = (time.time() - start_time) * 1000

        print(f"[OK] Detected {len(faces)} face(s) in {detection_time:.1f}ms")

        for i, face in enumerate(faces):
            print(f"\n  Face {i+1}:")
            print(f"    BBox: {face['bbox']}")
            print(f"    Confidence: {face['confidence']:.3f}")
            print(f"    Landmarks: {len(face['landmarks'])} points")

            # Validate face (but continue processing even if validation fails)
            validation_passed = False
            try:
                face = detector.validate_face(face, image.shape)
                print(f"    Angles: yaw={face['angles']['yaw']:.1f}deg "
                      f"pitch={face['angles']['pitch']:.1f}deg "
                      f"roll={face['angles']['roll']:.1f}deg")
                print(f"    [OK] Face validation passed")
                validation_passed = True
            except (FaceTooSmallError, FaceAngleTooExtremeError) as e:
                print(f"    [WARNING] Face validation failed: {e}")
                print(f"    [WARNING] Continuing with processing anyway (for testing)")

    except NoFaceDetectedError as e:
        print(f"[FAIL] {e}")
        return False
    except TooManyFacesError as e:
        print(f"[FAIL] {e}")
        return False
    except Exception as e:
        print(f"[FAIL] Face detection failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 2: Face parsing
    print("\n--- Step 2: Face Parsing ---")
    try:
        for i, face in enumerate(faces):
            print(f"\n  Parsing Face {i+1}...")

            start_time = time.time()
            masks = parser.parse_face(image, face['bbox'])
            parsing_time = (time.time() - start_time) * 1000

            print(f"  [OK] Parsed in {parsing_time:.1f}ms")

            # Show detected regions
            detected_regions = [name for name, mask in masks.items()
                                if name != '_crop_coords' and np.sum(mask > 0) > 0]
            print(f"  Detected regions ({len(detected_regions)}):")
            for region in detected_regions[:10]:  # Show first 10
                pixel_count = np.sum(masks[region] > 0)
                print(f"    - {region}: {pixel_count} pixels")
            if len(detected_regions) > 10:
                print(f"    ... and {len(detected_regions) - 10} more")

            # Validate segmentation quality
            is_valid = extractor.validate_segmentation_quality(masks)
            if is_valid:
                print(f"  [OK] Segmentation quality: GOOD")
            else:
                print(f"  [FAIL] Segmentation quality: POOR")

            # Save visualization
            output_dir = "test_output"
            os.makedirs(output_dir, exist_ok=True)

            viz = parser.visualize_parsing(image[
                masks['_crop_coords'][1]:masks['_crop_coords'][3],
                masks['_crop_coords'][0]:masks['_crop_coords'][2]
            ], masks)
            viz_path = os.path.join(output_dir, f"parsing_face_{i+1}.jpg")
            cv2.imwrite(viz_path, viz)
            print(f"  Saved visualization: {viz_path}")

    except Exception as e:
        print(f"[FAIL] Face parsing failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Step 3: Face extraction
    print("\n--- Step 3: Face Extraction ---")
    try:
        for i, face in enumerate(faces):
            print(f"\n  Extracting Face {i+1}...")

            # First parse the face
            masks = parser.parse_face(image, face['bbox'])

            start_time = time.time()
            extracted = extractor.extract_face_region(image, masks)
            extraction_time = (time.time() - start_time) * 1000

            print(f"  [OK] Extracted in {extraction_time:.1f}ms")
            print(f"    Face image: {extracted['face_image'].shape}")
            print(f"    Mask: {extracted['mask'].shape}")
            print(f"    Feathered mask: {extracted['feathered_mask'].shape}")
            print(f"    BBox: {extracted['bbox']}")

            # Save extracted face
            face_path = os.path.join(output_dir, f"extracted_face_{i+1}.jpg")
            cv2.imwrite(face_path, extracted['face_image'])
            print(f"  Saved face: {face_path}")

            # Save masks
            mask_path = os.path.join(output_dir, f"mask_{i+1}.jpg")
            cv2.imwrite(mask_path, extracted['mask'])

            feathered_path = os.path.join(output_dir, f"feathered_mask_{i+1}.jpg")
            cv2.imwrite(feathered_path, extracted['feathered_mask'])
            print(f"  Saved masks: mask_{i+1}.jpg, feathered_mask_{i+1}.jpg")

    except Exception as e:
        print(f"[FAIL] Face extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "=" * 60)
    print("[OK] PIPELINE TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)

    return True


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Test face detection pipeline with image")
    parser.add_argument("image", help="Path to test image")
    parser.add_argument("--bisenet-model", help="Path to BiSeNet pretrained weights", default=None)

    args = parser.parse_args()

    success = test_pipeline_with_image(args.image, args.bisenet_model)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
