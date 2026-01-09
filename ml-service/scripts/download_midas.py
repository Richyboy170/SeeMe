"""
Download MiDaS v3.1 (DPT_BEiT_L_512) pretrained model

This script downloads the pretrained MiDaS depth estimation model
from Intel ISL's repository via torch hub.
"""

import os
import sys
import torch
import argparse
from pathlib import Path


def download_midas_model(output_dir: str = "models/pretrained", verify: bool = False):
    """
    Download MiDaS DPT_BEiT_L_512 model

    Args:
        output_dir: Directory to save the model
        verify: If True, verify the model can be loaded
    """
    print("="*60)
    print("MiDaS v3.1 Model Download")
    print("="*60)

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"\nOutput directory: {output_path.absolute()}")

    # Model will be cached in torch hub cache
    # We're downloading through torch hub which handles caching automatically
    print("\n[1/3] Downloading MiDaS DPT_BEiT_L_512 model from torch hub...")
    print("This may take several minutes (model size: ~1.4 GB)")

    try:
        # Load model (will download if not cached)
        model = torch.hub.load(
            "intel-isl/MiDaS",
            "DPT_BEiT_L_512",
            pretrained=True,
            skip_validation=False
        )
        print("✓ Model downloaded successfully")

        # Get torch hub cache directory
        torch_cache_dir = torch.hub.get_dir()
        print(f"\n✓ Model cached in torch hub directory: {torch_cache_dir}")

        # Optionally save model weights to our project directory
        model_save_path = output_path / "midas_v31_dpt_beit_large_512.pt"
        print(f"\n[2/3] Saving model weights to: {model_save_path}")
        torch.save(model.state_dict(), model_save_path)
        print(f"✓ Model saved ({model_save_path.stat().st_size / 1024 / 1024:.1f} MB)")

        if verify:
            print("\n[3/3] Verifying model...")
            model.eval()

            # Load transforms
            midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
            transform = midas_transforms.beit512_transform

            # Create test input
            import numpy as np
            test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

            # Transform and predict
            input_batch = transform(test_image)
            with torch.no_grad():
                prediction = model(input_batch)

            print(f"✓ Model verification successful")
            print(f"  Test input shape: {test_image.shape}")
            print(f"  Prediction shape: {prediction.shape}")
        else:
            print("\n[3/3] Skipping verification (use --verify to enable)")

    except Exception as e:
        print(f"\n✗ Error downloading model: {e}")
        return False

    print("\n" + "="*60)
    print("Download Complete!")
    print("="*60)
    print("\nModel is ready to use. You can:")
    print("1. Use torch hub directly (recommended):")
    print("   model = torch.hub.load('intel-isl/MiDaS', 'DPT_BEiT_L_512', pretrained=True)")
    print("\n2. Load from saved weights:")
    print(f"   model.load_state_dict(torch.load('{model_save_path}'))")

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Download MiDaS v3.1 depth estimation model"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models/pretrained",
        help="Directory to save model weights (default: models/pretrained)"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify model after download"
    )

    args = parser.parse_args()

    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir.parent)  # Change to ml-service root

    print(f"Working directory: {os.getcwd()}\n")

    success = download_midas_model(args.output_dir, args.verify)

    if success:
        print("\n✓ Setup complete!")
        sys.exit(0)
    else:
        print("\n✗ Setup failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
