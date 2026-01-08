"""
Celery task for image processing
Handles avatar style transfer processing asynchronously
"""
from celery import Task
from loguru import logger
import time
from typing import Dict, Any

from celery_app import celery_app


class ImageProcessingTask(Task):
    """Custom task class with error handling"""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(f"Task {task_id} failed: {exc}")
        logger.error(f"Exception info: {einfo}")

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry"""
        logger.warning(f"Task {task_id} retrying: {exc}")

    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success"""
        logger.info(f"Task {task_id} completed successfully")


@celery_app.task(bind=True, base=ImageProcessingTask, name='process_image')
def process_image_task(
    self,
    image_url: str,
    user_id: str,
    avatar_id: str
) -> Dict[str, Any]:
    """
    Process image with avatar style transfer

    Args:
        self: Task instance (bound)
        image_url: S3 URL or CloudFront URL of the uploaded image
        user_id: User ID who uploaded the image
        avatar_id: Avatar style to apply

    Returns:
        Dict with processing results

    Phase 0 Implementation:
        - Placeholder that simulates processing
        - Returns mock results
        - Will be replaced with actual ML processing in later phases
    """
    logger.info(f"[Task {self.request.id}] Starting image processing")
    logger.info(f"  Image URL: {image_url}")
    logger.info(f"  User ID: {user_id}")
    logger.info(f"  Avatar ID: {avatar_id}")

    try:
        # Update task state: Downloading
        self.update_state(
            state='PROGRESS',
            meta={
                'stage': 'downloading',
                'progress': 10,
                'message': 'Downloading image from S3'
            }
        )
        time.sleep(0.5)  # Simulate download

        # Update task state: Processing - Face Detection
        self.update_state(
            state='PROGRESS',
            meta={
                'stage': 'face_detection',
                'progress': 25,
                'message': 'Detecting faces in image'
            }
        )
        time.sleep(0.5)  # Simulate face detection

        # Update task state: Processing - Face Parsing
        self.update_state(
            state='PROGRESS',
            meta={
                'stage': 'face_parsing',
                'progress': 50,
                'message': 'Parsing facial features'
            }
        )
        time.sleep(0.5)  # Simulate face parsing

        # Update task state: Processing - Style Transfer
        self.update_state(
            state='PROGRESS',
            meta={
                'stage': 'style_transfer',
                'progress': 75,
                'message': 'Applying avatar style'
            }
        )
        time.sleep(1.0)  # Simulate style transfer

        # Update task state: Uploading
        self.update_state(
            state='PROGRESS',
            meta={
                'stage': 'uploading',
                'progress': 90,
                'message': 'Uploading processed image to S3'
            }
        )
        time.sleep(0.5)  # Simulate upload

        # Processing complete
        processing_time = 3.0  # Total simulated time

        result = {
            'status': 'success',
            'task_id': self.request.id,
            'original_url': image_url,
            'processed_url': f'https://placeholder.com/processed/{user_id}/{avatar_id}/result.jpg',
            'processing_time': processing_time,
            'user_id': user_id,
            'avatar_id': avatar_id,
            'metadata': {
                'faces_detected': 1,
                'resolution': '512x512',
                'model_version': '0.1.0'
            }
        }

        logger.info(f"[Task {self.request.id}] Processing completed successfully")
        logger.info(f"  Processing time: {processing_time}s")

        return result

    except Exception as e:
        logger.error(f"[Task {self.request.id}] Processing failed: {e}")
        # Update task state to failure
        self.update_state(
            state='FAILURE',
            meta={
                'stage': 'error',
                'error': str(e),
                'message': f'Processing failed: {e}'
            }
        )
        # Re-raise to trigger retry
        raise


@celery_app.task(name='test_task')
def test_task(message: str = "Hello from Celery!") -> Dict[str, str]:
    """
    Simple test task to verify Celery is working

    Args:
        message: Test message

    Returns:
        Dict with test result
    """
    logger.info(f"Test task executed with message: {message}")
    time.sleep(2)  # Simulate work
    return {
        'status': 'success',
        'message': message,
        'timestamp': time.time()
    }
