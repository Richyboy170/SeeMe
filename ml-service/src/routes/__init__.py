"""
API Routes for SeeMe ML Service
"""

from .face_processing import router as face_processing_router
from .body_avatar import router as body_avatar_router

__all__ = ['face_processing_router', 'body_avatar_router']
