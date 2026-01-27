# MASTER_3D.md - Phase 3.1: Full-Body 3D Avatar & Skeleton CV System

## Overview

This document provides complete instructions for building a **sandbox within the SeeMe project** for:
1. **3D Avatar Rendering System** - VRM model loading, bone manipulation, real-time rendering
2. **Skeleton Computer Vision** - MediaPipe pose detection, landmark extraction, pose-to-rig mapping

The sandbox lives in `SeeMe/sandbox-3d/` and can be directly referenced when integrating into the main project.

---

## Table of Contents

1. [Sandbox Directory Structure](#1-sandbox-directory-structure)
2. [Setup Instructions](#2-setup-instructions)
3. [Part A: CV Service (Python)](#3-part-a-cv-service-python)
4. [Part B: Mobile 3D Renderer (React Native)](#4-part-b-mobile-3d-renderer-react-native)
5. [Part C: Integration Service](#5-part-c-integration-service)
6. [Data Structures & Interfaces](#6-data-structures--interfaces)
7. [Testing](#7-testing)
8. [Performance Targets](#8-performance-targets)
9. [Integration to Main Project](#9-integration-to-main-project)

---

## 1. Sandbox Directory Structure

Create this exact structure inside `SeeMe/`:

```
SeeMe/
├── sandbox-3d/                          # <- CREATE THIS FOLDER
│   │
│   ├── cv-service/                      # Python FastAPI CV Service
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── body_detection/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── person_detector.py
│   │   │   │   ├── holistic_landmarks.py
│   │   │   │   ├── skeleton_extractor.py
│   │   │   │   └── pose_to_rig.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   └── body_avatar.py
│   │   │   └── utils/
│   │   │       ├── __init__.py
│   │   │       └── math_utils.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_person_detector.py
│   │   │   ├── test_holistic.py
│   │   │   ├── test_skeleton.py
│   │   │   └── test_pose_mapper.py
│   │   ├── test_images/                 # Test images with people
│   │   │   └── .gitkeep
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── README.md
│   │
│   ├── mobile-renderer/                 # React Native 3D Test App
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── VRMAvatarRenderer.tsx
│   │   │   ├── services/
│   │   │   │   ├── vrmLoaderService.ts
│   │   │   │   ├── boneController.ts
│   │   │   │   ├── poseService.ts
│   │   │   │   └── avatarApiService.ts
│   │   │   ├── types/
│   │   │   │   └── pose.ts
│   │   │   └── screens/
│   │   │       └── TestScreen.tsx
│   │   ├── assets/
│   │   │   └── models/                  # VRM test models
│   │   │       └── .gitkeep
│   │   ├── App.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app.json
│   │   └── README.md
│   │
│   └── README.md                        # Sandbox overview
│
├── mobile/                              # Main mobile app (existing)
├── backend/                             # Main backend (existing)
├── ml-service/                          # Main ML service (existing)
└── MASTER_3D.md                         # This file
```

---

## 2. Setup Instructions

### Step 1: Create Directory Structure

Run these commands from `SeeMe/` root:

```bash
# Create sandbox root
mkdir sandbox-3d
cd sandbox-3d

# Create CV service structure
mkdir -p cv-service/src/body_detection
mkdir -p cv-service/src/routes
mkdir -p cv-service/src/utils
mkdir -p cv-service/tests
mkdir -p cv-service/test_images

# Create mobile renderer structure
mkdir -p mobile-renderer/src/components
mkdir -p mobile-renderer/src/services
mkdir -p mobile-renderer/src/types
mkdir -p mobile-renderer/src/screens
mkdir -p mobile-renderer/assets/models

# Create placeholder files
touch cv-service/src/__init__.py
touch cv-service/src/body_detection/__init__.py
touch cv-service/src/routes/__init__.py
touch cv-service/src/utils/__init__.py
touch cv-service/tests/__init__.py
touch cv-service/test_images/.gitkeep
touch mobile-renderer/assets/models/.gitkeep
```

### Step 2: Setup CV Service

```bash
cd sandbox-3d/cv-service

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
# source venv/bin/activate

# Install dependencies (after creating requirements.txt)
pip install -r requirements.txt
```

### Step 3: Setup Mobile Renderer

```bash
cd sandbox-3d/mobile-renderer

# Install dependencies (after creating package.json)
npm install

# Start Expo
npx expo start
```

---

## 3. Part A: CV Service (Python)

### File: `sandbox-3d/cv-service/requirements.txt`

```txt
fastapi==0.115.0
uvicorn[standard]==0.34.0
mediapipe==0.10.30
opencv-python==4.10.0.84
numpy==1.26.0
scipy==1.14.0
pillow==11.0.0
pydantic==2.10.0
python-multipart==0.0.17
pytest==8.0.0
pytest-asyncio==0.23.0
httpx==0.27.0
```

---

### File: `sandbox-3d/cv-service/src/body_detection/__init__.py`

```python
from .person_detector import PersonDetector
from .holistic_landmarks import HolisticLandmarksExtractor
from .skeleton_extractor import SkeletonExtractor
from .pose_to_rig import PoseToRigMapper

__all__ = [
    "PersonDetector",
    "HolisticLandmarksExtractor",
    "SkeletonExtractor",
    "PoseToRigMapper",
]
```

---

### File: `sandbox-3d/cv-service/src/body_detection/person_detector.py`

```python
"""
Person detection using MediaPipe Pose.
Detects if a human is present in the image and returns bounding box.
"""

import mediapipe as mp
import numpy as np
import cv2
from typing import Dict, Any, Optional


class PersonDetector:
    """Detects humans in images using MediaPipe Pose."""

    def __init__(self, min_detection_confidence: float = 0.5):
        """
        Initialize person detector.

        Args:
            min_detection_confidence: Minimum confidence for detection (0-1)
        """
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=0.5
        )
        self._is_closed = False

    def detect(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Detect person in image.

        Args:
            image: RGB numpy array (H, W, 3)

        Returns:
            Dict with:
                - detected: bool
                - confidence: float (0-1)
                - bounding_box: {x_min, y_min, x_max, y_max} or None
        """
        if self._is_closed:
            raise RuntimeError("Detector has been closed")

        # Ensure RGB format
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

        results = self.pose.process(image)

        if not results.pose_landmarks:
            return {
                "detected": False,
                "confidence": 0.0,
                "bounding_box": None
            }

        # Calculate bounding box from landmarks
        landmarks = results.pose_landmarks.landmark
        h, w = image.shape[:2]

        visible_landmarks = [
            (lm.x * w, lm.y * h)
            for lm in landmarks
            if lm.visibility > 0.5
        ]

        if not visible_landmarks:
            return {
                "detected": False,
                "confidence": 0.0,
                "bounding_box": None
            }

        x_coords = [p[0] for p in visible_landmarks]
        y_coords = [p[1] for p in visible_landmarks]

        # Add padding (10%)
        padding_x = (max(x_coords) - min(x_coords)) * 0.1
        padding_y = (max(y_coords) - min(y_coords)) * 0.1

        bbox = {
            "x_min": max(0, int(min(x_coords) - padding_x)),
            "y_min": max(0, int(min(y_coords) - padding_y)),
            "x_max": min(w, int(max(x_coords) + padding_x)),
            "y_max": min(h, int(max(y_coords) + padding_y))
        }

        # Average visibility as confidence
        confidence = float(np.mean([lm.visibility for lm in landmarks]))

        return {
            "detected": True,
            "confidence": confidence,
            "bounding_box": bbox
        }

    def close(self):
        """Release resources."""
        if not self._is_closed:
            self.pose.close()
            self._is_closed = True

    def __del__(self):
        self.close()
```

---

### File: `sandbox-3d/cv-service/src/body_detection/holistic_landmarks.py`

```python
"""
Holistic landmark extraction using MediaPipe.
Extracts body (33), face (478), and hand (21 each) landmarks.
"""

import mediapipe as mp
import numpy as np
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class Landmark:
    """Single landmark point."""
    x: float      # Normalized 0-1, left-to-right
    y: float      # Normalized 0-1, top-to-bottom (Y-DOWN)
    z: float      # Depth relative to hip
    visibility: float


class HolisticLandmarksExtractor:
    """
    Extracts full body, face, and hand landmarks using MediaPipe Holistic.

    Landmark counts:
    - Pose: 33 landmarks
    - Face: 478 landmarks
    - Left Hand: 21 landmarks
    - Right Hand: 21 landmarks
    - Total: 553 landmarks
    """

    # MediaPipe Pose landmark indices
    POSE_LANDMARK_NAMES = {
        0: "nose",
        1: "left_eye_inner",
        2: "left_eye",
        3: "left_eye_outer",
        4: "right_eye_inner",
        5: "right_eye",
        6: "right_eye_outer",
        7: "left_ear",
        8: "right_ear",
        9: "mouth_left",
        10: "mouth_right",
        11: "left_shoulder",
        12: "right_shoulder",
        13: "left_elbow",
        14: "right_elbow",
        15: "left_wrist",
        16: "right_wrist",
        17: "left_pinky",
        18: "right_pinky",
        19: "left_index",
        20: "right_index",
        21: "left_thumb",
        22: "right_thumb",
        23: "left_hip",
        24: "right_hip",
        25: "left_knee",
        26: "right_knee",
        27: "left_ankle",
        28: "right_ankle",
        29: "left_heel",
        30: "right_heel",
        31: "left_foot_index",
        32: "right_foot_index",
    }

    def __init__(
        self,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_complexity: int = 1
    ):
        """
        Initialize holistic extractor.

        Args:
            min_detection_confidence: Minimum detection confidence (0-1)
            min_tracking_confidence: Minimum tracking confidence (0-1)
            model_complexity: 0, 1, or 2 (higher = more accurate, slower)
        """
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            static_image_mode=True,
            model_complexity=model_complexity,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            refine_face_landmarks=True
        )
        self._is_closed = False

    def extract(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract all holistic landmarks from image.

        Args:
            image: RGB numpy array (H, W, 3)

        Returns:
            Dict containing:
                - success: bool
                - pose_landmarks: List of 33 landmarks (normalized coords)
                - pose_world_landmarks: List of 33 landmarks (meters, hip-centered)
                - face_landmarks: List of 478 landmarks
                - left_hand_landmarks: List of 21 landmarks
                - right_hand_landmarks: List of 21 landmarks
        """
        if self._is_closed:
            raise RuntimeError("Extractor has been closed")

        results = self.holistic.process(image)

        output = {
            "success": False,
            "pose_landmarks": None,
            "pose_world_landmarks": None,
            "face_landmarks": None,
            "left_hand_landmarks": None,
            "right_hand_landmarks": None,
        }

        # Extract pose landmarks (normalized image coordinates)
        if results.pose_landmarks:
            output["success"] = True
            output["pose_landmarks"] = self._convert_landmarks(
                results.pose_landmarks.landmark
            )

        # Extract pose world landmarks (3D in meters, hip-centered)
        if results.pose_world_landmarks:
            output["pose_world_landmarks"] = self._convert_landmarks(
                results.pose_world_landmarks.landmark
            )

        # Extract face landmarks
        if results.face_landmarks:
            output["face_landmarks"] = self._convert_landmarks(
                results.face_landmarks.landmark
            )

        # Extract hand landmarks
        if results.left_hand_landmarks:
            output["left_hand_landmarks"] = self._convert_landmarks(
                results.left_hand_landmarks.landmark
            )

        if results.right_hand_landmarks:
            output["right_hand_landmarks"] = self._convert_landmarks(
                results.right_hand_landmarks.landmark
            )

        return output

    def _convert_landmarks(self, landmarks) -> List[Dict[str, float]]:
        """Convert MediaPipe landmarks to list of dicts."""
        return [
            {
                "x": float(lm.x),
                "y": float(lm.y),
                "z": float(lm.z),
                "visibility": float(getattr(lm, 'visibility', 1.0))
            }
            for lm in landmarks
        ]

    def get_named_pose_landmarks(
        self,
        pose_landmarks: List[Dict[str, float]]
    ) -> Dict[str, Dict[str, float]]:
        """
        Convert pose landmarks list to named dictionary.

        Args:
            pose_landmarks: List of 33 pose landmarks

        Returns:
            Dict mapping landmark names to coordinates
        """
        if not pose_landmarks:
            return {}

        return {
            name: pose_landmarks[idx]
            for idx, name in self.POSE_LANDMARK_NAMES.items()
            if idx < len(pose_landmarks)
        }

    def close(self):
        """Release resources."""
        if not self._is_closed:
            self.holistic.close()
            self._is_closed = True

    def __del__(self):
        self.close()
```

---

### File: `sandbox-3d/cv-service/src/body_detection/skeleton_extractor.py`

```python
"""
Skeleton extraction from MediaPipe landmarks.
Builds hierarchical bone structure from pose landmarks.
"""

import numpy as np
from typing import Dict, List, Any, Tuple, Optional


class SkeletonExtractor:
    """
    Builds a hierarchical skeleton structure from MediaPipe landmarks.

    The skeleton hierarchy follows standard humanoid rigging:
    - Root: hips
    - Spine chain: hips -> spine -> chest -> neck -> head
    - Arm chains: chest -> shoulder -> upper_arm -> lower_arm -> hand
    - Leg chains: hips -> upper_leg -> lower_leg -> foot
    """

    # Skeleton hierarchy: joint_name -> parent_name
    SKELETON_HIERARCHY = {
        # Spine chain
        "hips": None,
        "spine": "hips",
        "chest": "spine",
        "neck": "chest",
        "head": "neck",

        # Left arm chain
        "left_shoulder": "chest",
        "left_upper_arm": "left_shoulder",
        "left_lower_arm": "left_upper_arm",
        "left_hand": "left_lower_arm",

        # Right arm chain
        "right_shoulder": "chest",
        "right_upper_arm": "right_shoulder",
        "right_lower_arm": "right_upper_arm",
        "right_hand": "right_lower_arm",

        # Left leg chain
        "left_upper_leg": "hips",
        "left_lower_leg": "left_upper_leg",
        "left_foot": "left_lower_leg",

        # Right leg chain
        "right_upper_leg": "hips",
        "right_lower_leg": "right_upper_leg",
        "right_foot": "right_lower_leg",
    }

    # Mapping from joint names to MediaPipe landmark indices
    # Tuples indicate joints derived from multiple landmarks
    JOINT_TO_LANDMARKS = {
        "hips": (23, 24),              # Average of left_hip, right_hip
        "spine": "CALCULATED",          # Midpoint between hips and chest
        "chest": (11, 12),             # Average of left_shoulder, right_shoulder
        "neck": "CALCULATED",           # Between chest and head
        "head": (0,),                  # Nose

        "left_shoulder": (11,),        # left_shoulder
        "left_upper_arm": (11,),       # Same as shoulder (rotation origin)
        "left_lower_arm": (13,),       # left_elbow
        "left_hand": (15,),            # left_wrist

        "right_shoulder": (12,),       # right_shoulder
        "right_upper_arm": (12,),      # Same as shoulder (rotation origin)
        "right_lower_arm": (14,),      # right_elbow
        "right_hand": (16,),           # right_wrist

        "left_upper_leg": (23,),       # left_hip
        "left_lower_leg": (25,),       # left_knee
        "left_foot": (27,),            # left_ankle

        "right_upper_leg": (24,),      # right_hip
        "right_lower_leg": (26,),      # right_knee
        "right_foot": (28,),           # right_ankle
    }

    def extract_skeleton(
        self,
        pose_landmarks: List[Dict[str, float]],
        use_world_coords: bool = True
    ) -> Dict[str, Any]:
        """
        Extract skeleton from pose landmarks.

        Args:
            pose_landmarks: List of 33 MediaPipe pose landmarks
            use_world_coords: If True, expects world coordinates (meters)

        Returns:
            Dict with:
                - success: bool
                - joints: Dict of joint data (position, parent, children, visibility)
                - hierarchy: Parent-child relationships
                - root: Root joint name ("hips")
                - error: Error message if failed
        """
        if not pose_landmarks or len(pose_landmarks) < 33:
            return {
                "success": False,
                "error": f"Insufficient landmarks: expected 33, got {len(pose_landmarks) if pose_landmarks else 0}"
            }

        joints = {}

        for joint_name in self.SKELETON_HIERARCHY.keys():
            position = self._calculate_joint_position(pose_landmarks, joint_name)
            visibility = self._get_joint_visibility(pose_landmarks, joint_name)

            parent = self.SKELETON_HIERARCHY.get(joint_name)
            children = [
                name for name, p in self.SKELETON_HIERARCHY.items()
                if p == joint_name
            ]

            joints[joint_name] = {
                "position": {
                    "x": position[0],
                    "y": position[1],
                    "z": position[2]
                },
                "parent": parent,
                "children": children,
                "visibility": visibility
            }

        return {
            "success": True,
            "joints": joints,
            "hierarchy": self.SKELETON_HIERARCHY,
            "root": "hips"
        }

    def _calculate_joint_position(
        self,
        landmarks: List[Dict[str, float]],
        joint_name: str
    ) -> Tuple[float, float, float]:
        """Calculate joint position from landmarks."""

        mapping = self.JOINT_TO_LANDMARKS.get(joint_name)

        # Handle calculated joints
        if mapping == "CALCULATED":
            if joint_name == "spine":
                # Midpoint between hips center and chest center
                hips = self._average_landmarks(landmarks, (23, 24))
                chest = self._average_landmarks(landmarks, (11, 12))
                return (
                    (hips[0] + chest[0]) / 2,
                    (hips[1] + chest[1]) / 2,
                    (hips[2] + chest[2]) / 2,
                )

            elif joint_name == "neck":
                # 70% from chest toward head
                chest = self._average_landmarks(landmarks, (11, 12))
                head = (landmarks[0]["x"], landmarks[0]["y"], landmarks[0]["z"])
                t = 0.3  # 30% from chest
                return (
                    chest[0] + (head[0] - chest[0]) * t,
                    chest[1] + (head[1] - chest[1]) * t,
                    chest[2] + (head[2] - chest[2]) * t,
                )

        # Handle single landmark
        if len(mapping) == 1:
            lm = landmarks[mapping[0]]
            return (lm["x"], lm["y"], lm["z"])

        # Handle averaged landmarks
        return self._average_landmarks(landmarks, mapping)

    def _average_landmarks(
        self,
        landmarks: List[Dict[str, float]],
        indices: Tuple[int, ...]
    ) -> Tuple[float, float, float]:
        """Calculate average position of multiple landmarks."""
        x = sum(landmarks[i]["x"] for i in indices) / len(indices)
        y = sum(landmarks[i]["y"] for i in indices) / len(indices)
        z = sum(landmarks[i]["z"] for i in indices) / len(indices)
        return (x, y, z)

    def _get_joint_visibility(
        self,
        landmarks: List[Dict[str, float]],
        joint_name: str
    ) -> float:
        """Get visibility score for joint."""
        mapping = self.JOINT_TO_LANDMARKS.get(joint_name)

        if mapping == "CALCULATED":
            # For calculated joints, average parent landmarks
            if joint_name == "spine":
                indices = (23, 24, 11, 12)
            elif joint_name == "neck":
                indices = (11, 12, 0)
            else:
                return 1.0
        else:
            indices = mapping

        visibilities = [landmarks[i].get("visibility", 1.0) for i in indices]
        return sum(visibilities) / len(visibilities)
```

---

### File: `sandbox-3d/cv-service/src/body_detection/pose_to_rig.py`

```python
"""
Pose-to-Rig mapping.
Converts skeleton joint positions to VRM-compatible bone rotations.
"""

import numpy as np
from typing import Dict, Any, Tuple, List, Optional
from scipy.spatial.transform import Rotation


class PoseToRigMapper:
    """
    Converts skeleton joint positions to bone rotations for VRM rigging.

    Coordinate Systems:
    - MediaPipe: X-right, Y-down, Z-toward camera
    - Three.js/VRM: X-right, Y-up, Z-toward viewer

    Output: Euler angles (XYZ order) in radians
    """

    # Rest pose bone directions (T-pose, in Three.js coordinates)
    # These define the "forward" direction for each bone at rest
    BONE_REST_DIRECTIONS = {
        # Spine points up
        "spine": np.array([0, 1, 0]),
        "chest": np.array([0, 1, 0]),
        "neck": np.array([0, 1, 0]),
        "head": np.array([0, 1, 0]),

        # Arms point outward
        "left_upper_arm": np.array([-1, 0, 0]),
        "left_lower_arm": np.array([-1, 0, 0]),
        "left_hand": np.array([-1, 0, 0]),

        "right_upper_arm": np.array([1, 0, 0]),
        "right_lower_arm": np.array([1, 0, 0]),
        "right_hand": np.array([1, 0, 0]),

        # Legs point down
        "left_upper_leg": np.array([0, -1, 0]),
        "left_lower_leg": np.array([0, -1, 0]),
        "left_foot": np.array([0, -1, 0]),

        "right_upper_leg": np.array([0, -1, 0]),
        "right_lower_leg": np.array([0, -1, 0]),
        "right_foot": np.array([0, -1, 0]),
    }

    # Mapping: VRM bone name -> (parent_joint, child_joint)
    BONE_JOINT_PAIRS = [
        ("spine", "hips", "spine"),
        ("chest", "spine", "chest"),
        ("neck", "chest", "neck"),
        ("head", "neck", "head"),

        ("leftUpperArm", "left_shoulder", "left_lower_arm"),
        ("leftLowerArm", "left_lower_arm", "left_hand"),
        ("leftHand", "left_hand", None),

        ("rightUpperArm", "right_shoulder", "right_lower_arm"),
        ("rightLowerArm", "right_lower_arm", "right_hand"),
        ("rightHand", "right_hand", None),

        ("leftUpperLeg", "left_upper_leg", "left_lower_leg"),
        ("leftLowerLeg", "left_lower_leg", "left_foot"),
        ("leftFoot", "left_foot", None),

        ("rightUpperLeg", "right_upper_leg", "right_lower_leg"),
        ("rightLowerLeg", "right_lower_leg", "right_foot"),
        ("rightFoot", "right_foot", None),
    ]

    def map_to_rig(self, skeleton: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert skeleton to VRM bone rotations.

        Args:
            skeleton: Output from SkeletonExtractor.extract_skeleton()

        Returns:
            Dict with:
                - success: bool
                - rotations: Dict[bone_name, {x, y, z}] in radians
                - error: Error message if failed
        """
        if not skeleton.get("success"):
            return {
                "success": False,
                "error": skeleton.get("error", "Invalid skeleton")
            }

        joints = skeleton["joints"]
        rotations = {}

        # Process each bone
        for vrm_bone, parent_joint, child_joint in self.BONE_JOINT_PAIRS:
            if parent_joint not in joints:
                continue

            if child_joint and child_joint in joints:
                # Calculate rotation from parent to child
                parent_pos = self._get_position(joints[parent_joint])
                child_pos = self._get_position(joints[child_joint])
                rotation = self._calculate_bone_rotation(
                    parent_pos, child_pos, vrm_bone
                )
            else:
                # Leaf bone - use parent's rotation or zero
                rotation = {"x": 0.0, "y": 0.0, "z": 0.0}

            rotations[vrm_bone] = rotation

        # Calculate hips (root) rotation
        rotations["hips"] = self._calculate_hips_rotation(joints)

        return {
            "success": True,
            "rotations": rotations
        }

    def _get_position(self, joint: Dict) -> np.ndarray:
        """Extract position array from joint dict."""
        pos = joint["position"]
        return np.array([pos["x"], pos["y"], pos["z"]])

    def _calculate_bone_rotation(
        self,
        parent_pos: np.ndarray,
        child_pos: np.ndarray,
        bone_name: str
    ) -> Dict[str, float]:
        """
        Calculate rotation to orient bone from parent to child.

        Handles coordinate conversion from MediaPipe to Three.js.
        """
        # Convert from MediaPipe (Y-down) to Three.js (Y-up)
        parent = parent_pos.copy()
        child = child_pos.copy()
        parent[1] = -parent[1]
        child[1] = -child[1]

        # Calculate bone direction
        direction = child - parent
        length = np.linalg.norm(direction)

        if length < 1e-6:
            return {"x": 0.0, "y": 0.0, "z": 0.0}

        direction = direction / length

        # Get rest direction for this bone
        rest_dir = self._get_rest_direction(bone_name)

        # Calculate rotation from rest to current
        rotation = self._rotation_between_vectors(rest_dir, direction)
        euler = rotation.as_euler('xyz')

        return {
            "x": float(euler[0]),
            "y": float(euler[1]),
            "z": float(euler[2])
        }

    def _get_rest_direction(self, bone_name: str) -> np.ndarray:
        """Get rest pose direction for bone."""
        # Try direct match
        for key, direction in self.BONE_REST_DIRECTIONS.items():
            if key in bone_name.lower():
                return direction.copy()

        # Default to up
        return np.array([0.0, 1.0, 0.0])

    def _calculate_hips_rotation(self, joints: Dict) -> Dict[str, float]:
        """Calculate root hip rotation from hip and spine orientation."""
        try:
            left_hip = self._get_position(joints["left_upper_leg"])
            right_hip = self._get_position(joints["right_upper_leg"])
            spine = self._get_position(joints["spine"])
            hips = self._get_position(joints["hips"])

            # Convert Y coordinate
            left_hip[1] = -left_hip[1]
            right_hip[1] = -right_hip[1]
            spine[1] = -spine[1]
            hips[1] = -hips[1]

            # Hip facing direction (perpendicular to hip line, in XZ plane)
            hip_line = right_hip - left_hip
            hip_line[1] = 0  # Project to XZ plane

            if np.linalg.norm(hip_line) < 1e-6:
                return {"x": 0.0, "y": 0.0, "z": 0.0}

            hip_line = hip_line / np.linalg.norm(hip_line)

            # Facing direction is 90 degrees from hip line
            facing = np.array([-hip_line[2], 0, hip_line[0]])

            # Calculate Y rotation (yaw)
            y_rotation = float(np.arctan2(facing[0], facing[2]))

            # Calculate forward tilt (pitch) from spine
            spine_dir = spine - hips
            if np.linalg.norm(spine_dir) > 1e-6:
                spine_dir = spine_dir / np.linalg.norm(spine_dir)
                x_rotation = float(np.arcsin(np.clip(-spine_dir[2], -1, 1)))
            else:
                x_rotation = 0.0

            return {
                "x": x_rotation,
                "y": y_rotation,
                "z": 0.0
            }

        except (KeyError, TypeError):
            return {"x": 0.0, "y": 0.0, "z": 0.0}

    def _rotation_between_vectors(
        self,
        v1: np.ndarray,
        v2: np.ndarray
    ) -> Rotation:
        """Calculate rotation that transforms v1 to v2."""
        v1 = v1 / (np.linalg.norm(v1) + 1e-8)
        v2 = v2 / (np.linalg.norm(v2) + 1e-8)

        cross = np.cross(v1, v2)
        dot = np.dot(v1, v2)

        # Handle parallel vectors
        if np.linalg.norm(cross) < 1e-6:
            if dot > 0:
                return Rotation.identity()
            else:
                # 180 degree rotation
                perp = np.array([1, 0, 0]) if abs(v1[0]) < 0.9 else np.array([0, 1, 0])
                axis = np.cross(v1, perp)
                axis = axis / np.linalg.norm(axis)
                return Rotation.from_rotvec(np.pi * axis)

        # Rodrigues' formula
        axis = cross / np.linalg.norm(cross)
        angle = np.arccos(np.clip(dot, -1, 1))

        return Rotation.from_rotvec(angle * axis)
```

---

### File: `sandbox-3d/cv-service/src/routes/__init__.py`

```python
from .body_avatar import router as body_avatar_router

__all__ = ["body_avatar_router"]
```

---

### File: `sandbox-3d/cv-service/src/routes/body_avatar.py`

```python
"""
FastAPI routes for body avatar processing.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
from typing import Optional

from ..body_detection import (
    PersonDetector,
    HolisticLandmarksExtractor,
    SkeletonExtractor,
    PoseToRigMapper,
)

router = APIRouter(prefix="/api/body-avatar", tags=["Body Avatar"])

# Singleton instances for efficiency
_person_detector: Optional[PersonDetector] = None
_holistic_extractor: Optional[HolisticLandmarksExtractor] = None
_skeleton_extractor: Optional[SkeletonExtractor] = None
_pose_mapper: Optional[PoseToRigMapper] = None


def get_person_detector() -> PersonDetector:
    global _person_detector
    if _person_detector is None:
        _person_detector = PersonDetector()
    return _person_detector


def get_holistic_extractor() -> HolisticLandmarksExtractor:
    global _holistic_extractor
    if _holistic_extractor is None:
        _holistic_extractor = HolisticLandmarksExtractor()
    return _holistic_extractor


def get_skeleton_extractor() -> SkeletonExtractor:
    global _skeleton_extractor
    if _skeleton_extractor is None:
        _skeleton_extractor = SkeletonExtractor()
    return _skeleton_extractor


def get_pose_mapper() -> PoseToRigMapper:
    global _pose_mapper
    if _pose_mapper is None:
        _pose_mapper = PoseToRigMapper()
    return _pose_mapper


async def load_image(file: UploadFile) -> np.ndarray:
    """Load uploaded file as RGB numpy array."""
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    if image.mode != "RGB":
        image = image.convert("RGB")

    return np.array(image)


@router.post("/detect-person")
async def detect_person(file: UploadFile = File(...)):
    """
    Detect if a person is present in the image.

    Returns:
        - detected: bool
        - confidence: float (0-1)
        - bounding_box: {x_min, y_min, x_max, y_max} or null
    """
    try:
        image = await load_image(file)
        result = get_person_detector().detect(image)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-landmarks")
async def extract_landmarks(file: UploadFile = File(...)):
    """
    Extract full holistic landmarks (body, face, hands).

    Returns:
        - success: bool
        - pose_landmarks: List of 33 body landmarks
        - pose_world_landmarks: 3D world coordinates (meters)
        - face_landmarks: List of 478 face landmarks
        - left_hand_landmarks: List of 21 landmarks
        - right_hand_landmarks: List of 21 landmarks
    """
    try:
        image = await load_image(file)
        result = get_holistic_extractor().extract(image)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-skeleton")
async def extract_skeleton(file: UploadFile = File(...)):
    """
    Extract hierarchical skeleton from image.

    Returns:
        - success: bool
        - joints: Dict of joint positions and hierarchy
        - hierarchy: Parent-child relationships
        - root: Root joint name
    """
    try:
        image = await load_image(file)

        # Extract landmarks
        landmarks_result = get_holistic_extractor().extract(image)

        if not landmarks_result.get("success"):
            return JSONResponse(content={
                "success": False,
                "error": "Could not detect pose landmarks"
            })

        # Use world landmarks for better 3D accuracy
        landmarks = (
            landmarks_result.get("pose_world_landmarks") or
            landmarks_result.get("pose_landmarks")
        )

        skeleton = get_skeleton_extractor().extract_skeleton(landmarks)
        return JSONResponse(content=skeleton)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pose-to-rig")
async def pose_to_rig(file: UploadFile = File(...)):
    """
    Full pipeline: Image -> Landmarks -> Skeleton -> Bone Rotations.

    Returns bone rotations ready for VRM avatar application.

    Returns:
        - success: bool
        - rotations: Dict of bone names to {x, y, z} Euler angles (radians)
        - face_landmarks: Face landmarks for expression mapping (if detected)
    """
    try:
        image = await load_image(file)

        # Extract landmarks
        landmarks_result = get_holistic_extractor().extract(image)

        if not landmarks_result.get("success"):
            return JSONResponse(content={
                "success": False,
                "error": "Could not detect pose landmarks"
            })

        # Extract skeleton
        landmarks = (
            landmarks_result.get("pose_world_landmarks") or
            landmarks_result.get("pose_landmarks")
        )
        skeleton = get_skeleton_extractor().extract_skeleton(landmarks)

        if not skeleton.get("success"):
            return JSONResponse(content=skeleton)

        # Map to rig rotations
        rig_result = get_pose_mapper().map_to_rig(skeleton)

        # Include face landmarks for expression mapping
        if landmarks_result.get("face_landmarks"):
            rig_result["face_landmarks"] = landmarks_result["face_landmarks"]

        return JSONResponse(content=rig_result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-pipeline")
async def full_pipeline(file: UploadFile = File(...)):
    """
    Complete processing pipeline returning all intermediate data.

    Returns:
        - success: bool
        - person_detection: Detection result
        - landmarks: All holistic landmarks
        - skeleton: Hierarchical skeleton
        - rig_rotations: Ready-to-use bone rotations
    """
    try:
        image = await load_image(file)

        # Person detection
        detection = get_person_detector().detect(image)

        if not detection.get("detected"):
            return JSONResponse(content={
                "success": False,
                "error": "No person detected in image",
                "person_detection": detection
            })

        # Extract landmarks
        landmarks = get_holistic_extractor().extract(image)

        if not landmarks.get("success"):
            return JSONResponse(content={
                "success": False,
                "error": "Could not extract landmarks",
                "person_detection": detection,
                "landmarks": landmarks
            })

        # Extract skeleton
        pose_landmarks = (
            landmarks.get("pose_world_landmarks") or
            landmarks.get("pose_landmarks")
        )
        skeleton = get_skeleton_extractor().extract_skeleton(pose_landmarks)

        # Map to rig
        rig = None
        if skeleton.get("success"):
            rig = get_pose_mapper().map_to_rig(skeleton)

        return JSONResponse(content={
            "success": True,
            "person_detection": detection,
            "landmarks": {
                "success": landmarks["success"],
                "has_pose": landmarks["pose_landmarks"] is not None,
                "has_face": landmarks["face_landmarks"] is not None,
                "has_left_hand": landmarks["left_hand_landmarks"] is not None,
                "has_right_hand": landmarks["right_hand_landmarks"] is not None,
                "pose_landmarks": landmarks["pose_landmarks"],
                "face_landmarks": landmarks["face_landmarks"],
            },
            "skeleton": skeleton,
            "rig_rotations": rig
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### File: `sandbox-3d/cv-service/src/utils/__init__.py`

```python
from .math_utils import normalize_vector, lerp, clamp

__all__ = ["normalize_vector", "lerp", "clamp"]
```

---

### File: `sandbox-3d/cv-service/src/utils/math_utils.py`

```python
"""
Math utility functions.
"""

import numpy as np
from typing import Union


def normalize_vector(v: np.ndarray) -> np.ndarray:
    """Normalize a vector to unit length."""
    norm = np.linalg.norm(v)
    if norm < 1e-8:
        return v
    return v / norm


def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation between a and b."""
    return a + (b - a) * t


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp value between min and max."""
    return max(min_val, min(max_val, value))


def euler_to_quaternion(x: float, y: float, z: float) -> np.ndarray:
    """Convert Euler angles (XYZ order) to quaternion [x, y, z, w]."""
    cx = np.cos(x / 2)
    sx = np.sin(x / 2)
    cy = np.cos(y / 2)
    sy = np.sin(y / 2)
    cz = np.cos(z / 2)
    sz = np.sin(z / 2)

    return np.array([
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz,
    ])


def quaternion_to_euler(q: np.ndarray) -> np.ndarray:
    """Convert quaternion [x, y, z, w] to Euler angles (XYZ order)."""
    x, y, z, w = q

    # Roll (x-axis rotation)
    sinr_cosp = 2 * (w * x + y * z)
    cosr_cosp = 1 - 2 * (x * x + y * y)
    roll = np.arctan2(sinr_cosp, cosr_cosp)

    # Pitch (y-axis rotation)
    sinp = 2 * (w * y - z * x)
    if abs(sinp) >= 1:
        pitch = np.copysign(np.pi / 2, sinp)
    else:
        pitch = np.arcsin(sinp)

    # Yaw (z-axis rotation)
    siny_cosp = 2 * (w * z + x * y)
    cosy_cosp = 1 - 2 * (y * y + z * z)
    yaw = np.arctan2(siny_cosp, cosy_cosp)

    return np.array([roll, pitch, yaw])
```

---

### File: `sandbox-3d/cv-service/main.py`

```python
"""
CV Service Entry Point.

Run with: python main.py
Or: uvicorn main:app --reload --port 8001
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.routes import body_avatar_router

app = FastAPI(
    title="SeeMe CV Service - 3D Sandbox",
    description="Computer Vision service for body detection and pose estimation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(body_avatar_router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "service": "SeeMe CV Service - 3D Sandbox",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "cv-sandbox"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
```

---

### File: `sandbox-3d/cv-service/README.md`

```markdown
# CV Service - 3D Sandbox

Computer Vision service for body detection, landmark extraction, and pose-to-rig mapping.

## Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

Server runs at: http://localhost:8001

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/body-avatar/detect-person` | POST | Detect person in image |
| `/api/body-avatar/extract-landmarks` | POST | Extract holistic landmarks |
| `/api/body-avatar/extract-skeleton` | POST | Build skeleton from landmarks |
| `/api/body-avatar/pose-to-rig` | POST | Convert pose to VRM rotations |
| `/api/body-avatar/full-pipeline` | POST | Run complete pipeline |

## Test

```bash
# Run tests
pytest tests/ -v

# Test with curl
curl http://localhost:8001/health
curl -X POST -F "file=@test_images/person.jpg" http://localhost:8001/api/body-avatar/detect-person
```

## API Documentation

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
```

---

## 4. Part B: Mobile 3D Renderer (React Native)

### File: `sandbox-3d/mobile-renderer/package.json`

```json
{
  "name": "seeme-3d-sandbox",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-gl": "~14.0.0",
    "expo-image-picker": "~15.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "@react-three/fiber": "^8.15.0",
    "three": "^0.160.0",
    "@pixiv/three-vrm": "^2.1.0",
    "kalidokit": "^1.1.5",
    "expo-three": "^7.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "@types/three": "^0.160.0",
    "typescript": "^5.3.0"
  },
  "private": true
}
```

---

### File: `sandbox-3d/mobile-renderer/tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

---

### File: `sandbox-3d/mobile-renderer/app.json`

```json
{
  "expo": {
    "name": "SeeMe 3D Sandbox",
    "slug": "seeme-3d-sandbox",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#1a1a2e"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#1a1a2e"
      }
    },
    "plugins": [
      "expo-image-picker"
    ]
  }
}
```

---

### File: `sandbox-3d/mobile-renderer/src/types/pose.ts`

```typescript
/**
 * Pose data structures for VRM avatar rigging.
 */

/**
 * Euler rotation in radians.
 */
export interface EulerRotation {
  x: number;
  y: number;
  z: number;
}

/**
 * Complete solved pose for VRM avatar.
 * All rotations are Euler angles in radians (XYZ order).
 */
export interface SolvedPose {
  // Root and spine
  hips: EulerRotation;
  spine: EulerRotation;
  chest: EulerRotation;
  neck: EulerRotation;
  head: EulerRotation;

  // Left arm
  leftShoulder: EulerRotation;
  leftUpperArm: EulerRotation;
  leftLowerArm: EulerRotation;
  leftHand: EulerRotation;

  // Right arm
  rightShoulder: EulerRotation;
  rightUpperArm: EulerRotation;
  rightLowerArm: EulerRotation;
  rightHand: EulerRotation;

  // Left leg
  leftUpperLeg: EulerRotation;
  leftLowerLeg: EulerRotation;
  leftFoot: EulerRotation;

  // Right leg
  rightUpperLeg: EulerRotation;
  rightLowerLeg: EulerRotation;
  rightFoot: EulerRotation;

  // Face expressions (optional)
  face?: FaceExpressions;

  // Hand fingers (optional)
  leftFingers?: FingerRotations;
  rightFingers?: FingerRotations;
}

/**
 * Face expression blend shape values (0-1).
 */
export interface FaceExpressions {
  mouthOpen: number;
  mouthSmile: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  browUp: number;
  browDown: number;
}

/**
 * Individual finger rotations.
 */
export interface FingerRotations {
  thumb: FingerJoints;
  index: FingerJoints;
  middle: FingerJoints;
  ring: FingerJoints;
  pinky: FingerJoints;
}

export interface FingerJoints {
  proximal: EulerRotation;
  intermediate: EulerRotation;
  distal: EulerRotation;
}

/**
 * MediaPipe landmark format.
 */
export interface MediaPipeLandmark {
  x: number;        // 0-1 normalized
  y: number;        // 0-1 normalized (Y-down)
  z: number;        // Depth
  visibility?: number;
}

/**
 * API response for pose-to-rig endpoint.
 */
export interface PoseToRigResponse {
  success: boolean;
  error?: string;
  rotations?: Record<string, EulerRotation>;
  face_landmarks?: MediaPipeLandmark[];
}

/**
 * Create a default T-pose (all zeros).
 */
export function createDefaultPose(): SolvedPose {
  const zero = { x: 0, y: 0, z: 0 };
  return {
    hips: { ...zero },
    spine: { ...zero },
    chest: { ...zero },
    neck: { ...zero },
    head: { ...zero },
    leftShoulder: { ...zero },
    leftUpperArm: { ...zero },
    leftLowerArm: { ...zero },
    leftHand: { ...zero },
    rightShoulder: { ...zero },
    rightUpperArm: { ...zero },
    rightLowerArm: { ...zero },
    rightHand: { ...zero },
    leftUpperLeg: { ...zero },
    leftLowerLeg: { ...zero },
    leftFoot: { ...zero },
    rightUpperLeg: { ...zero },
    rightLowerLeg: { ...zero },
    rightFoot: { ...zero },
  };
}
```

---

### File: `sandbox-3d/mobile-renderer/src/services/avatarApiService.ts`

```typescript
/**
 * API service for communicating with CV service.
 */

import { PoseToRigResponse, EulerRotation } from '../types/pose';

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
}

export class AvatarApiService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Check if CV service is healthy.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Detect person in image.
   */
  async detectPerson(imageUri: string): Promise<{
    detected: boolean;
    confidence: number;
    boundingBox?: { xMin: number; yMin: number; xMax: number; yMax: number };
  }> {
    const response = await this.postImage('/api/body-avatar/detect-person', imageUri);

    return {
      detected: response.detected,
      confidence: response.confidence,
      boundingBox: response.bounding_box
        ? {
            xMin: response.bounding_box.x_min,
            yMin: response.bounding_box.y_min,
            xMax: response.bounding_box.x_max,
            yMax: response.bounding_box.y_max,
          }
        : undefined,
    };
  }

  /**
   * Get pose-to-rig rotations from image.
   */
  async getPoseRotations(imageUri: string): Promise<PoseToRigResponse> {
    return this.postImage('/api/body-avatar/pose-to-rig', imageUri);
  }

  /**
   * Run full pipeline.
   */
  async fullPipeline(imageUri: string): Promise<{
    success: boolean;
    error?: string;
    rotations?: Record<string, EulerRotation>;
    faceLandmarks?: any[];
  }> {
    const response = await this.postImage('/api/body-avatar/full-pipeline', imageUri);

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      rotations: response.rig_rotations?.rotations,
      faceLandmarks: response.landmarks?.face_landmarks,
    };
  }

  /**
   * Post image to endpoint.
   */
  private async postImage(endpoint: string, imageUri: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const formData = new FormData();

      // Handle different URI formats
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Default instance pointing to local CV service
export const avatarApi = new AvatarApiService({
  baseUrl: 'http://localhost:8001',
});
```

---

### File: `sandbox-3d/mobile-renderer/src/services/poseService.ts`

```typescript
/**
 * Pose solving service.
 * Converts API rotations to SolvedPose format.
 */

import { SolvedPose, EulerRotation, createDefaultPose } from '../types/pose';
import { AvatarApiService, avatarApi } from './avatarApiService';

export class PoseService {
  private api: AvatarApiService;

  constructor(api: AvatarApiService = avatarApi) {
    this.api = api;
  }

  /**
   * Process image and get solved pose.
   */
  async processImage(imageUri: string): Promise<SolvedPose | null> {
    try {
      const result = await this.api.getPoseRotations(imageUri);

      if (!result.success || !result.rotations) {
        console.warn('Pose extraction failed:', result.error);
        return null;
      }

      return this.convertToSolvedPose(result.rotations);
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  }

  /**
   * Convert API rotation format to SolvedPose.
   */
  private convertToSolvedPose(
    rotations: Record<string, EulerRotation>
  ): SolvedPose {
    const zero = { x: 0, y: 0, z: 0 };

    return {
      hips: rotations.hips || zero,
      spine: rotations.spine || zero,
      chest: rotations.chest || zero,
      neck: rotations.neck || zero,
      head: rotations.head || zero,

      leftShoulder: rotations.leftShoulder || zero,
      leftUpperArm: rotations.leftUpperArm || zero,
      leftLowerArm: rotations.leftLowerArm || zero,
      leftHand: rotations.leftHand || zero,

      rightShoulder: rotations.rightShoulder || zero,
      rightUpperArm: rotations.rightUpperArm || zero,
      rightLowerArm: rotations.rightLowerArm || zero,
      rightHand: rotations.rightHand || zero,

      leftUpperLeg: rotations.leftUpperLeg || zero,
      leftLowerLeg: rotations.leftLowerLeg || zero,
      leftFoot: rotations.leftFoot || zero,

      rightUpperLeg: rotations.rightUpperLeg || zero,
      rightLowerLeg: rotations.rightLowerLeg || zero,
      rightFoot: rotations.rightFoot || zero,
    };
  }

  /**
   * Smooth transition between two poses.
   */
  smoothPose(
    current: SolvedPose,
    target: SolvedPose,
    factor: number = 0.3
  ): SolvedPose {
    const lerp = (a: number, b: number) => a + (b - a) * factor;

    const smoothRotation = (
      curr: EulerRotation,
      tgt: EulerRotation
    ): EulerRotation => ({
      x: lerp(curr.x, tgt.x),
      y: lerp(curr.y, tgt.y),
      z: lerp(curr.z, tgt.z),
    });

    const result = createDefaultPose();

    const keys: (keyof SolvedPose)[] = [
      'hips', 'spine', 'chest', 'neck', 'head',
      'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
      'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
      'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
    ];

    for (const key of keys) {
      const currVal = current[key];
      const tgtVal = target[key];
      if (currVal && tgtVal && typeof currVal === 'object' && 'x' in currVal) {
        (result as any)[key] = smoothRotation(
          currVal as EulerRotation,
          tgtVal as EulerRotation
        );
      }
    }

    return result;
  }
}

export const poseService = new PoseService();
```

---

### File: `sandbox-3d/mobile-renderer/src/services/boneController.ts`

```typescript
/**
 * VRM Bone Controller.
 * Applies SolvedPose rotations to VRM humanoid bones.
 */

import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { SolvedPose, EulerRotation } from '../types/pose';

// Mapping from SolvedPose keys to VRM bone names
const BONE_MAPPING: Record<keyof Omit<SolvedPose, 'face' | 'leftFingers' | 'rightFingers'>, VRMHumanBoneName> = {
  hips: 'hips',
  spine: 'spine',
  chest: 'chest',
  neck: 'neck',
  head: 'head',

  leftShoulder: 'leftShoulder',
  leftUpperArm: 'leftUpperArm',
  leftLowerArm: 'leftLowerArm',
  leftHand: 'leftHand',

  rightShoulder: 'rightShoulder',
  rightUpperArm: 'rightUpperArm',
  rightLowerArm: 'rightLowerArm',
  rightHand: 'rightHand',

  leftUpperLeg: 'leftUpperLeg',
  leftLowerLeg: 'leftLowerLeg',
  leftFoot: 'leftFoot',

  rightUpperLeg: 'rightUpperLeg',
  rightLowerLeg: 'rightLowerLeg',
  rightFoot: 'rightFoot',
};

export class BoneController {
  private vrm: VRM;
  private smoothingFactor: number = 0.3;
  private previousPose: SolvedPose | null = null;

  constructor(vrm: VRM) {
    this.vrm = vrm;
  }

  /**
   * Apply solved pose to VRM bones.
   */
  applyPose(pose: SolvedPose, smooth: boolean = true): void {
    let finalPose = pose;

    if (smooth && this.previousPose) {
      finalPose = this.smoothPose(pose, this.previousPose);
    }

    // Apply body bone rotations
    for (const [poseKey, boneName] of Object.entries(BONE_MAPPING)) {
      const rotation = (finalPose as any)[poseKey] as EulerRotation | undefined;
      if (rotation) {
        this.setBoneRotation(boneName, rotation);
      }
    }

    // Apply face expressions
    if (finalPose.face && this.vrm.expressionManager) {
      this.applyFaceExpressions(finalPose.face);
    }

    // Update VRM (required for expression manager)
    this.vrm.update(1 / 60);

    this.previousPose = { ...finalPose };
  }

  /**
   * Set rotation for a specific bone.
   */
  private setBoneRotation(boneName: VRMHumanBoneName, rotation: EulerRotation): void {
    const bone = this.vrm.humanoid?.getNormalizedBoneNode(boneName);
    if (bone) {
      bone.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }

  /**
   * Apply face expressions.
   */
  private applyFaceExpressions(face: SolvedPose['face']): void {
    if (!face || !this.vrm.expressionManager) return;

    // Map to VRM expression names
    this.vrm.expressionManager.setValue('aa', face.mouthOpen * 0.5);
    this.vrm.expressionManager.setValue('happy', face.mouthSmile);
    this.vrm.expressionManager.setValue('blinkLeft', face.eyeBlinkLeft);
    this.vrm.expressionManager.setValue('blinkRight', face.eyeBlinkRight);
  }

  /**
   * Smooth pose transition.
   */
  private smoothPose(current: SolvedPose, previous: SolvedPose): SolvedPose {
    const lerp = (a: number, b: number) => a + (b - a) * this.smoothingFactor;

    const smoothRotation = (
      curr: EulerRotation,
      prev: EulerRotation
    ): EulerRotation => ({
      x: lerp(prev.x, curr.x),
      y: lerp(prev.y, curr.y),
      z: lerp(prev.z, curr.z),
    });

    const result: any = { ...current };

    for (const key of Object.keys(BONE_MAPPING)) {
      const currVal = (current as any)[key];
      const prevVal = (previous as any)[key];
      if (currVal && prevVal) {
        result[key] = smoothRotation(currVal, prevVal);
      }
    }

    return result;
  }

  /**
   * Reset to T-pose.
   */
  resetPose(): void {
    for (const boneName of Object.values(BONE_MAPPING)) {
      const bone = this.vrm.humanoid?.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.rotation.set(0, 0, 0);
      }
    }
    this.previousPose = null;
  }

  /**
   * Set smoothing factor (0 = no smoothing, 1 = instant).
   */
  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
}
```

---

### File: `sandbox-3d/mobile-renderer/src/services/vrmLoaderService.ts`

```typescript
/**
 * VRM Model Loader Service.
 * Handles loading and caching VRM avatar models.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';

export class VRMLoaderService {
  private loader: GLTFLoader;
  private cache: Map<string, VRM> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
  }

  /**
   * Load VRM model from URL.
   */
  async loadVRM(
    url: string,
    onProgress?: (percent: number) => void
  ): Promise<VRM> {
    // Check cache
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM;

          if (!vrm) {
            reject(new Error('Failed to load VRM from GLTF'));
            return;
          }

          // Rotate to face camera (VRM models face +Z by default)
          vrm.scene.rotation.y = Math.PI;

          // Cache model
          this.cache.set(url, vrm);

          resolve(vrm);
        },
        (progress) => {
          if (onProgress && progress.total > 0) {
            onProgress((progress.loaded / progress.total) * 100);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Dispose VRM model and remove from cache.
   */
  disposeVRM(url: string): void {
    const vrm = this.cache.get(url);

    if (vrm) {
      vrm.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      this.cache.delete(url);
    }
  }

  /**
   * Clear all cached models.
   */
  clearCache(): void {
    for (const url of this.cache.keys()) {
      this.disposeVRM(url);
    }
  }
}

export const vrmLoader = new VRMLoaderService();
```

---

### File: `sandbox-3d/mobile-renderer/src/components/VRMAvatarRenderer.tsx`

```typescript
/**
 * VRM Avatar Renderer Component.
 * Renders a VRM avatar with applied pose.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

import { VRMLoaderService, vrmLoader } from '../services/vrmLoaderService';
import { BoneController } from '../services/boneController';
import { SolvedPose } from '../types/pose';

interface VRMAvatarRendererProps {
  modelUrl: string;
  pose?: SolvedPose;
  backgroundColor?: string;
  enableSmoothing?: boolean;
  cameraTarget?: 'fullBody' | 'upperBody' | 'face';
  onModelLoaded?: () => void;
  onError?: (error: Error) => void;
}

// VRM Model component (inside Canvas)
const VRMModel: React.FC<{
  vrm: VRM;
  pose?: SolvedPose;
  enableSmoothing: boolean;
}> = ({ vrm, pose, enableSmoothing }) => {
  const boneControllerRef = useRef<BoneController | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    scene.add(vrm.scene);
    boneControllerRef.current = new BoneController(vrm);

    return () => {
      scene.remove(vrm.scene);
    };
  }, [vrm, scene]);

  useFrame(() => {
    if (pose && boneControllerRef.current) {
      boneControllerRef.current.applyPose(pose, enableSmoothing);
    }
  });

  return null;
};

// Lighting setup
const Lighting: React.FC = () => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[0, 10, 5]} intensity={0.8} />
    <directionalLight position={[-5, 5, -5]} intensity={0.3} />
  </>
);

// Camera setup
const CameraSetup: React.FC<{
  target: 'fullBody' | 'upperBody' | 'face';
}> = ({ target }) => {
  const { camera } = useThree();

  useEffect(() => {
    const configs = {
      fullBody: { pos: [0, 1, 3] as const, lookAt: [0, 1, 0] as const },
      upperBody: { pos: [0, 1.4, 1.5] as const, lookAt: [0, 1.4, 0] as const },
      face: { pos: [0, 1.5, 0.8] as const, lookAt: [0, 1.5, 0] as const },
    };

    const config = configs[target];
    camera.position.set(...config.pos);
    camera.lookAt(new THREE.Vector3(...config.lookAt));
  }, [camera, target]);

  return null;
};

export const VRMAvatarRenderer: React.FC<VRMAvatarRendererProps> = ({
  modelUrl,
  pose,
  backgroundColor = '#1a1a2e',
  enableSmoothing = true,
  cameraTarget = 'fullBody',
  onModelLoaded,
  onError,
}) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const loadedVRM = await vrmLoader.loadVRM(modelUrl, (progress) => {
        setLoadProgress(progress);
      });

      setVrm(loadedVRM);
      onModelLoaded?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      setLoading(false);
    }
  }, [modelUrl, onModelLoaded, onError]);

  useEffect(() => {
    loadModel();

    return () => {
      vrmLoader.disposeVRM(modelUrl);
    };
  }, [modelUrl, loadModel]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>
          Loading model... {loadProgress.toFixed(0)}%
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor }]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Canvas>
        <CameraSetup target={cameraTarget} />
        <Lighting />
        {vrm && (
          <VRMModel vrm={vrm} pose={pose} enableSmoothing={enableSmoothing} />
        )}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
```

---

### File: `sandbox-3d/mobile-renderer/src/screens/TestScreen.tsx`

```typescript
/**
 * Test Screen for 3D Avatar Rendering.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { VRMAvatarRenderer } from '../components/VRMAvatarRenderer';
import { SolvedPose, createDefaultPose } from '../types/pose';
import { poseService } from '../services/poseService';
import { avatarApi } from '../services/avatarApiService';

// Sample VRM model URL (replace with your own)
const SAMPLE_VRM_URL = 'https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAvatarSample_B.vrm';

// Test poses
const TEST_POSES: { name: string; pose: Partial<SolvedPose> }[] = [
  {
    name: 'T-Pose',
    pose: createDefaultPose(),
  },
  {
    name: 'Wave',
    pose: {
      ...createDefaultPose(),
      rightUpperArm: { x: 0, y: 0, z: -Math.PI / 3 },
      rightLowerArm: { x: 0, y: Math.PI / 4, z: 0 },
    },
  },
  {
    name: 'Arms Up',
    pose: {
      ...createDefaultPose(),
      leftUpperArm: { x: 0, y: 0, z: Math.PI / 2 },
      rightUpperArm: { x: 0, y: 0, z: -Math.PI / 2 },
    },
  },
];

export const TestScreen: React.FC = () => {
  const [currentPose, setCurrentPose] = useState<SolvedPose>(createDefaultPose());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    setApiStatus('checking');
    const healthy = await avatarApi.healthCheck();
    setApiStatus(healthy ? 'online' : 'offline');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (imageUri: string) => {
    if (apiStatus !== 'online') {
      Alert.alert('Error', 'CV Service is offline');
      return;
    }

    setProcessing(true);

    try {
      const pose = await poseService.processImage(imageUri);

      if (pose) {
        setCurrentPose(pose);
      } else {
        Alert.alert('Error', 'Could not extract pose from image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  };

  const selectTestPose = (index: number) => {
    setCurrentPose(TEST_POSES[index].pose as SolvedPose);
    setSelectedImage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.title}>3D Avatar Test</Text>
        <View style={styles.apiStatus}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  apiStatus === 'online'
                    ? '#4ade80'
                    : apiStatus === 'offline'
                    ? '#f87171'
                    : '#fbbf24',
              },
            ]}
          />
          <Text style={styles.statusText}>
            CV: {apiStatus}
          </Text>
        </View>
      </View>

      {/* 3D Avatar View */}
      <View style={styles.avatarContainer}>
        <VRMAvatarRenderer
          modelUrl={SAMPLE_VRM_URL}
          pose={currentPose}
          backgroundColor="#1a1a2e"
          enableSmoothing={true}
          onModelLoaded={() => console.log('Model loaded')}
          onError={(err) => console.error('Model error:', err)}
        />
      </View>

      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          {processing && (
            <View style={styles.processingOverlay}>
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Test Poses */}
        <Text style={styles.sectionTitle}>Test Poses</Text>
        <View style={styles.buttonRow}>
          {TEST_POSES.map((testPose, index) => (
            <TouchableOpacity
              key={index}
              style={styles.poseButton}
              onPress={() => selectTestPose(index)}
            >
              <Text style={styles.buttonText}>{testPose.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Image Processing */}
        <Text style={styles.sectionTitle}>From Image</Text>
        <TouchableOpacity
          style={[styles.imageButton, apiStatus !== 'online' && styles.disabledButton]}
          onPress={pickImage}
          disabled={apiStatus !== 'online' || processing}
        >
          <Text style={styles.buttonText}>
            {processing ? 'Processing...' : 'Pick Image'}
          </Text>
        </TouchableOpacity>

        {/* Refresh API Status */}
        <TouchableOpacity style={styles.refreshButton} onPress={checkApiHealth}>
          <Text style={styles.refreshText}>Refresh API Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  apiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  avatarContainer: {
    flex: 1,
    minHeight: 300,
  },
  previewContainer: {
    position: 'absolute',
    top: 70,
    right: 16,
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#ffffff',
    fontSize: 10,
  },
  controls: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sectionTitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  poseButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  refreshButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  refreshText: {
    color: '#6b7280',
    fontSize: 12,
  },
});
```

---

### File: `sandbox-3d/mobile-renderer/App.tsx`

```typescript
/**
 * Sandbox App Entry Point.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { TestScreen } from './src/screens/TestScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <TestScreen />
    </>
  );
}
```

---

### File: `sandbox-3d/mobile-renderer/README.md`

```markdown
# Mobile 3D Renderer - Sandbox

React Native app for testing VRM avatar rendering with pose application.

## Setup

```bash
# Install dependencies
npm install

# Start Expo
npx expo start
```

## Requirements

- CV Service running at http://localhost:8001
- VRM model URL (default uses sample from Glitch CDN)

## Features

- VRM model loading with progress indicator
- Pose application with smoothing
- Test poses (T-pose, Wave, Arms Up)
- Image-to-pose processing via CV Service
- Real-time API health checking

## Testing

1. Start the CV Service first: `cd ../cv-service && python main.py`
2. Start this app: `npx expo start`
3. Use test poses or pick an image to extract pose
```

---

## 5. Part C: Integration Service

This section shows how to integrate the sandbox components into the main SeeMe project.

### Integration Architecture

```
Main Project Integration:

mobile/src/services/
├── poseService.ts      <- Copy from sandbox
└── avatarApiService.ts <- Copy from sandbox

mobile/src/components/3d/
├── VRMAvatarRenderer.tsx <- Copy from sandbox
└── ...

ml-service/src/body_detection/
├── person_detector.py       <- Copy from sandbox
├── holistic_landmarks.py    <- Copy from sandbox
├── skeleton_extractor.py    <- Copy from sandbox
└── pose_to_rig.py           <- Copy from sandbox

ml-service/src/routes/
└── body_avatar.py           <- Merge with existing
```

---

## 6. Data Structures & Interfaces

### 6.1 Coordinate Systems

```
MediaPipe Coordinates:
┌─────────────────┐
│     (0,0)       │
│       ↓ Y+     │
│  X+ →          │
│                 │
│     (1,1)       │
└─────────────────┘
- Origin: Top-left
- Y-axis: Points DOWN
- Z-axis: Toward camera (depth)

Three.js/VRM Coordinates:
       Y+
       ↑
       │
       │
───────┼────→ X+
      /│
     / │
    ↙  │
   Z+

- Origin: Center
- Y-axis: Points UP
- Z-axis: Toward viewer

Conversion:
  three_y = -mediapipe_y
  three_x = mediapipe_x
  three_z = mediapipe_z
```

### 6.2 VRM Bone Hierarchy

```
                    head
                      │
                    neck
                      │
        ┌─────────chest─────────┐
        │             │         │
  leftShoulder      spine    rightShoulder
        │             │         │
  leftUpperArm      hips    rightUpperArm
        │           / \         │
  leftLowerArm     /   \    rightLowerArm
        │         /     \       │
  leftHand    leftLeg  rightLeg rightHand
                │         │
          leftLowerLeg  rightLowerLeg
                │         │
            leftFoot    rightFoot
```

---

## 7. Testing

### Run CV Service Tests

```bash
cd sandbox-3d/cv-service
pip install -r requirements.txt
pytest tests/ -v
```

### Run Mobile Renderer

```bash
cd sandbox-3d/mobile-renderer
npm install
npx expo start
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8001/health

# Detect person
curl -X POST -F "file=@test_images/person.jpg" \
  http://localhost:8001/api/body-avatar/detect-person

# Full pipeline
curl -X POST -F "file=@test_images/person.jpg" \
  http://localhost:8001/api/body-avatar/full-pipeline
```

---

## 8. Performance Targets

| Component | Target | Notes |
|-----------|--------|-------|
| Person Detection | <100ms | MediaPipe Pose |
| Landmark Extraction | <200ms | MediaPipe Holistic |
| Skeleton Building | <10ms | Pure computation |
| Pose Mapping | <5ms | Pure computation |
| **Total CV Pipeline** | **<400ms** | End-to-end |
| VRM Model Loading | <3s | First load only |
| Pose Application | <5ms | Per frame |
| **Render Frame Rate** | **30+ FPS** | Smooth animation |

---

## 9. Integration to Main Project

### Step-by-Step Integration

1. **Verify Sandbox Works**
   - CV service returns correct rotations
   - Mobile renderer displays poses correctly

2. **Copy CV Components**
   ```bash
   # From SeeMe root
   cp sandbox-3d/cv-service/src/body_detection/*.py ml-service/src/body_detection/
   ```

3. **Merge Routes**
   - Add new endpoints to `ml-service/src/routes/body_avatar.py`
   - Or create new route file and register in `main.py`

4. **Copy Mobile Components**
   ```bash
   cp sandbox-3d/mobile-renderer/src/types/pose.ts mobile/src/types/
   cp sandbox-3d/mobile-renderer/src/services/*.ts mobile/src/services/
   cp sandbox-3d/mobile-renderer/src/components/VRMAvatarRenderer.tsx mobile/src/components/3d/
   ```

5. **Update Imports**
   - Fix relative import paths
   - Update API base URL for production

6. **Connect to Existing Screens**
   - Import VRMAvatarRenderer in FullBodyAvatarScreen
   - Replace existing avatar display with new renderer

### File Mapping

| Sandbox File | Main Project Destination |
|--------------|--------------------------|
| `cv-service/src/body_detection/*.py` | `ml-service/src/body_detection/` |
| `cv-service/src/routes/body_avatar.py` | `ml-service/src/routes/` |
| `mobile-renderer/src/types/pose.ts` | `mobile/src/types/` |
| `mobile-renderer/src/services/*.ts` | `mobile/src/services/` |
| `mobile-renderer/src/components/*.tsx` | `mobile/src/components/3d/` |

---

## Quick Reference

### Start Development

```bash
# Terminal 1: CV Service
cd SeeMe/sandbox-3d/cv-service
venv\Scripts\activate
python main.py

# Terminal 2: Mobile App
cd SeeMe/sandbox-3d/mobile-renderer
npx expo start
```

### API Endpoints Summary

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Service health check |
| `POST /api/body-avatar/detect-person` | Detect person in image |
| `POST /api/body-avatar/extract-landmarks` | Extract all landmarks |
| `POST /api/body-avatar/extract-skeleton` | Build skeleton |
| `POST /api/body-avatar/pose-to-rig` | Get VRM rotations |
| `POST /api/body-avatar/full-pipeline` | Complete pipeline |

---

**Document Version:** 2.0
**Location:** `SeeMe/MASTER_3D.md`
**Sandbox Location:** `SeeMe/sandbox-3d/`
**Status:** Ready for development
