"""
Pose-to-Rig Mapping for 3D Avatar
Phase 3.1: Full-Body 3D Avatar System

Converts MediaPipe skeleton keypoints to 3D model bone rotations.
Uses quaternion math for natural pose transfer.

Compatible with:
- Mixamo rigs
- Ready Player Me avatars
- Standard humanoid skeletons
"""

import numpy as np
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any
from loguru import logger


@dataclass
class BoneTransform:
    """Transform for a single bone in the 3D rig."""
    bone_name: str
    rotation: List[float]  # Quaternion [x, y, z, w]
    position: List[float]  # Local position offset [x, y, z]
    scale: List[float]     # Scale (usually [1, 1, 1])

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class PoseToRigMapper:
    """
    Maps MediaPipe skeleton keypoints to 3D model bone rotations.
    Uses inverse kinematics principles for natural pose transfer.

    The mapping converts 2D/3D keypoint positions into bone rotations
    that can be applied to a standard humanoid 3D model.
    """

    # Standard humanoid bone names (Mixamo compatible)
    BONE_NAMES = [
        "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
        "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
        "RightShoulder", "RightArm", "RightForeArm", "RightHand",
        "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
        "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
        # Finger bones (left)
        "LeftHandThumb1", "LeftHandThumb2", "LeftHandThumb3",
        "LeftHandIndex1", "LeftHandIndex2", "LeftHandIndex3",
        "LeftHandMiddle1", "LeftHandMiddle2", "LeftHandMiddle3",
        "LeftHandRing1", "LeftHandRing2", "LeftHandRing3",
        "LeftHandPinky1", "LeftHandPinky2", "LeftHandPinky3",
        # Finger bones (right)
        "RightHandThumb1", "RightHandThumb2", "RightHandThumb3",
        "RightHandIndex1", "RightHandIndex2", "RightHandIndex3",
        "RightHandMiddle1", "RightHandMiddle2", "RightHandMiddle3",
        "RightHandRing1", "RightHandRing2", "RightHandRing3",
        "RightHandPinky1", "RightHandPinky2", "RightHandPinky3",
    ]

    # Mapping from MediaPipe landmarks to bone chains
    LANDMARK_CHAINS = {
        # Spine chain
        "spine": [("left_hip", "right_hip"), ("left_shoulder", "right_shoulder"), "nose"],
        # Left arm
        "left_arm": ["left_shoulder", "left_elbow", "left_wrist"],
        # Right arm
        "right_arm": ["right_shoulder", "right_elbow", "right_wrist"],
        # Left leg
        "left_leg": ["left_hip", "left_knee", "left_ankle"],
        # Right leg
        "right_leg": ["right_hip", "right_knee", "right_ankle"],
    }

    def __init__(self):
        """Initialize the pose-to-rig mapper."""
        self.t_pose_reference = self._create_t_pose_reference()
        logger.info("PoseToRigMapper initialized")

    def _create_t_pose_reference(self) -> Dict[str, Dict[str, List[float]]]:
        """
        Create T-pose reference for the 3D model.
        T-pose is the default pose where all bone rotations are calculated relative to.
        """
        return {
            "Hips": {"rotation": [0, 0, 0, 1], "position": [0, 1, 0]},
            "Spine": {"rotation": [0, 0, 0, 1], "position": [0, 0.1, 0]},
            "Spine1": {"rotation": [0, 0, 0, 1], "position": [0, 0.1, 0]},
            "Spine2": {"rotation": [0, 0, 0, 1], "position": [0, 0.1, 0]},
            "Neck": {"rotation": [0, 0, 0, 1], "position": [0, 0.1, 0]},
            "Head": {"rotation": [0, 0, 0, 1], "position": [0, 0.15, 0]},
            # Arms in T-pose (pointing outward)
            "LeftShoulder": {"rotation": [0, 0, 0, 1], "position": [0.05, 0, 0]},
            "LeftArm": {"rotation": [0, 0, 0.707, 0.707], "position": [0.1, 0, 0]},
            "LeftForeArm": {"rotation": [0, 0, 0, 1], "position": [0.25, 0, 0]},
            "LeftHand": {"rotation": [0, 0, 0, 1], "position": [0.25, 0, 0]},
            "RightShoulder": {"rotation": [0, 0, 0, 1], "position": [-0.05, 0, 0]},
            "RightArm": {"rotation": [0, 0, -0.707, 0.707], "position": [-0.1, 0, 0]},
            "RightForeArm": {"rotation": [0, 0, 0, 1], "position": [-0.25, 0, 0]},
            "RightHand": {"rotation": [0, 0, 0, 1], "position": [-0.25, 0, 0]},
            # Legs pointing down
            "LeftUpLeg": {"rotation": [0, 0, 0, 1], "position": [0.1, -0.1, 0]},
            "LeftLeg": {"rotation": [0, 0, 0, 1], "position": [0, -0.4, 0]},
            "LeftFoot": {"rotation": [0, 0, 0, 1], "position": [0, -0.4, 0]},
            "LeftToeBase": {"rotation": [0, 0, 0, 1], "position": [0, 0, 0.1]},
            "RightUpLeg": {"rotation": [0, 0, 0, 1], "position": [-0.1, -0.1, 0]},
            "RightLeg": {"rotation": [0, 0, 0, 1], "position": [0, -0.4, 0]},
            "RightFoot": {"rotation": [0, 0, 0, 1], "position": [0, -0.4, 0]},
            "RightToeBase": {"rotation": [0, 0, 0, 1], "position": [0, 0, 0.1]},
        }

    def _normalize(self, v: np.ndarray) -> np.ndarray:
        """Normalize a vector."""
        norm = np.linalg.norm(v)
        if norm < 1e-8:
            return np.array([0, 1, 0])
        return v / norm

    def _quaternion_from_two_vectors(
        self,
        v1: np.ndarray,
        v2: np.ndarray
    ) -> np.ndarray:
        """
        Calculate quaternion that rotates v1 to v2.

        Args:
            v1: Source direction (normalized)
            v2: Target direction (normalized)

        Returns:
            Quaternion as [x, y, z, w]
        """
        v1 = self._normalize(v1)
        v2 = self._normalize(v2)

        # Cross product for rotation axis
        cross = np.cross(v1, v2)
        dot = np.dot(v1, v2)

        # Handle parallel vectors
        if np.linalg.norm(cross) < 1e-8:
            if dot > 0:
                return np.array([0, 0, 0, 1])  # Identity quaternion
            else:
                # 180 degree rotation - find perpendicular axis
                perp = np.array([1, 0, 0]) if abs(v1[0]) < 0.9 else np.array([0, 1, 0])
                axis = self._normalize(np.cross(v1, perp))
                return np.array([axis[0], axis[1], axis[2], 0])

        # Standard quaternion calculation
        w = 1 + dot
        quat = np.array([cross[0], cross[1], cross[2], w])

        # Normalize
        return quat / np.linalg.norm(quat)

    def _get_keypoint_position(
        self,
        keypoints: Dict[str, Dict],
        name: str,
        use_world: bool = True
    ) -> Optional[np.ndarray]:
        """
        Get keypoint position as numpy array.

        Args:
            keypoints: Dictionary of keypoints
            name: Keypoint name
            use_world: Use world coordinates if available

        Returns:
            Position as [x, y, z] or None if not found
        """
        kp = keypoints.get(name)
        if not kp:
            return None

        if use_world and "world_position" in kp:
            pos = kp["world_position"]
        else:
            pos = kp.get("position", kp)

        return np.array([pos["x"], pos["y"], pos["z"]])

    def map_pose_to_rig(self, skeleton_data: Dict[str, Any]) -> List[BoneTransform]:
        """
        Convert MediaPipe skeleton to rig bone transforms.

        Args:
            skeleton_data: Output from FullSkeletonExtractor.to_dict()

        Returns:
            List of BoneTransform for each bone
        """
        transforms = []

        # Build keypoint lookup
        keypoints = {}
        for kp in skeleton_data.get("body_keypoints", []):
            keypoints[kp["name"]] = kp
        for kp in skeleton_data.get("left_hand_keypoints", []):
            keypoints[kp["name"]] = kp
        for kp in skeleton_data.get("right_hand_keypoints", []):
            keypoints[kp["name"]] = kp

        # Calculate hip position and rotation (root bone)
        transforms.append(self._calculate_hip_transform(keypoints))

        # Calculate spine transforms
        transforms.extend(self._calculate_spine_transforms(keypoints))

        # Calculate arm transforms
        transforms.extend(self._calculate_arm_transforms(keypoints, "left"))
        transforms.extend(self._calculate_arm_transforms(keypoints, "right"))

        # Calculate leg transforms
        transforms.extend(self._calculate_leg_transforms(keypoints, "left"))
        transforms.extend(self._calculate_leg_transforms(keypoints, "right"))

        # Calculate finger transforms if hands detected
        if skeleton_data.get("hands_detected", False):
            transforms.extend(self._calculate_finger_transforms(keypoints, "left"))
            transforms.extend(self._calculate_finger_transforms(keypoints, "right"))

        return transforms

    def _calculate_hip_transform(self, keypoints: Dict) -> BoneTransform:
        """Calculate hip (root) bone transform."""
        left_hip = self._get_keypoint_position(keypoints, "left_hip")
        right_hip = self._get_keypoint_position(keypoints, "right_hip")

        if left_hip is None or right_hip is None:
            return BoneTransform(
                bone_name="Hips",
                rotation=[0, 0, 0, 1],
                position=[0, 1, 0],
                scale=[1, 1, 1]
            )

        hip_center = (left_hip + right_hip) / 2

        # Calculate hip rotation from hip line
        hip_direction = self._normalize(right_hip - left_hip)
        reference_direction = np.array([1, 0, 0])  # T-pose: hips pointing X

        rotation = self._quaternion_from_two_vectors(reference_direction, hip_direction)

        return BoneTransform(
            bone_name="Hips",
            rotation=[round(r, 5) for r in rotation.tolist()],
            position=[round(p, 5) for p in hip_center.tolist()],
            scale=[1, 1, 1]
        )

    def _calculate_spine_transforms(self, keypoints: Dict) -> List[BoneTransform]:
        """Calculate spine and head bone transforms."""
        transforms = []

        left_hip = self._get_keypoint_position(keypoints, "left_hip")
        right_hip = self._get_keypoint_position(keypoints, "right_hip")
        left_shoulder = self._get_keypoint_position(keypoints, "left_shoulder")
        right_shoulder = self._get_keypoint_position(keypoints, "right_shoulder")
        nose = self._get_keypoint_position(keypoints, "nose")

        if left_hip is None or right_hip is None:
            return transforms

        hip_center = (left_hip + right_hip) / 2

        if left_shoulder is not None and right_shoulder is not None:
            shoulder_center = (left_shoulder + right_shoulder) / 2

            # Spine direction (up from hip to shoulder)
            spine_direction = self._normalize(shoulder_center - hip_center)
            reference_direction = np.array([0, 1, 0])  # T-pose: spine pointing Y

            spine_rotation = self._quaternion_from_two_vectors(reference_direction, spine_direction)

            transforms.append(BoneTransform(
                bone_name="Spine",
                rotation=[round(r, 5) for r in spine_rotation.tolist()],
                position=[0, 0, 0],
                scale=[1, 1, 1]
            ))

            # Head rotation
            if nose is not None:
                head_direction = self._normalize(nose - shoulder_center)
                head_rotation = self._quaternion_from_two_vectors(reference_direction, head_direction)

                transforms.append(BoneTransform(
                    bone_name="Head",
                    rotation=[round(r, 5) for r in head_rotation.tolist()],
                    position=[0, 0, 0],
                    scale=[1, 1, 1]
                ))

        return transforms

    def _calculate_arm_transforms(self, keypoints: Dict, side: str) -> List[BoneTransform]:
        """Calculate transforms for one arm."""
        transforms = []

        shoulder = self._get_keypoint_position(keypoints, f"{side}_shoulder")
        elbow = self._get_keypoint_position(keypoints, f"{side}_elbow")
        wrist = self._get_keypoint_position(keypoints, f"{side}_wrist")

        bone_suffix = "Left" if side == "left" else "Right"
        arm_direction = 1 if side == "left" else -1

        # T-pose arm direction
        t_pose_direction = np.array([arm_direction, 0, 0])

        if shoulder is not None and elbow is not None:
            # Upper arm
            upper_arm_dir = self._normalize(elbow - shoulder)
            upper_arm_rot = self._quaternion_from_two_vectors(t_pose_direction, upper_arm_dir)

            transforms.append(BoneTransform(
                bone_name=f"{bone_suffix}Arm",
                rotation=[round(r, 5) for r in upper_arm_rot.tolist()],
                position=[0, 0, 0],
                scale=[1, 1, 1]
            ))

        if elbow is not None and wrist is not None:
            # Forearm
            forearm_dir = self._normalize(wrist - elbow)
            forearm_rot = self._quaternion_from_two_vectors(t_pose_direction, forearm_dir)

            transforms.append(BoneTransform(
                bone_name=f"{bone_suffix}ForeArm",
                rotation=[round(r, 5) for r in forearm_rot.tolist()],
                position=[0, 0, 0],
                scale=[1, 1, 1]
            ))

        return transforms

    def _calculate_leg_transforms(self, keypoints: Dict, side: str) -> List[BoneTransform]:
        """Calculate transforms for one leg."""
        transforms = []

        hip = self._get_keypoint_position(keypoints, f"{side}_hip")
        knee = self._get_keypoint_position(keypoints, f"{side}_knee")
        ankle = self._get_keypoint_position(keypoints, f"{side}_ankle")

        bone_suffix = "Left" if side == "left" else "Right"

        # T-pose leg direction (pointing down)
        t_pose_direction = np.array([0, -1, 0])

        if hip is not None and knee is not None:
            # Upper leg
            upper_leg_dir = self._normalize(knee - hip)
            upper_leg_rot = self._quaternion_from_two_vectors(t_pose_direction, upper_leg_dir)

            transforms.append(BoneTransform(
                bone_name=f"{bone_suffix}UpLeg",
                rotation=[round(r, 5) for r in upper_leg_rot.tolist()],
                position=[0, 0, 0],
                scale=[1, 1, 1]
            ))

        if knee is not None and ankle is not None:
            # Lower leg
            lower_leg_dir = self._normalize(ankle - knee)
            lower_leg_rot = self._quaternion_from_two_vectors(t_pose_direction, lower_leg_dir)

            transforms.append(BoneTransform(
                bone_name=f"{bone_suffix}Leg",
                rotation=[round(r, 5) for r in lower_leg_rot.tolist()],
                position=[0, 0, 0],
                scale=[1, 1, 1]
            ))

        return transforms

    def _calculate_finger_transforms(self, keypoints: Dict, side: str) -> List[BoneTransform]:
        """Calculate finger bone transforms."""
        transforms = []
        bone_prefix = "Left" if side == "left" else "Right"

        # Finger definitions: (name, joints)
        fingers = [
            ("Thumb", ["thumb_cmc", "thumb_mcp", "thumb_ip", "thumb_tip"]),
            ("Index", ["index_mcp", "index_pip", "index_dip", "index_tip"]),
            ("Middle", ["middle_mcp", "middle_pip", "middle_dip", "middle_tip"]),
            ("Ring", ["ring_mcp", "ring_pip", "ring_dip", "ring_tip"]),
            ("Pinky", ["pinky_mcp", "pinky_pip", "pinky_dip", "pinky_tip"]),
        ]

        for finger_name, joints in fingers:
            for i in range(len(joints) - 1):
                parent_name = f"{side}_{joints[i]}"
                child_name = f"{side}_{joints[i + 1]}"

                parent = self._get_keypoint_position(keypoints, parent_name)
                child = self._get_keypoint_position(keypoints, child_name)

                if parent is not None and child is not None:
                    direction = self._normalize(child - parent)

                    # Finger default direction (outward from hand)
                    arm_direction = 1 if side == "left" else -1
                    default_dir = np.array([arm_direction, 0, 0])

                    rotation = self._quaternion_from_two_vectors(default_dir, direction)

                    bone_number = i + 1
                    transforms.append(BoneTransform(
                        bone_name=f"{bone_prefix}Hand{finger_name}{bone_number}",
                        rotation=[round(r, 5) for r in rotation.tolist()],
                        position=[0, 0, 0],
                        scale=[1, 1, 1]
                    ))

        return transforms

    def to_dict(self, transforms: List[BoneTransform]) -> Dict[str, Any]:
        """
        Convert transforms to JSON for API/client.
        """
        return {
            "bones": [t.to_dict() for t in transforms],
            "bone_count": len(transforms)
        }

    def get_default_pose(self) -> List[BoneTransform]:
        """
        Get default T-pose transforms.
        """
        transforms = []
        for bone_name, data in self.t_pose_reference.items():
            transforms.append(BoneTransform(
                bone_name=bone_name,
                rotation=data["rotation"],
                position=data["position"],
                scale=[1, 1, 1]
            ))
        return transforms
