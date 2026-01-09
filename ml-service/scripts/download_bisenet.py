"""
Download BiSeNet Pretrained Model
Downloads pretrained BiSeNet model for face parsing
"""

import os
import sys
import requests
from pathlib import Path


# BiSeNet pretrained model URLs
# Note: These are example URLs - actual URLs will need to be verified
BISENET_URLS = {
    'face_parsing_79999_iter.pth': {
        'url': 'https://drive.google.com/uc?id=154JgKpzCPW82qINcVieuPH3fZ2e0P812',
        'description': 'BiSeNet pretrained on CelebAMask-HQ (79999 iterations)',
        'size_mb': 50,
    }
}


def download_file(url: str, output_path: str, description: str = ""):
    """Download file with progress bar"""
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

        print("\n✓ Download completed")
        return True

    except Exception as e:
        print(f"\n✗ Download failed: {e}")
        return False


def download_bisenet_model(output_dir: str = None):
    """
    Download BiSeNet pretrained model

    Args:
        output_dir: Directory to save model (default: ml-service/models/pretrained)
    """
    if output_dir is None:
        # Get default model directory
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        output_dir = project_root / 'models' / 'pretrained'

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("BiSeNet Model Downloader")
    print("=" * 60)
    print(f"Output directory: {output_dir}")

    # Check if model already exists
    model_name = 'face_parsing_79999_iter.pth'
    model_path = output_dir / model_name

    if model_path.exists():
        print(f"\n✓ Model already exists: {model_path}")
        response = input("Do you want to re-download? (y/N): ")
        if response.lower() != 'y':
            print("Skipping download")
            return str(model_path)

    # Download model
    model_info = BISENET_URLS[model_name]

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
        print("✓ BiSeNet model downloaded successfully!")
        print(f"Model path: {model_path}")
        print("=" * 60)

        # Print usage instructions
        print("\nUsage in code:")
        print("```python")
        print("from pipeline import FaceParser")
        print(f"parser = FaceParser(model_path='{model_path}')")
        print("```")

        return str(model_path)
    else:
        print("\n" + "=" * 60)
        print("✗ Download failed")
        print("=" * 60)
        print("\nAlternative download options:")
        print("1. Manual download from Google Drive:")
        print("   https://drive.google.com/file/d/154JgKpzCPW82qINcVieuPH3fZ2e0P812")
        print(f"   Save to: {model_path}")
        print("\n2. Use gdown command:")
        print("   pip install gdown")
        print(f"   gdown 154JgKpzCPW82qINcVieuPH3fZ2e0P812 -O {model_path}")

        return None


def verify_model(model_path: str):
    """Verify downloaded model can be loaded"""
    print(f"\nVerifying model: {model_path}")

    try:
        import torch
        state_dict = torch.load(model_path, map_location='cpu')
        print(f"✓ Model loaded successfully")
        print(f"  Keys: {len(state_dict)} parameters")
        return True
    except Exception as e:
        print(f"✗ Model verification failed: {e}")
        return False


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Download BiSeNet pretrained model")
    parser.add_argument(
        "--output-dir",
        help="Output directory for model",
        default=None
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify model after download"
    )

    args = parser.parse_args()

    model_path = download_bisenet_model(args.output_dir)

    if model_path and args.verify:
        verify_model(model_path)

    sys.exit(0 if model_path else 1)


if __name__ == "__main__":
    main()
