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
