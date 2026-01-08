"""
Exception classes for face processing pipeline
"""


class FaceProcessingError(Exception):
    """Base exception for face processing errors"""
    pass


class NoFaceDetectedError(FaceProcessingError):
    """No face found in image"""
    pass


class TooManyFacesError(FaceProcessingError):
    """More than maximum allowed faces"""
    pass


class FaceTooSmallError(FaceProcessingError):
    """Face is too small for quality processing"""
    pass


class FaceAngleTooExtremeError(FaceProcessingError):
    """Face angle outside acceptable range"""
    pass
