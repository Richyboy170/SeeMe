"""
Full Skeleton Extraction with Fingers
Phase 3.1: Full-Body 3D Avatar System

Extracts COMPLETE skeleton including all finger joints (75 keypoints total):
- Body: 33 keypoints (MediaPipe Pose)
- Left Hand: 21 keypoints (MediaPipe Hands)
- Right Hand: 21 keypoints (MediaPipe Hands)

Uses MediaPipe Holistic for combined detection.
"""

import mediapipe as mp
import numpy as np
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any, Tuple
from loguru import logger
import time


@dataclass
class SkeletonKeypoint:
    """Single skeleton keypoint with 3D coordinates."""
    name: str
    x: float          # Normalized 0-1 (image space)
    y: float          # Normalized 0-1
    z: float          # Depth (relative)
    visibility: float # 0-1 confidence
    world_x: float    # Real-world meters
    world_y: float
    world_z: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "position": {"x": self.x, "y": self.y, "z": self.z},
            "world_position": {"x": self.world_x, "y": self.world_y, "z": self.world_z},
            "visibility": self.visibility
        }


@dataclass
class FullBodySkeleton:
    """Complete body skeleton with ALL keypoints including fingers."""
    body_keypoints: List[SkeletonKeypoint]      # 33 body points
    left_hand_keypoints: List[SkeletonKeypoint]  # 21 finger points
    right_hand_keypoints: List[SkeletonKeypoint] # 21 finger points
    total_keypoints: int  # 75 total
    pose_type: str  # standing, sitting, etc.
    facing_direction: str  # front, back, side
    confidence: float
    hands_detected: bool
    processing_time_ms: float


class FullSkeletonExtractor:
    """
    Extracts COMPLETE skeleton including all finger joints.
    Uses MediaPipe Holistic for body + hands combined detection.

    Total keypoints: 75
    - Body: 33 keypoints
    - Left Hand: 21 keypoints (wrist + 4 per finger x 5 fingers)
    - Right Hand: 21 keypoints
    """

    # MediaPipe Pose Landmarks (33 points)
    BODY_LANDMARK_NAMES = [
        "nose", "left_eye_inner", "left_eye", "left_eye_outer",
        "right_eye_inner", "right_eye", "right_eye_outer",
        "left_ear", "right_ear", "mouth_left", "mouth_right",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_pinky", "right_pinky",
        "left_index", "right_index", "left_thumb", "right_thumb",
        "left_hip", "right_hip", "left_knee", "right_knee",
        "left_ankle", "right_ankle", "left_heel", "right_heel",
        "left_foot_index", "right_foot_index"
    ]

    # MediaPipe Hand Landmarks (21 points per hand)
    HAND_LANDMARK_NAMES = [
        "wrist",
        "thumb_cmc", "thumb_mcp", "thumb_ip", "thumb_tip",
        "index_mcp", "index_pip", "index_dip", "index_tip",
        "middle_mcp", "middle_pip", "middle_dip", "middle_tip",
        "ring_mcp", "ring_pip", "ring_dip", "ring_tip",
        "pinky_mcp", "pinky_pip", "pinky_dip", "pinky_tip"
    ]

    # Bone connections for full skeleton (for visualization/rigging)
    BODY_BONES = [
        ("left_shoulder", "right_shoulder"),
        ("left_shoulder", "left_elbow"),
        ("left_elbow", "left_wrist"),
        ("right_shoulder", "right_elbow"),
        ("right_elbow", "right_wrist"),
        ("left_shoulder", "left_hip"),
        ("right_shoulder", "right_hip"),
        ("left_hip", "right_hip"),
        ("left_hip", "left_knee"),
        ("left_knee", "left_ankle"),
        ("right_hip", "right_knee"),
        ("right_knee", "right_ankle"),
        # Face connections
        ("nose", "left_eye_inner"),
        ("nose", "right_eye_inner"),
        ("left_eye_inner", "left_eye"),
        ("right_eye_inner", "right_eye"),
    ]

    # Finger bone connections (same pattern for both hands)
    FINGER_BONES = [
        ("wrist", "thumb_cmc"), ("thumb_cmc", "thumb_mcp"),
        ("thumb_mcp", "thumb_ip"), ("thumb_ip", "thumb_tip"),
        ("wrist", "index_mcp"), ("index_mcp", "index_pip"),
        ("index_pip", "index_dip"), ("index_dip", "index_tip"),
        ("wrist", "middle_mcp"), ("middle_mcp", "middle_pip"),
        ("middle_pip", "middle_dip"), ("middle_dip", "middle_tip"),
        ("wrist", "ring_mcp"), ("ring_mcp", "ring_pip"),
        ("ring_pip", "ring_dip"), ("ring_dip", "ring_tip"),
        ("wrist", "pinky_mcp"), ("pinky_mcp", "pinky_pip"),
        ("pinky_pip", "pinky_dip"), ("pinky_dip", "pinky_tip"),
    ]

    def __init__(self, model_complexity: int = 2):
        """
        Initialize the skeleton extractor.

        Args:
            model_complexity: 0 = lite, 1 = full, 2 = heavy (most accurate)
        """
        # Use Holistic for combined body + hands detection
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            static_image_mode=True,
            model_complexity=model_complexity,
            enable_segmentation=True,
            refine_face_landmarks=False,  # Don't need face mesh
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        logger.info(f"FullSkeletonExtractor initialized with complexity={model_complexity}")

    def extract_full_skeleton(
        self,
        image: np.ndarray,
        person_bbox: Optional[Dict[str, float]] = None
    ) -> Optional[FullBodySkeleton]:
        """
        Extract COMPLETE skeleton including fingers from image.

        Args:
            image: RGB image as numpy array (HxWxC)
            person_bbox: Optional bounding box {x, y, width, height} if user
                        selected specific person (normalized 0-1)

        Returns:
            FullBodySkeleton with body + both hands (75 keypoints),
            or None if no person detected
        """
        start_time = time.time()

        if image is None or len(image.shape) != 3:
            return None

        original_h, original_w = image.shape[:2]

        # If bbox provided, crop to selected person
        if person_bbox:
            x1 = int(person_bbox["x"] * original_w)
            y1 = int(person_bbox["y"] * original_h)
            x2 = int((person_bbox["x"] + person_bbox["width"]) * original_w)
            y2 = int((person_bbox["y"] + person_bbox["height"]) * original_h)

            # Ensure valid crop
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(original_w, x2)
            y2 = min(original_h, y2)

            if x2 > x1 and y2 > y1:
                image = image[y1:y2, x1:x2]
                logger.debug(f"Cropped to person bbox: {x1},{y1} to {x2},{y2}")

        # Use Holistic for body + hands combined
        results = self.holistic.process(image)

        if not results.pose_landmarks:
            logger.warning("No pose detected in image")
            return None

        # Extract body keypoints (33 points)
        body_keypoints = self._extract_body_keypoints(
            results.pose_landmarks.landmark,
            results.pose_world_landmarks.landmark if results.pose_world_landmarks else None
        )

        # Extract LEFT hand keypoints (21 points)
        left_hand_keypoints = self._extract_hand_keypoints(
            results.left_hand_landmarks, "left"
        )

        # Extract RIGHT hand keypoints (21 points)
        right_hand_keypoints = self._extract_hand_keypoints(
            results.right_hand_landmarks, "right"
        )

        hands_detected = (results.left_hand_landmarks is not None or
                         results.right_hand_landmarks is not None)

        # Determine pose type and facing direction
        pose_type = self._classify_pose(body_keypoints)
        facing_direction = self._get_facing_direction(body_keypoints)

        # Calculate overall confidence
        confidence = np.mean([kp.visibility for kp in body_keypoints])

        processing_time = (time.time() - start_time) * 1000

        logger.info(
            f"Extracted skeleton: {len(body_keypoints)} body + "
            f"{len(left_hand_keypoints)} left + {len(right_hand_keypoints)} right, "
            f"hands_detected={hands_detected}, time={processing_time:.1f}ms"
        )

        return FullBodySkeleton(
            body_keypoints=body_keypoints,
            left_hand_keypoints=left_hand_keypoints,
            right_hand_keypoints=right_hand_keypoints,
            total_keypoints=len(body_keypoints) + len(left_hand_keypoints) + len(right_hand_keypoints),
            pose_type=pose_type,
            facing_direction=facing_direction,
            confidence=round(confidence, 3),
            hands_detected=hands_detected,
            processing_time_ms=round(processing_time, 1)
        )

    def _extract_body_keypoints(
        self,
        pose_landmarks,
        world_landmarks
    ) -> List[SkeletonKeypoint]:
        """Extract 33 body keypoints."""
        keypoints = []

        for i, pose_lm in enumerate(pose_landmarks):
            # Get world coordinates if available
            if world_landmarks and i < len(world_landmarks):
                world_lm = world_landmarks[i]
                world_x, world_y, world_z = world_lm.x, world_lm.y, world_lm.z
            else:
                world_x, world_y, world_z = pose_lm.x, pose_lm.y, pose_lm.z

            name = self.BODY_LANDMARK_NAMES[i] if i < len(self.BODY_LANDMARK_NAMES) else f"body_{i}"

            keypoint = SkeletonKeypoint(
                name=name,
                x=round(pose_lm.x, 5),
                y=round(pose_lm.y, 5),
                z=round(pose_lm.z, 5),
                visibility=round(pose_lm.visibility, 3),
                world_x=round(world_x, 5),
                world_y=round(world_y, 5),
                world_z=round(world_z, 5)
            )
            keypoints.append(keypoint)

        return keypoints

    def _extract_hand_keypoints(
        self,
        hand_landmarks,
        hand_side: str
    ) -> List[SkeletonKeypoint]:
        """
        Extract 21 keypoints for a single hand.

        Args:
            hand_landmarks: MediaPipe hand landmarks or None
            hand_side: "left" or "right"

        Returns:
            List of 21 SkeletonKeypoints
        """
        if hand_landmarks is None:
            # Return default hand pose if not detected
            return self._get_default_hand_keypoints(hand_side)

        keypoints = []
        for i, lm in enumerate(hand_landmarks.landmark):
            name = f"{hand_side}_{self.HAND_LANDMARK_NAMES[i]}" if i < len(self.HAND_LANDMARK_NAMES) else f"{hand_side}_hand_{i}"

            keypoint = SkeletonKeypoint(
                name=name,
                x=round(lm.x, 5),
                y=round(lm.y, 5),
                z=round(lm.z, 5),
                visibility=1.0,  # Hand landmarks don't have visibility
                world_x=round(lm.x, 5),  # Approximate (hands don't have world coords)
                world_y=round(lm.y, 5),
                world_z=round(lm.z, 5)
            )
            keypoints.append(keypoint)

        return keypoints

    def _get_default_hand_keypoints(self, hand_side: str) -> List[SkeletonKeypoint]:
        """
        Return default relaxed hand pose when hand not detected.
        """
        keypoints = []
        for name in self.HAND_LANDMARK_NAMES:
            keypoints.append(SkeletonKeypoint(
                name=f"{hand_side}_{name}",
                x=0.0, y=0.0, z=0.0,
                visibility=0.0,  # Mark as not detected
                world_x=0.0, world_y=0.0, world_z=0.0
            ))
        return keypoints

    def _classify_pose(self, keypoints: List[SkeletonKeypoint]) -> str:
        """
        Classify the type of pose (standing, sitting, etc.).
        """
        kp_dict = {kp.name: kp for kp in keypoints}

        # Get key joints
        left_hip = kp_dict.get("left_hip")
        left_knee = kp_dict.get("left_knee")
        left_ankle = kp_dict.get("left_ankle")

        if not all([left_hip, left_knee, left_ankle]):
            return "unknown"

        # Check visibility
        if left_hip.visibility < 0.5 or left_knee.visibility < 0.5:
            return "partial"

        # Calculate leg angles
        hip_to_knee = abs(left_knee.y - left_hip.y)
        knee_to_ankle = abs(left_ankle.y - left_knee.y)

        # If knee is close to hip level, likely sitting
        if hip_to_knee < knee_to_ankle * 0.5:
            return "sitting"

        # Check if person is lying down (hip and ankle at similar Y)
        if abs(left_hip.y - left_ankle.y) < 0.2:
            return "lying"

        return "standing"

    def _get_facing_direction(self, keypoints: List[SkeletonKeypoint]) -> str:
        """
        Determine if person is facing front, back, or side.
        """
        kp_dict = {kp.name: kp for kp in keypoints}

        left_shoulder = kp_dict.get("left_shoulder")
        right_shoulder = kp_dict.get("right_shoulder")
        nose = kp_dict.get("nose")

        if not all([left_shoulder, right_shoulder, nose]):
            return "unknown"

        # Check shoulder alignment (Z difference)
        shoulder_z_diff = abs(left_shoulder.z - right_shoulder.z)

        if shoulder_z_diff > 0.1:
            return "side"

        # Check if nose is in front of or behind shoulders
        avg_shoulder_z = (left_shoulder.z + right_shoulder.z) / 2

        if nose.z < avg_shoulder_z - 0.05:
            return "front"
        elif nose.z > avg_shoulder_z + 0.05:
            return "back"

        return "front"

    def to_dict(self, skeleton: FullBodySkeleton) -> Dict[str, Any]:
        """
        Convert full skeleton to JSON for API response.
        """
        return {
            "body_keypoints": [kp.to_dict() for kp in skeleton.body_keypoints],
            "left_hand_keypoints": [kp.to_dict() for kp in skeleton.left_hand_keypoints],
            "right_hand_keypoints": [kp.to_dict() for kp in skeleton.right_hand_keypoints],
            "total_keypoints": skeleton.total_keypoints,
            "hands_detected": skeleton.hands_detected,
            "pose_type": skeleton.pose_type,
            "facing_direction": skeleton.facing_direction,
            "confidence": skeleton.confidence,
            "processing_time_ms": skeleton.processing_time_ms,
            "body_bones": self.BODY_BONES,
            "finger_bones": self.FINGER_BONES
        }

    def extract_from_bytes(
        self,
        image_bytes: bytes,
        person_bbox: Optional[Dict[str, float]] = None
    ) -> Optional[FullBodySkeleton]:
        """
        Extract skeleton from raw image bytes.
        """
        import cv2

        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                return None

            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            return self.extract_full_skeleton(image, person_bbox)

        except Exception as e:
            logger.error(f"Error extracting skeleton from bytes: {e}")
            return None

    def __del__(self):
        """Cleanup MediaPipe resources."""
        if hasattr(self, 'holistic') and self.holistic:
            self.holistic.close()
