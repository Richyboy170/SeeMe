"""
Skeleton extraction from MediaPipe landmarks.
Builds hierarchical bone structure from pose landmarks.
"""

import numpy as np
from typing import Dict, List, Any, Tuple


class SkeletonExtractor:
    """Builds a hierarchical skeleton structure from MediaPipe landmarks."""

    SKELETON_HIERARCHY = {
        "hips": None, "spine": "hips", "chest": "spine", "neck": "chest", "head": "neck",
        "left_shoulder": "chest", "left_upper_arm": "left_shoulder",
        "left_lower_arm": "left_upper_arm", "left_hand": "left_lower_arm",
        "right_shoulder": "chest", "right_upper_arm": "right_shoulder",
        "right_lower_arm": "right_upper_arm", "right_hand": "right_lower_arm",
        "left_upper_leg": "hips", "left_lower_leg": "left_upper_leg", "left_foot": "left_lower_leg",
        "right_upper_leg": "hips", "right_lower_leg": "right_upper_leg", "right_foot": "right_lower_leg",
    }

    JOINT_TO_LANDMARKS = {
        "hips": (23, 24), "spine": "CALCULATED", "chest": (11, 12),
        "neck": "CALCULATED", "head": (0,),
        "left_shoulder": (11,), "left_upper_arm": (11,),
        "left_lower_arm": (13,), "left_hand": (15,),
        "right_shoulder": (12,), "right_upper_arm": (12,),
        "right_lower_arm": (14,), "right_hand": (16,),
        "left_upper_leg": (23,), "left_lower_leg": (25,), "left_foot": (27,),
        "right_upper_leg": (24,), "right_lower_leg": (26,), "right_foot": (28,),
    }

    def extract_skeleton(self, pose_landmarks: List[Dict[str, float]], use_world_coords: bool = True) -> Dict[str, Any]:
        if not pose_landmarks or len(pose_landmarks) < 33:
            return {"success": False, "error": f"Insufficient landmarks: expected 33, got {len(pose_landmarks) if pose_landmarks else 0}"}

        joints = {}
        for joint_name in self.SKELETON_HIERARCHY.keys():
            position = self._calculate_joint_position(pose_landmarks, joint_name)
            visibility = self._get_joint_visibility(pose_landmarks, joint_name)
            parent = self.SKELETON_HIERARCHY.get(joint_name)
            children = [name for name, p in self.SKELETON_HIERARCHY.items() if p == joint_name]

            joints[joint_name] = {
                "position": {"x": position[0], "y": position[1], "z": position[2]},
                "parent": parent, "children": children, "visibility": visibility
            }

        return {"success": True, "joints": joints, "hierarchy": self.SKELETON_HIERARCHY, "root": "hips"}

    def _calculate_joint_position(self, landmarks: List[Dict[str, float]], joint_name: str) -> Tuple[float, float, float]:
        mapping = self.JOINT_TO_LANDMARKS.get(joint_name)

        if mapping == "CALCULATED":
            if joint_name == "spine":
                hips = self._average_landmarks(landmarks, (23, 24))
                chest = self._average_landmarks(landmarks, (11, 12))
                return ((hips[0] + chest[0]) / 2, (hips[1] + chest[1]) / 2, (hips[2] + chest[2]) / 2)
            elif joint_name == "neck":
                chest = self._average_landmarks(landmarks, (11, 12))
                head = (landmarks[0]["x"], landmarks[0]["y"], landmarks[0]["z"])
                t = 0.3
                return (chest[0] + (head[0] - chest[0]) * t, chest[1] + (head[1] - chest[1]) * t, chest[2] + (head[2] - chest[2]) * t)

        if len(mapping) == 1:
            lm = landmarks[mapping[0]]
            return (lm["x"], lm["y"], lm["z"])

        return self._average_landmarks(landmarks, mapping)

    def _average_landmarks(self, landmarks: List[Dict[str, float]], indices: Tuple[int, ...]) -> Tuple[float, float, float]:
        x = sum(landmarks[i]["x"] for i in indices) / len(indices)
        y = sum(landmarks[i]["y"] for i in indices) / len(indices)
        z = sum(landmarks[i]["z"] for i in indices) / len(indices)
        return (x, y, z)

    def _get_joint_visibility(self, landmarks: List[Dict[str, float]], joint_name: str) -> float:
        mapping = self.JOINT_TO_LANDMARKS.get(joint_name)
        if mapping == "CALCULATED":
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
