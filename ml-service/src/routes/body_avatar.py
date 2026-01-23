"""
Body Avatar API Routes
Phase 3.1: Full-Body 3D Avatar System

Endpoints for:
- Content policy enforcement (person check)
- Face blur functionality
- Multi-person detection
- Full skeleton extraction
- Pose-to-rig mapping
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse, Response
from typing import Optional
import numpy as np
from PIL import Image
import io
import json
from loguru import logger

from body_detection import (
    QuickPersonDetector,
    FaceBlurProcessor,
    MultiPersonDetector,
    FullSkeletonExtractor,
    PoseToRigMapper,
    HolisticLandmarkExtractor,
)

router = APIRouter(prefix="/api/body-avatar", tags=["body-avatar"])

# Initialize components (singleton pattern)
_quick_detector: Optional[QuickPersonDetector] = None
_face_blurrer: Optional[FaceBlurProcessor] = None
_person_detector: Optional[MultiPersonDetector] = None
_skeleton_extractor: Optional[FullSkeletonExtractor] = None
_pose_mapper: Optional[PoseToRigMapper] = None
_holistic_extractor: Optional[HolisticLandmarkExtractor] = None


def get_quick_detector() -> QuickPersonDetector:
    """Get or create QuickPersonDetector singleton."""
    global _quick_detector
    if _quick_detector is None:
        _quick_detector = QuickPersonDetector()
    return _quick_detector


def get_face_blurrer() -> FaceBlurProcessor:
    """Get or create FaceBlurProcessor singleton."""
    global _face_blurrer
    if _face_blurrer is None:
        _face_blurrer = FaceBlurProcessor()
    return _face_blurrer


def get_person_detector() -> MultiPersonDetector:
    """Get or create MultiPersonDetector singleton."""
    global _person_detector
    if _person_detector is None:
        _person_detector = MultiPersonDetector()
    return _person_detector


def get_skeleton_extractor() -> FullSkeletonExtractor:
    """Get or create FullSkeletonExtractor singleton."""
    global _skeleton_extractor
    if _skeleton_extractor is None:
        _skeleton_extractor = FullSkeletonExtractor()
    return _skeleton_extractor


def get_pose_mapper() -> PoseToRigMapper:
    """Get or create PoseToRigMapper singleton."""
    global _pose_mapper
    if _pose_mapper is None:
        _pose_mapper = PoseToRigMapper()
    return _pose_mapper


def get_holistic_extractor() -> HolisticLandmarkExtractor:
    """Get or create HolisticLandmarkExtractor singleton."""
    global _holistic_extractor
    if _holistic_extractor is None:
        _holistic_extractor = HolisticLandmarkExtractor()
    return _holistic_extractor


# ========== KalidoKit Landmark Extraction ==========

@router.post("/extract-landmarks")
async def extract_landmarks(file: UploadFile = File(...)):
    """
    Extract MediaPipe Holistic landmarks from image.
    Returns raw landmark data in KalidoKit-compatible format.

    KalidoKit expects:
    - poseLandmarks: 33 points (2D normalized)
    - poseWorldLandmarks: 33 points (3D meters)
    - faceLandmarks: 468/478 points (for face tracking)
    - leftHandLandmarks: 21 points
    - rightHandLandmarks: 21 points

    The mobile app uses KalidoKit.Pose.solve(), KalidoKit.Face.solve(),
    and KalidoKit.Hand.solve() to convert these to bone rotations.

    Response time target: <1000ms for complex processing
    """
    try:
        contents = await file.read()

        extractor = get_holistic_extractor()
        result = extractor.extract_from_bytes(contents)

        if not result.get("success"):
            return JSONResponse(result, status_code=400)

        return JSONResponse(result)

    except Exception as e:
        logger.error(f"Extract landmarks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== Content Policy Endpoints ==========

@router.post("/detect-person")
async def detect_person(file: UploadFile = File(...)):
    """
    Quick person detection for content policy enforcement.
    Uses lightweight pose model (complexity=0) for speed.
    Target: <200ms response time.

    This is the endpoint specified in Task 3.1.1.2.
    Called automatically when user selects image for posting.

    Returns:
        - person_detected: bool
        - can_post_directly: bool (true if no person detected)
        - message: str
    """
    try:
        contents = await file.read()

        detector = get_quick_detector()
        result = detector.check_image_from_bytes(contents)

        return JSONResponse({
            "person_detected": result["person_detected"],
            "can_post_directly": not result["person_detected"],
            "message": "Person detected - must convert to avatar or blur" if result["person_detected"] else "Ready to post"
        })

    except Exception as e:
        logger.error(f"Detect person error: {e}")
        return JSONResponse({
            "person_detected": False,
            "error": str(e)
        }, status_code=500)


@router.post("/person-check")
async def check_for_person(file: UploadFile = File(...)):
    """
    Quick person detection for content policy enforcement.
    Called automatically when user selects image for posting.

    Response time target: <200ms

    Returns:
        - person_detected: bool
        - confidence: float (0-1)
        - can_post_directly: bool (true if no person detected)
        - message: str
    """
    try:
        contents = await file.read()

        detector = get_quick_detector()
        result = detector.check_image_from_bytes(contents)

        return JSONResponse({
            "person_detected": result["person_detected"],
            "confidence": result["confidence"],
            "body_coverage": result["body_coverage"],
            "can_post_directly": not result["person_detected"],
            "processing_time_ms": result["processing_time_ms"],
            "message": result["message"]
        })

    except Exception as e:
        logger.error(f"Person check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/blur-faces")
async def blur_faces_in_image(
    file: UploadFile = File(...),
    blur_strength: int = 99
):
    """
    Blur all faces in image for privacy protection.
    Returns processed image with faces blurred.

    Args:
        file: Image file
        blur_strength: Gaussian blur kernel size (odd number, higher = more blur)

    Returns:
        Processed image as JPEG with headers containing face info
    """
    try:
        contents = await file.read()

        blurrer = get_face_blurrer()
        result = blurrer.process_and_get_bytes(
            contents,
            blur_strength=blur_strength,
            output_format='JPEG',
            quality=90
        )

        return Response(
            content=result["processed_bytes"],
            media_type="image/jpeg",
            headers={
                "X-Faces-Found": str(result["faces_found"]),
                "X-Face-Locations": json.dumps(result["face_locations"]),
                "X-Processing-Time-Ms": str(result["processing_time_ms"])
            }
        )

    except Exception as e:
        logger.error(f"Face blur error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/blur-faces-json")
async def blur_faces_json(
    file: UploadFile = File(...),
    blur_strength: int = 99
):
    """
    Blur all faces and return result as JSON with base64 encoded image.
    Alternative endpoint for easier mobile integration.
    """
    import base64

    try:
        contents = await file.read()

        blurrer = get_face_blurrer()
        result = blurrer.process_and_get_bytes(
            contents,
            blur_strength=blur_strength,
            output_format='JPEG',
            quality=90
        )

        # Encode image as base64
        image_base64 = base64.b64encode(result["processed_bytes"]).decode('utf-8')

        return JSONResponse({
            "success": True,
            "image_base64": image_base64,
            "faces_found": result["faces_found"],
            "face_locations": result["face_locations"],
            "processing_time_ms": result["processing_time_ms"]
        })

    except Exception as e:
        logger.error(f"Face blur JSON error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== Avatar Creation Endpoints ==========

@router.post("/detect-people")
async def detect_people(file: UploadFile = File(...)):
    """
    Detect all people in image for user selection.
    Returns bounding boxes for each detected person.

    Only runs when user explicitly requests avatar creation.
    """
    try:
        contents = await file.read()

        detector = get_person_detector()
        people = detector.detect_from_bytes(contents)

        return JSONResponse(detector.to_dict(people))

    except Exception as e:
        logger.error(f"People detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-skeleton")
async def extract_skeleton(
    file: UploadFile = File(...),
    person_bbox: Optional[str] = Form(None)
):
    """
    Extract full skeleton (75 keypoints) from image.

    Args:
        file: Image file
        person_bbox: Optional JSON string with bounding box {x, y, width, height}
                    if user selected a specific person

    Returns:
        Full skeleton data with body and hand keypoints
    """
    try:
        contents = await file.read()

        # Parse bounding box if provided
        bbox = None
        if person_bbox:
            try:
                bbox = json.loads(person_bbox)
            except json.JSONDecodeError:
                logger.warning(f"Invalid person_bbox JSON: {person_bbox}")

        extractor = get_skeleton_extractor()
        skeleton = extractor.extract_from_bytes(contents, bbox)

        if skeleton is None:
            raise HTTPException(status_code=400, detail="No person detected in image")

        return JSONResponse(extractor.to_dict(skeleton))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Skeleton extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-rig-transforms")
async def generate_rig_transforms(
    file: UploadFile = File(...),
    person_bbox: Optional[str] = Form(None)
):
    """
    Generate 3D rig bone transforms from image.
    Combines skeleton extraction with pose-to-rig mapping.

    Returns bone rotations ready for applying to 3D model.
    """
    try:
        contents = await file.read()

        # Parse bounding box if provided
        bbox = None
        if person_bbox:
            try:
                bbox = json.loads(person_bbox)
            except json.JSONDecodeError:
                logger.warning(f"Invalid person_bbox JSON: {person_bbox}")

        # Extract skeleton
        extractor = get_skeleton_extractor()
        skeleton = extractor.extract_from_bytes(contents, bbox)

        if skeleton is None:
            return JSONResponse({
                "success": False,
                "error": "skeleton_extraction_failed",
                "message": "Failed to detect body pose in image"
            }, status_code=400)

        # Map to rig transforms
        skeleton_dict = extractor.to_dict(skeleton)
        mapper = get_pose_mapper()
        transforms = mapper.map_pose_to_rig(skeleton_dict)

        return JSONResponse({
            "success": True,
            "skeleton": skeleton_dict,
            "rig_transforms": mapper.to_dict(transforms),
            "pose_type": skeleton.pose_type,
            "facing_direction": skeleton.facing_direction,
            "confidence": skeleton.confidence
        })

    except Exception as e:
        logger.error(f"Rig transforms error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-body-avatar")
async def generate_full_body_avatar(
    file: UploadFile = File(...),
    person_bbox: Optional[str] = Form(None),
    style: str = Form("cartoon")
):
    """
    Complete endpoint: Validate, extract skeleton, and return full avatar data.
    Combines all steps into single API call.

    Args:
        file: Image file (full-body photo)
        person_bbox: Optional JSON bounding box if multiple people detected
        style: Avatar style (cartoon, anime, minimalist)

    Returns:
        Complete avatar data ready for 3D rendering
    """
    try:
        contents = await file.read()

        # Parse bounding box if provided
        bbox = None
        if person_bbox:
            try:
                bbox = json.loads(person_bbox)
            except json.JSONDecodeError:
                logger.warning(f"Invalid person_bbox JSON: {person_bbox}")

        # Step 1: Quick validation (person exists)
        detector = get_quick_detector()
        validation = detector.check_image_from_bytes(contents)

        if not validation["person_detected"]:
            return JSONResponse({
                "success": False,
                "stage": "validation",
                "error": "no_person_detected",
                "message": "No person detected in image",
                "suggestions": [
                    "Make sure the full body is visible",
                    "Ensure good lighting",
                    "Stand facing the camera"
                ]
            }, status_code=400)

        # Step 2: Extract skeleton
        extractor = get_skeleton_extractor()
        skeleton = extractor.extract_from_bytes(contents, bbox)

        if skeleton is None:
            return JSONResponse({
                "success": False,
                "stage": "skeleton_extraction",
                "error": "skeleton_extraction_failed",
                "message": "Failed to extract body pose",
                "suggestions": [
                    "Make sure the full body is visible",
                    "Avoid complex poses initially",
                    "Ensure clear background"
                ]
            }, status_code=400)

        # Step 3: Map to rig
        skeleton_dict = extractor.to_dict(skeleton)
        mapper = get_pose_mapper()
        transforms = mapper.map_pose_to_rig(skeleton_dict)

        return JSONResponse({
            "success": True,
            "avatar_data": {
                "style": style,
                "pose": {
                    "type": skeleton.pose_type,
                    "facing": skeleton.facing_direction,
                    "confidence": skeleton.confidence
                },
                "skeleton": skeleton_dict,
                "rig_transforms": mapper.to_dict(transforms)
            },
            "processing_time_ms": skeleton.processing_time_ms
        })

    except Exception as e:
        logger.error(f"Full body avatar error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/default-pose")
async def get_default_pose():
    """
    Get default T-pose rig transforms.
    Useful for initializing avatar before applying custom pose.
    """
    try:
        mapper = get_pose_mapper()
        transforms = mapper.get_default_pose()

        return JSONResponse({
            "success": True,
            "rig_transforms": mapper.to_dict(transforms)
        })

    except Exception as e:
        logger.error(f"Default pose error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def body_avatar_health():
    """Health check for body avatar endpoints."""
    return JSONResponse({
        "status": "healthy",
        "module": "body-avatar",
        "components": {
            "quick_detector": _quick_detector is not None,
            "face_blurrer": _face_blurrer is not None,
            "person_detector": _person_detector is not None,
            "skeleton_extractor": _skeleton_extractor is not None,
            "pose_mapper": _pose_mapper is not None,
            "holistic_extractor": _holistic_extractor is not None
        }
    })
