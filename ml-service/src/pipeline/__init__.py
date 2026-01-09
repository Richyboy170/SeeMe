"""
Computer Vision Pipeline for SeeMe
Face detection, segmentation, and processing pipeline
"""

from .exceptions import (
    FaceProcessingError,
    NoFaceDetectedError,
    TooManyFacesError,
    FaceTooSmallError,
    FaceAngleTooExtremeError,
)

from .face_detection import FaceDetector
from .face_parsing import FaceParser, FACE_PARSING_CLASSES
from .face_extraction import FaceExtractor
from .depth_estimation import DepthEstimator
from .normal_estimation import NormalEstimator
from .edge_detection import EdgeDetector

__all__ = [
    # Exceptions
    'FaceProcessingError',
    'NoFaceDetectedError',
    'TooManyFacesError',
    'FaceTooSmallError',
    'FaceAngleTooExtremeError',
    # Core classes
    'FaceDetector',
    'FaceParser',
    'FaceExtractor',
    'DepthEstimator',
    'NormalEstimator',
    'EdgeDetector',
    'FACE_PARSING_CLASSES',
]
