"""
Style Applicator for SeeMe Avatar Generation

Applies avatar styles to face regions using color palettes, texture smoothing,
shading, and edge enhancement.
"""

import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple

from .style_config import StyleDefinition, STYLES, get_style


class StyleApplicator:
    """
    Applies avatar styles to face regions

    Uses region-based processing to transform real face images into stylized avatars.
    Supports texture smoothing, color palette mapping, shading, and edge enhancement.
    """

    def __init__(self, style_name: str):
        """
        Initialize style applicator

        Args:
            style_name: Name of style to apply ('cartoon', 'anime', 'minimalist')

        Raises:
            ValueError: If style name is unknown
        """
        self.style = get_style(style_name)
        self.style_name = style_name

    def apply_style_to_region(
        self,
        region_image: np.ndarray,
        region_name: str,
        region_mask: np.ndarray,
        edge_map: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Apply avatar style to a specific face region

        Args:
            region_image: RGB image of region
            region_name: Name of region (e.g., 'skin', 'left_eye', 'hair')
            region_mask: Binary mask of region (255 = region, 0 = background)
            edge_map: Optional edge map for structure preservation

        Returns:
            Styled region image (RGB)
        """
        styled = region_image.copy()

        # 1. Smooth texture
        if self.style.texture_smoothness > 0:
            styled = self.smooth_texture(styled, region_mask, self.style.texture_smoothness)

        # 2. Apply color palette
        styled = self.apply_color_palette(styled, region_name, region_mask)

        # 3. Apply shading style
        if self.style.features.shading_style != 'none':
            styled = self.apply_shading(styled, region_mask, self.style.features.shading_style)

        # 4. Enhance edges (but preserve original edge positions)
        if self.style.edge_enhancement > 0 and edge_map is not None:
            styled = self.enhance_edges(styled, edge_map, self.style.edge_enhancement)

        return styled

    def smooth_texture(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        smoothness: float
    ) -> np.ndarray:
        """
        Smooth texture while preserving edges

        Uses bilateral filter to reduce skin texture and noise while keeping
        major features sharp.

        Args:
            image: RGB image
            mask: Binary mask (255 = process, 0 = skip)
            smoothness: Smoothness factor [0.0, 1.0]

        Returns:
            Smoothed image
        """
        # Bilateral filter: smooths while preserving edges
        kernel_size = int(smoothness * 20) + 5  # 5-25 based on smoothness
        kernel_size = kernel_size if kernel_size % 2 == 1 else kernel_size + 1  # Must be odd

        smoothed = cv2.bilateralFilter(
            image,
            d=kernel_size,
            sigmaColor=75 * smoothness,
            sigmaSpace=75 * smoothness
        )

        # Apply only within mask
        result = image.copy()
        mask_bool = mask > 127
        result[mask_bool] = smoothed[mask_bool]

        return result

    def apply_color_palette(
        self,
        image: np.ndarray,
        region_name: str,
        mask: np.ndarray
    ) -> np.ndarray:
        """
        Map region colors to style palette

        Args:
            image: RGB image
            region_name: Name of region to determine palette
            mask: Binary mask (255 = region, 0 = background)

        Returns:
            Recolored image
        """
        result = image.copy()
        mask_bool = mask > 127

        # Get appropriate palette based on region
        if region_name == 'skin':
            # Calculate average skin tone
            masked_pixels = image[mask_bool]
            if len(masked_pixels) == 0:
                return result

            avg_color = np.mean(masked_pixels, axis=0)

            # Find closest palette color
            palette_color = self.find_closest_palette_color(
                avg_color,
                self.style.colors.skin_tones
            )

            # Apply palette color (preserve relative lightness)
            result = self.recolor_region(image, mask, palette_color)

        elif region_name in ['left_eye', 'right_eye']:
            # Apply eye color from palette
            masked_pixels = image[mask_bool]
            if len(masked_pixels) == 0:
                return result

            avg_color = np.mean(masked_pixels, axis=0)
            palette_color = self.find_closest_palette_color(
                avg_color,
                self.style.colors.eye_colors
            )
            result = self.recolor_region(image, mask, palette_color)

        elif region_name == 'hair':
            # Apply hair color from palette
            masked_pixels = image[mask_bool]
            if len(masked_pixels) == 0:
                return result

            avg_color = np.mean(masked_pixels, axis=0)
            palette_color = self.find_closest_palette_color(
                avg_color,
                self.style.colors.hair_colors
            )
            result = self.recolor_region(image, mask, palette_color)

        return result

    def find_closest_palette_color(
        self,
        color: np.ndarray,
        palette: List[str]
    ) -> np.ndarray:
        """
        Find closest color in palette to given color

        Args:
            color: RGB color [0, 255]
            palette: List of hex color strings

        Returns:
            RGB color array [0, 255]
        """
        color_rgb = color[:3]  # In case of RGBA

        # Convert palette hex colors to RGB
        palette_rgb = [self.hex_to_rgb(hex_color) for hex_color in palette]

        # Find closest by Euclidean distance in RGB space
        distances = [np.linalg.norm(color_rgb - p) for p in palette_rgb]
        closest_idx = np.argmin(distances)

        return palette_rgb[closest_idx]

    def hex_to_rgb(self, hex_color: str) -> np.ndarray:
        """
        Convert hex color to RGB array

        Args:
            hex_color: Hex color string (e.g., '#FF0000' or '#FF000080')

        Returns:
            RGB array [0, 255] (ignores alpha channel)
        """
        hex_color = hex_color.lstrip('#')

        # Handle both RGB and RGBA hex strings
        if len(hex_color) >= 6:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
            return np.array([r, g, b], dtype=np.float32)
        else:
            raise ValueError(f"Invalid hex color: {hex_color}")

    def recolor_region(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        target_color: np.ndarray
    ) -> np.ndarray:
        """
        Recolor a region while preserving relative lightness

        Maps all colors in the region to the target color while maintaining
        the original brightness variations.

        Args:
            image: RGB image
            mask: Binary mask (255 = region, 0 = background)
            target_color: Target RGB color [0, 255]

        Returns:
            Recolored image
        """
        result = image.copy()
        mask_bool = mask > 127

        if not np.any(mask_bool):
            return result

        # Convert to HSV to preserve lightness
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV).astype(np.float32)
        target_hsv = cv2.cvtColor(
            np.uint8([[target_color]]),
            cv2.COLOR_RGB2HSV
        )[0, 0].astype(np.float32)

        # Apply target hue and saturation, keep original value (lightness)
        hsv[mask_bool, 0] = target_hsv[0]  # Hue
        hsv[mask_bool, 1] = target_hsv[1]  # Saturation
        # Keep original hsv[:, :, 2] (Value/Lightness)

        # Convert back to RGB
        hsv = np.clip(hsv, 0, 255).astype(np.uint8)
        result = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)

        return result

    def apply_shading(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        shading_style: str
    ) -> np.ndarray:
        """
        Apply shading style to region

        Args:
            image: RGB image
            mask: Binary mask (255 = region, 0 = background)
            shading_style: 'cell', 'gradient', 'flat', or 'none'

        Returns:
            Shaded image
        """
        if shading_style == 'none' or shading_style == 'flat':
            # Flat shading: posterize to reduce tones
            return self.posterize_region(image, mask, levels=3)

        elif shading_style == 'cell':
            # Cell shading: 3-tone anime-style shading
            return self.apply_cell_shading(image, mask, levels=3)

        elif shading_style == 'gradient':
            # Gradient shading: smooth transitions
            return self.apply_gradient_shading(image, mask)

        else:
            return image

    def posterize_region(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        levels: int = 3
    ) -> np.ndarray:
        """
        Posterize region to reduce color levels

        Args:
            image: RGB image
            mask: Binary mask
            levels: Number of color levels (2-8)

        Returns:
            Posterized image
        """
        result = image.copy()
        mask_bool = mask > 127

        if not np.any(mask_bool):
            return result

        # Quantize pixel values
        step = 256 // levels
        result[mask_bool] = (result[mask_bool] // step) * step + step // 2

        return result

    def apply_cell_shading(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        levels: int = 3
    ) -> np.ndarray:
        """
        Apply cell shading (anime-style 3-tone shading)

        Args:
            image: RGB image
            mask: Binary mask
            levels: Number of shading levels (typically 3)

        Returns:
            Cell-shaded image
        """
        result = image.copy()
        mask_bool = mask > 127

        if not np.any(mask_bool):
            return result

        # Convert to grayscale for shading calculation
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

        # Apply thresholding to create distinct shading levels
        thresholds = np.linspace(0, 255, levels + 1)[1:-1]

        # Create shading multipliers for each level
        shading = np.ones_like(gray, dtype=np.float32)
        for i, threshold in enumerate(thresholds):
            shading[gray < threshold] = 0.7 - (i * 0.2)  # Darken progressively

        # Apply shading to each channel
        for c in range(3):
            result[:, :, c] = np.clip(result[:, :, c] * shading, 0, 255).astype(np.uint8)

        # Apply only to masked region
        result_temp = image.copy()
        result_temp[mask_bool] = result[mask_bool]

        return result_temp

    def apply_gradient_shading(
        self,
        image: np.ndarray,
        mask: np.ndarray
    ) -> np.ndarray:
        """
        Apply smooth gradient shading

        Args:
            image: RGB image
            mask: Binary mask

        Returns:
            Gradient-shaded image
        """
        # For gradient shading, just apply subtle smoothing
        # This preserves natural shading but makes it smoother
        return self.smooth_texture(image, mask, smoothness=0.5)

    def enhance_edges(
        self,
        image: np.ndarray,
        edge_map: np.ndarray,
        enhancement: float
    ) -> np.ndarray:
        """
        Enhance edges in image

        Draws stylized outlines based on edge map and style parameters.

        Args:
            image: RGB image
            edge_map: Edge map (255 = edge, 0 = no edge)
            enhancement: Enhancement strength [0.0, 1.0]

        Returns:
            Edge-enhanced image
        """
        result = image.copy()

        # Dilate edges based on outline thickness
        thickness = self.style.features.outline_thickness
        if thickness > 0:
            kernel = np.ones((thickness, thickness), np.uint8)
            edges_thick = cv2.dilate(edge_map, kernel, iterations=1)
        else:
            edges_thick = edge_map

        # Get outline color
        outline_rgb = self.hex_to_rgb(self.style.colors.outline_color)

        # Blend outline with image based on enhancement strength
        edge_mask = edges_thick > 127
        if np.any(edge_mask):
            alpha = enhancement  # Use enhancement as alpha
            result[edge_mask] = (
                alpha * outline_rgb + (1 - alpha) * result[edge_mask]
            ).astype(np.uint8)

        return result

    def apply_style_to_full_face(
        self,
        image: np.ndarray,
        masks: Dict[str, np.ndarray],
        edge_map: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Apply style to all face regions

        Args:
            image: RGB image of face
            masks: Dictionary of region masks (region_name -> binary mask)
            edge_map: Optional edge map for structure preservation

        Returns:
            Fully styled face image
        """
        result = image.copy()

        # Define processing order (background first, important features last)
        region_order = [
            'neck', 'hair', 'left_ear', 'right_ear', 'skin',
            'left_eyebrow', 'right_eyebrow', 'nose',
            'mouth_interior', 'upper_lip', 'lower_lip',
            'left_eye', 'right_eye'
        ]

        # Process each region
        for region_name in region_order:
            if region_name in masks:
                mask = masks[region_name]
                styled_region = self.apply_style_to_region(
                    result,
                    region_name,
                    mask,
                    edge_map
                )

                # Blend styled region back into result
                mask_bool = mask > 127
                result[mask_bool] = styled_region[mask_bool]

        # Apply final edge enhancement to entire face
        if edge_map is not None and self.style.edge_enhancement > 0:
            result = self.enhance_edges(result, edge_map, self.style.edge_enhancement)

        return result
