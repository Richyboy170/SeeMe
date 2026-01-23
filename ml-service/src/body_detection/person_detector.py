"""
Multi-Person Detection and Selection
Phase 3.1: Full-Body 3D Avatar System

Detects ALL people in an image and returns bounding boxes.
User will select which person to use for avatar creation.
"""

import mediapipe as mp
import numpy as np
import cv2
from PIL import Image
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from loguru import logger
import time


@dataclass
class DetectedPerson:
    """A single detected person in the image."""
    person_id: int
    bounding_box: Dict[str, float]  # {x, y, width, height} normalized 0-1
    confidence: float
    body_coverage: float  # How much of body is visible (0-1)
    landmark_preview: List[Dict[str, Any]]  # Key landmarks for preview

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


class MultiPersonDetector:
    """
    Detects ALL people in an image and returns bounding boxes.
    User will select which person to use for avatar.

    This ONLY runs when user explicitly taps "Create 3D Avatar" button.
    """

    def __init__(self, model_complexity: int = 1):
        """
        Initialize the multi-person detector.

        Args:
            model_complexity: 0 = lite, 1 = full, 2 = heavy
        """
        # Use MediaPipe Pose for person detection
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=model_complexity,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Also use face detection for additional person finding
        self.mp_face = mp.solutions.face_detection
        self.face_detection = self.mp_face.FaceDetection(
            model_selection=1,  # Full range
            min_detection_confidence=0.5
        )

        logger.info(f"MultiPersonDetector initialized with complexity={model_complexity}")

    def detect_all_people(self, image: np.ndarray) -> List[DetectedPerson]:
        """
        Detect all people in image and return their bounding boxes.

        Note: MediaPipe Pose is designed for single-person detection.
        For true multi-person detection, we use face detection first,
        then try pose detection on the full image.

        Args:
            image: RGB image as numpy array (HxWxC)

        Returns:
            List of DetectedPerson with bounding boxes for UI selection
        """
        start_time = time.time()

        if image is None or len(image.shape) != 3:
            return []

        height, width = image.shape[:2]
        detected_people = []

        # First, try full pose detection
        results = self.pose.process(image)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            # Calculate bounding box from landmarks
            visible_x = [lm.x for lm in landmarks if lm.visibility > 0.3]
            visible_y = [lm.y for lm in landmarks if lm.visibility > 0.3]

            if visible_x and visible_y:
                # Add padding
                padding = 0.05
                x_min = max(0, min(visible_x) - padding)
                y_min = max(0, min(visible_y) - padding)
                x_max = min(1, max(visible_x) + padding)
                y_max = min(1, max(visible_y) + padding)

                bbox = {
                    "x": x_min,
                    "y": y_min,
                    "width": x_max - x_min,
                    "height": y_max - y_min
                }

                # Calculate body coverage
                visible_count = sum(1 for lm in landmarks if lm.visibility > 0.5)
                body_coverage = visible_count / len(landmarks)

                # Key landmarks for preview (normalized coordinates)
                preview_landmarks = self._get_preview_landmarks(landmarks)

                # Calculate confidence
                avg_confidence = np.mean([lm.visibility for lm in landmarks])

                detected_people.append(DetectedPerson(
                    person_id=0,
                    bounding_box=bbox,
                    confidence=round(avg_confidence, 3),
                    body_coverage=round(body_coverage, 3),
                    landmark_preview=preview_landmarks
                ))

        # Also check faces that might not have full body visible
        face_results = self.face_detection.process(image)

        if face_results.detections:
            for idx, detection in enumerate(face_results.detections):
                bbox_rel = detection.location_data.relative_bounding_box

                # Check if this face is already covered by detected person
                face_center_x = bbox_rel.xmin + bbox_rel.width / 2
                face_center_y = bbox_rel.ymin + bbox_rel.height / 2

                already_detected = False
                for person in detected_people:
                    pb = person.bounding_box
                    if (pb["x"] <= face_center_x <= pb["x"] + pb["width"] and
                        pb["y"] <= face_center_y <= pb["y"] + pb["height"]):
                        already_detected = True
                        break

                if not already_detected and len(detected_people) < 5:  # Max 5 people
                    # Create a person entry from face detection
                    # Estimate body bounding box (face is typically 1/7 of body height)
                    face_height = bbox_rel.height
                    estimated_body_height = min(1.0, face_height * 6)
                    body_top = bbox_rel.ymin
                    body_bottom = min(1.0, body_top + estimated_body_height)

                    bbox = {
                        "x": max(0, bbox_rel.xmin - bbox_rel.width * 0.5),
                        "y": body_top,
                        "width": min(1.0, bbox_rel.width * 2),
                        "height": body_bottom - body_top
                    }

                    detected_people.append(DetectedPerson(
                        person_id=len(detected_people),
                        bounding_box=bbox,
                        confidence=round(detection.score[0], 3),
                        body_coverage=0.3,  # Lower coverage since only face detected
                        landmark_preview=[{
                            "name": "face_center",
                            "x": face_center_x,
                            "y": face_center_y
                        }]
                    ))

        processing_time = (time.time() - start_time) * 1000
        logger.info(f"Detected {len(detected_people)} people in {processing_time:.1f}ms")

        return detected_people

    def _get_preview_landmarks(self, landmarks) -> List[Dict[str, Any]]:
        """Extract key landmarks for UI preview."""
        # Key indices for preview: nose, shoulders, hips
        key_indices = [
            (0, "nose"),
            (11, "left_shoulder"),
            (12, "right_shoulder"),
            (23, "left_hip"),
            (24, "right_hip"),
        ]

        preview = []
        for idx, name in key_indices:
            if idx < len(landmarks):
                lm = landmarks[idx]
                preview.append({
                    "name": name,
                    "x": round(lm.x, 4),
                    "y": round(lm.y, 4),
                    "visibility": round(lm.visibility, 3)
                })

        return preview

    def detect_from_bytes(self, image_bytes: bytes) -> List[DetectedPerson]:
        """
        Detect people from raw image bytes.

        Args:
            image_bytes: Raw image bytes

        Returns:
            List of DetectedPerson
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                return []

            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            return self.detect_all_people(image)

        except Exception as e:
            logger.error(f"Error detecting people from bytes: {e}")
            return []

    def to_dict(self, people: List[DetectedPerson]) -> Dict[str, Any]:
        """
        Convert detection results to JSON-serializable dict.

        Args:
            people: List of detected people

        Returns:
            {
                "person_count": int,
                "people": list of person dicts,
                "selection_required": bool (true if multiple people)
            }
        """
        return {
            "person_count": len(people),
            "people": [p.to_dict() for p in people],
            "selection_required": len(people) > 1
        }

    def __del__(self):
        """Cleanup MediaPipe resources."""
        if hasattr(self, 'pose') and self.pose:
            self.pose.close()
        if hasattr(self, 'face_detection') and self.face_detection:
            self.face_detection.close()
