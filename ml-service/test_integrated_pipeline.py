"""
Test script for IntegratedFacePipeline
"""
import sys
import cv2
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from pipeline import IntegratedFacePipeline


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_integrated_pipeline.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    # Load image
    print(f"Loading image: {image_path}")
    image = cv2.imread(image_path)

    if image is None:
        print(f"Error: Could not load image from {image_path}")
        sys.exit(1)

    print(f"Image loaded: {image.shape}")

    # Initialize pipeline
    print("\n" + "="*60)
    print("Initializing IntegratedFacePipeline...")
    print("="*60)

    pipeline = IntegratedFacePipeline(
        enable_depth=True,
        enable_normals=True,
        enable_edges=True
    )

    # Show pipeline info
    info = pipeline.get_pipeline_info()
    print("\nPipeline Configuration:")
    print(f"  Workstreams: {', '.join(info['workstreams'])}")
    print(f"  Device: {info['device']}")
    print(f"\nActive Components:")
    for component, status in info['components'].items():
        print(f"  {component}: {status}")

    # Process image
    print("\n" + "="*60)
    print("Processing Image...")
    print("="*60)

    result = pipeline.process_image(image, return_visualizations=True)

    # Print results
    print(f"\n{'='*60}")
    print(f"PROCESSING RESULT: {'SUCCESS' if result['success'] else 'FAILED'}")
    print(f"{'='*60}")

    if result['error']:
        print(f"\nError: {result['error']}")
        print(f"Error Type: {result['error_type']}")
        sys.exit(1)

    # Print timings
    print("\nProcessing Timings:")
    for stage, time_val in result['timings'].items():
        if time_val is not None:
            print(f"  {stage:25s}: {time_val:6.3f}s")

    # Print face detection results
    if 'face_detection' in result:
        print("\nFace Detection:")
        print(f"  Confidence: {result['face_detection']['confidence']:.3f}")
        bbox = result['face_detection']['bbox']
        print(f"  BBox: ({bbox['x']}, {bbox['y']}, {bbox['width']}, {bbox['height']})")

    # Print segmentation results
    if 'segmentation' in result:
        seg = result['segmentation']
        print(f"\nSegmentation:")
        print(f"  Quality Valid: {seg.get('quality_valid', False)}")
        print(f"  Detected Regions: {len(seg['masks'])} regions")

    # Print depth results
    if 'depth' in result:
        depth_data = result['depth']
        print(f"\nDepth Estimation:")
        print(f"  Quality Valid: {depth_data['quality_valid']}")
        print(f"  Features:")
        for key, value in depth_data['features'].items():
            print(f"    {key}: {value:.2f}")

    # Print normal results
    if 'normals' in result:
        normal_data = result['normals']
        print(f"\nNormal Map Generation:")
        print(f"  Quality Valid: {normal_data['quality_valid']}")
        print(f"  Features:")
        for key, value in normal_data['features'].items():
            print(f"    {key}: {value:.4f}")

    # Print edge results
    if 'edges' in result:
        edges = result['edges']
        print(f"\nEdge Detection:")
        print(f"  Coarse edges: {sum(sum(edges['coarse_edges'] > 0))} pixels")
        print(f"  Fine edges: {sum(sum(edges['fine_edges'] > 0))} pixels")
        print(f"  Semantic edges: {sum(sum(edges['semantic_edges'] > 0))} pixels")
        print(f"  Depth edges: {sum(sum(edges['depth_edges'] > 0))} pixels")
        print(f"  Fused edges: {sum(sum(edges['fused_edges'] > 0))} pixels")

    # Save outputs
    output_dir = "test_output/integrated"
    os.makedirs(output_dir, exist_ok=True)

    print(f"\nSaving outputs to {output_dir}/")

    if 'face_extraction' in result:
        cv2.imwrite(f"{output_dir}/face.jpg", result['face_extraction']['face_image'])
        cv2.imwrite(f"{output_dir}/mask.jpg", result['face_extraction']['mask'])
        print(f"  [SAVED] face.jpg, mask.jpg")

    if 'depth' in result:
        cv2.imwrite(f"{output_dir}/depth.jpg", result['depth']['depth_map'])
        if 'visualization' in result['depth']:
            cv2.imwrite(f"{output_dir}/depth_colored.jpg", result['depth']['visualization'])
        print(f"  [SAVED] depth.jpg, depth_colored.jpg")

    if 'normals' in result:
        cv2.imwrite(f"{output_dir}/normals.jpg", result['normals']['smoothed_normals'])
        print(f"  [SAVED] normals.jpg")

    if 'edges' in result:
        cv2.imwrite(f"{output_dir}/edges_coarse.jpg", result['edges']['coarse_edges'])
        cv2.imwrite(f"{output_dir}/edges_fine.jpg", result['edges']['fine_edges'])
        cv2.imwrite(f"{output_dir}/edges_fused.jpg", result['edges']['fused_edges'])
        print(f"  [SAVED] edges_coarse.jpg, edges_fine.jpg, edges_fused.jpg")

    print(f"\n{'='*60}")
    print("INTEGRATION TEST: PASSED")
    print(f"{'='*60}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
