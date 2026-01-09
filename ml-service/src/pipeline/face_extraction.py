"""
Face Region Extraction & Validation
Extracts face regions, creates feathered masks, and validates segmentation quality
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple
from scipy.ndimage import gaussian_filter


class FaceExtractor:
    """
    Extracts and validates face regions from images
    Creates smooth masks for blending
    """

    def __init__(self, feather_radius: int = 5):
        """
        Initialize Face Extractor

        Args:
            feather_radius: Gaussian blur radius for mask feathering (pixels)
        """
        self.feather_radius = feather_radius

    def extract_face_region(
        self,
        image: np.ndarray,
        masks: Dict[str, np.ndarray]
    ) -> Dict:
        """
        Extract face region with proper boundaries

        Args:
            image: Full image (BGR format)
            masks: Dict of region masks from FaceParser.parse_face()

        Returns:
            Dict with:
            - face_image: Extracted face region (BGR)
            - mask: Binary mask of face
            - feathered_mask: Soft-edged mask for blending
            - bbox: Bounding box of extracted region {x, y, width, height}
            - crop_coords: Tuple (x1, y1, x2, y2) in original image
        """
        # Get crop coordinates
        x1, y1, x2, y2 = masks['_crop_coords']
        face_crop = image[y1:y2, x1:x2].copy()

        # Get combined face mask
        face_mask = self.get_combined_face_mask(masks)

        # Create feathered mask for smooth blending
        feathered_mask = self.create_feathered_mask(face_mask)

        return {
            'face_image': face_crop,
            'mask': face_mask,
            'feathered_mask': feathered_mask,
            'bbox': {'x': x1, 'y': y1, 'width': x2-x1, 'height': y2-y1},
            'crop_coords': (x1, y1, x2, y2)
        }

    def create_feathered_mask(self, mask: np.ndarray) -> np.ndarray:
        """
        Create soft-edged mask for seamless blending

        Args:
            mask: Binary mask (0-255)

        Returns:
            Feathered mask with smooth edges (0-255)
        """
        # Apply Gaussian blur to mask edges
        mask_float = mask.astype(np.float32) / 255.0
        feathered = gaussian_filter(mask_float, sigma=self.feather_radius)

        # Normalize back to 0-255
        feathered = (feathered * 255).astype(np.uint8)

        return feathered

    def validate_segmentation_quality(self, masks: Dict[str, np.ndarray]) -> bool:
        """
        Check if segmentation is high enough quality for processing

        Args:
            masks: Dict of region masks from FaceParser.parse_face()

        Returns:
            True if segmentation quality is acceptable
        """
        # Check if key regions are detected
        required_regions = ['skin', 'left_eye', 'right_eye', 'nose', 'mouth_interior']

        # Also accept upper/lower lip if mouth_interior is missing
        mouth_regions = ['mouth_interior', 'upper_lip', 'lower_lip']

        for region in required_regions:
            if region == 'mouth_interior':
                # Check if at least one mouth region is present
                has_mouth = any(
                    region in masks and np.sum(masks[region] > 0) >= 50
                    for region in mouth_regions
                )
                if not has_mouth:
                    return False
            else:
                if region not in masks:
                    return False

                # Check if region has minimum pixels
                region_pixels = np.sum(masks[region] > 0)
                if region_pixels < 100:  # Minimum 100 pixels per region
                    return False

        return True

    def get_combined_face_mask(self, masks: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Combine face regions (excluding background and accessories)

        Args:
            masks: Dict of region masks

        Returns:
            Combined binary mask of main face regions
        """
        face_regions = [
            'skin', 'left_eyebrow', 'right_eyebrow',
            'left_eye', 'right_eye', 'nose',
            'mouth_interior', 'upper_lip', 'lower_lip'
        ]

        # Get a reference mask to initialize combined mask
        ref_mask = None
        for key in masks:
            if key != '_crop_coords' and isinstance(masks[key], np.ndarray):
                ref_mask = masks[key]
                break

        if ref_mask is None:
            raise ValueError("No valid masks found")

        combined = np.zeros_like(ref_mask)

        for region in face_regions:
            if region in masks:
                combined = np.maximum(combined, masks[region])

        return combined

    def blend_face_region(
        self,
        background: np.ndarray,
        foreground: np.ndarray,
        mask: np.ndarray,
        position: Tuple[int, int]
    ) -> np.ndarray:
        """
        Blend face region into background using feathered mask

        Args:
            background: Background image (BGR)
            foreground: Face region to blend (BGR)
            mask: Feathered mask (0-255)
            position: Top-left position (x, y) in background

        Returns:
            Blended image
        """
        x, y = position
        h, w = foreground.shape[:2]

        # Ensure we don't go out of bounds
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(background.shape[1], x + w)
        y2 = min(background.shape[0], y + h)

        # Adjust foreground and mask if position is negative
        fx1 = max(0, -x)
        fy1 = max(0, -y)
        fx2 = fx1 + (x2 - x1)
        fy2 = fy1 + (y2 - y1)

        # Get regions
        bg_region = background[y1:y2, x1:x2]
        fg_region = foreground[fy1:fy2, fx1:fx2]
        mask_region = mask[fy1:fy2, fx1:fx2]

        # Normalize mask to 0-1
        mask_normalized = mask_region.astype(np.float32) / 255.0

        # Expand mask to 3 channels
        if len(mask_normalized.shape) == 2:
            mask_normalized = np.expand_dims(mask_normalized, axis=2)

        # Blend
        blended = (fg_region * mask_normalized + bg_region * (1 - mask_normalized)).astype(np.uint8)

        # Copy back to result
        result = background.copy()
        result[y1:y2, x1:x2] = blended

        return result

    def detect_overlapping_faces(
        self,
        face_bboxes: List[Dict]
    ) -> List[Tuple[int, int]]:
        """
        Detect which faces overlap with each other

        Args:
            face_bboxes: List of face bounding boxes

        Returns:
            List of (i, j) tuples indicating overlapping face indices
        """
        overlaps = []

        for i in range(len(face_bboxes)):
            for j in range(i + 1, len(face_bboxes)):
                if self._bboxes_overlap(face_bboxes[i], face_bboxes[j]):
                    overlaps.append((i, j))

        return overlaps

    def _bboxes_overlap(self, bbox1: Dict, bbox2: Dict) -> bool:
        """
        Check if two bounding boxes overlap

        Args:
            bbox1, bbox2: Bounding box dicts with x, y, width, height

        Returns:
            True if boxes overlap
        """
        x1_min = bbox1['x']
        y1_min = bbox1['y']
        x1_max = bbox1['x'] + bbox1['width']
        y1_max = bbox1['y'] + bbox1['height']

        x2_min = bbox2['x']
        y2_min = bbox2['y']
        x2_max = bbox2['x'] + bbox2['width']
        y2_max = bbox2['y'] + bbox2['height']

        # Check if boxes don't overlap, then invert
        no_overlap = (x1_max < x2_min or x2_max < x1_min or
                      y1_max < y2_min or y2_max < y1_min)

        return not no_overlap

    def get_iou(self, bbox1: Dict, bbox2: Dict) -> float:
        """
        Calculate Intersection over Union (IoU) of two bounding boxes

        Args:
            bbox1, bbox2: Bounding box dicts

        Returns:
            IoU value (0-1)
        """
        x1_min = bbox1['x']
        y1_min = bbox1['y']
        x1_max = bbox1['x'] + bbox1['width']
        y1_max = bbox1['y'] + bbox1['height']

        x2_min = bbox2['x']
        y2_min = bbox2['y']
        x2_max = bbox2['x'] + bbox2['width']
        y2_max = bbox2['y'] + bbox2['height']

        # Intersection
        inter_x_min = max(x1_min, x2_min)
        inter_y_min = max(y1_min, y2_min)
        inter_x_max = min(x1_max, x2_max)
        inter_y_max = min(y1_max, y2_max)

        if inter_x_max < inter_x_min or inter_y_max < inter_y_min:
            return 0.0

        inter_area = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min)

        # Union
        bbox1_area = bbox1['width'] * bbox1['height']
        bbox2_area = bbox2['width'] * bbox2['height']
        union_area = bbox1_area + bbox2_area - inter_area

        return inter_area / union_area if union_area > 0 else 0.0
