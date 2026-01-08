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

__all__ = [
    'FaceProcessingError',
    'NoFaceDetectedError',
    'TooManyFacesError',
    'FaceTooSmallError',
    'FaceAngleTooExtremeError',
]
