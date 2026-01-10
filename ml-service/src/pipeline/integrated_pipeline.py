"""
Integrated Pipeline: WORKSTREAM 1.1 + 1.2
Combines face detection, segmentation, depth estimation, normal generation, and edge detection
"""

import cv2
import numpy as np
from typing import Dict, Optional, Tuple
import time
from loguru import logger

# Handle both package import and direct execution
try:
    from .face_detection import FaceDetector
    from .face_parsing import FaceParser
    from .face_extraction import FaceExtractor
    from .depth_estimation import DepthEstimator
    from .normal_estimation import NormalEstimator
    from .edge_detection import EdgeDetector
    from .exceptions import FaceProcessingError
except ImportError:
    from face_detection import FaceDetector
    from face_parsing import FaceParser
    from face_extraction import FaceExtractor
    from depth_estimation import DepthEstimator
    from normal_estimation import NormalEstimator
    from edge_detection import EdgeDetector
    from exceptions import FaceProcessingError

# Import style system
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from styles import StyleApplicator, list_styles


class IntegratedFacePipeline:
    """
    Complete face processing pipeline combining:
    - WORKSTREAM 1.1: Face Detection & Segmentation
    - WORKSTREAM 1.2: Structure Extraction (Depth & Edges)

    Processes images from raw input to complete feature extraction.
    """

    def __init__(
        self,
        device: Optional[str] = None,
        enable_depth: bool = True,
        enable_normals: bool = True,
        enable_edges: bool = True,
        enable_style: bool = True
    ):
        """
        Initialize integrated pipeline

        Args:
            device: 'cuda' or 'cpu' (auto-detects if None)
            enable_depth: Enable depth estimation
            enable_normals: Enable normal map generation
            enable_edges: Enable edge detection
            enable_style: Enable avatar style application
        """
        logger.info("Initializing IntegratedFacePipeline...")

        # WORKSTREAM 1.1: Face Detection & Segmentation
        self.face_detector = FaceDetector()
        self.face_parser = FaceParser(device=device)
        self.face_extractor = FaceExtractor(feather_radius=5)

        # WORKSTREAM 1.2: Structure Extraction
        self.enable_depth = enable_depth
        self.enable_normals = enable_normals
        self.enable_edges = enable_edges

        if enable_depth:
            self.depth_estimator = DepthEstimator(device=device)
        else:
            self.depth_estimator = None

        if enable_normals:
            self.normal_estimator = NormalEstimator()
        else:
            self.normal_estimator = None

        if enable_edges:
            self.edge_detector = EdgeDetector()
        else:
            self.edge_detector = None

        # WORKSTREAM 1.3: Avatar Style System
        self.enable_style = enable_style
        self.style_applicator = None  # Initialized per-request with specific style

        logger.info("IntegratedFacePipeline initialized successfully")

    def process_image(
        self,
        image: np.ndarray,
        return_visualizations: bool = False,
        style_name: Optional[str] = None
    ) -> Dict:
        """
        Complete image processing pipeline

        Args:
            image: Input image (BGR format) as numpy array
            return_visualizations: If True, includes colored depth maps and edge visualizations
            style_name: Avatar style to apply ('cartoon', 'anime', 'minimalist', or None)

        Returns:
            Dictionary containing:
            - face_detection: Detection results with bbox and landmarks
            - segmentation: Parsed face regions and masks
            - face_extraction: Extracted face region with masks
            - depth_map: Depth estimation (if enabled)
            - normal_map: Surface normals (if enabled)
            - edges: Multi-scale edge detection (if enabled)
            - styled_face: Avatar-styled face (if style_name provided)
            - timings: Performance metrics for each stage
            - success: Boolean indicating successful processing
            - error: Error message if failed
        """
        result = {
            'success': False,
            'timings': {},
            'error': None
        }

        try:
            # Stage 1: Face Detection
            logger.info("Stage 1: Face Detection")
            t0 = time.time()
            faces = self.face_detector.detect_faces(image)
            result['timings']['face_detection'] = time.time() - t0

            # Use the first detected face
            if not faces or len(faces) == 0:
                raise FaceProcessingError("No face detected")

            detection_result = faces[0]  # Use first face
            result['face_detection'] = detection_result
            logger.info(f"Face detected in {result['timings']['face_detection']:.3f}s")

            # Stage 2: Face Parsing (Segmentation)
            logger.info("Stage 2: Face Parsing")
            t0 = time.time()
            masks = self.face_parser.parse_face(
                image,
                detection_result['bbox']
            )
            result['timings']['face_parsing'] = time.time() - t0
            result['segmentation'] = {'masks': masks}
            logger.info(f"Face parsed in {result['timings']['face_parsing']:.3f}s")

            # Stage 3: Face Extraction
            logger.info("Stage 3: Face Extraction")
            t0 = time.time()
            extraction_result = self.face_extractor.extract_face_region(
                image,
                masks
            )
            result['timings']['face_extraction'] = time.time() - t0
            result['face_extraction'] = extraction_result
            logger.info(f"Face extracted in {result['timings']['face_extraction']:.3f}s")

            # Validate segmentation quality
            is_valid = self.face_extractor.validate_segmentation_quality(masks)
            result['segmentation']['quality_valid'] = is_valid

            if not is_valid:
                logger.warning("Segmentation quality validation failed")

            # Get the face region for structure extraction
            face_image = extraction_result['face_image']

            # Stage 4: Depth Estimation (WORKSTREAM 1.2)
            if self.enable_depth and self.depth_estimator is not None:
                logger.info("Stage 4: Depth Estimation")
                t0 = time.time()
                depth_map = self.depth_estimator.estimate_depth(face_image)
                result['timings']['depth_estimation'] = time.time() - t0

                # Extract depth features
                depth_features = self.depth_estimator.extract_depth_features(depth_map)
                depth_quality = self.depth_estimator.validate_depth_quality(depth_map)

                result['depth'] = {
                    'depth_map': depth_map,
                    'features': depth_features,
                    'quality_valid': depth_quality
                }

                if return_visualizations:
                    result['depth']['visualization'] = self.depth_estimator.visualize_depth(depth_map)

                logger.info(f"Depth estimated in {result['timings']['depth_estimation']:.3f}s")
            else:
                depth_map = None

            # Stage 5: Normal Map Generation (WORKSTREAM 1.2)
            if self.enable_normals and self.normal_estimator is not None and depth_map is not None:
                logger.info("Stage 5: Normal Map Generation")
                t0 = time.time()
                normal_map = self.normal_estimator.compute_normals(depth_map)
                smoothed_normals = self.normal_estimator.smooth_normals(normal_map)
                result['timings']['normal_generation'] = time.time() - t0

                # Validate normal quality
                normal_quality = self.normal_estimator.validate_normal_quality(smoothed_normals)

                # Extract simple features from normal map
                decoded_normals = self.normal_estimator.decode_normals(smoothed_normals)
                normal_features = {
                    'mean_x': float(np.mean(decoded_normals[:, :, 0])),
                    'mean_y': float(np.mean(decoded_normals[:, :, 1])),
                    'mean_z': float(np.mean(decoded_normals[:, :, 2])),
                    'std_x': float(np.std(decoded_normals[:, :, 0])),
                    'std_y': float(np.std(decoded_normals[:, :, 1])),
                    'std_z': float(np.std(decoded_normals[:, :, 2]))
                }

                result['normals'] = {
                    'normal_map': normal_map,
                    'smoothed_normals': smoothed_normals,
                    'features': normal_features,
                    'quality_valid': normal_quality
                }

                logger.info(f"Normals generated in {result['timings']['normal_generation']:.3f}s")

            # Stage 6: Multi-Scale Edge Detection (WORKSTREAM 1.2)
            if self.enable_edges and self.edge_detector is not None:
                logger.info("Stage 6: Multi-Scale Edge Detection")
                t0 = time.time()
                edges = self.edge_detector.detect_edges_multiscale(
                    face_image,
                    masks=masks,
                    depth_map=depth_map
                )
                result['timings']['edge_detection'] = time.time() - t0

                result['edges'] = edges

                logger.info(f"Edges detected in {result['timings']['edge_detection']:.3f}s")

            # Stage 7: Avatar Style Application (WORKSTREAM 1.3)
            if self.enable_style and style_name is not None:
                logger.info(f"Stage 7: Avatar Style Application ({style_name})")
                t0 = time.time()

                try:
                    # Initialize style applicator for the requested style
                    style_applicator = StyleApplicator(style_name)

                    # Apply style to the entire face image using segmentation masks
                    styled_face = self.apply_style_to_face(
                        face_image,
                        masks,
                        edges.get('fused_edges') if 'edges' in result else None,
                        style_applicator
                    )

                    result['timings']['style_application'] = time.time() - t0
                    result['styled_face'] = {
                        'styled_image': styled_face,
                        'style_name': style_name
                    }

                    logger.info(f"Style '{style_name}' applied in {result['timings']['style_application']:.3f}s")

                except ValueError as e:
                    logger.warning(f"Style application failed: {e}")
                    result['styled_face'] = None

            # Calculate total processing time
            result['timings']['total'] = sum(result['timings'].values())

            result['success'] = True
            logger.info(f"Pipeline completed successfully in {result['timings']['total']:.3f}s")

            return result

        except FaceProcessingError as e:
            logger.error(f"Face processing error: {e}")
            result['error'] = str(e)
            result['error_type'] = type(e).__name__
            return result

        except Exception as e:
            logger.error(f"Unexpected error in pipeline: {e}")
            result['error'] = str(e)
            result['error_type'] = 'UnexpectedError'
            return result

    def process_image_batch(
        self,
        images: list[np.ndarray],
        return_visualizations: bool = False
    ) -> list[Dict]:
        """
        Process multiple images

        Args:
            images: List of images (BGR format)
            return_visualizations: If True, includes visualizations

        Returns:
            List of processing results
        """
        results = []

        for idx, image in enumerate(images):
            logger.info(f"Processing image {idx+1}/{len(images)}")
            result = self.process_image(image, return_visualizations)
            results.append(result)

        return results

    def apply_style_to_face(
        self,
        face_image: np.ndarray,
        masks: Dict[str, np.ndarray],
        edge_map: Optional[np.ndarray],
        style_applicator: StyleApplicator
    ) -> np.ndarray:
        """
        Apply avatar style to the entire face image

        Args:
            face_image: Face region image (BGR format)
            masks: Dictionary of region masks from face parsing
            edge_map: Fused edge map for edge enhancement
            style_applicator: Initialized StyleApplicator instance

        Returns:
            Styled face image (BGR format)
        """
        styled_face = face_image.copy()

        # Define regions to style in order (background to foreground)
        region_order = [
            'skin', 'neck', 'hair',
            'left_ear', 'right_ear',
            'left_eyebrow', 'right_eyebrow',
            'left_eye', 'right_eye',
            'nose', 'upper_lip', 'lower_lip', 'mouth_interior'
        ]

        # Apply style to each region
        for region_name in region_order:
            if region_name in masks and region_name != '_crop_coords':
                region_mask = masks[region_name]

                # Skip if mask is empty
                if np.sum(region_mask) == 0:
                    continue

                try:
                    # Apply style to this region
                    styled_region = style_applicator.apply_style_to_region(
                        styled_face,
                        region_name,
                        region_mask,
                        edge_map
                    )

                    # Blend styled region back into face
                    mask_bool = region_mask > 127
                    styled_face[mask_bool] = styled_region[mask_bool]

                except Exception as e:
                    logger.warning(f"Failed to style region '{region_name}': {e}")
                    continue

        return styled_face

    def get_pipeline_info(self) -> Dict:
        """
        Get information about the pipeline configuration

        Returns:
            Dictionary with pipeline info and component status
        """
        return {
            'workstreams': [
                '1.1: Face Detection & Segmentation',
                '1.2: Structure Extraction',
                '1.3: Avatar Style System'
            ],
            'components': {
                'face_detector': 'active',
                'face_parser': 'active',
                'face_extractor': 'active',
                'depth_estimator': 'active' if self.enable_depth else 'disabled',
                'normal_estimator': 'active' if self.enable_normals else 'disabled',
                'edge_detector': 'active' if self.enable_edges else 'disabled',
                'style_applicator': 'active' if self.enable_style else 'disabled'
            },
            'device': self.depth_estimator.device if self.depth_estimator else 'N/A',
            'capabilities': {
                'face_detection': True,
                'face_segmentation': True,
                'face_extraction': True,
                'depth_estimation': self.enable_depth,
                'normal_generation': self.enable_normals,
                'edge_detection': self.enable_edges,
                'avatar_styles': self.enable_style
            },
            'available_styles': list_styles() if self.enable_style else []
        }

    def __del__(self):
        """Cleanup resources"""
        try:
            if hasattr(self, 'depth_estimator') and self.depth_estimator is not None:
                del self.depth_estimator
            if hasattr(self, 'face_parser') and self.face_parser is not None:
                del self.face_parser
        except:
            pass


if __name__ == "__main__":
    """Quick test of integrated pipeline"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python integrated_pipeline.py <image_path>")
        sys.exit(1)

    # Load image
    image_path = sys.argv[1]
    image = cv2.imread(image_path)

    if image is None:
        print(f"Error: Could not load image from {image_path}")
        sys.exit(1)

    print(f"Loaded image: {image.shape}")

    # Initialize pipeline
    print("\nInitializing pipeline...")
    pipeline = IntegratedFacePipeline(
        enable_depth=True,
        enable_normals=True,
        enable_edges=True
    )

    # Show pipeline info
    info = pipeline.get_pipeline_info()
    print("\nPipeline Info:")
    for key, value in info.items():
        print(f"  {key}: {value}")

    # Process image
    print("\nProcessing image...")
    result = pipeline.process_image(image, return_visualizations=True)

    # Print results
    print(f"\nSuccess: {result['success']}")
    if result['error']:
        print(f"Error: {result['error']}")

    print("\nTimings:")
    for stage, time_val in result['timings'].items():
        print(f"  {stage}: {time_val:.3f}s")

    # Save outputs
    if result['success']:
        output_dir = "test_output"
        import os
        os.makedirs(output_dir, exist_ok=True)

        # Save face extraction
        if 'face_extraction' in result:
            cv2.imwrite(f"{output_dir}/integrated_face.jpg", result['face_extraction']['face_image'])
            cv2.imwrite(f"{output_dir}/integrated_mask.jpg", result['face_extraction']['mask'])

        # Save depth
        if 'depth' in result:
            cv2.imwrite(f"{output_dir}/integrated_depth.jpg", result['depth']['depth_map'])
            if 'visualization' in result['depth']:
                cv2.imwrite(f"{output_dir}/integrated_depth_colored.jpg", result['depth']['visualization'])

        # Save normals
        if 'normals' in result:
            cv2.imwrite(f"{output_dir}/integrated_normals.jpg", result['normals']['smoothed_normals'])

        # Save edges
        if 'edges' in result:
            cv2.imwrite(f"{output_dir}/integrated_edges.jpg", result['edges']['fused_edges'])

        print(f"\nOutputs saved to {output_dir}/")
