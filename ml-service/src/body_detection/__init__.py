"""
Body Detection Module for SeeMe ML Service
Phase 3.1: Full-Body 3D Avatar System

This module provides:
- Quick person detection for content policy enforcement
- Face blur functionality for privacy
- Multi-person detection and selection
- Full skeleton extraction (75 keypoints: body + hands)
- Pose-to-rig mapping for 3D avatar rendering
- KalidoKit-compatible holistic landmark extraction
"""

from .quick_person_check import QuickPersonDetector
from .face_blur import FaceBlurProcessor
from .person_detector import MultiPersonDetector, DetectedPerson
from .skeleton_extractor import FullSkeletonExtractor, FullBodySkeleton, SkeletonKeypoint
from .pose_to_rig import PoseToRigMapper, BoneTransform
from .holistic_landmarks import HolisticLandmarkExtractor

__all__ = [
    'QuickPersonDetector',
    'FaceBlurProcessor',
    'MultiPersonDetector',
    'DetectedPerson',
    'FullSkeletonExtractor',
    'FullBodySkeleton',
    'SkeletonKeypoint',
    'PoseToRigMapper',
    'BoneTransform',
    'HolisticLandmarkExtractor',
]
