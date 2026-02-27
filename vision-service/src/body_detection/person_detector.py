"""
Person detection using MediaPipe Pose Landmarker (Tasks API).
Detects humans in images and returns bounding boxes. Supports multi-person detection.
"""

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import cv2
from typing import Dict, List, Any
import os
import urllib.request

# Model URL and path
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker_heavy.task")


def ensure_model_downloaded():
    """Download the pose landmarker model if not present."""
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    if not os.path.exists(MODEL_PATH):
        print(f"Downloading pose landmarker model to {MODEL_PATH}...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Download complete!")


class PersonDetector:
    """Detects humans in images using MediaPipe Pose Landmarker. Supports multi-person."""

    def __init__(self, min_detection_confidence: float = 0.5, num_poses: int = 4):
        ensure_model_downloaded()

        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_pose_detection_confidence=min_detection_confidence,
            min_tracking_confidence=0.5,
            num_poses=num_poses
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)
        self._is_closed = False

    def _prepare_image(self, image: np.ndarray) -> np.ndarray:
        """Convert image to RGB format."""
        if len(image.shape) == 2:
            return cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:
            return cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif image.shape[2] == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return image

    def detect(self, image: np.ndarray) -> Dict[str, Any]:
        """Detect first person (backwards compatible)."""
        all_results = self.detect_all(image)
        if not all_results:
            return {"detected": False, "confidence": 0.0, "bounding_box": None}
        return all_results[0]

    def detect_all(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect all people in the image. Returns a list of detections."""
        if self._is_closed:
            raise RuntimeError("Detector has been closed")

        image = self._prepare_image(image)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
        results = self.detector.detect(mp_image)

        if not results.pose_landmarks or len(results.pose_landmarks) == 0:
            return []

        h, w = image.shape[:2]
        detections = []

        for landmarks in results.pose_landmarks:
            visible_landmarks = [
                (lm.x * w, lm.y * h) for lm in landmarks if lm.visibility > 0.5
            ]

            if not visible_landmarks:
                continue

            x_coords = [p[0] for p in visible_landmarks]
            y_coords = [p[1] for p in visible_landmarks]

            padding_x = (max(x_coords) - min(x_coords)) * 0.1
            padding_y = (max(y_coords) - min(y_coords)) * 0.1

            bbox = {
                "x_min": max(0, int(min(x_coords) - padding_x)),
                "y_min": max(0, int(min(y_coords) - padding_y)),
                "x_max": min(w, int(max(x_coords) + padding_x)),
                "y_max": min(h, int(max(y_coords) + padding_y))
            }

            confidence = float(np.mean([lm.visibility for lm in landmarks]))
            detections.append({"detected": True, "confidence": confidence, "bounding_box": bbox})

        return detections

    def close(self):
        if not self._is_closed:
            self.detector.close()
            self._is_closed = True

    def __del__(self):
        if hasattr(self, '_is_closed'):
            self.close()
