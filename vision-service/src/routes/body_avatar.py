"""FastAPI routes for body avatar processing."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
from typing import Optional

from ..body_detection import (
    PersonDetector,
    HolisticLandmarksExtractor,
    SkeletonExtractor,
    PoseToRigMapper,
)

router = APIRouter(prefix="/api/body-avatar", tags=["Body Avatar"])

_person_detector: Optional[PersonDetector] = None
_holistic_extractor: Optional[HolisticLandmarksExtractor] = None
_skeleton_extractor: Optional[SkeletonExtractor] = None
_pose_mapper: Optional[PoseToRigMapper] = None


def get_person_detector() -> PersonDetector:
    global _person_detector
    if _person_detector is None:
        _person_detector = PersonDetector()
    return _person_detector


def get_holistic_extractor() -> HolisticLandmarksExtractor:
    global _holistic_extractor
    if _holistic_extractor is None:
        _holistic_extractor = HolisticLandmarksExtractor()
    return _holistic_extractor


def get_skeleton_extractor() -> SkeletonExtractor:
    global _skeleton_extractor
    if _skeleton_extractor is None:
        _skeleton_extractor = SkeletonExtractor()
    return _skeleton_extractor


def get_pose_mapper() -> PoseToRigMapper:
    global _pose_mapper
    if _pose_mapper is None:
        _pose_mapper = PoseToRigMapper()
    return _pose_mapper


async def load_image(file: UploadFile) -> np.ndarray:
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    if image.mode != "RGB":
        image = image.convert("RGB")
    return np.array(image)


@router.post("/detect-person")
async def detect_person(file: UploadFile = File(...)):
    try:
        image = await load_image(file)
        result = get_person_detector().detect(image)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-landmarks")
async def extract_landmarks(file: UploadFile = File(...)):
    try:
        image = await load_image(file)
        result = get_holistic_extractor().extract(image)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-skeleton")
async def extract_skeleton(file: UploadFile = File(...)):
    try:
        image = await load_image(file)
        landmarks_result = get_holistic_extractor().extract(image)

        if not landmarks_result.get("success"):
            return JSONResponse(content={"success": False, "error": "Could not detect pose landmarks"})

        landmarks = landmarks_result.get("pose_world_landmarks") or landmarks_result.get("pose_landmarks")
        skeleton = get_skeleton_extractor().extract_skeleton(landmarks)
        return JSONResponse(content=skeleton)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pose-to-rig")
async def pose_to_rig(file: UploadFile = File(...)):
    try:
        image = await load_image(file)
        landmarks_result = get_holistic_extractor().extract(image)

        if not landmarks_result.get("success"):
            return JSONResponse(content={"success": False, "error": "Could not detect pose landmarks"})

        landmarks = landmarks_result.get("pose_world_landmarks") or landmarks_result.get("pose_landmarks")
        skeleton = get_skeleton_extractor().extract_skeleton(landmarks)

        if not skeleton.get("success"):
            return JSONResponse(content=skeleton)

        rig_result = get_pose_mapper().map_to_rig(skeleton)

        if landmarks_result.get("face_landmarks"):
            rig_result["face_landmarks"] = landmarks_result["face_landmarks"]

        return JSONResponse(content=rig_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-pipeline")
async def full_pipeline(file: UploadFile = File(...)):
    try:
        image = await load_image(file)
        detection = get_person_detector().detect(image)

        if not detection.get("detected"):
            return JSONResponse(content={"success": False, "error": "No person detected", "person_detection": detection})

        landmarks = get_holistic_extractor().extract(image)

        if not landmarks.get("success"):
            return JSONResponse(content={"success": False, "error": "Could not extract landmarks", "person_detection": detection})

        pose_landmarks = landmarks.get("pose_world_landmarks") or landmarks.get("pose_landmarks")
        skeleton = get_skeleton_extractor().extract_skeleton(pose_landmarks)
        rig = get_pose_mapper().map_to_rig(skeleton) if skeleton.get("success") else None

        return JSONResponse(content={
            "success": True,
            "person_detection": detection,
            "landmarks": {
                "success": landmarks["success"],
                "has_pose": landmarks["pose_landmarks"] is not None,
                "has_face": landmarks["face_landmarks"] is not None,
                "pose_landmarks": landmarks["pose_landmarks"],
                "face_landmarks": landmarks["face_landmarks"],
            },
            "skeleton": skeleton,
            "rig_rotations": rig
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
