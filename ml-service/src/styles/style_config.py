"""
Style Configuration for SeeMe Avatar Generation

Defines avatar styles with color palettes, feature transformations, and rendering parameters.
Supports cartoon, anime, and minimalist styles.
"""

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class ColorPalette:
    """Color palette for avatar style"""
    skin_tones: List[str]  # Hex colors for skin
    eye_colors: List[str]  # Hex colors for eyes
    hair_colors: List[str]  # Hex colors for hair
    outline_color: str  # Hex color for outlines
    highlight_color: str  # Hex color for highlights
    shadow_color: str  # Hex color with alpha for shadows


@dataclass
class FeatureStyle:
    """Feature transformation parameters for avatar style"""
    eye_size_multiplier: float  # 1.0 = normal, 1.5 = 50% larger
    nose_style: str  # 'detailed', 'simple_line', 'dots', 'minimal'
    mouth_style: str  # 'detailed', 'simple', 'minimal'
    outline_thickness: int  # pixels
    shading_style: str  # 'cell', 'gradient', 'flat', 'none'


@dataclass
class StyleDefinition:
    """Complete definition of an avatar style"""
    name: str
    description: str
    colors: ColorPalette
    features: FeatureStyle
    texture_smoothness: float  # 0.0 = keep texture, 1.0 = completely smooth
    edge_enhancement: float  # 0.0 = soft, 1.0 = sharp outlines

    def __post_init__(self):
        """Validate style parameters"""
        if not 0.0 <= self.texture_smoothness <= 1.0:
            raise ValueError("texture_smoothness must be between 0.0 and 1.0")
        if not 0.0 <= self.edge_enhancement <= 1.0:
            raise ValueError("edge_enhancement must be between 0.0 and 1.0")
        if self.features.eye_size_multiplier <= 0:
            raise ValueError("eye_size_multiplier must be positive")
        if self.features.outline_thickness < 0:
            raise ValueError("outline_thickness must be non-negative")


# ============================================================================
# CARTOON STYLE
# ============================================================================

CARTOON_STYLE = StyleDefinition(
    name='cartoon',
    description='Bold, colorful, Western animation style',
    colors=ColorPalette(
        skin_tones=['#FFE0BD', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'],
        eye_colors=['#1F51FF', '#654321', '#228B22', '#8B4513'],
        hair_colors=['#000000', '#3D2314', '#A52A2A', '#FFD700', '#DC143C'],
        outline_color='#000000',
        highlight_color='#FFFFFF',
        shadow_color='#00000040'
    ),
    features=FeatureStyle(
        eye_size_multiplier=1.3,
        nose_style='simple_line',
        mouth_style='detailed',
        outline_thickness=3,
        shading_style='cell'  # 3-tone cell shading
    ),
    texture_smoothness=0.8,
    edge_enhancement=0.9
)


# ============================================================================
# ANIME STYLE
# ============================================================================

ANIME_STYLE = StyleDefinition(
    name='anime',
    description='Japanese anime/manga style with large expressive eyes',
    colors=ColorPalette(
        skin_tones=['#FFE4C4', '#F5DEB3', '#DEB887', '#D2691E', '#8B4513'],
        eye_colors=['#4169E1', '#8B4513', '#32CD32', '#FF1493', '#9370DB'],
        hair_colors=['#000000', '#4A2511', '#B22222', '#FFD700', '#FF69B4', '#9370DB'],
        outline_color='#2C1810',
        highlight_color='#FFFFFF',
        shadow_color='#FFB6C140'
    ),
    features=FeatureStyle(
        eye_size_multiplier=1.8,  # Very large eyes
        nose_style='minimal',  # Often just a small line or dot
        mouth_style='simple',
        outline_thickness=2,
        shading_style='gradient'
    ),
    texture_smoothness=0.95,  # Very smooth
    edge_enhancement=0.7
)


# ============================================================================
# MINIMALIST STYLE
# ============================================================================

MINIMALIST_STYLE = StyleDefinition(
    name='minimalist',
    description='Simple, geometric, abstract style',
    colors=ColorPalette(
        skin_tones=['#F5E6D3', '#E8CBA8', '#D4A574', '#B8865A', '#8B6F47'],
        eye_colors=['#000000', '#FFFFFF'],  # Binary
        hair_colors=['#000000', '#808080', '#FFFFFF'],
        outline_color='#000000',
        highlight_color='#FFFFFF',
        shadow_color='#00000020'
    ),
    features=FeatureStyle(
        eye_size_multiplier=1.0,
        nose_style='dots',  # Two dots or omitted
        mouth_style='minimal',  # Simple line
        outline_thickness=4,  # Thick outlines
        shading_style='flat'  # No shading
    ),
    texture_smoothness=1.0,  # Completely flat
    edge_enhancement=1.0
)


# ============================================================================
# STYLE REGISTRY
# ============================================================================

STYLES: Dict[str, StyleDefinition] = {
    'cartoon': CARTOON_STYLE,
    'anime': ANIME_STYLE,
    'minimalist': MINIMALIST_STYLE
}


def get_style(style_name: str) -> StyleDefinition:
    """
    Get a style definition by name

    Args:
        style_name: Name of the style ('cartoon', 'anime', 'minimalist')

    Returns:
        StyleDefinition object

    Raises:
        ValueError: If style name is not found
    """
    if style_name not in STYLES:
        available = ', '.join(STYLES.keys())
        raise ValueError(f"Unknown style: {style_name}. Available styles: {available}")

    return STYLES[style_name]


def list_styles() -> List[str]:
    """Get list of available style names"""
    return list(STYLES.keys())


def get_style_info(style_name: str) -> Dict:
    """
    Get human-readable information about a style

    Args:
        style_name: Name of the style

    Returns:
        Dictionary with style information
    """
    style = get_style(style_name)

    return {
        'name': style.name,
        'description': style.description,
        'features': {
            'eye_size': f"{style.features.eye_size_multiplier}x",
            'nose_style': style.features.nose_style,
            'mouth_style': style.features.mouth_style,
            'outline_thickness': f"{style.features.outline_thickness}px",
            'shading': style.features.shading_style
        },
        'rendering': {
            'texture_smoothness': f"{style.texture_smoothness * 100:.0f}%",
            'edge_enhancement': f"{style.edge_enhancement * 100:.0f}%"
        }
    }
