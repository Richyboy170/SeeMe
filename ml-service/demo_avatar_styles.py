"""
Quick Demo: Avatar Style System

Demonstrates the usage of WORKSTREAM 1.3 avatar style system.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import cv2
import numpy as np
from styles import (
    StyleApplicator,
    list_styles,
    get_style_info,
    CARTOON_STYLE,
    ANIME_STYLE,
    MINIMALIST_STYLE
)


def demo_style_info():
    """Demonstrate style information retrieval"""
    print("="*70)
    print("AVAILABLE AVATAR STYLES")
    print("="*70)

    styles = list_styles()
    print(f"\nTotal styles available: {len(styles)}")
    print(f"Style names: {', '.join(styles)}")

    print("\n" + "="*70)
    print("STYLE DETAILS")
    print("="*70)

    for style_name in styles:
        info = get_style_info(style_name)
        print(f"\n{style_name.upper()} Style:")
        print(f"  Description: {info['description']}")
        print(f"  Features:")
        for key, value in info['features'].items():
            print(f"    - {key}: {value}")
        print(f"  Rendering:")
        for key, value in info['rendering'].items():
            print(f"    - {key}: {value}")


def demo_style_application():
    """Demonstrate style application to a test image"""
    print("\n" + "="*70)
    print("STYLE APPLICATION DEMO")
    print("="*70)

    # Create a test image (gradient with some features)
    print("\n[1/4] Creating test image...")
    h, w = 400, 400
    test_image = np.zeros((h, w, 3), dtype=np.uint8)

    # Create gradient background
    for i in range(h):
        test_image[i, :] = [150 + i//4, 120, 100]

    # Add some "facial features" (circles for demonstration)
    cv2.circle(test_image, (150, 150), 30, (200, 180, 150), -1)  # Left eye area
    cv2.circle(test_image, (250, 150), 30, (200, 180, 150), -1)  # Right eye area
    cv2.circle(test_image, (200, 250), 40, (180, 120, 100), -1)  # Mouth area

    print(f"  Test image created: {test_image.shape}")

    # Create mask (circular face region)
    print("\n[2/4] Creating face mask...")
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, (200, 200), 150, 255, -1)
    print(f"  Mask created: {mask.shape}")

    # Create simple edges
    print("\n[3/4] Creating edge map...")
    gray = cv2.cvtColor(test_image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    print(f"  Edges detected: {edges.shape}")

    # Apply each style
    print("\n[4/4] Applying styles...")
    output_dir = "demo_output"
    os.makedirs(output_dir, exist_ok=True)

    # Save original
    cv2.imwrite(
        os.path.join(output_dir, "0_original.jpg"),
        cv2.cvtColor(test_image, cv2.COLOR_RGB2BGR)
    )

    results = {}
    for style_name in list_styles():
        print(f"\n  Applying {style_name} style...")

        applicator = StyleApplicator(style_name)
        styled = applicator.apply_style_to_region(
            test_image,
            'skin',
            mask,
            edges
        )

        results[style_name] = styled

        # Save result
        output_path = os.path.join(output_dir, f"1_styled_{style_name}.jpg")
        cv2.imwrite(output_path, cv2.cvtColor(styled, cv2.COLOR_RGB2BGR))
        print(f"    Saved to: {output_path}")

    # Create comparison image
    print("\n[5/4] Creating comparison...")
    comparison = np.hstack([
        test_image,
        results['cartoon'],
        results['anime'],
        results['minimalist']
    ])
    comparison_path = os.path.join(output_dir, "2_comparison.jpg")
    cv2.imwrite(comparison_path, cv2.cvtColor(comparison, cv2.COLOR_RGB2BGR))
    print(f"  Comparison saved to: {comparison_path}")

    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)
    print(f"Output files saved to: {output_dir}/")
    print("  - 0_original.jpg")
    print("  - 1_styled_cartoon.jpg")
    print("  - 1_styled_anime.jpg")
    print("  - 1_styled_minimalist.jpg")
    print("  - 2_comparison.jpg")


def demo_style_parameters():
    """Demonstrate style parameter access"""
    print("\n" + "="*70)
    print("STYLE PARAMETER DETAILS")
    print("="*70)

    print("\nCARTOON Style Parameters:")
    print(f"  Eye size multiplier: {CARTOON_STYLE.features.eye_size_multiplier}x")
    print(f"  Nose style: {CARTOON_STYLE.features.nose_style}")
    print(f"  Mouth style: {CARTOON_STYLE.features.mouth_style}")
    print(f"  Outline thickness: {CARTOON_STYLE.features.outline_thickness}px")
    print(f"  Shading: {CARTOON_STYLE.features.shading_style}")
    print(f"  Texture smoothness: {CARTOON_STYLE.texture_smoothness}")
    print(f"  Edge enhancement: {CARTOON_STYLE.edge_enhancement}")
    print(f"  Skin tones: {len(CARTOON_STYLE.colors.skin_tones)}")
    print(f"  Eye colors: {len(CARTOON_STYLE.colors.eye_colors)}")
    print(f"  Hair colors: {len(CARTOON_STYLE.colors.hair_colors)}")

    print("\nANIME Style Parameters:")
    print(f"  Eye size multiplier: {ANIME_STYLE.features.eye_size_multiplier}x")
    print(f"  Nose style: {ANIME_STYLE.features.nose_style}")
    print(f"  Mouth style: {ANIME_STYLE.features.mouth_style}")
    print(f"  Outline thickness: {ANIME_STYLE.features.outline_thickness}px")
    print(f"  Shading: {ANIME_STYLE.features.shading_style}")
    print(f"  Texture smoothness: {ANIME_STYLE.texture_smoothness}")
    print(f"  Edge enhancement: {ANIME_STYLE.edge_enhancement}")
    print(f"  Skin tones: {len(ANIME_STYLE.colors.skin_tones)}")
    print(f"  Eye colors: {len(ANIME_STYLE.colors.eye_colors)}")
    print(f"  Hair colors: {len(ANIME_STYLE.colors.hair_colors)}")

    print("\nMINIMALIST Style Parameters:")
    print(f"  Eye size multiplier: {MINIMALIST_STYLE.features.eye_size_multiplier}x")
    print(f"  Nose style: {MINIMALIST_STYLE.features.nose_style}")
    print(f"  Mouth style: {MINIMALIST_STYLE.features.mouth_style}")
    print(f"  Outline thickness: {MINIMALIST_STYLE.features.outline_thickness}px")
    print(f"  Shading: {MINIMALIST_STYLE.features.shading_style}")
    print(f"  Texture smoothness: {MINIMALIST_STYLE.texture_smoothness}")
    print(f"  Edge enhancement: {MINIMALIST_STYLE.edge_enhancement}")
    print(f"  Skin tones: {len(MINIMALIST_STYLE.colors.skin_tones)}")
    print(f"  Eye colors: {len(MINIMALIST_STYLE.colors.eye_colors)}")
    print(f"  Hair colors: {len(MINIMALIST_STYLE.colors.hair_colors)}")


def demo_color_palettes():
    """Demonstrate color palette visualization"""
    print("\n" + "="*70)
    print("COLOR PALETTE VISUALIZATION")
    print("="*70)

    output_dir = "demo_output"
    os.makedirs(output_dir, exist_ok=True)

    for style_name in list_styles():
        applicator = StyleApplicator(style_name)
        style = applicator.style

        print(f"\n{style_name.upper()} Color Palette:")

        # Create palette visualization
        palette_height = 100
        palette_width = 600
        palette_img = np.zeros((palette_height * 3, palette_width, 3), dtype=np.uint8)

        # Skin tones
        section_width = palette_width // len(style.colors.skin_tones)
        for i, color_hex in enumerate(style.colors.skin_tones):
            color = applicator.hex_to_rgb(color_hex)
            x_start = i * section_width
            x_end = (i + 1) * section_width
            palette_img[0:palette_height, x_start:x_end] = color
            print(f"  Skin tone {i+1}: {color_hex}")

        # Eye colors
        section_width = palette_width // len(style.colors.eye_colors)
        for i, color_hex in enumerate(style.colors.eye_colors):
            color = applicator.hex_to_rgb(color_hex)
            x_start = i * section_width
            x_end = (i + 1) * section_width
            palette_img[palette_height:palette_height*2, x_start:x_end] = color
            print(f"  Eye color {i+1}: {color_hex}")

        # Hair colors
        section_width = palette_width // len(style.colors.hair_colors)
        for i, color_hex in enumerate(style.colors.hair_colors):
            color = applicator.hex_to_rgb(color_hex)
            x_start = i * section_width
            x_end = (i + 1) * section_width
            palette_img[palette_height*2:palette_height*3, x_start:x_end] = color
            print(f"  Hair color {i+1}: {color_hex}")

        # Add labels
        cv2.putText(palette_img, "Skin Tones", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(palette_img, "Eye Colors", (10, 130),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(palette_img, "Hair Colors", (10, 230),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Save palette
        palette_path = os.path.join(output_dir, f"3_palette_{style_name}.jpg")
        cv2.imwrite(palette_path, cv2.cvtColor(palette_img, cv2.COLOR_RGB2BGR))
        print(f"  Palette saved to: {palette_path}")


def main():
    """Run all demos"""
    print("\n" + "="*70)
    print("WORKSTREAM 1.3: AVATAR STYLE SYSTEM DEMO")
    print("="*70)

    # Demo 1: Style information
    demo_style_info()

    # Demo 2: Style parameters
    demo_style_parameters()

    # Demo 3: Color palettes
    demo_color_palettes()

    # Demo 4: Style application
    demo_style_application()

    print("\n" + "="*70)
    print("ALL DEMOS COMPLETE!")
    print("="*70)
    print("\nNext steps:")
    print("1. Run tests: python tests/test_workstream_1_3.py")
    print("2. Integration test: python tests/test_full_avatar_pipeline.py <image>")
    print("3. Check demo_output/ directory for visualizations")


if __name__ == '__main__':
    main()
