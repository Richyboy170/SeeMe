"""
Download pre-trained models for SeeMe ML Service
Downloads BiSeNet (face parsing) and MiDaS (depth estimation) models
"""
import os
import sys
from pathlib import Path
import urllib.request
from typing import Dict

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

MODELS: Dict[str, Dict[str, str]] = {
    "bisenet": {
        "url": "https://github.com/zllrunning/face-parsing.PyTorch/releases/download/v0.1/79999_iter.pth",
        "path": str(MODELS_DIR / "bisenet_face_parsing.pth"),
        "description": "BiSeNet Face Parsing Model"
    },
    "midas": {
        "url": "https://github.com/isl-org/MiDaS/releases/download/v3_1/dpt_beit_large_512.pt",
        "path": str(MODELS_DIR / "midas_v3_1.pt"),
        "description": "MiDaS Depth Estimation Model (DPT-BEiT-Large-512)"
    }
}


def download_progress_hook(block_num, block_size, total_size):
    """Display download progress"""
    downloaded = block_num * block_size
    percent = min(downloaded / total_size * 100, 100) if total_size > 0 else 0
    mb_downloaded = downloaded / (1024 * 1024)
    mb_total = total_size / (1024 * 1024)

    # Clear line and show progress
    sys.stdout.write(f"\r  Progress: {percent:.1f}% ({mb_downloaded:.1f}/{mb_total:.1f} MB)")
    sys.stdout.flush()


def download_model(name: str, info: Dict[str, str]) -> bool:
    """Download a single model file"""
    model_path = Path(info["path"])

    if model_path.exists():
        file_size = model_path.stat().st_size / (1024 * 1024)
        print(f"✓ {info['description']} already exists ({file_size:.1f} MB)")
        return True

    print(f"\n📥 Downloading {info['description']}...")
    print(f"   URL: {info['url']}")
    print(f"   Destination: {model_path}")

    try:
        urllib.request.urlretrieve(
            info["url"],
            info["path"],
            reporthook=download_progress_hook
        )
        print()  # New line after progress
        file_size = model_path.stat().st_size / (1024 * 1024)
        print(f"✓ Downloaded successfully ({file_size:.1f} MB)")
        return True

    except Exception as e:
        print(f"\n✗ Error downloading {name}: {e}")
        # Clean up partial download
        if model_path.exists():
            model_path.unlink()
        return False


def verify_models() -> bool:
    """Verify all models are present and valid"""
    print("\n" + "=" * 60)
    print("MODEL VERIFICATION")
    print("=" * 60)

    all_valid = True
    for name, info in MODELS.items():
        model_path = Path(info["path"])
        if model_path.exists():
            file_size = model_path.stat().st_size / (1024 * 1024)
            print(f"✓ {info['description']}: OK ({file_size:.1f} MB)")
        else:
            print(f"✗ {info['description']}: MISSING")
            all_valid = False

    return all_valid


def main():
    """Main download function"""
    print("=" * 60)
    print("SeeMe ML Service - Model Downloader")
    print("=" * 60)
    print(f"Models directory: {MODELS_DIR.absolute()}\n")

    success_count = 0
    for name, info in MODELS.items():
        if download_model(name, info):
            success_count += 1

    print("\n" + "=" * 60)
    print(f"Download Summary: {success_count}/{len(MODELS)} models ready")
    print("=" * 60)

    # Verify all models
    if verify_models():
        print("\n✓ All models verified successfully!")
        print(f"\nModels location: {MODELS_DIR.absolute()}")
        return 0
    else:
        print("\n✗ Some models are missing. Please run this script again.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
