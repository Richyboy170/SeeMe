"""
Face Blur Processor for Privacy Protection
Phase 3.1: Full-Body 3D Avatar System

Detects and blurs all faces in an image as alternative to 3D avatar conversion.
Processing time target: <500ms
"""

import mediapipe as mp
import numpy as np
import cv2
from PIL import Image
from typing import Dict, Any, List
from loguru import logger
import time
import io


class FaceBlurProcessor:
    """
    Detects and blurs all faces in an image.
    Uses MediaPipe Face Detection (faster than face mesh).

    When it's used:
    - User chooses "Blur Faces" option when person is detected
    - Alternative to converting to 3D avatar
    """

    def __init__(self):
        """Initialize the face detection model."""
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 0 = short range (2m), 1 = full range (5m)
            min_detection_confidence=0.5
        )
        logger.info("FaceBlurProcessor initialized")

    def blur_all_faces(
        self,
        image: np.ndarray,
        blur_strength: int = 99
    ) -> Dict[str, Any]:
        """
        Detect and blur all faces in image.

        Args:
            image: RGB image as numpy array (HxWxC)
            blur_strength: Gaussian blur kernel size (must be odd, higher = more blur)

        Returns:
            {
                "processed_image": np.ndarray (RGB),
                "faces_found": int,
                "face_locations": list of {x, y, width, height},
                "processing_time_ms": float
            }
        """
        start_time = time.time()

        # Validate input
        if image is None or len(image.shape) != 3:
            return {
                "processed_image": image,
                "faces_found": 0,
                "face_locations": [],
                "processing_time_ms": 0.0,
                "error": "Invalid image format"
            }

        # Ensure blur_strength is odd
        if blur_strength % 2 == 0:
            blur_strength += 1

        h, w = image.shape[:2]
        output_image = image.copy()
        face_locations = []

        # Process with MediaPipe
        results = self.face_detection.process(image)

        if results.detections:
            for detection in results.detections:
                # Get bounding box (relative coordinates 0-1)
                bbox = detection.location_data.relative_bounding_box
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                box_w = int(bbox.width * w)
                box_h = int(bbox.height * h)

                # Expand box slightly for better coverage (20% padding)
                padding = int(max(box_w, box_h) * 0.2)
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(w, x + box_w + padding)
                y2 = min(h, y + box_h + padding)

                # Ensure valid region
                if x2 > x1 and y2 > y1:
                    # Extract face region
                    face_region = output_image[y1:y2, x1:x2]

                    # Apply strong Gaussian blur
                    blurred_face = cv2.GaussianBlur(
                        face_region,
                        (blur_strength, blur_strength),
                        0
                    )

                    # Replace face with blurred version
                    output_image[y1:y2, x1:x2] = blurred_face

                    face_locations.append({
                        "x": x1,
                        "y": y1,
                        "width": x2 - x1,
                        "height": y2 - y1,
                        "confidence": round(detection.score[0], 3)
                    })

        processing_time = (time.time() - start_time) * 1000

        logger.info(f"Blurred {len(face_locations)} faces in {processing_time:.1f}ms")

        return {
            "processed_image": output_image,
            "faces_found": len(face_locations),
            "face_locations": face_locations,
            "processing_time_ms": round(processing_time, 1)
        }

    def blur_to_bytes(
        self,
        image: np.ndarray,
        format: str = 'JPEG',
        quality: int = 90
    ) -> bytes:
        """
        Convert processed image to bytes.

        Args:
            image: RGB image as numpy array
            format: Output format ('JPEG', 'PNG')
            quality: JPEG quality (1-100)

        Returns:
            Image bytes
        """
        try:
            # Convert RGB to BGR for OpenCV if needed, then to PIL
            img_pil = Image.fromarray(image)
            buffer = io.BytesIO()

            if format.upper() == 'JPEG':
                img_pil.save(buffer, format='JPEG', quality=quality)
            else:
                img_pil.save(buffer, format=format)

            return buffer.getvalue()

        except Exception as e:
            logger.error(f"Error converting image to bytes: {e}")
            raise

    def process_and_get_bytes(
        self,
        image_bytes: bytes,
        blur_strength: int = 99,
        output_format: str = 'JPEG',
        quality: int = 90
    ) -> Dict[str, Any]:
        """
        Full pipeline: decode image, blur faces, return bytes.

        Args:
            image_bytes: Raw image bytes
            blur_strength: Gaussian blur kernel size
            output_format: Output format ('JPEG', 'PNG')
            quality: JPEG quality

        Returns:
            {
                "processed_bytes": bytes,
                "faces_found": int,
                "face_locations": list,
                "processing_time_ms": float
            }
        """
        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                raise ValueError("Failed to decode image")

            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Blur faces
            result = self.blur_all_faces(image, blur_strength)

            # Convert to bytes
            processed_bytes = self.blur_to_bytes(
                result["processed_image"],
                output_format,
                quality
            )

            return {
                "processed_bytes": processed_bytes,
                "faces_found": result["faces_found"],
                "face_locations": result["face_locations"],
                "processing_time_ms": result["processing_time_ms"]
            }

        except Exception as e:
            logger.error(f"Error in process_and_get_bytes: {e}")
            raise

    def pixelate_all_faces(
        self,
        image: np.ndarray,
        pixel_size: int = 10
    ) -> Dict[str, Any]:
        """
        Alternative: Pixelate faces instead of Gaussian blur.
        Creates a retro/stylized look.

        Args:
            image: RGB image as numpy array
            pixel_size: Size of pixelation blocks

        Returns:
            Same as blur_all_faces()
        """
        start_time = time.time()

        h, w = image.shape[:2]
        output_image = image.copy()
        face_locations = []

        results = self.face_detection.process(image)

        if results.detections:
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                box_w = int(bbox.width * w)
                box_h = int(bbox.height * h)

                padding = int(max(box_w, box_h) * 0.2)
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(w, x + box_w + padding)
                y2 = min(h, y + box_h + padding)

                if x2 > x1 and y2 > y1:
                    face_region = output_image[y1:y2, x1:x2]

                    # Pixelate: shrink then enlarge
                    face_h, face_w = face_region.shape[:2]
                    small = cv2.resize(
                        face_region,
                        (max(1, face_w // pixel_size), max(1, face_h // pixel_size)),
                        interpolation=cv2.INTER_LINEAR
                    )
                    pixelated = cv2.resize(
                        small,
                        (face_w, face_h),
                        interpolation=cv2.INTER_NEAREST
                    )

                    output_image[y1:y2, x1:x2] = pixelated

                    face_locations.append({
                        "x": x1,
                        "y": y1,
                        "width": x2 - x1,
                        "height": y2 - y1,
                        "confidence": round(detection.score[0], 3)
                    })

        processing_time = (time.time() - start_time) * 1000

        return {
            "processed_image": output_image,
            "faces_found": len(face_locations),
            "face_locations": face_locations,
            "processing_time_ms": round(processing_time, 1)
        }

    def __del__(self):
        """Cleanup MediaPipe resources."""
        if hasattr(self, 'face_detection') and self.face_detection:
            self.face_detection.close()
