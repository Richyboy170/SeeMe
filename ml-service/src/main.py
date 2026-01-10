"""
SeeMe ML Service - FastAPI Application
Handles image processing, face detection, segmentation, and avatar style transfer
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import sys
from pathlib import Path
import torch

from config import settings
from routes import face_processing_router

# Configure Loguru
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=settings.log_level
)
logger.add(
    "logs/ml_service_{time:YYYY-MM-DD}.log",
    rotation="00:00",
    retention="30 days",
    level=settings.log_level
)

# Initialize FastAPI app
app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="ML service for face detection, segmentation, and avatar style transfer"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(face_processing_router)


def check_models_loaded() -> dict:
    """Check if all required models are present"""
    models_status = {}
    required_models = [
        "bisenet_face_parsing.pth",
        "midas_v3_1.pt"
    ]

    for model_file in required_models:
        model_path = settings.models_dir / model_file
        models_status[model_file] = model_path.exists()

    return models_status


@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")
    logger.info(f"Python: {sys.version}")
    logger.info(f"PyTorch: {torch.__version__}")
    logger.info(f"CUDA Available: {torch.cuda.is_available()}")

    if torch.cuda.is_available():
        logger.info(f"CUDA Device: {torch.cuda.get_device_name(0)}")
        logger.info(f"CUDA Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

    # Check models
    models_status = check_models_loaded()
    logger.info(f"Models Status: {models_status}")

    # Create models directory if it doesn't exist
    settings.models_dir.mkdir(exist_ok=True)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down ML Service")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint with detailed system status"""
    models_status = check_models_loaded()
    all_models_loaded = all(models_status.values())

    health_data = {
        "status": "healthy" if all_models_loaded else "degraded",
        "service": settings.service_name,
        "version": settings.service_version,
        "gpu_available": torch.cuda.is_available(),
        "gpu_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "models_loaded": models_status,
        "all_models_ready": all_models_loaded
    }

    return health_data


@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...),
    user_id: str = "",
    avatar_id: str = ""
):
    """
    Process image endpoint (placeholder for Phase 0)
    Will be replaced with actual ML processing in later phases
    """
    logger.info(f"Received image for processing: user_id={user_id}, avatar_id={avatar_id}, filename={file.filename}")

    # Validate file type
    if file.content_type not in settings.allowed_image_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {settings.allowed_image_types}"
        )

    # Read file
    contents = await file.read()
    file_size = len(contents)

    # Validate file size
    if file_size > settings.max_image_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.max_image_size / 1024 / 1024}MB"
        )

    logger.info(f"Image validated: size={file_size / 1024:.2f}KB, type={file.content_type}")

    # For now, just return success
    # TODO: Implement actual ML processing in later phases
    return {
        "status": "success",
        "message": "Image received (processing not implemented yet)",
        "file_size": file_size,
        "filename": file.filename,
        "user_id": user_id,
        "avatar_id": avatar_id
    }


@app.get("/api/models/status")
async def models_status():
    """Get detailed status of all ML models"""
    models_status = check_models_loaded()

    return {
        "models": models_status,
        "models_directory": str(settings.models_dir.absolute()),
        "all_ready": all(models_status.values())
    }


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting server on {settings.host}:{settings.port}")
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    )
