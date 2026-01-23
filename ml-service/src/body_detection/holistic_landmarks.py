"""
Holistic Landmark Extraction for KalidoKit
Phase 3.1.1: CV Pipeline (Simplified)

Extracts MediaPipe Holistic landmarks in KalidoKit-compatible format.
This is the bridge between server-side MediaPipe and client-side KalidoKit.

KalidoKit expects:
- poseLandmarks: 33 points (2D normalized)
- poseWorldLandmarks: 33 points (3D in meters)
- faceLandmarks: 468/478 points (for face tracking)
- leftHandLandmarks: 21 points
- rightHandLandmarks: 21 points
"""

import mediapipe as mp
import numpy as np
import cv2
from typing import Dict, Any, Optional, List
from loguru import logger
import time


class HolisticLandmarkExtractor:
    """
    Extracts raw MediaPipe Holistic landmarks for KalidoKit processing.

    Unlike FullSkeletonExtractor which processes and structures data,
    this class returns raw landmark data exactly as KalidoKit expects.

    The client (React Native) uses KalidoKit to convert these landmarks
    to bone rotations for VRM avatar rendering.
    """

    def __init__(self, model_complexity: int = 2):
        """
        Initialize the holistic landmark extractor.

        Args:
            model_complexity: 0 = lite, 1 = full, 2 = heavy (most accurate)
        """
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            static_image_mode=True,
            model_complexity=model_complexity,
            enable_segmentation=False,  # Not needed for landmarks
            refine_face_landmarks=True,  # Enable 478-point iris tracking
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info(f"HolisticLandmarkExtractor initialized (complexity={model_complexity}, face_refinement=True)")

    def extract_landmarks(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract all MediaPipe Holistic landmarks from image.

        Args:
            image: RGB image as numpy array (HxWxC)

        Returns:
            KalidoKit-compatible landmark data:
            {
                "success": bool,
                "imageSize": {"width": int, "height": int},
                "poseLandmarks": [{"x": float, "y": float, "z": float, "visibility": float}, ...] (33 points),
                "poseWorldLandmarks": [{"x": float, "y": float, "z": float, "visibility": float}, ...] (33 points),
                "faceLandmarks": [{"x": float, "y": float, "z": float}, ...] (468/478 points) or null,
                "leftHandLandmarks": [{"x": float, "y": float, "z": float}, ...] (21 points) or null,
                "rightHandLandmarks": [{"x": float, "y": float, "z": float}, ...] (21 points) or null,
                "processingTimeMs": float
            }
        """
        start_time = time.time()

        # Validate input
        if image is None or len(image.shape) != 3:
            return {
                "success": False,
                "error": "invalid_image",
                "message": "Invalid image format"
            }

        h, w = image.shape[:2]

        # Ensure image is RGB
        if image.shape[2] == 4:  # RGBA
            image = image[:, :, :3]

        # Process with MediaPipe Holistic
        results = self.holistic.process(image)

        processing_time = (time.time() - start_time) * 1000

        # Check if person detected
        if not results.pose_landmarks:
            return {
                "success": False,
                "error": "no_person_detected",
                "message": "No person detected in image",
                "processingTimeMs": round(processing_time, 1)
            }

        # Build KalidoKit-compatible response
        response = {
            "success": True,
            "imageSize": {"width": w, "height": h},
            "poseLandmarks": None,
            "poseWorldLandmarks": None,
            "faceLandmarks": None,
            "leftHandLandmarks": None,
            "rightHandLandmarks": None,
            "processingTimeMs": round(processing_time, 1)
        }

        # Pose landmarks (2D normalized 0-1)
        if results.pose_landmarks:
            response["poseLandmarks"] = [
                {
                    "x": round(lm.x, 6),
                    "y": round(lm.y, 6),
                    "z": round(lm.z, 6),
                    "visibility": round(lm.visibility, 4)
                }
                for lm in results.pose_landmarks.landmark
            ]

        # Pose world landmarks (3D in meters, hip-centered)
        if results.pose_world_landmarks:
            response["poseWorldLandmarks"] = [
                {
                    "x": round(lm.x, 6),
                    "y": round(lm.y, 6),
                    "z": round(lm.z, 6),
                    "visibility": round(lm.visibility, 4)
                }
                for lm in results.pose_world_landmarks.landmark
            ]

        # Face landmarks (468 or 478 with iris refinement)
        if results.face_landmarks:
            response["faceLandmarks"] = [
                {
                    "x": round(lm.x, 6),
                    "y": round(lm.y, 6),
                    "z": round(lm.z, 6)
                }
                for lm in results.face_landmarks.landmark
            ]

        # Left hand landmarks (21 points)
        # Note: MediaPipe swaps left/right when viewing mirrored
        if results.left_hand_landmarks:
            response["leftHandLandmarks"] = [
                {
                    "x": round(lm.x, 6),
                    "y": round(lm.y, 6),
                    "z": round(lm.z, 6)
                }
                for lm in results.left_hand_landmarks.landmark
            ]

        # Right hand landmarks (21 points)
        if results.right_hand_landmarks:
            response["rightHandLandmarks"] = [
                {
                    "x": round(lm.x, 6),
                    "y": round(lm.y, 6),
                    "z": round(lm.z, 6)
                }
                for lm in results.right_hand_landmarks.landmark
            ]

        # Log summary
        logger.info(
            f"Extracted landmarks: pose={len(response['poseLandmarks']) if response['poseLandmarks'] else 0}, "
            f"face={len(response['faceLandmarks']) if response['faceLandmarks'] else 0}, "
            f"leftHand={len(response['leftHandLandmarks']) if response['leftHandLandmarks'] else 0}, "
            f"rightHand={len(response['rightHandLandmarks']) if response['rightHandLandmarks'] else 0}, "
            f"time={processing_time:.1f}ms"
        )

        return response

    def extract_from_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Extract landmarks from raw image bytes.

        Args:
            image_bytes: Raw image bytes (JPEG, PNG, etc.)

        Returns:
            Same as extract_landmarks()
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                return {
                    "success": False,
                    "error": "decode_failed",
                    "message": "Failed to decode image"
                }

            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            return self.extract_landmarks(image)

        except Exception as e:
            logger.error(f"Error extracting landmarks from bytes: {e}")
            return {
                "success": False,
                "error": "processing_failed",
                "message": str(e)
            }

    def __del__(self):
        """Cleanup MediaPipe resources."""
        if hasattr(self, 'holistic') and self.holistic:
            self.holistic.close()
