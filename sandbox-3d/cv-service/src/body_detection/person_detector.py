"""
Person detection using MediaPipe Pose Landmarker (Tasks API).
Detects if a human is present in the image and returns bounding box.
"""

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import cv2
from typing import Dict, Any
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
    """Detects humans in images using MediaPipe Pose Landmarker."""

    def __init__(self, min_detection_confidence: float = 0.5):
        ensure_model_downloaded()

        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_pose_detection_confidence=min_detection_confidence,
            min_tracking_confidence=0.5,
            num_poses=1
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)
        self._is_closed = False

    def detect(self, image: np.ndarray) -> Dict[str, Any]:
        if self._is_closed:
            raise RuntimeError("Detector has been closed")

        # Convert to RGB if needed
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Create MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)

        # Detect
        results = self.detector.detect(mp_image)

        if not results.pose_landmarks or len(results.pose_landmarks) == 0:
            return {"detected": False, "confidence": 0.0, "bounding_box": None}

        landmarks = results.pose_landmarks[0]
        h, w = image.shape[:2]

        # Get visible landmarks
        visible_landmarks = [
            (lm.x * w, lm.y * h) for lm in landmarks if lm.visibility > 0.5
        ]

        if not visible_landmarks:
            return {"detected": False, "confidence": 0.0, "bounding_box": None}

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
        return {"detected": True, "confidence": confidence, "bounding_box": bbox}

    def close(self):
        if not self._is_closed:
            self.detector.close()
            self._is_closed = True

    def __del__(self):
        if hasattr(self, '_is_closed'):
            self.close()
