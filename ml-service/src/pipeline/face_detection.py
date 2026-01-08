"""
Face Detection using MediaPipe
Detects faces, extracts landmarks, and validates face angles
"""

import mediapipe as mp
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

    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh

        # Initialize detectors
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 0=short range (<2m), 1=long range (>2m)
            min_detection_confidence=0.7
        )

        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=5,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        print("FaceDetector initialized successfully")

    def detect_faces(self, image: np.ndarray) -> Optional[List[Dict]]:
        """
        Detect faces in image and extract landmarks

        Args:
            image: Input image as numpy array (BGR format)

        Returns:
            List of dicts with:
            - bbox: {x, y, width, height} in pixels
            - landmarks: List of 468 (x, y, z) tuples
            - confidence: Detection confidence score

        Raises:
            NoFaceDetectedError: No face found in image
            TooManyFacesError: More than 5 faces detected
        """
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        h, w, _ = image.shape

        # Detect faces
        detection_results = self.face_detection.process(rgb_image)

        if not detection_results.detections:
            raise NoFaceDetectedError("No face detected in image")

        # Too many faces
        if len(detection_results.detections) > 5:
            raise TooManyFacesError(
                f"Found {len(detection_results.detections)} faces, maximum is 5"
            )

        # Extract landmarks
        mesh_results = self.face_mesh.process(rgb_image)

        if not mesh_results.multi_face_landmarks:
            raise NoFaceDetectedError("Face detected but landmarks extraction failed")

        faces = []
        for i, (detection, face_landmarks) in enumerate(
            zip(detection_results.detections, mesh_results.multi_face_landmarks)
        ):
            bbox = detection.location_data.relative_bounding_box

            # Convert relative to absolute coordinates
            face_data = {
                'bbox': {
                    'x': int(bbox.xmin * w),
                    'y': int(bbox.ymin * h),
                    'width': int(bbox.width * w),
                    'height': int(bbox.height * h)
                },
                'landmarks': [
                    (lm.x * w, lm.y * h, lm.z)
                    for lm in face_landmarks.landmark
                ],
                'confidence': detection.score[0]
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
                f"Yaw angle {angles['yaw']:.1f}° exceeds limit of 45°"
            )

        if abs(angles['pitch']) >= 30:
            raise FaceAngleTooExtremeError(
                f"Pitch angle {angles['pitch']:.1f}° exceeds limit of 30°"
            )

        if abs(angles['roll']) >= 30:
            raise FaceAngleTooExtremeError(
                f"Roll angle {angles['roll']:.1f}° exceeds limit of 30°"
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
        if hasattr(self, 'face_detection'):
            self.face_detection.close()
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()
