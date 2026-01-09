# WORKSTREAM 1.1 - Quick Start Guide

**Face Detection & Segmentation Pipeline**

## Prerequisites

1. Python 3.9+ installed
2. All dependencies from requirements.txt

## Setup (5 minutes)

### 1. Install Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

This installs:
- torch, torchvision (BiSeNet model)
- opencv-python (image processing)
- mediapipe (face detection)
- scipy (mask feathering)
- numpy, pillow

### 2. Download BiSeNet Model (Optional for full testing)

```bash
python scripts/download_bisenet.py --verify
```

Or manually:
1. Download: https://drive.google.com/file/d/154JgKpzCPW82qINcVieuPH3fZ2e0P812
2. Save to: `models/pretrained/face_parsing_79999_iter.pth`

**Note:** You can run basic tests without the model. Face parsing tests will use random weights.

## Quick Tests

### Test 1: Unit Tests (2 minutes)

Run all 11 unit tests:

```bash
cd ml-service
python tests/test_face_detection.py
```

**Expected Output:**
```
=== WORKSTREAM 1.1: FACE DETECTION & SEGMENTATION - TEST SUITE ===
✓ PASS: Task 1.1.1: FaceDetector Initialization
✓ PASS: Task 1.1.1: No Face Detection
✓ PASS: Task 1.1.1: Face Angle Estimation
...
Results: 11/11 tests passed (100.0%)
```

### Test 2: End-to-End with Real Image (1 minute)

Test with your own image:

```bash
python tests/test_pipeline_e2e.py path/to/your/photo.jpg
```

**With BiSeNet model:**
```bash
python tests/test_pipeline_e2e.py photo.jpg --bisenet-model models/pretrained/face_parsing_79999_iter.pth
```

**Expected Output:**
```
Testing Pipeline with: photo.jpg
✓ Loaded image: 640x480

Initializing pipeline components...
✓ FaceDetector initialized
✓ FaceParser initialized
✓ FaceExtractor initialized

--- Step 1: Face Detection ---
✓ Detected 1 face(s) in 85.2ms
  Face 1:
    BBox: {'x': 150, 'y': 120, 'width': 280, 'height': 320}
    Confidence: 0.992
    Landmarks: 468 points
    Angles: yaw=2.3° pitch=-5.1° roll=1.8°
    ✓ Face validation passed

--- Step 2: Face Parsing ---
  Parsing Face 1...
  ✓ Parsed in 847.3ms
  Detected regions (19):
    - skin: 45892 pixels
    - left_eye: 1203 pixels
    - right_eye: 1187 pixels
    ...
  ✓ Segmentation quality: GOOD
  Saved visualization: test_output/parsing_face_1.jpg

--- Step 3: Face Extraction ---
  Extracting Face 1...
  ✓ Extracted in 23.4ms
    Face image: (380, 340, 3)
    Mask: (380, 340)
  Saved face: test_output/extracted_face_1.jpg

✓ PIPELINE TEST COMPLETED SUCCESSFULLY
```

**Outputs in `test_output/` directory:**
- `parsing_face_1.jpg` - Colored segmentation visualization
- `extracted_face_1.jpg` - Extracted face region
- `mask_1.jpg` - Binary face mask
- `feathered_mask_1.jpg` - Soft-edged mask

## Quick Code Examples

### Example 1: Simple Face Detection

```python
import cv2
from pipeline import FaceDetector

# Initialize
detector = FaceDetector()

# Load image
image = cv2.imread('photo.jpg')

# Detect faces
try:
    faces = detector.detect_faces(image)
    print(f"Found {len(faces)} face(s)")

    for i, face in enumerate(faces):
        print(f"Face {i+1}: {face['bbox']}, confidence: {face['confidence']:.2f}")

except Exception as e:
    print(f"Error: {e}")
```

### Example 2: Face Detection + Validation

```python
import cv2
from pipeline import FaceDetector, FaceAngleTooExtremeError

detector = FaceDetector()
image = cv2.imread('photo.jpg')

try:
    faces = detector.detect_faces(image)

    for face in faces:
        # Validate face size and angle
        face = detector.validate_face(face, image.shape)
        print(f"Valid face: {face['angles']}")

except FaceAngleTooExtremeError as e:
    print(f"Please face the camera: {e}")
```

### Example 3: Complete Pipeline

```python
import cv2
from pipeline import FaceDetector, FaceParser, FaceExtractor

# Initialize all components
detector = FaceDetector()
parser = FaceParser(model_path='models/pretrained/face_parsing_79999_iter.pth')
extractor = FaceExtractor()

# Load image
image = cv2.imread('photo.jpg')

# Detect
faces = detector.detect_faces(image)

# Process each face
for face in faces:
    # Validate
    face = detector.validate_face(face, image.shape)

    # Parse
    masks = parser.parse_face(image, face['bbox'])

    # Check quality
    if extractor.validate_segmentation_quality(masks):
        # Extract
        extracted = extractor.extract_face_region(image, masks)

        # Save results
        cv2.imwrite('face.jpg', extracted['face_image'])
        cv2.imwrite('mask.jpg', extracted['feathered_mask'])

        print("✓ Face processed successfully")
```

## Troubleshooting

### Issue: "No module named 'pipeline'"

**Solution:**
```bash
cd ml-service
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"  # Linux/Mac
set PYTHONPATH=%PYTHONPATH%;%CD%\src          # Windows
```

Or run from tests directory:
```bash
cd ml-service/tests
python test_face_detection.py
```

### Issue: "mediapipe not found"

**Solution:**
```bash
pip install mediapipe==0.10.9
```

### Issue: "No face detected"

**Reasons:**
- Image doesn't contain a visible face
- Face is too small (<100px)
- Face is at extreme angle
- Image is too dark/blurry

**Test with known good image:**
- Use a clear, frontal face photo
- Face should be well-lit
- Face should occupy at least 20% of image

### Issue: BiSeNet slow on CPU

**Expected behavior:**
- CPU: 3-5 seconds per face
- GPU: 0.5-1 second per face

**To use GPU:**
```python
parser = FaceParser(model_path='...', device='cuda')  # Use GPU
```

Check GPU availability:
```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
```

## Performance Benchmarks

**Test Image: 640x480 with 1 face**

| Step | Time (GPU) | Time (CPU) |
|------|------------|------------|
| Face Detection | ~80ms | ~100ms |
| Face Validation | ~5ms | ~5ms |
| Face Parsing | ~800ms | ~4000ms |
| Face Extraction | ~30ms | ~30ms |
| **Total** | **~915ms** | **~4135ms** |

**Targets:**
- ✅ Detection: <100ms
- ✅ Parsing (GPU): <1s
- ✅ Parsing (CPU): <5s
- ✅ Total (GPU): <5s

## Next Steps

1. **Run Unit Tests**
   ```bash
   python tests/test_face_detection.py
   ```

2. **Test with Your Images**
   ```bash
   python tests/test_pipeline_e2e.py your_photo.jpg
   ```

3. **Review Outputs**
   - Check `test_output/` directory
   - Verify segmentation quality
   - Inspect masks

4. **Integrate into ML Service**
   - Update `tasks/process_image.py`
   - Use pipeline in Celery tasks
   - Add to FastAPI endpoints

5. **Proceed to WORKSTREAM 1.2**
   - Depth estimation (MiDaS)
   - Normal maps
   - Edge detection

## Documentation

- **Pipeline README:** `ml-service/src/pipeline/README.md`
- **Full Summary:** `ml-service/WORKSTREAM_1.1_SUMMARY.md`
- **MASTER Plan:** `MASTER.md` (search for "WORKSTREAM 1.1")

## Support

If you encounter issues:
1. Check the documentation above
2. Run unit tests to verify installation
3. Review error messages and exceptions
4. Check that all dependencies are installed

---

**Ready to start?** Run this now:

```bash
cd ml-service
python tests/test_face_detection.py
```

Good luck! 🚀
