"""
Download MediaPipe models
Downloads required MediaPipe models for face detection and landmarks
"""

import os
import sys
import requests
from pathlib import Path


MEDIAPIPE_MODELS = {
    'face_landmarker.task': {
        'url': 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
        'description': 'MediaPipe Face Landmarker (478 landmarks)',
        'size_mb': 6,
    }
}


def download_file(url: str, output_path: str, description: str = ""):
    """Download file with progress"""
    print(f"\nDownloading: {description}")
    print(f"From: {url}")
    print(f"To: {output_path}")

    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        block_size = 8192
        downloaded = 0

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=block_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        print(f"\rProgress: {progress:.1f}% ({downloaded / 1024 / 1024:.1f} MB)", end='')

        print("\n[OK] Download completed")
        return True

    except Exception as e:
        print(f"\n[FAIL] Download failed: {e}")
        return False


def download_mediapipe_models(output_dir: str = None):
    """
    Download MediaPipe models

    Args:
        output_dir: Directory to save models (default: ml-service/models)
    """
    if output_dir is None:
        # Get default model directory
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        output_dir = project_root / 'models'

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("MediaPipe Models Downloader")
    print("=" * 60)
    print(f"Output directory: {output_dir}")

    # Download face landmarker model
    model_name = 'face_landmarker.task'
    model_path = output_dir / model_name
    model_info = MEDIAPIPE_MODELS[model_name]

    # Check if model already exists
    if model_path.exists():
        print(f"\n[OK] Model already exists: {model_path}")
        response = input("Do you want to re-download? (y/N): ")
        if response.lower() != 'y':
            print("Skipping download")
            return str(model_path)

    print(f"\nModel: {model_name}")
    print(f"Description: {model_info['description']}")
    print(f"Size: ~{model_info['size_mb']} MB")

    success = download_file(
        model_info['url'],
        str(model_path),
        model_info['description']
    )

    if success:
        print("\n" + "=" * 60)
        print("[SUCCESS] MediaPipe models downloaded successfully!")
        print(f"Model path: {model_path}")
        print("=" * 60)

        # Print usage instructions
        print("\nUsage in code:")
        print("```python")
        print("from pipeline import FaceDetector")
        print(f"detector = FaceDetector(model_path='{model_path}')")
        print("# Or let it auto-detect:")
        print("detector = FaceDetector()  # Will find model in models/ directory")
        print("```")

        return str(model_path)
    else:
        print("\n" + "=" * 60)
        print("[FAIL] Download failed")
        print("=" * 60)
        print("\nAlternative: Download manually")
        print(f"URL: {model_info['url']}")
        print(f"Save to: {model_path}")

        return None


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Download MediaPipe models")
    parser.add_argument(
        "--output-dir",
        help="Output directory for models",
        default=None
    )

    args = parser.parse_args()

    model_path = download_mediapipe_models(args.output_dir)

    sys.exit(0 if model_path else 1)


if __name__ == "__main__":
    main()
