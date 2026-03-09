"""
Friendship Pose Validator.
Validates that multiple people are in frame and approximately matching a target pose.
Lenient scoring — the goal is fun, not perfection.
"""

import numpy as np
from typing import Dict, Any, List, Optional
from .holistic_landmarks import HolisticLandmarksExtractor


# Pose definitions: each pose specifies which joint relationships to check
# Keypoints reference MediaPipe indices: 11=left_shoulder, 12=right_shoulder,
# 13=left_elbow, 14=right_elbow, 15=left_wrist, 16=right_wrist,
# 23=left_hip, 24=right_hip, 25=left_knee, 26=right_knee
POSE_DEFINITIONS = {
    "high_five": {
        "description": "Both people raise one arm high",
        "checks": [
            {"type": "arm_raised", "side": "any", "min_angle": 120},
        ]
    },
    "back_to_back": {
        "description": "Standing back to back",
        "checks": [
            {"type": "standing_upright"},
        ]
    },
    "heart_hands": {
        "description": "Both hands together forming a heart shape",
        "checks": [
            {"type": "hands_close_together"},
        ]
    },
    "peace_signs": {
        "description": "Peace sign gesture",
        "checks": [
            {"type": "arm_raised", "side": "any", "min_angle": 60},
        ]
    },
    "silly_faces": {
        "description": "Any silly expression — just need people in frame",
        "checks": [
            {"type": "people_visible"},
        ]
    },
    "side_hug": {
        "description": "Side hug position",
        "checks": [
            {"type": "people_close"},
        ]
    },
    "flexing": {
        "description": "Flexing muscles, arms bent at sides",
        "checks": [
            {"type": "arms_bent", "min_angle": 30, "max_angle": 120},
        ]
    },
    "pointing_at_each_other": {
        "description": "Pointing at the other person",
        "checks": [
            {"type": "arm_extended", "side": "any"},
        ]
    },
    "thumbs_up": {
        "description": "Thumbs up gesture",
        "checks": [
            {"type": "arm_raised", "side": "any", "min_angle": 45},
        ]
    },
    "victory": {
        "description": "Both arms raised in victory",
        "checks": [
            {"type": "both_arms_raised", "min_angle": 100},
        ]
    },
    "handshake": {
        "description": "Handshake — arms extended toward each other",
        "checks": [
            {"type": "arm_extended", "side": "any"},
        ]
    },
    "shoulder_to_shoulder": {
        "description": "Standing close, shoulder to shoulder",
        "checks": [
            {"type": "people_close"},
            {"type": "standing_upright"},
        ]
    },
}


def _angle_between_points(a: Dict, b: Dict, c: Dict) -> float:
    """Calculate angle at point b formed by points a-b-c (in degrees)."""
    ba = np.array([a["x"] - b["x"], a["y"] - b["y"]])
    bc = np.array([c["x"] - b["x"], c["y"] - b["y"]])

    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    cos_angle = np.clip(cos_angle, -1, 1)
    return float(np.degrees(np.arccos(cos_angle)))


def _get_landmark(landmarks: List[Dict], idx: int) -> Optional[Dict]:
    """Get a landmark by index, returning None if not visible enough."""
    if idx < len(landmarks) and landmarks[idx].get("visibility", 0) > 0.15:
        return landmarks[idx]
    return None


def _check_arm_raised(landmarks: List[Dict], side: str = "any", min_angle: float = 90) -> float:
    """Check if arm is raised. Returns 0-1 score."""
    scores = []

    for s in (["left", "right"] if side == "any" else [side]):
        shoulder_idx = 11 if s == "left" else 12
        elbow_idx = 13 if s == "left" else 14
        wrist_idx = 15 if s == "left" else 16
        hip_idx = 23 if s == "left" else 24

        shoulder = _get_landmark(landmarks, shoulder_idx)
        elbow = _get_landmark(landmarks, elbow_idx)
        wrist = _get_landmark(landmarks, wrist_idx)
        hip = _get_landmark(landmarks, hip_idx)

        if shoulder and hip and (elbow or wrist):
            ref_point = wrist if wrist else elbow
            # Check if hand/elbow is above shoulder
            if ref_point["y"] < shoulder["y"]:
                scores.append(1.0)
            elif ref_point["y"] < hip["y"]:
                scores.append(0.5)
            else:
                scores.append(0.1)

    return max(scores) if scores else 0.0


def _check_both_arms_raised(landmarks: List[Dict], min_angle: float = 100) -> float:
    """Check if both arms are raised."""
    left = _check_arm_raised(landmarks, "left", min_angle)
    right = _check_arm_raised(landmarks, "right", min_angle)
    return (left + right) / 2.0


def _check_standing_upright(landmarks: List[Dict]) -> float:
    """Check if person is standing relatively upright."""
    left_shoulder = _get_landmark(landmarks, 11)
    right_shoulder = _get_landmark(landmarks, 12)
    left_hip = _get_landmark(landmarks, 23)
    right_hip = _get_landmark(landmarks, 24)

    if not (left_shoulder and right_shoulder and left_hip and right_hip):
        return 0.3  # Can't tell, give benefit of doubt

    mid_shoulder_x = (left_shoulder["x"] + right_shoulder["x"]) / 2
    mid_hip_x = (left_hip["x"] + right_hip["x"]) / 2

    # How vertically aligned are shoulders and hips?
    offset = abs(mid_shoulder_x - mid_hip_x)
    return max(0, 1.0 - offset * 5)


def _check_arms_bent(landmarks: List[Dict], min_angle: float = 30, max_angle: float = 120) -> float:
    """Check if arms are bent (like flexing)."""
    scores = []
    for side in ["left", "right"]:
        shoulder_idx = 11 if side == "left" else 12
        elbow_idx = 13 if side == "left" else 14
        wrist_idx = 15 if side == "left" else 16

        shoulder = _get_landmark(landmarks, shoulder_idx)
        elbow = _get_landmark(landmarks, elbow_idx)
        wrist = _get_landmark(landmarks, wrist_idx)

        if shoulder and elbow and wrist:
            angle = _angle_between_points(shoulder, elbow, wrist)
            if min_angle <= angle <= max_angle:
                scores.append(1.0)
            else:
                scores.append(0.3)

    return max(scores) if scores else 0.3


def _check_arm_extended(landmarks: List[Dict], side: str = "any") -> float:
    """Check if arm is extended outward."""
    scores = []
    for s in (["left", "right"] if side == "any" else [side]):
        shoulder_idx = 11 if s == "left" else 12
        elbow_idx = 13 if s == "left" else 14
        wrist_idx = 15 if s == "left" else 16

        shoulder = _get_landmark(landmarks, shoulder_idx)
        elbow = _get_landmark(landmarks, elbow_idx)
        wrist = _get_landmark(landmarks, wrist_idx)

        if shoulder and elbow and wrist:
            angle = _angle_between_points(shoulder, elbow, wrist)
            if angle > 140:
                scores.append(1.0)
            elif angle > 100:
                scores.append(0.6)
            else:
                scores.append(0.2)

    return max(scores) if scores else 0.2


def _check_hands_close_together(landmarks: List[Dict]) -> float:
    """Check if both hands are close together (heart hands)."""
    left_wrist = _get_landmark(landmarks, 15)
    right_wrist = _get_landmark(landmarks, 16)

    if left_wrist and right_wrist:
        dist = np.sqrt((left_wrist["x"] - right_wrist["x"])**2 + (left_wrist["y"] - right_wrist["y"])**2)
        if dist < 0.15:
            return 1.0
        elif dist < 0.3:
            return 0.5
    return 0.2


def _check_people_close(all_landmarks: List[List[Dict]]) -> float:
    """Check if detected people are physically close to each other."""
    if len(all_landmarks) < 2:
        return 0.0

    # Compare midpoints of first two people
    centers = []
    for landmarks in all_landmarks[:2]:
        left_hip = _get_landmark(landmarks, 23)
        right_hip = _get_landmark(landmarks, 24)
        if left_hip and right_hip:
            centers.append(((left_hip["x"] + right_hip["x"]) / 2, (left_hip["y"] + right_hip["y"]) / 2))

    if len(centers) < 2:
        return 0.3

    dist = np.sqrt((centers[0][0] - centers[1][0])**2 + (centers[0][1] - centers[1][1])**2)
    if dist < 0.4:
        return 1.0
    elif dist < 0.6:
        return 0.5
    return 0.2


def _validate_pose_for_person(landmarks: List[Dict], checks: List[Dict], all_landmarks: List[List[Dict]]) -> float:
    """Run pose checks for a single person. Returns average score."""
    if not checks:
        return 1.0

    scores = []
    for check in checks:
        check_type = check["type"]

        if check_type == "people_visible":
            scores.append(1.0)
        elif check_type == "arm_raised":
            scores.append(_check_arm_raised(landmarks, check.get("side", "any"), check.get("min_angle", 90)))
        elif check_type == "both_arms_raised":
            scores.append(_check_both_arms_raised(landmarks, check.get("min_angle", 100)))
        elif check_type == "standing_upright":
            scores.append(_check_standing_upright(landmarks))
        elif check_type == "arms_bent":
            scores.append(_check_arms_bent(landmarks, check.get("min_angle", 30), check.get("max_angle", 120)))
        elif check_type == "arm_extended":
            scores.append(_check_arm_extended(landmarks, check.get("side", "any")))
        elif check_type == "hands_close_together":
            scores.append(_check_hands_close_together(landmarks))
        elif check_type == "people_close":
            scores.append(_check_people_close(all_landmarks))
        else:
            scores.append(0.5)

    return float(np.mean(scores)) if scores else 0.0


def _get_person_center(landmarks: List[Dict]) -> Optional[tuple]:
    """Get the torso center (midpoint of shoulders and hips) for a person."""
    left_shoulder = _get_landmark(landmarks, 11)
    right_shoulder = _get_landmark(landmarks, 12)
    left_hip = _get_landmark(landmarks, 23)
    right_hip = _get_landmark(landmarks, 24)

    points = [p for p in [left_shoulder, right_shoulder, left_hip, right_hip] if p is not None]
    if len(points) < 2:
        return None

    cx = float(np.mean([p["x"] for p in points]))
    cy = float(np.mean([p["y"] for p in points]))
    return (cx, cy)


def _deduplicate_people(people_landmarks: List[List[Dict]], min_distance: float = 0.07) -> List[List[Dict]]:
    """
    Remove duplicate detections of the same person.
    If two detected poses have torso centers closer than min_distance, keep only the one
    with more visible landmarks (higher quality detection).
    """
    if len(people_landmarks) <= 1:
        return people_landmarks

    centers = []
    visibilities = []
    for landmarks in people_landmarks:
        center = _get_person_center(landmarks)
        centers.append(center)
        # Sum of visibility scores as quality metric
        vis = sum(lm.get("visibility", 0) for lm in landmarks)
        visibilities.append(vis)

    keep = [True] * len(people_landmarks)
    for i in range(len(people_landmarks)):
        if not keep[i] or centers[i] is None:
            continue
        for j in range(i + 1, len(people_landmarks)):
            if not keep[j] or centers[j] is None:
                continue
            dist = np.sqrt((centers[i][0] - centers[j][0])**2 + (centers[i][1] - centers[j][1])**2)
            if dist < min_distance:
                # Duplicate — drop the lower quality one
                if visibilities[i] >= visibilities[j]:
                    keep[j] = False
                else:
                    keep[i] = False
                    break

    return [lm for lm, k in zip(people_landmarks, keep) if k]


class FriendshipPoseValidator:
    """Validates friendship meetup poses using multi-person detection."""

    def __init__(self):
        self.extractor = HolisticLandmarksExtractor(
            num_poses=4, num_faces=4, min_detection_confidence=0.35
        )

    def validate(self, image: np.ndarray, pose_name: str, min_people: int = 2) -> Dict[str, Any]:
        """
        Validate a friendship pose in the given image.

        Returns:
            {
                "people_detected": int,
                "pose_match_score": float (0-1),
                "is_valid": bool (score > 0.3 and enough people),
                "details": str
            }
        """
        # Single model run — extract landmarks for all detected people
        all_people_landmarks = self.extractor.extract_all(image)

        if not all_people_landmarks:
            return {
                "people_detected": 0,
                "pose_match_score": 0.0,
                "is_valid": False,
                "details": "No people detected in frame"
            }

        # Extract pose landmarks and deduplicate (removes ghost/duplicate detections)
        all_landmarks_lists = [p["pose_landmarks"] for p in all_people_landmarks if p.get("pose_landmarks")]
        all_landmarks_lists = _deduplicate_people(all_landmarks_lists)
        people_count = len(all_landmarks_lists)

        if people_count == 0:
            return {
                "people_detected": 0,
                "pose_match_score": 0.0,
                "is_valid": False,
                "details": "No valid landmarks extracted"
            }

        # Look up pose definition
        pose_def = POSE_DEFINITIONS.get(pose_name)
        if not pose_def:
            # Unknown pose — just check people count
            is_enough = people_count >= min_people
            return {
                "people_detected": people_count,
                "pose_match_score": 0.5 if is_enough else 0.0,
                "is_valid": is_enough,
                "details": f"Unknown pose '{pose_name}', validated people count only"
            }

        checks = pose_def["checks"]

        # Score each detected person against the pose
        person_scores = []
        for landmarks in all_landmarks_lists:
            score = _validate_pose_for_person(landmarks, checks, all_landmarks_lists)
            person_scores.append(score)

        # Overall score is the average of all detected people
        overall_score = float(np.mean(person_scores)) if person_scores else 0.0

        # Bonus for having enough people (selfie-friendly: boost score more)
        if people_count >= min_people:
            overall_score = min(1.0, max(overall_score * 1.2, 0.4))

        enough_people = people_count >= min_people
        is_valid = enough_people and overall_score > 0.25

        if not enough_people:
            details = f"Need {min_people} people, detected {people_count}"
        elif is_valid:
            details = f"Pose '{pose_name}' matched with score {overall_score:.2f}"
        else:
            details = f"Pose '{pose_name}' score too low: {overall_score:.2f}"

        return {
            "people_detected": people_count,
            "pose_match_score": round(overall_score, 3),
            "is_valid": is_valid,
            "details": details
        }

    def close(self):
        self.extractor.close()

    def __del__(self):
        if hasattr(self, 'extractor'):
            self.close()
