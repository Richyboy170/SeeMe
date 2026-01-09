# Computer Vision Pipeline

**WORKSTREAM 1.1: FACE DETECTION & SEGMENTATION**
**WORKSTREAM 1.2: STRUCTURE EXTRACTION (DEPTH & EDGES)**

This directory contains the computer vision pipeline for detecting, segmenting, and extracting faces from images, plus depth estimation, normal maps, and edge detection.

## Components

### 1. Face Detection (`face_detection.py`)
**Task 1.1.1: MediaPipe Face Detection Integration**

- Detects 1-5 faces per image using MediaPipe
- Extracts 468 facial landmarks per face
- Estimates head pose angles (yaw, pitch, roll)
- Validates face size and angle constraints

**Key Features:**
- Bounding box detection with confidence scores
- 468-point facial landmark extraction
- Head pose estimation
- Face validation (size ≥100px, angles within frontal range)

**Usage:**
```python
from pipeline import FaceDetector

detector = FaceDetector()
faces = detector.detect_faces(image)

for face in faces:
    # Validate face
    face = detector.validate_face(face, image.shape)
    print(f"Face at {face['bbox']}")
    print(f"Angles: {face['angles']}")
```

**Exceptions:**
- `NoFaceDetectedError`: No face found in image
- `TooManyFacesError`: More than 5 faces detected
- `FaceTooSmallError`: Face width < 100px
- `FaceAngleTooExtremeError`: Face angle outside acceptable range (yaw ±45°, pitch/roll ±30°)

### 2. Face Parsing (`face_parsing.py`)
**Task 1.1.2: BiSeNet Face Parsing Integration**

- Semantic segmentation using BiSeNet
- 19-class face region classification
- GPU-accelerated inference

**Face Parsing Classes:**
```
0: background       10: nose
1: skin            11: mouth_interior
2: left_eyebrow    12: upper_lip
3: right_eyebrow   13: lower_lip
4: left_eye        14: neck
5: right_eye       15: necklace
6: glasses         16: clothing
7: left_ear        17: hair
8: right_ear       18: hat
9: earring
```

**Usage:**
```python
from pipeline import FaceParser

parser = FaceParser(model_path='path/to/bisenet.pth', device='cuda')
masks = parser.parse_face(image, face_bbox)

# Get combined face mask
combined_mask = parser.get_combined_face_mask(masks)

# Visualize parsing
viz = parser.visualize_parsing(image, masks)
```

**Performance:**
- GPU: <1 second per face
- CPU: <5 seconds per face

### 3. Face Extraction (`face_extraction.py`)
**Task 1.1.3: Face Region Extraction & Validation**

- Extracts face regions from full images
- Creates feathered masks for smooth blending
- Validates segmentation quality
- Detects overlapping faces

**Usage:**
```python
from pipeline import FaceExtractor

extractor = FaceExtractor(feather_radius=5)

# Extract face region
extracted = extractor.extract_face_region(image, masks)
face_image = extracted['face_image']
feathered_mask = extracted['feathered_mask']

# Validate quality
is_valid = extractor.validate_segmentation_quality(masks)

# Blend back into image
result = extractor.blend_face_region(
    background, foreground, feathered_mask, position
)
```

### 4. Depth Estimation (`depth_estimation.py`)
**Task 1.2.1: MiDaS Depth Estimation**

- Estimates depth maps using MiDaS v3.1 (DPT_BEiT_L_512)
- Generates normalized depth maps (0-255)
- GPU-accelerated inference
- Provides depth quality validation

**Key Features:**
- Depth map generation (high values = closer, low = farther)
- Automatic normalization to 0-255 range
- Depth feature extraction (mean, range, std)
- Colored depth visualization
- Face-specific depth estimation

**Usage:**
```python
from pipeline import DepthEstimator

# Initialize (uses torch hub by default)
estimator = DepthEstimator(device='cuda')

# Estimate depth for full image
depth_map = estimator.estimate_depth(image)

# Estimate depth for specific face
depth_map = estimator.estimate_depth_for_face(image, face_bbox, padding=20)

# Extract depth features
features = estimator.extract_depth_features(depth_map)
print(f"Mean depth: {features['mean_depth']}")
print(f"Depth range: {features['depth_range']}")

# Validate depth quality
is_valid = estimator.validate_depth_quality(depth_map)

# Visualize (colored heatmap)
depth_colored = estimator.visualize_depth(depth_map)
```

**Performance:**
- GPU: <2 seconds per face (target met)
- CPU: ~5-8 seconds per face
- Depth map resolution: matches input image

**Download Model:**
```bash
python scripts/download_midas.py --verify
```

### 5. Normal Map Generation (`normal_estimation.py`)
**Task 1.2.2: Normal Map Generation**

- Derives surface normals from depth maps
- Encodes normals as RGB images
- Bilateral filtering for smooth normals
- Normal quality validation

**Key Features:**
- Surface normal computation from depth gradients
- RGB encoding: R=X, G=Y, B=Z components
- Bilateral smoothing preserves edges
- Normal enhancement for sharper features
- Consistency measurement
- Mask application

**Usage:**
```python
from pipeline import NormalEstimator

estimator = NormalEstimator()

# Compute normals from depth map
normal_map = estimator.compute_normals(depth_map)

# Smooth normals while preserving edges
smoothed = estimator.smooth_normals(normal_map, kernel_size=5)

# Enhance normal contrast
enhanced = estimator.enhance_normals(normal_map, strength=1.5)

# Validate quality
is_valid = estimator.validate_normal_quality(normal_map)

# Measure smoothness
consistency = estimator.compute_normal_consistency(normal_map)
print(f"Surface consistency: {consistency:.2f}°")

# Apply face mask
masked_normals = estimator.apply_mask(normal_map, face_mask)

# Visualize
viz = estimator.visualize_normals(normal_map)
```

**Normal Encoding:**
- RGB values [0, 255] encode normal vectors [-1, 1]
- (128, 128, 255) = flat surface facing camera (0, 0, 1)
- Red channel = horizontal orientation (X)
- Green channel = vertical orientation (Y)
- Blue channel = depth orientation (Z)

**Performance:**
- Normal computation: <50ms per face
- Bilateral smoothing: ~100ms per face
- CPU-only (no GPU required)

### 6. Multi-Scale Edge Detection (`edge_detection.py`)
**Task 1.2.3: Multi-Scale Edge Detection**

- Detects edges at multiple scales
- Combines coarse, fine, semantic, and depth edges
- Weighted fusion for comprehensive edge maps
- Expression-critical region enhancement

**Edge Types:**
1. **Coarse edges**: Major features (Sobel with large kernel)
2. **Fine edges**: Expression lines, wrinkles (Canny with low threshold)
3. **Semantic edges**: Region boundaries from segmentation masks
4. **Depth edges**: Depth discontinuities from depth maps

**Usage:**
```python
from pipeline import EdgeDetector

detector = EdgeDetector()

# Detect all edge types
edge_results = detector.detect_edges_multiscale(
    image,
    masks=segmentation_masks,  # Optional
    depth_map=depth_map        # Optional
)

# Access different edge types
coarse = edge_results['coarse_edges']
fine = edge_results['fine_edges']
semantic = edge_results['semantic_edges']
depth = edge_results['depth_edges']
fused = edge_results['fused_edges']  # Combined result

# Enhance expression regions (eyes, mouth)
enhanced = detector.enhance_expression_edges(fused, landmarks)

# Apply face mask
masked_edges = detector.apply_edge_mask(fused, face_mask)

# Thin edges to 1-pixel width
thin_edges = detector.thin_edges(fused)

# Validate quality
is_valid = detector.validate_edge_quality(fused)

# Visualize with colors
viz = detector.visualize_edges(edge_results, image)
```

**Fusion Weights:**
- Semantic edges: 0.4 (highest - most reliable)
- Depth edges: 0.3
- Coarse edges: 0.2
- Fine edges: 0.1 (lowest - can be noisy)

**Performance:**
- Coarse edge detection: ~50ms
- Fine edge detection: ~100ms
- Semantic edge extraction: ~30ms
- Depth edge detection: ~50ms
- Fusion: ~20ms
- **Total: ~250ms per face**

## Pipeline Architecture

```
BiSeNet Model Architecture (models/bisenet.py)
│
├── Spatial Path (preserves spatial details)
│   └── Conv layers (7x7, 3x3, 3x3) → 128 channels
│
├── Context Path (semantic context)
│   ├── ResNet-18 style backbone
│   ├── Global Average Pooling
│   └── Attention Refinement Module
│
└── Feature Fusion Module
    ├── Concatenate paths
    ├── Attention mechanism
    └── Output 19-class segmentation
```

## Installation

Required dependencies (already in `requirements.txt`):
```
torch>=2.5.1
opencv-python>=4.10.0
mediapipe>=0.10.9
numpy>=1.26.4
scipy>=1.11.4
```

Download BiSeNet pretrained model:
```bash
python scripts/download_bisenet.py --verify
```

Or manually:
1. Download from: https://drive.google.com/file/d/154JgKpzCPW82qINcVieuPH3fZ2e0P812
2. Save to: `ml-service/models/pretrained/face_parsing_79999_iter.pth`

## Testing

### Unit Tests
```bash
cd ml-service
python tests/test_face_detection.py
```

Tests all components:
- FaceDetector initialization and methods
- FaceParser initialization
- FaceExtractor mask creation and validation
- Edge case handling

### End-to-End Test
```bash
python tests/test_pipeline_e2e.py path/to/test/image.jpg --bisenet-model path/to/model.pth
```

Outputs:
- `test_output/parsing_face_*.jpg` - Colored segmentation visualization
- `test_output/extracted_face_*.jpg` - Extracted face regions
- `test_output/mask_*.jpg` - Binary masks
- `test_output/feathered_mask_*.jpg` - Soft-edged masks

## Performance Metrics

**Critical Success Metrics (from MASTER.md):**
- ✓ Face detection accuracy: >95% on standard photos
- ✓ Segmentation IoU: >0.85 for main face regions
- ✓ Processing time: <100ms for detection
- ✓ Processing time: <1s for parsing (GPU)

**Current Status:**
- MediaPipe detection: ~50-100ms per image
- BiSeNet parsing: ~500ms-1s per face (GPU)
- Face extraction: <50ms per face

## Example: Full Pipeline

```python
import cv2
from pipeline import FaceDetector, FaceParser, FaceExtractor

# Initialize
detector = FaceDetector()
parser = FaceParser(model_path='models/pretrained/face_parsing_79999_iter.pth')
extractor = FaceExtractor()

# Load image
image = cv2.imread('photo.jpg')

# Step 1: Detect faces
faces = detector.detect_faces(image)
print(f"Found {len(faces)} faces")

# Step 2: Process each face
for i, face in enumerate(faces):
    # Validate face
    face = detector.validate_face(face, image.shape)

    # Parse face regions
    masks = parser.parse_face(image, face['bbox'])

    # Validate segmentation quality
    if extractor.validate_segmentation_quality(masks):
        # Extract face region
        extracted = extractor.extract_face_region(image, masks)

        # Process extracted face...
        cv2.imwrite(f'face_{i}.jpg', extracted['face_image'])
```

## Error Handling

```python
from pipeline import (
    NoFaceDetectedError,
    TooManyFacesError,
    FaceTooSmallError,
    FaceAngleTooExtremeError,
)

try:
    faces = detector.detect_faces(image)
    face = detector.validate_face(faces[0], image.shape)
except NoFaceDetectedError:
    print("No face in image")
except TooManyFacesError as e:
    print(f"Too many faces: {e}")
except FaceTooSmallError as e:
    print(f"Face too small: {e}")
except FaceAngleTooExtremeError as e:
    print(f"Face angle too extreme: {e}")
```

## File Structure

```
pipeline/
├── __init__.py                 # Package exports
├── exceptions.py               # Custom exceptions
├── face_detection.py          # Task 1.1.1: MediaPipe face detection
├── face_parsing.py            # Task 1.1.2: BiSeNet face parsing
├── face_extraction.py         # Task 1.1.3: Face extraction & validation
├── depth_estimation.py        # Task 1.2.1: MiDaS depth estimation
├── normal_estimation.py       # Task 1.2.2: Normal map generation
├── edge_detection.py          # Task 1.2.3: Multi-scale edge detection
└── models/
    ├── __init__.py
    └── bisenet.py             # BiSeNet model architecture
```

## WORKSTREAM 1.2 Status

- ✅ Task 1.2.1: MiDaS Depth Estimation (Complete)
- ✅ Task 1.2.2: Normal Map Generation (Complete)
- ✅ Task 1.2.3: Multi-Scale Edge Detection (Complete)

These modules provide structural information for avatar style transfer.

## References

### WORKSTREAM 1.1:
- MediaPipe Face Detection: https://google.github.io/mediapipe/solutions/face_detection
- MediaPipe Face Mesh: https://google.github.io/mediapipe/solutions/face_mesh
- BiSeNet Paper: https://arxiv.org/abs/1808.00897
- CelebAMask-HQ Dataset: https://github.com/switchablenorms/CelebAMask-HQ

### WORKSTREAM 1.2:
- MiDaS GitHub: https://github.com/isl-org/MiDaS
- MiDaS Paper (DPT): https://arxiv.org/abs/2103.13413
- Depth Estimation Overview: https://pytorch.org/hub/intelisl_midas_v2/
