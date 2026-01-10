"""
Face Processing API Routes
Endpoints for WORKSTREAM 1.1 + 1.2 integrated pipeline
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from loguru import logger
import cv2
import numpy as np
import io
from pathlib import Path
import base64
from typing import Optional

from models.api_models import (
    FaceProcessingResponse,
    PipelineInfoResponse,
    ErrorResponse,
    ProcessingTimings,
    DepthFeatures,
    NormalFeatures,
    EdgeStatistics,
    ProcessingQuality
)
from pipeline import IntegratedFacePipeline
from pipeline.exceptions import (
    FaceProcessingError,
    NoFaceDetectedError,
    TooManyFacesError,
    FaceTooSmallError,
    FaceAngleTooExtremeError
)
from config import settings

router = APIRouter(prefix="/api/face", tags=["Face Processing"])

# Global pipeline instance (lazy initialization)
_pipeline: Optional[IntegratedFacePipeline] = None


def get_pipeline() -> IntegratedFacePipeline:
    """Get or initialize the pipeline"""
    global _pipeline
    if _pipeline is None:
        logger.info("Initializing IntegratedFacePipeline...")
        _pipeline = IntegratedFacePipeline(
            device=None,  # Auto-detect
            enable_depth=True,
            enable_normals=True,
            enable_edges=True
        )
        logger.info("Pipeline initialized successfully")
    return _pipeline


def image_to_base64(image: np.ndarray, format: str = ".jpg") -> str:
    """Convert numpy image to base64 string"""
    success, buffer = cv2.imencode(format, image)
    if not success:
        raise ValueError("Failed to encode image")
    return base64.b64encode(buffer).decode('utf-8')


def parse_image_from_upload(file_contents: bytes) -> np.ndarray:
    """Parse image from uploaded file"""
    # Convert bytes to numpy array
    nparr = np.frombuffer(file_contents, np.uint8)

    # Decode image
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Failed to decode image")

    return image


@router.post("/process", response_model=FaceProcessingResponse)
async def process_face(
    file: UploadFile = File(..., description="Image file to process"),
    user_id: str = Form("", description="User ID"),
    avatar_id: str = Form("", description="Avatar ID"),
    quality: ProcessingQuality = Form(ProcessingQuality.STANDARD, description="Processing quality"),
    enable_depth: bool = Form(True, description="Enable depth estimation"),
    enable_normals: bool = Form(True, description="Enable normal generation"),
    enable_edges: bool = Form(True, description="Enable edge detection"),
    style_name: str = Form(None, description="Avatar style: 'cartoon', 'anime', 'minimalist', or None"),
    return_visualizations: bool = Form(False, description="Return base64 visualizations"),
    return_images: bool = Form(False, description="Return processed images as base64")
):
    """
    Process a face image through the complete pipeline

    **WORKSTREAM 1.1 + 1.2 + 1.3**: Face Detection, Segmentation, Depth, Normals, Edges, Style

    Returns:
        - Face detection results
        - Segmentation quality
        - Depth features and quality
        - Normal map features
        - Edge detection statistics
        - Avatar-styled face (if style_name provided)
        - Processing timings
        - Optional: Base64-encoded images
    """
    try:
        logger.info(f"Processing face: user_id={user_id}, avatar_id={avatar_id}, quality={quality}")

        # Validate file type
        if file.content_type not in settings.allowed_image_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {settings.allowed_image_types}"
            )

        # Read and parse image
        contents = await file.read()
        file_size = len(contents)

        if file_size > settings.max_image_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max: {settings.max_image_size / 1024 / 1024}MB"
            )

        logger.info(f"Image received: size={file_size / 1024:.2f}KB, type={file.content_type}")

        # Parse image
        image = parse_image_from_upload(contents)
        logger.info(f"Image decoded: shape={image.shape}")

        # Get pipeline
        pipeline = get_pipeline()

        # Update pipeline settings based on request
        pipeline.enable_depth = enable_depth
        pipeline.enable_normals = enable_normals
        pipeline.enable_edges = enable_edges

        # Process image
        result = pipeline.process_image(
            image,
            return_visualizations=return_visualizations,
            style_name=style_name
        )

        # Build response
        response_data = {
            "success": result['success'],
            "error": result.get('error'),
            "error_type": result.get('error_type'),
            "timings": ProcessingTimings(**result['timings'])
        }

        if result['success']:
            # Face detection
            if 'face_detection' in result:
                detection = result['face_detection']
                response_data['face_detected'] = True
                response_data['face_bbox'] = detection['bbox']
                response_data['face_confidence'] = detection['confidence']

            # Segmentation
            if 'segmentation' in result:
                seg = result['segmentation']
                response_data['segmentation_quality_valid'] = seg.get('quality_valid', False)
                response_data['detected_regions'] = list(seg['masks'].keys())

            # Depth
            if 'depth' in result:
                depth_data = result['depth']
                response_data['depth_features'] = DepthFeatures(**depth_data['features'])
                response_data['depth_quality_valid'] = depth_data['quality_valid']

            # Normals
            if 'normals' in result:
                normal_data = result['normals']
                response_data['normal_features'] = NormalFeatures(**normal_data['features'])
                response_data['normal_quality_valid'] = normal_data['quality_valid']

            # Edges
            if 'edges' in result:
                edges = result['edges']
                response_data['edge_statistics'] = EdgeStatistics(
                    total_pixels=int(np.sum(edges['fused_edges'] > 0)),
                    coarse_pixels=int(np.sum(edges['coarse_edges'] > 0)),
                    fine_pixels=int(np.sum(edges['fine_edges'] > 0)),
                    semantic_pixels=int(np.sum(edges['semantic_edges'] > 0)),
                    depth_pixels=int(np.sum(edges['depth_edges'] > 0))
                )

            # Return images as base64 if requested
            if return_images:
                urls = {}

                if 'face_extraction' in result:
                    urls['face'] = image_to_base64(result['face_extraction']['face_image'])
                    urls['mask'] = image_to_base64(result['face_extraction']['mask'])

                if 'depth' in result and 'visualization' in result['depth']:
                    urls['depth'] = image_to_base64(result['depth']['visualization'])

                if 'normals' in result:
                    urls['normals'] = image_to_base64(result['normals']['smoothed_normals'])

                if 'edges' in result:
                    urls['edges'] = image_to_base64(result['edges']['fused_edges'])

                # Styled face image (WORKSTREAM 1.3)
                if 'styled_face' in result and result['styled_face'] is not None:
                    urls['styled_face'] = image_to_base64(result['styled_face']['styled_image'])

                response_data['urls'] = urls

        return FaceProcessingResponse(**response_data)

    except NoFaceDetectedError as e:
        logger.warning(f"No face detected: {e}")
        return FaceProcessingResponse(
            success=False,
            error=str(e),
            error_type="NoFaceDetectedError",
            timings=ProcessingTimings(total=0.0)
        )

    except FaceProcessingError as e:
        logger.error(f"Face processing error: {e}")
        return FaceProcessingResponse(
            success=False,
            error=str(e),
            error_type=type(e).__name__,
            timings=ProcessingTimings(total=0.0)
        )

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline/info", response_model=PipelineInfoResponse)
async def get_pipeline_info():
    """
    Get information about the pipeline configuration

    Returns details about active components and capabilities
    """
    try:
        pipeline = get_pipeline()
        info = pipeline.get_pipeline_info()
        return PipelineInfoResponse(**info)

    except Exception as e:
        logger.error(f"Error getting pipeline info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/styles")
async def list_available_styles():
    """
    List available avatar styles

    Returns information about all available avatar styles including their
    characteristics and parameters.
    """
    try:
        from styles import list_styles, get_style_info

        styles = list_styles()
        style_info = {style_name: get_style_info(style_name) for style_name in styles}

        return {
            "styles": styles,
            "count": len(styles),
            "details": style_info
        }

    except Exception as e:
        logger.error(f"Error listing styles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_face(
    file: UploadFile = File(..., description="Image file to validate")
):
    """
    Quick validation: Check if image contains a valid face

    Faster than full processing - only runs detection and basic validation

    Returns:
        - face_detected: bool
        - confidence: float
        - bbox: dict
        - processing_time: float
    """
    try:
        # Read image
        contents = await file.read()
        image = parse_image_from_upload(contents)

        # Get pipeline
        pipeline = get_pipeline()

        # Run only face detection
        import time
        t0 = time.time()
        faces = pipeline.face_detector.detect_faces(image)
        elapsed = time.time() - t0

        if not faces or len(faces) == 0:
            return {
                "face_detected": False,
                "confidence": 0.0,
                "bbox": None,
                "processing_time": elapsed
            }

        # Use first face
        detection_result = faces[0]

        return {
            "face_detected": True,
            "confidence": detection_result['confidence'],
            "bbox": detection_result['bbox'],
            "processing_time": elapsed
        }

    except NoFaceDetectedError:
        return {
            "face_detected": False,
            "confidence": 0.0,
            "bbox": None,
            "processing_time": 0.0
        }

    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def face_processing_health():
    """
    Health check for face processing pipeline

    Returns:
        - pipeline_initialized: bool
        - components_status: dict
        - device: str
    """
    try:
        pipeline = get_pipeline()
        info = pipeline.get_pipeline_info()

        return {
            "pipeline_initialized": True,
            "components": info['components'],
            "device": info['device'],
            "status": "healthy"
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "pipeline_initialized": False,
            "status": "unhealthy",
            "error": str(e)
        }
