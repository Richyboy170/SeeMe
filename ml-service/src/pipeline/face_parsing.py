"""
Face Parsing using BiSeNet
Semantic segmentation of facial regions into 19 classes
"""

import torch
import torch.nn as nn
import cv2
import numpy as np
from typing import Dict
import os

from .models.bisenet import BiSeNet


# Face parsing classes (BiSeNet 19 classes)
FACE_PARSING_CLASSES = {
    0: 'background',
    1: 'skin',
    2: 'left_eyebrow',
    3: 'right_eyebrow',
    4: 'left_eye',
    5: 'right_eye',
    6: 'glasses',
    7: 'left_ear',
    8: 'right_ear',
    9: 'earring',
    10: 'nose',
    11: 'mouth_interior',
    12: 'upper_lip',
    13: 'lower_lip',
    14: 'neck',
    15: 'necklace',
    16: 'clothing',
    17: 'hair',
    18: 'hat'
}


class FaceParser:
    """
    Face parsing using BiSeNet
    Segments face into 19 semantic regions
    """

    def __init__(self, model_path: str = None, device: str = 'cuda'):
        """
        Initialize Face Parser

        Args:
            model_path: Path to pretrained BiSeNet weights
            device: 'cuda' or 'cpu'
        """
        self.device = device if torch.cuda.is_available() and device == 'cuda' else 'cpu'

        # Load BiSeNet model
        self.model = BiSeNet(n_classes=19)

        # Load pretrained weights if provided
        if model_path and os.path.exists(model_path):
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            print(f"Loaded BiSeNet weights from {model_path}")
        else:
            print("WARNING: No pretrained weights loaded. Model initialized with random weights.")
            print("For production use, download pretrained BiSeNet weights.")

        self.model.to(self.device)
        self.model.eval()

        print(f"FaceParser initialized on {self.device}")

    def parse_face(self, image: np.ndarray, face_bbox: Dict) -> Dict[str, np.ndarray]:
        """
        Parse face into semantic regions

        Args:
            image: Full image (BGR format)
            face_bbox: Face bounding box {x, y, width, height}

        Returns:
            Dict mapping region names to binary masks
            Also includes '_crop_coords' key with (x1, y1, x2, y2) tuple
        """
        # Extract and pad face region
        padding = int(max(face_bbox['width'], face_bbox['height']) * 0.2)
        x1 = max(0, face_bbox['x'] - padding)
        y1 = max(0, face_bbox['y'] - padding)
        x2 = min(image.shape[1], face_bbox['x'] + face_bbox['width'] + padding)
        y2 = min(image.shape[0], face_bbox['y'] + face_bbox['height'] + padding)

        face_crop = image[y1:y2, x1:x2]

        # Preprocess for BiSeNet
        face_resized = cv2.resize(face_crop, (512, 512))
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        face_normalized = (face_rgb / 255.0 - 0.5) / 0.5  # Normalize to [-1, 1]

        # Convert to tensor
        face_tensor = torch.from_numpy(face_normalized).float()
        face_tensor = face_tensor.permute(2, 0, 1).unsqueeze(0)  # [1, 3, 512, 512]
        face_tensor = face_tensor.to(self.device)

        # Inference
        with torch.no_grad():
            output = self.model(face_tensor)
            if isinstance(output, tuple):
                # Training mode returns multiple outputs
                output = output[0]
            parsing = output.squeeze(0).argmax(0)  # [512, 512]

        # Convert to numpy and resize back
        parsing_np = parsing.cpu().numpy().astype(np.uint8)
        parsing_resized = cv2.resize(
            parsing_np,
            (face_crop.shape[1], face_crop.shape[0]),
            interpolation=cv2.INTER_NEAREST
        )

        # Create binary masks for each region
        masks = {}
        for class_id, class_name in FACE_PARSING_CLASSES.items():
            mask = (parsing_resized == class_id).astype(np.uint8) * 255
            masks[class_name] = mask

        # Store crop coordinates for later use
        masks['_crop_coords'] = (x1, y1, x2, y2)

        return masks

    def get_combined_face_mask(self, masks: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Combine relevant face regions into single mask
        (Excludes background, clothing, accessories)

        Args:
            masks: Dict of region masks from parse_face()

        Returns:
            Combined binary mask of main face regions
        """
        face_regions = [
            'skin', 'left_eyebrow', 'right_eyebrow',
            'left_eye', 'right_eye', 'nose',
            'mouth_interior', 'upper_lip', 'lower_lip'
        ]

        # Get a reference mask shape
        ref_mask = masks.get('skin', masks.get('background'))
        combined = np.zeros_like(ref_mask)

        for region in face_regions:
            if region in masks:
                combined = np.maximum(combined, masks[region])

        return combined

    def visualize_parsing(self, image: np.ndarray, masks: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Create a colored visualization of the parsing result

        Args:
            image: Original face crop
            masks: Dict of region masks

        Returns:
            RGB visualization with colored regions
        """
        # Color map for 19 classes
        colors = [
            [0, 0, 0],        # background
            [255, 200, 200],  # skin
            [139, 69, 19],    # left_eyebrow
            [139, 69, 19],    # right_eyebrow
            [0, 100, 200],    # left_eye
            [0, 100, 200],    # right_eye
            [100, 100, 100],  # glasses
            [255, 180, 150],  # left_ear
            [255, 180, 150],  # right_ear
            [255, 215, 0],    # earring
            [255, 150, 150],  # nose
            [200, 0, 0],      # mouth_interior
            [255, 100, 100],  # upper_lip
            [255, 100, 100],  # lower_lip
            [255, 220, 200],  # neck
            [255, 215, 0],    # necklace
            [150, 150, 150],  # clothing
            [100, 50, 0],     # hair
            [50, 50, 50],     # hat
        ]

        # Get crop coordinates
        if '_crop_coords' in masks:
            x1, y1, x2, y2 = masks['_crop_coords']
            h, w = y2 - y1, x2 - x1
        else:
            h, w = image.shape[:2]

        # Create colored overlay
        overlay = np.zeros((h, w, 3), dtype=np.uint8)

        for class_id, class_name in FACE_PARSING_CLASSES.items():
            if class_name in masks and class_name != '_crop_coords':
                mask = masks[class_name]
                overlay[mask > 0] = colors[class_id]

        # Blend with original image
        result = cv2.addWeighted(image, 0.5, overlay, 0.5, 0)

        return result
