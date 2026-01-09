"""
Face Detection using MediaPipe
Detects faces, extracts landmarks, and validates face angles
"""

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import numpy as np
from typing import List, Dict, Optional

from .exceptions import (
    NoFaceDetectedError,
    TooManyFacesError,
    FaceTooSmallError,
    FaceAngleTooExtremeError,
)


class FaceDetector:
    """
    Face detection and landmark extraction using MediaPipe
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize FaceDetector

        Args:
            model_path: Optional path to face_landmarker.task model file
                       If None, will attempt to use default bundled model
        """
        # Download model if not provided
        if model_path is None:
            # Try to use the default model location
            import os
            from pathlib import Path

            # Check common model locations
            possible_paths = [
                "models/face_landmarker.task",
                "../models/face_landmarker.task",
                "../../models/face_landmarker.task",
            ]

            for path in possible_paths:
                if os.path.exists(path):
                    model_path = path
                    break

            if model_path is None:
                # Model not found - provide instructions
                raise FileNotFoundError(
                    "Face landmarker model not found. Please download it:\n"
                    "1. Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task\n"
                    "2. Save to: models/face_landmarker.task\n"
                    "Or specify model_path parameter."
                )

        # Create FaceLandmarker for both detection and landmarks
        base_options = python.BaseOptions(model_asset_path=model_path)

        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_faces=5,
            min_face_detection_confidence=0.7,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )

        self.landmarker = vision.FaceLandmarker.create_from_options(options)

        print(f"FaceDetector initialized successfully with model: {model_path}")

    def detect_faces(self, image: np.ndarray) -> Optional[List[Dict]]:
        """
        Detect faces in image and extract landmarks

        Args:
            image: Input image as numpy array (BGR format)

        Returns:
            List of dicts with:
            - bbox: {x, y, width, height} in pixels
            - landmarks: List of 478 (x, y, z) tuples
            - confidence: Detection confidence score

        Raises:
            NoFaceDetectedError: No face found in image
            TooManyFacesError: More than 5 faces detected
        """
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        h, w, _ = image.shape

        # Convert to MediaPipe Image format
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        # Detect faces and landmarks
        detection_result = self.landmarker.detect(mp_image)

        if not detection_result.face_landmarks:
            raise NoFaceDetectedError("No face detected in image")

        # Too many faces
        if len(detection_result.face_landmarks) > 5:
            raise TooManyFacesError(
                f"Found {len(detection_result.face_landmarks)} faces, maximum is 5"
            )

        faces = []
        for i, face_landmarks in enumerate(detection_result.face_landmarks):
            # Get bounding box from landmarks
            landmark_points = [(lm.x * w, lm.y * h) for lm in face_landmarks]
            xs = [p[0] for p in landmark_points]
            ys = [p[1] for p in landmark_points]

            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)

            # Add padding to bbox
            padding = 0.1
            width = x_max - x_min
            height = y_max - y_min
            x_min = max(0, x_min - width * padding)
            y_min = max(0, y_min - height * padding)
            width = width * (1 + 2 * padding)
            height = height * (1 + 2 * padding)

            # Get confidence (default to 0.9 if not available)
            confidence = 0.9

            # Convert relative to absolute coordinates
            face_data = {
                'bbox': {
                    'x': int(x_min),
                    'y': int(y_min),
                    'width': int(width),
                    'height': int(height)
                },
                'landmarks': [
                    (lm.x * w, lm.y * h, lm.z if hasattr(lm, 'z') else 0)
                    for lm in face_landmarks
                ],
                'confidence': confidence
            }

            faces.append(face_data)

        return faces

    def validate_face_size(self, face_bbox: Dict, image_shape: tuple) -> bool:
        """
        Check if face is large enough for processing

        Args:
            face_bbox: Face bounding box dict
            image_shape: Tuple of (height, width, channels)

        Returns:
            True if face is large enough

        Raises:
            FaceTooSmallError: Face is too small for processing
        """
        min_face_width = 100  # pixels

        if face_bbox['width'] < min_face_width:
            raise FaceTooSmallError(
                f"Face width {face_bbox['width']}px is below minimum {min_face_width}px"
            )

        return True

    def estimate_face_angle(self, landmarks: List[tuple]) -> Dict[str, float]:
        """
        Estimate head pose angles from landmarks

        Args:
            landmarks: List of 468 (x, y, z) landmark tuples

        Returns:
            Dict with {yaw, pitch, roll} in degrees
        """
        # Key landmarks for pose estimation (MediaPipe 468-point model)
        nose_tip = landmarks[1]
        chin = landmarks[152]
        left_eye = landmarks[33]
        right_eye = landmarks[263]
        left_ear = landmarks[234]
        right_ear = landmarks[454]

        # Calculate yaw (left-right rotation)
        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        yaw = np.arctan2(nose_tip[0] - eye_center_x, 50) * 180 / np.pi

        # Calculate pitch (up-down rotation)
        eye_center_y = (left_eye[1] + right_eye[1]) / 2
        pitch = np.arctan2(nose_tip[1] - eye_center_y, 50) * 180 / np.pi

        # Calculate roll (tilt)
        roll = np.arctan2(
            right_eye[1] - left_eye[1],
            right_eye[0] - left_eye[0]
        ) * 180 / np.pi

        return {
            'yaw': yaw,
            'pitch': pitch,
            'roll': roll
        }

    def is_acceptable_angle(self, angles: Dict[str, float]) -> bool:
        """
        Check if face angle is within acceptable range for processing

        Args:
            angles: Dict with yaw, pitch, roll values in degrees

        Returns:
            True if angles are acceptable

        Raises:
            FaceAngleTooExtremeError: Face angle is too extreme
        """
        # Phase 1 limits: Frontal faces only
        if abs(angles['yaw']) >= 45:
            raise FaceAngleTooExtremeError(
                f"Yaw angle {angles['yaw']:.1f}deg exceeds limit of 45deg"
            )

        if abs(angles['pitch']) >= 30:
            raise FaceAngleTooExtremeError(
                f"Pitch angle {angles['pitch']:.1f}deg exceeds limit of 30deg"
            )

        if abs(angles['roll']) >= 30:
            raise FaceAngleTooExtremeError(
                f"Roll angle {angles['roll']:.1f}deg exceeds limit of 30deg"
            )

        return True

    def validate_face(self, face_data: Dict, image_shape: tuple) -> Dict:
        """
        Validate face size and angle

        Args:
            face_data: Face data dict from detect_faces()
            image_shape: Image shape tuple

        Returns:
            Face data dict with added 'angles' field

        Raises:
            FaceTooSmallError: Face is too small
            FaceAngleTooExtremeError: Face angle is too extreme
        """
        # Validate size
        self.validate_face_size(face_data['bbox'], image_shape)

        # Estimate and validate angles
        angles = self.estimate_face_angle(face_data['landmarks'])
        self.is_acceptable_angle(angles)

        # Add angles to face data
        face_data['angles'] = angles

        return face_data

    def __del__(self):
        """Clean up MediaPipe resources"""
        if hasattr(self, 'landmarker'):
            self.landmarker.close()
