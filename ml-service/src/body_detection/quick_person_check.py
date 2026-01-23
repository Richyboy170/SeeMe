"""
Quick Person Detection for Content Policy Enforcement
Phase 3.1: Full-Body 3D Avatar System

Fast, lightweight person detection that runs on EVERY image before posting.
Processing time target: <200ms
"""

import mediapipe as mp
import numpy as np
import cv2
from PIL import Image
from typing import Dict, Any
from loguru import logger
import time


class QuickPersonDetector:
    """
    Fast, lightweight person detection for content policy enforcement.
    Runs on EVERY image before posting.

    NOT for skeleton extraction - just yes/no person detection.

    Why this exists:
    - Protects user privacy
    - Prevents posting photos of others without consent
    - Core app identity: avatars, not real faces
    - Makes the platform unique and safe
    """

    def __init__(self):
        """Initialize the lightweight pose detector."""
        # Use lightweight pose model (complexity=0 for speed)
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=0,  # Fastest model (0 = lite, 1 = full, 2 = heavy)
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("QuickPersonDetector initialized with lightweight model")

    def contains_person(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Quick check if image contains a person.

        Args:
            image: RGB image as numpy array (HxWxC)

        Returns:
            {
                "person_detected": bool,
                "confidence": float (0-1),
                "body_coverage": float (0-1, how much of body is visible),
                "processing_time_ms": float,
                "message": str
            }
        """
        start_time = time.time()

        # Validate input
        if image is None or len(image.shape) != 3:
            return {
                "person_detected": False,
                "confidence": 0.0,
                "body_coverage": 0.0,
                "processing_time_ms": 0.0,
                "message": "Invalid image format"
            }

        # Resize for faster processing (max dimension 640px)
        h, w = image.shape[:2]
        if max(h, w) > 640:
            scale = 640 / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            logger.debug(f"Resized image from {w}x{h} to {new_w}x{new_h}")

        # Ensure image is RGB
        if image.shape[2] == 4:  # RGBA
            image = image[:, :, :3]

        # Process with MediaPipe
        results = self.pose.process(image)

        processing_time = (time.time() - start_time) * 1000

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            # Calculate confidence from visible landmarks
            visible_count = sum(1 for lm in landmarks if lm.visibility > 0.5)
            total_landmarks = len(landmarks)
            confidence = visible_count / total_landmarks

            # Calculate body coverage (how much of the standard body parts are visible)
            key_body_parts = [
                0,   # nose
                11,  # left shoulder
                12,  # right shoulder
                23,  # left hip
                24,  # right hip
            ]
            key_visible = sum(1 for idx in key_body_parts if landmarks[idx].visibility > 0.5)
            body_coverage = key_visible / len(key_body_parts)

            logger.info(f"Person detected: confidence={confidence:.2f}, coverage={body_coverage:.2f}, time={processing_time:.1f}ms")

            return {
                "person_detected": True,
                "confidence": round(confidence, 3),
                "body_coverage": round(body_coverage, 3),
                "processing_time_ms": round(processing_time, 1),
                "message": "Person detected - must convert to 3D avatar or blur faces to post"
            }

        logger.info(f"No person detected, time={processing_time:.1f}ms")

        return {
            "person_detected": False,
            "confidence": 0.0,
            "body_coverage": 0.0,
            "processing_time_ms": round(processing_time, 1),
            "message": "No person detected - ready to post"
        }

    def check_image_from_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Check if image contains a person from raw bytes.

        Args:
            image_bytes: Raw image bytes (JPEG, PNG, etc.)

        Returns:
            Same as contains_person()
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                return {
                    "person_detected": False,
                    "confidence": 0.0,
                    "body_coverage": 0.0,
                    "processing_time_ms": 0.0,
                    "message": "Failed to decode image"
                }

            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            return self.contains_person(image)

        except Exception as e:
            logger.error(f"Error checking image: {e}")
            return {
                "person_detected": False,
                "confidence": 0.0,
                "body_coverage": 0.0,
                "processing_time_ms": 0.0,
                "message": f"Error processing image: {str(e)}"
            }

    def check_image_from_pil(self, pil_image: Image.Image) -> Dict[str, Any]:
        """
        Check if image contains a person from PIL Image.

        Args:
            pil_image: PIL Image object

        Returns:
            Same as contains_person()
        """
        try:
            # Convert to RGB if necessary
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')

            # Convert to numpy array
            image_array = np.array(pil_image)

            return self.contains_person(image_array)

        except Exception as e:
            logger.error(f"Error checking PIL image: {e}")
            return {
                "person_detected": False,
                "confidence": 0.0,
                "body_coverage": 0.0,
                "processing_time_ms": 0.0,
                "message": f"Error processing image: {str(e)}"
            }

    def __del__(self):
        """Cleanup MediaPipe resources."""
        if hasattr(self, 'pose') and self.pose:
            self.pose.close()
