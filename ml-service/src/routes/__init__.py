"""
API Routes for SeeMe ML Service
"""

from .face_processing import router as face_processing_router

__all__ = ['face_processing_router']
