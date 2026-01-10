"""
Test script for ML Service API endpoints
Tests the integrated pipeline through REST API
"""

import requests
import json
from pathlib import Path
import sys


def test_health_check(base_url: str):
    """Test service health endpoint"""
    print("\n=== Testing Health Check ===")
    response = requests.get(f"{base_url}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_pipeline_info(base_url: str):
    """Test pipeline info endpoint"""
    print("\n=== Testing Pipeline Info ===")
    response = requests.get(f"{base_url}/api/face/pipeline/info")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_face_validation(base_url: str, image_path: str):
    """Test face validation endpoint"""
    print(f"\n=== Testing Face Validation ===")
    print(f"Image: {image_path}")

    with open(image_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(f"{base_url}/api/face/validate", files=files)

    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_face_processing(base_url: str, image_path: str):
    """Test full face processing pipeline"""
    print(f"\n=== Testing Face Processing ===")
    print(f"Image: {image_path}")

    with open(image_path, 'rb') as f:
        files = {'file': f}
        data = {
            'user_id': 'test_user_123',
            'avatar_id': 'test_avatar_456',
            'quality': 'standard',
            'enable_depth': True,
            'enable_normals': True,
            'enable_edges': True,
            'return_visualizations': False,
            'return_images': False
        }
        response = requests.post(
            f"{base_url}/api/face/process",
            files=files,
            data=data,
            timeout=60
        )

    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"\nSuccess: {result['success']}")

        if result['success']:
            print(f"Face Detected: {result.get('face_detected')}")
            print(f"Face Confidence: {result.get('face_confidence')}")
            print(f"Segmentation Quality Valid: {result.get('segmentation_quality_valid')}")
            print(f"Depth Quality Valid: {result.get('depth_quality_valid')}")
            print(f"Normal Quality Valid: {result.get('normal_quality_valid')}")

            if 'timings' in result:
                timings = result['timings']
                print(f"\nTimings:")
                for key, value in timings.items():
                    if value is not None:
                        print(f"  {key}: {value:.3f}s")

            if 'depth_features' in result and result['depth_features']:
                print(f"\nDepth Features:")
                for key, value in result['depth_features'].items():
                    print(f"  {key}: {value:.2f}")

            if 'edge_statistics' in result and result['edge_statistics']:
                print(f"\nEdge Statistics:")
                for key, value in result['edge_statistics'].items():
                    print(f"  {key}: {value}")
        else:
            print(f"Error: {result.get('error')}")
            print(f"Error Type: {result.get('error_type')}")
    else:
        print(f"Error: {response.text}")

    return response.status_code == 200


def main():
    """Run all tests"""
    base_url = "http://localhost:8000"

    if len(sys.argv) > 1:
        base_url = sys.argv[1]

    print(f"Testing ML Service at: {base_url}")

    # Test 1: Health Check
    health_ok = test_health_check(base_url)

    # Test 2: Pipeline Info
    pipeline_ok = test_pipeline_info(base_url)

    # Test 3: Face Validation (if test image exists)
    test_image = Path("testPic/image.jpg")
    if not test_image.exists():
        test_image = Path("test_output/extracted_face_1.jpg")

    if test_image.exists():
        validation_ok = test_face_validation(base_url, str(test_image))
        processing_ok = test_face_processing(base_url, str(test_image))
    else:
        print(f"\nNo test image found at {test_image}")
        validation_ok = False
        processing_ok = False

    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    print(f"Health Check:       {'PASS' if health_ok else 'FAIL'}")
    print(f"Pipeline Info:      {'PASS' if pipeline_ok else 'FAIL'}")
    print(f"Face Validation:    {'PASS' if validation_ok else 'FAIL'}")
    print(f"Face Processing:    {'PASS' if processing_ok else 'FAIL'}")

    total_tests = 4
    passed_tests = sum([health_ok, pipeline_ok, validation_ok, processing_ok])
    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")

    return passed_tests == total_tests


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
