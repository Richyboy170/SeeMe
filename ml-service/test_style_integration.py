"""
Test script for WORKSTREAM 1.3: Avatar Style System Integration
Tests the complete pipeline with avatar style application
"""
import sys
import cv2
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from pipeline import IntegratedFacePipeline
from styles import list_styles, get_style_info


def test_style_listing():
    """Test listing available styles"""
    print("\n" + "="*60)
    print("TEST 1: List Available Styles")
    print("="*60)

    styles = list_styles()
    print(f"\nAvailable styles: {styles}")
    print(f"Total styles: {len(styles)}")

    for style_name in styles:
        info = get_style_info(style_name)
        print(f"\n{style_name.upper()}:")
        print(f"  Description: {info['description']}")
        print(f"  Features: {info['features']}")
        print(f"  Rendering: {info['rendering']}")

    return len(styles) == 3  # Should have 3 styles


def test_pipeline_with_style(image_path, style_name):
    """Test full pipeline with avatar style"""
    print("\n" + "="*60)
    print(f"TEST 2: Pipeline with '{style_name}' Style")
    print("="*60)

    # Load image
    print(f"\nLoading image: {image_path}")
    image = cv2.imread(image_path)

    if image is None:
        print(f"ERROR: Could not load image from {image_path}")
        return False

    print(f"Image loaded: {image.shape}")

    # Initialize pipeline with style enabled
    print("\nInitializing pipeline...")
    pipeline = IntegratedFacePipeline(
        enable_depth=True,
        enable_normals=True,
        enable_edges=True,
        enable_style=True
    )

    # Show pipeline info
    info = pipeline.get_pipeline_info()
    print("\nPipeline Configuration:")
    print(f"  Workstreams: {', '.join(info['workstreams'])}")
    print(f"  Device: {info['device']}")
    print(f"  Available styles: {info['available_styles']}")

    # Process image with style
    print(f"\nProcessing image with style '{style_name}'...")
    result = pipeline.process_image(
        image,
        return_visualizations=True,
        style_name=style_name
    )

    # Print results
    print(f"\n{'='*60}")
    print(f"PROCESSING RESULT: {'SUCCESS' if result['success'] else 'FAILED'}")
    print(f"{'='*60}")

    if result['error']:
        print(f"\nError: {result['error']}")
        print(f"Error Type: {result['error_type']}")
        return False

    # Print timings
    print("\nProcessing Timings:")
    for stage, time_val in result['timings'].items():
        if time_val is not None:
            print(f"  {stage:25s}: {time_val:6.3f}s")

    # Check if style was applied
    if 'styled_face' in result and result['styled_face'] is not None:
        styled_info = result['styled_face']
        print(f"\nStyle Application:")
        print(f"  Style applied: {styled_info['style_name']}")
        print(f"  Output shape: {styled_info['styled_image'].shape}")

        # Save styled output
        output_dir = "test_output/styles"
        os.makedirs(output_dir, exist_ok=True)

        styled_path = f"{output_dir}/styled_{style_name}.jpg"
        cv2.imwrite(styled_path, styled_info['styled_image'])
        print(f"  Saved to: {styled_path}")

        # Also save comparison
        if 'face_extraction' in result:
            original_face = result['face_extraction']['face_image']
            comparison = create_comparison(original_face, styled_info['styled_image'])
            comparison_path = f"{output_dir}/comparison_{style_name}.jpg"
            cv2.imwrite(comparison_path, comparison)
            print(f"  Comparison saved to: {comparison_path}")

        return True
    else:
        print("\nERROR: Style was not applied!")
        return False


def create_comparison(original, styled):
    """Create side-by-side comparison image"""
    # Ensure both images have the same height
    h1, w1 = original.shape[:2]
    h2, w2 = styled.shape[:2]

    max_h = max(h1, h2)

    # Resize if needed
    if h1 != max_h:
        scale = max_h / h1
        original = cv2.resize(original, (int(w1 * scale), max_h))
    if h2 != max_h:
        scale = max_h / h2
        styled = cv2.resize(styled, (int(w2 * scale), max_h))

    # Add labels
    import numpy as np
    label_h = 30
    label_original = np.zeros((label_h, original.shape[1], 3), dtype=np.uint8)
    label_styled = np.zeros((label_h, styled.shape[1], 3), dtype=np.uint8)

    cv2.putText(label_original, 'Original', (10, 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    cv2.putText(label_styled, 'Styled', (10, 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # Stack labels and images
    original_with_label = np.vstack([label_original, original])
    styled_with_label = np.vstack([label_styled, styled])

    # Concatenate side by side
    comparison = np.hstack([original_with_label, styled_with_label])

    return comparison


def test_all_styles(image_path):
    """Test all available styles"""
    print("\n" + "="*60)
    print("TEST 3: All Styles")
    print("="*60)

    styles = list_styles()
    results = {}

    for style_name in styles:
        success = test_pipeline_with_style(image_path, style_name)
        results[style_name] = success

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for style_name, success in results.items():
        status = "PASS" if success else "FAIL"
        print(f"  {style_name:15s}: {status}")

    passed = sum(results.values())
    total = len(results)
    print(f"\nTotal: {passed}/{total} styles passed")

    return passed == total


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("WORKSTREAM 1.3: AVATAR STYLE SYSTEM - INTEGRATION TEST")
    print("="*60)

    # Test 1: List styles
    test1_pass = test_style_listing()

    # Test 2 & 3: Test with actual image
    test_image = "testPic/image.jpg"
    if not os.path.exists(test_image):
        test_image = "test_output/integrated/face.jpg"

    if not os.path.exists(test_image):
        print(f"\nERROR: No test image found at {test_image}")
        print("Please run test_integrated_pipeline.py first to generate test images")
        return False

    # Test all styles
    test2_pass = test_all_styles(test_image)

    # Final summary
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"Test 1 (List Styles):     {'PASS' if test1_pass else 'FAIL'}")
    print(f"Test 2 (All Styles):      {'PASS' if test2_pass else 'FAIL'}")

    all_pass = test1_pass and test2_pass
    print(f"\n{'='*60}")
    if all_pass:
        print("ALL TESTS PASSED - WORKSTREAM 1.3 COMPLETE")
    else:
        print("SOME TESTS FAILED")
    print(f"{'='*60}\n")

    return all_pass


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
