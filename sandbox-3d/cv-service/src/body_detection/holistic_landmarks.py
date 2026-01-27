"""
Holistic landmark extraction using MediaPipe Tasks API.
Extracts body pose landmarks (33 points) with optional face and hand landmarks.
"""

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
from typing import Dict, List, Any
from dataclasses import dataclass
import os
import urllib.request

# Model URLs and paths
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")

POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
POSE_MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker_heavy.task")

FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
FACE_MODEL_PATH = os.path.join(MODEL_DIR, "face_landmarker.task")

HAND_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
HAND_MODEL_PATH = os.path.join(MODEL_DIR, "hand_landmarker.task")


def ensure_models_downloaded():
    """Download all required models if not present."""
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    models = [
        (POSE_MODEL_URL, POSE_MODEL_PATH, "pose landmarker"),
        (FACE_MODEL_URL, FACE_MODEL_PATH, "face landmarker"),
        (HAND_MODEL_URL, HAND_MODEL_PATH, "hand landmarker"),
    ]

    for url, path, name in models:
        if not os.path.exists(path):
            print(f"Downloading {name} model to {path}...")
            urllib.request.urlretrieve(url, path)
            print(f"{name} download complete!")


@dataclass
class Landmark:
    x: float
    y: float
    z: float
    visibility: float


class HolisticLandmarksExtractor:
    """Extracts full body, face, and hand landmarks using MediaPipe Tasks API."""

    POSE_LANDMARK_NAMES = {
        0: "nose", 1: "left_eye_inner", 2: "left_eye", 3: "left_eye_outer",
        4: "right_eye_inner", 5: "right_eye", 6: "right_eye_outer",
        7: "left_ear", 8: "right_ear", 9: "mouth_left", 10: "mouth_right",
        11: "left_shoulder", 12: "right_shoulder", 13: "left_elbow",
        14: "right_elbow", 15: "left_wrist", 16: "right_wrist",
        17: "left_pinky", 18: "right_pinky", 19: "left_index",
        20: "right_index", 21: "left_thumb", 22: "right_thumb",
        23: "left_hip", 24: "right_hip", 25: "left_knee", 26: "right_knee",
        27: "left_ankle", 28: "right_ankle", 29: "left_heel", 30: "right_heel",
        31: "left_foot_index", 32: "right_foot_index",
    }

    def __init__(
        self,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_complexity: int = 1
    ):
        ensure_models_downloaded()

        # Initialize Pose Landmarker
        pose_base_options = python.BaseOptions(model_asset_path=POSE_MODEL_PATH)
        pose_options = vision.PoseLandmarkerOptions(
            base_options=pose_base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_pose_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            num_poses=1,
            output_segmentation_masks=False
        )
        self.pose_landmarker = vision.PoseLandmarker.create_from_options(pose_options)

        # Initialize Face Landmarker
        face_base_options = python.BaseOptions(model_asset_path=FACE_MODEL_PATH)
        face_options = vision.FaceLandmarkerOptions(
            base_options=face_base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_face_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            num_faces=1,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False
        )
        self.face_landmarker = vision.FaceLandmarker.create_from_options(face_options)

        # Initialize Hand Landmarker
        hand_base_options = python.BaseOptions(model_asset_path=HAND_MODEL_PATH)
        hand_options = vision.HandLandmarkerOptions(
            base_options=hand_base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_hand_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            num_hands=2
        )
        self.hand_landmarker = vision.HandLandmarker.create_from_options(hand_options)

        self._is_closed = False

    def extract(self, image: np.ndarray) -> Dict[str, Any]:
        if self._is_closed:
            raise RuntimeError("Extractor has been closed")

        # Convert BGR to RGB
        if len(image.shape) == 3 and image.shape[2] == 3:
            image_rgb = image[:, :, ::-1].copy()
        else:
            image_rgb = image

        # Create MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

        output = {
            "success": False,
            "pose_landmarks": None,
            "pose_world_landmarks": None,
            "face_landmarks": None,
            "left_hand_landmarks": None,
            "right_hand_landmarks": None,
        }

        # Detect pose
        pose_results = self.pose_landmarker.detect(mp_image)
        if pose_results.pose_landmarks and len(pose_results.pose_landmarks) > 0:
            output["success"] = True
            output["pose_landmarks"] = self._convert_landmarks(pose_results.pose_landmarks[0])
            if pose_results.pose_world_landmarks and len(pose_results.pose_world_landmarks) > 0:
                output["pose_world_landmarks"] = self._convert_landmarks(pose_results.pose_world_landmarks[0])

        # Detect face
        face_results = self.face_landmarker.detect(mp_image)
        if face_results.face_landmarks and len(face_results.face_landmarks) > 0:
            output["face_landmarks"] = self._convert_landmarks(face_results.face_landmarks[0])

        # Detect hands
        hand_results = self.hand_landmarker.detect(mp_image)
        if hand_results.hand_landmarks:
            for i, hand_landmarks in enumerate(hand_results.hand_landmarks):
                if i < len(hand_results.handedness):
                    handedness = hand_results.handedness[i][0].category_name
                    if handedness == "Left":
                        output["left_hand_landmarks"] = self._convert_landmarks(hand_landmarks)
                    else:
                        output["right_hand_landmarks"] = self._convert_landmarks(hand_landmarks)

        return output

    def _convert_landmarks(self, landmarks) -> List[Dict[str, float]]:
        result = []
        for lm in landmarks:
            visibility = getattr(lm, 'visibility', None)
            if visibility is None:
                visibility = 1.0
            result.append({
                "x": float(lm.x),
                "y": float(lm.y),
                "z": float(lm.z),
                "visibility": float(visibility)
            })
        return result

    def get_named_pose_landmarks(self, pose_landmarks: List[Dict[str, float]]) -> Dict[str, Dict[str, float]]:
        if not pose_landmarks:
            return {}
        return {
            name: pose_landmarks[idx]
            for idx, name in self.POSE_LANDMARK_NAMES.items()
            if idx < len(pose_landmarks)
        }

    def close(self):
        if not self._is_closed:
            self.pose_landmarker.close()
            self.face_landmarker.close()
            self.hand_landmarker.close()
            self._is_closed = True

    def __del__(self):
        self.close()
