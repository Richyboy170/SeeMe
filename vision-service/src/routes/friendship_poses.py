"""
Friendship Poses API routes.
Validates multi-person poses for the Friendship Meetup feature.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import numpy as np
import cv2

from src.body_detection import FriendshipPoseValidator

router = APIRouter(prefix="/api/friendship", tags=["Friendship Poses"])

# Lazy-loaded singleton
_validator = None


def get_validator() -> FriendshipPoseValidator:
    global _validator
    if _validator is None:
        _validator = FriendshipPoseValidator()
    return _validator


@router.post("/validate-pose")
async def validate_pose(
    image: UploadFile = File(...),
    pose_name: str = Form(...),
    min_people: int = Form(2)
):
    """
    Validate a friendship pose from an uploaded image.

    - **image**: Camera frame (JPEG/PNG)
    - **pose_name**: Name of the target pose (e.g. 'high_five', 'side_hug')
    - **min_people**: Minimum number of people required (default 2)

    Returns people count, validation score, and pass/fail.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    validator = get_validator()
    result = validator.validate(img, pose_name, min_people)

    return result
