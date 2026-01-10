"""
SeeMe Avatar Style System

This package provides style configuration and application for avatar generation.
Supports multiple avatar styles (cartoon, anime, minimalist) with region-based
style application.
"""

from .style_config import (
    ColorPalette,
    FeatureStyle,
    StyleDefinition,
    CARTOON_STYLE,
    ANIME_STYLE,
    MINIMALIST_STYLE,
    STYLES,
    get_style,
    list_styles,
    get_style_info
)

from .style_applicator import StyleApplicator

__all__ = [
    'ColorPalette',
    'FeatureStyle',
    'StyleDefinition',
    'CARTOON_STYLE',
    'ANIME_STYLE',
    'MINIMALIST_STYLE',
    'STYLES',
    'get_style',
    'list_styles',
    'get_style_info',
    'StyleApplicator',
]
