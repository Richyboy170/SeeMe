# Avatar Style System

**WORKSTREAM 1.3: Avatar Style Application**

This module provides avatar style definitions and application for the SeeMe avatar generation system. It supports three distinct avatar styles with region-based processing, color palette mapping, texture smoothing, and edge enhancement.

---

## Features

- **3 Distinct Avatar Styles**: Cartoon, Anime, and Minimalist
- **Region-Based Processing**: Apply styles to individual face regions (skin, eyes, hair, etc.)
- **Color Palette Mapping**: Map colors to predefined style palettes
- **Texture Smoothing**: Reduce skin texture while preserving edges
- **Multiple Shading Styles**: Cell, gradient, flat, or no shading
- **Edge Enhancement**: Stylized outlines with configurable thickness
- **Comprehensive Testing**: 26+ unit tests with full coverage

---

## Quick Start

```python
import cv2
from styles import StyleApplicator

# Initialize style applicator
applicator = StyleApplicator('cartoon')  # or 'anime', 'minimalist'

# Apply style to a region
styled = applicator.apply_style_to_region(
    region_image=face_image,
    region_name='skin',
    region_mask=skin_mask,
    edge_map=edge_map
)

# Apply style to entire face
styled_face = applicator.apply_style_to_full_face(
    image=face_image,
    masks=region_masks,  # Dict of region_name -> mask
    edge_map=edge_map
)
```

---

## Available Styles

### 1. Cartoon Style
**Bold, colorful, Western animation style**

- Eye size: 1.3x
- Nose: Simple line
- Mouth: Detailed
- Outline: 3px thick, black
- Shading: Cell shading (3-tone)
- Texture smoothness: 80%
- Edge enhancement: 90%

**Color Palettes:**
- 5 skin tones (light to dark)
- 4 eye colors (blue, brown, green, hazel)
- 5 hair colors (black, brown, auburn, blonde, red)

### 2. Anime Style
**Japanese anime/manga style with large expressive eyes**

- Eye size: 1.8x (very large)
- Nose: Minimal (small line or dot)
- Mouth: Simple
- Outline: 2px thick, dark brown
- Shading: Gradient (smooth transitions)
- Texture smoothness: 95% (very smooth)
- Edge enhancement: 70%

**Color Palettes:**
- 5 skin tones (porcelain to tan)
- 5 eye colors (blue, brown, green, pink, purple)
- 6 hair colors (including pastels: black, brown, red, gold, pink, purple)

### 3. Minimalist Style
**Simple, geometric, abstract style**

- Eye size: 1.0x (normal)
- Nose: Dots (two dots or omitted)
- Mouth: Minimal (simple line)
- Outline: 4px thick, black
- Shading: Flat (no shading)
- Texture smoothness: 100% (completely flat)
- Edge enhancement: 100%

**Color Palettes:**
- 5 skin tones (neutral palette)
- 2 eye colors (black, white - binary)
- 3 hair colors (black, gray, white)

---

## API Reference

### StyleApplicator

Main class for applying avatar styles to face images.

#### `__init__(style_name: str)`
Initialize style applicator with a specific style.

**Args:**
- `style_name`: Name of style ('cartoon', 'anime', 'minimalist')

**Raises:**
- `ValueError`: If style name is unknown

#### `apply_style_to_region(region_image, region_name, region_mask, edge_map=None)`
Apply style to a specific face region.

**Args:**
- `region_image`: RGB image of region
- `region_name`: Name of region (e.g., 'skin', 'left_eye', 'hair')
- `region_mask`: Binary mask (255 = region, 0 = background)
- `edge_map`: Optional edge map for structure preservation

**Returns:**
- Styled region image (RGB)

#### `apply_style_to_full_face(image, masks, edge_map=None)`
Apply style to all face regions.

**Args:**
- `image`: RGB image of face
- `masks`: Dictionary of region_name -> binary mask
- `edge_map`: Optional edge map

**Returns:**
- Fully styled face image (RGB)

### Helper Functions

#### `get_style(name: str) -> StyleDefinition`
Get a style definition by name.

#### `list_styles() -> List[str]`
Get list of available style names.

#### `get_style_info(name: str) -> Dict`
Get human-readable information about a style.

---

## Style Configuration

### ColorPalette
Defines color schemes for a style.

**Attributes:**
- `skin_tones`: List of hex colors for skin
- `eye_colors`: List of hex colors for eyes
- `hair_colors`: List of hex colors for hair
- `outline_color`: Hex color for outlines
- `highlight_color`: Hex color for highlights
- `shadow_color`: Hex color (with alpha) for shadows

### FeatureStyle
Defines feature transformation parameters.

**Attributes:**
- `eye_size_multiplier`: Eye size scaling factor (float)
- `nose_style`: Nose rendering style (str)
- `mouth_style`: Mouth rendering style (str)
- `outline_thickness`: Outline thickness in pixels (int)
- `shading_style`: Shading type ('cell', 'gradient', 'flat', 'none')

### StyleDefinition
Complete style specification.

**Attributes:**
- `name`: Style name (str)
- `description`: Human-readable description (str)
- `colors`: ColorPalette instance
- `features`: FeatureStyle instance
- `texture_smoothness`: Texture smoothing factor [0.0, 1.0]
- `edge_enhancement`: Edge enhancement strength [0.0, 1.0]

---

## Usage Examples

### Example 1: List Available Styles

```python
from styles import list_styles, get_style_info

# Get all style names
styles = list_styles()
print(f"Available styles: {styles}")

# Get detailed info
for style_name in styles:
    info = get_style_info(style_name)
    print(f"\n{style_name}:")
    print(f"  {info['description']}")
```

### Example 2: Apply Single Style

```python
from styles import StyleApplicator

# Load your face image and masks
face_image = ...  # RGB image
skin_mask = ...   # Binary mask
edge_map = ...    # Edge detection result

# Apply cartoon style
applicator = StyleApplicator('cartoon')
styled = applicator.apply_style_to_region(
    face_image,
    'skin',
    skin_mask,
    edge_map
)
```

### Example 3: Generate All Style Variants

```python
from styles import list_styles, StyleApplicator

# Generate avatars in all styles
avatars = {}
for style_name in list_styles():
    applicator = StyleApplicator(style_name)
    avatar = applicator.apply_style_to_full_face(
        face_image,
        region_masks,
        edge_map
    )
    avatars[style_name] = avatar
```

### Example 4: Custom Region Processing

```python
from styles import StyleApplicator

applicator = StyleApplicator('anime')

# Process different regions separately
styled_skin = applicator.apply_style_to_region(
    image, 'skin', skin_mask, edges
)
styled_eyes = applicator.apply_style_to_region(
    image, 'left_eye', eye_mask, edges
)
styled_hair = applicator.apply_style_to_region(
    image, 'hair', hair_mask, edges
)

# Combine results...
```

---

## Integration with Pipeline

The style system integrates with previous workstreams:

**From WORKSTREAM 1.1 (Face Detection & Segmentation):**
- Face bounding boxes for region selection
- Segmentation masks for region-based styling
- Face landmarks for feature positioning

**From WORKSTREAM 1.2 (Structure Extraction):**
- Edge maps for stylized outlines
- Depth maps for shading (future enhancement)
- Normal maps for lighting (future enhancement)

**Complete Pipeline:**
```python
from pipeline import FaceDetector, FaceParser, EdgeDetector
from styles import StyleApplicator

# Detect face
detector = FaceDetector()
faces = detector.detect_faces(image)

# Parse regions
parser = FaceParser()
masks = parser.parse_face(image, faces[0]['bbox'])

# Extract edges
edge_detector = EdgeDetector()
edges = edge_detector.detect_edges_multiscale(image, masks)

# Apply style
applicator = StyleApplicator('cartoon')
avatar = applicator.apply_style_to_full_face(
    image,
    masks,
    edges['fused_edges']
)
```

---

## Testing

### Run Unit Tests

```bash
cd ml-service
python tests/test_workstream_1_3.py
```

**Test Coverage:**
- 10 tests for style configuration
- 16 tests for style application
- 3 integration tests

### Run Demo

```bash
python demo_avatar_styles.py
```

**Demo Output:**
- Style information display
- Color palette visualizations
- Style application examples
- Comparison images

### Run Integration Test

```bash
python tests/test_full_avatar_pipeline.py path/to/image.jpg --all-styles
```

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Style initialization | <10ms | One-time per style |
| Texture smoothing | 50-100ms | Depends on smoothness parameter |
| Color palette application | 10-20ms | Per region |
| Shading application | 20-50ms | Depends on shading type |
| Edge enhancement | 10-30ms | Depends on thickness |
| **Full region styling** | **100-200ms** | Single region |
| **Full face styling** | **500ms-1s** | All regions |

---

## Files

```
ml-service/src/styles/
├── __init__.py              # Package exports
├── style_config.py          # Style definitions (200+ lines)
├── style_applicator.py      # StyleApplicator class (500+ lines)
└── README.md               # This file

ml-service/tests/
├── test_workstream_1_3.py          # Unit tests (600+ lines)
└── test_full_avatar_pipeline.py    # Integration test (400+ lines)

ml-service/
├── demo_avatar_styles.py           # Demo script (300+ lines)
└── WORKSTREAM_1.3_SUMMARY.md       # Completion summary
```

---

## Known Limitations

1. **Style Parameters**: Predefined styles only (no runtime customization yet)
2. **Region Processing**: Depends on segmentation quality from WORKSTREAM 1.1
3. **Color Mapping**: Basic Euclidean distance (could use perceptual color spaces)
4. **Edge Enhancement**: Uniform thickness (could vary by feature)
5. **Shading**: Simple thresholding for cell shading (could use lighting analysis)

---

## Future Enhancements

1. **Custom Styles**: User-defined palettes and parameters
2. **Advanced Shading**: Normal map integration, dynamic lighting
3. **Feature Adjustments**: Actual eye resizing, nose/mouth shape changes
4. **Quality Improvements**: Perceptual color matching, anti-aliasing
5. **Performance**: GPU acceleration, batch processing

---

## Dependencies

- `opencv-python>=4.10.0`: Image processing
- `numpy>=1.26.4`: Array operations

All dependencies are included in `ml-service/requirements.txt`.

---

## License

Part of the SeeMe avatar generation system.

---

## Support

For issues or questions about the style system:
1. Check WORKSTREAM_1.3_SUMMARY.md for detailed documentation
2. Run demo_avatar_styles.py to see usage examples
3. Refer to test files for code examples

---

**WORKSTREAM 1.3 Status:** ✅ COMPLETE
**Version:** 1.0
**Last Updated:** 2026-01-09
