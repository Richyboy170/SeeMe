"""
Model loading utilities for BiSeNet and MiDaS
Handles loading pre-trained models and GPU/CPU allocation
"""
import torch
from pathlib import Path
from loguru import logger
from typing import Optional

MODELS_DIR = Path("models")


def check_models_loaded() -> bool:
    """Verify all required models are present"""
    required_models = [
        "bisenet_face_parsing.pth",
        "midas_v3_1.pt"
    ]

    for model_file in required_models:
        model_path = MODELS_DIR / model_file
        if not model_path.exists():
            logger.warning(f"Model not found: {model_path}")
            return False

    return True


def get_device() -> torch.device:
    """Get the best available device (CUDA if available, else CPU)"""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
    else:
        device = torch.device("cpu")
        logger.info("Using CPU (GPU not available)")

    return device


def load_bisenet() -> Optional[torch.nn.Module]:
    """
    Load BiSeNet face parsing model
    Note: BiSeNet architecture needs to be implemented separately
    This is a placeholder for Phase 0
    """
    model_path = MODELS_DIR / "bisenet_face_parsing.pth"

    if not model_path.exists():
        logger.error(f"BiSeNet model not found: {model_path}")
        return None

    try:
        # TODO: Implement BiSeNet architecture class
        # For now, just verify the file exists
        logger.info(f"BiSeNet model file found: {model_path}")
        logger.warning("BiSeNet loader not fully implemented (Phase 0)")

        # Placeholder - will be replaced with actual model loading
        # from .bisenet import BiSeNet
        # model = BiSeNet(n_classes=19)
        # model.load_state_dict(torch.load(model_path, map_location=get_device()))
        # model.eval()

        return None

    except Exception as e:
        logger.error(f"Error loading BiSeNet: {e}")
        return None


def load_midas() -> Optional[torch.nn.Module]:
    """
    Load MiDaS depth estimation model
    Uses torch.hub for model architecture
    """
    model_path = MODELS_DIR / "midas_v3_1.pt"

    if not model_path.exists():
        logger.error(f"MiDaS model not found: {model_path}")
        return None

    try:
        device = get_device()

        logger.info("Loading MiDaS model architecture from torch.hub...")
        # Load model architecture from torch.hub
        model = torch.hub.load(
            "intel-isl/MiDaS",
            "DPT_BEiT_L_512",
            pretrained=False,
            trust_repo=True
        )

        logger.info(f"Loading MiDaS weights from {model_path}")
        # Load pre-trained weights
        state_dict = torch.load(model_path, map_location=device)
        model.load_state_dict(state_dict)

        # Set to evaluation mode
        model.eval()
        model.to(device)

        logger.info("MiDaS model loaded successfully")
        return model

    except Exception as e:
        logger.error(f"Error loading MiDaS: {e}")
        return None


class ModelManager:
    """Singleton class to manage ML models"""

    _instance = None
    _bisenet_model = None
    _midas_model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def load_all_models(self):
        """Load all ML models"""
        logger.info("Loading all ML models...")

        # Load BiSeNet (placeholder for now)
        self._bisenet_model = load_bisenet()

        # Load MiDaS
        self._midas_model = load_midas()

        logger.info("Model loading complete")

    @property
    def bisenet(self):
        """Get BiSeNet model"""
        if self._bisenet_model is None:
            logger.warning("BiSeNet model not loaded")
        return self._bisenet_model

    @property
    def midas(self):
        """Get MiDaS model"""
        if self._midas_model is None:
            logger.warning("MiDaS model not loaded")
        return self._midas_model

    def unload_models(self):
        """Unload models to free memory"""
        logger.info("Unloading models...")
        self._bisenet_model = None
        self._midas_model = None

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        logger.info("Models unloaded, memory cleared")


# Global model manager instance
model_manager = ModelManager()
