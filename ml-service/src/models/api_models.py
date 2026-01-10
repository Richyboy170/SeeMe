"""
API Request and Response Models for SeeMe ML Service
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from enum import Enum


class ProcessingQuality(str, Enum):
    """Processing quality levels"""
    FAST = "fast"           # Fastest processing, lower quality
    STANDARD = "standard"   # Balanced quality/speed
    HIGH = "high"          # Highest quality, slower


class FaceDetectionResult(BaseModel):
    """Face detection result"""
    bbox: Dict[str, int] = Field(description="Bounding box {x, y, width, height}")
    confidence: float = Field(description="Detection confidence [0-1]")
    landmarks: Optional[Dict[str, List[float]]] = Field(None, description="Facial landmarks")


class DepthFeatures(BaseModel):
    """Depth map features"""
    mean_depth: float
    max_depth: float
    min_depth: float
    depth_range: float
    depth_std: float


class NormalFeatures(BaseModel):
    """Normal map features"""
    mean_x: float
    mean_y: float
    mean_z: float
    std_x: float
    std_y: float
    std_z: float


class EdgeStatistics(BaseModel):
    """Edge detection statistics"""
    total_pixels: int
    coarse_pixels: int
    fine_pixels: int
    semantic_pixels: int
    depth_pixels: int


class ProcessingTimings(BaseModel):
    """Processing time breakdown"""
    face_detection: Optional[float] = None
    face_parsing: Optional[float] = None
    face_extraction: Optional[float] = None
    depth_estimation: Optional[float] = None
    normal_generation: Optional[float] = None
    edge_detection: Optional[float] = None
    total: float


class FaceProcessingRequest(BaseModel):
    """Request for face processing"""
    user_id: str = Field(description="User ID")
    avatar_id: str = Field(description="Avatar ID")
    quality: ProcessingQuality = Field(
        default=ProcessingQuality.STANDARD,
        description="Processing quality level"
    )
    enable_depth: bool = Field(default=True, description="Enable depth estimation")
    enable_normals: bool = Field(default=True, description="Enable normal map generation")
    enable_edges: bool = Field(default=True, description="Enable edge detection")
    return_visualizations: bool = Field(
        default=False,
        description="Return colored visualizations (larger response)"
    )


class FaceProcessingResponse(BaseModel):
    """Response from face processing"""
    success: bool = Field(description="Whether processing succeeded")
    error: Optional[str] = Field(None, description="Error message if failed")
    error_type: Optional[str] = Field(None, description="Error type")

    # Face detection results
    face_detected: Optional[bool] = None
    face_bbox: Optional[Dict[str, int]] = None
    face_confidence: Optional[float] = None

    # Segmentation results
    segmentation_quality_valid: Optional[bool] = None
    detected_regions: Optional[List[str]] = None

    # Depth results (if enabled)
    depth_features: Optional[DepthFeatures] = None
    depth_quality_valid: Optional[bool] = None

    # Normal results (if enabled)
    normal_features: Optional[NormalFeatures] = None
    normal_quality_valid: Optional[bool] = None

    # Edge results (if enabled)
    edge_statistics: Optional[EdgeStatistics] = None

    # Performance metrics
    timings: ProcessingTimings

    # URLs to processed images (stored in S3)
    urls: Optional[Dict[str, str]] = Field(
        None,
        description="URLs to stored images (face, depth, normals, edges)"
    )


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str = Field(description="Service status: healthy, degraded, or unhealthy")
    service: str
    version: str
    gpu_available: bool
    gpu_device: Optional[str] = None
    models_loaded: Dict[str, bool]
    all_models_ready: bool


class PipelineInfoResponse(BaseModel):
    """Pipeline configuration info"""
    workstreams: List[str]
    components: Dict[str, str]
    device: str
    capabilities: Dict[str, bool]
    available_styles: Optional[List[str]] = Field(
        None,
        description="Available avatar styles (if style system enabled)"
    )


class BatchProcessingRequest(BaseModel):
    """Request for batch processing"""
    user_id: str
    image_count: int = Field(description="Number of images in batch")
    quality: ProcessingQuality = Field(default=ProcessingQuality.STANDARD)
    enable_depth: bool = True
    enable_normals: bool = True
    enable_edges: bool = True


class BatchProcessingResponse(BaseModel):
    """Response from batch processing"""
    success: bool
    processed_count: int
    failed_count: int
    results: List[FaceProcessingResponse]
    total_time: float


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str = Field(description="Error message")
    error_type: str = Field(description="Error type/code")
    detail: Optional[str] = Field(None, description="Detailed error information")
    status_code: int = Field(description="HTTP status code")
