"""
WORKSTREAM 1.3 Tests: Avatar Style System

Tests for style configuration and style application.
"""

import os
import sys
import unittest
import numpy as np
import cv2

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from styles import (
    ColorPalette, FeatureStyle, StyleDefinition,
    CARTOON_STYLE, ANIME_STYLE, MINIMALIST_STYLE,
    STYLES, get_style, list_styles, get_style_info,
    StyleApplicator
)


class TestStyleConfiguration(unittest.TestCase):
    """Tests for style configuration system (Task 1.3.1)"""

    def test_color_palette_creation(self):
        """Test ColorPalette dataclass creation"""
        palette = ColorPalette(
            skin_tones=['#FFE0BD', '#F1C27D'],
            eye_colors=['#1F51FF', '#654321'],
            hair_colors=['#000000', '#3D2314'],
            outline_color='#000000',
            highlight_color='#FFFFFF',
            shadow_color='#00000040'
        )

        self.assertEqual(len(palette.skin_tones), 2)
        self.assertEqual(len(palette.eye_colors), 2)
        self.assertEqual(palette.outline_color, '#000000')

    def test_feature_style_creation(self):
        """Test FeatureStyle dataclass creation"""
        features = FeatureStyle(
            eye_size_multiplier=1.3,
            nose_style='simple_line',
            mouth_style='detailed',
            outline_thickness=3,
            shading_style='cell'
        )

        self.assertEqual(features.eye_size_multiplier, 1.3)
        self.assertEqual(features.nose_style, 'simple_line')
        self.assertEqual(features.outline_thickness, 3)

    def test_style_definition_validation(self):
        """Test StyleDefinition parameter validation"""
        # Valid style
        style = StyleDefinition(
            name='test',
            description='Test style',
            colors=ColorPalette(
                skin_tones=['#FFE0BD'],
                eye_colors=['#1F51FF'],
                hair_colors=['#000000'],
                outline_color='#000000',
                highlight_color='#FFFFFF',
                shadow_color='#00000040'
            ),
            features=FeatureStyle(
                eye_size_multiplier=1.0,
                nose_style='simple',
                mouth_style='simple',
                outline_thickness=2,
                shading_style='flat'
            ),
            texture_smoothness=0.5,
            edge_enhancement=0.5
        )
        self.assertEqual(style.name, 'test')

        # Invalid texture_smoothness
        with self.assertRaises(ValueError):
            StyleDefinition(
                name='invalid',
                description='Invalid style',
                colors=style.colors,
                features=style.features,
                texture_smoothness=1.5,  # Invalid: > 1.0
                edge_enhancement=0.5
            )

        # Invalid edge_enhancement
        with self.assertRaises(ValueError):
            StyleDefinition(
                name='invalid',
                description='Invalid style',
                colors=style.colors,
                features=style.features,
                texture_smoothness=0.5,
                edge_enhancement=-0.1  # Invalid: < 0.0
            )

    def test_cartoon_style(self):
        """Test CARTOON_STYLE definition"""
        self.assertEqual(CARTOON_STYLE.name, 'cartoon')
        self.assertEqual(len(CARTOON_STYLE.colors.skin_tones), 5)
        self.assertEqual(CARTOON_STYLE.features.eye_size_multiplier, 1.3)
        self.assertEqual(CARTOON_STYLE.features.shading_style, 'cell')
        self.assertEqual(CARTOON_STYLE.texture_smoothness, 0.8)

    def test_anime_style(self):
        """Test ANIME_STYLE definition"""
        self.assertEqual(ANIME_STYLE.name, 'anime')
        self.assertEqual(len(ANIME_STYLE.colors.hair_colors), 6)
        self.assertEqual(ANIME_STYLE.features.eye_size_multiplier, 1.8)
        self.assertEqual(ANIME_STYLE.features.shading_style, 'gradient')
        self.assertEqual(ANIME_STYLE.texture_smoothness, 0.95)

    def test_minimalist_style(self):
        """Test MINIMALIST_STYLE definition"""
        self.assertEqual(MINIMALIST_STYLE.name, 'minimalist')
        self.assertEqual(len(MINIMALIST_STYLE.colors.eye_colors), 2)
        self.assertEqual(MINIMALIST_STYLE.features.eye_size_multiplier, 1.0)
        self.assertEqual(MINIMALIST_STYLE.features.shading_style, 'flat')
        self.assertEqual(MINIMALIST_STYLE.texture_smoothness, 1.0)

    def test_styles_registry(self):
        """Test STYLES dictionary"""
        self.assertEqual(len(STYLES), 3)
        self.assertIn('cartoon', STYLES)
        self.assertIn('anime', STYLES)
        self.assertIn('minimalist', STYLES)

    def test_get_style(self):
        """Test get_style function"""
        style = get_style('cartoon')
        self.assertEqual(style.name, 'cartoon')

        style = get_style('anime')
        self.assertEqual(style.name, 'anime')

        # Invalid style name
        with self.assertRaises(ValueError):
            get_style('invalid_style')

    def test_list_styles(self):
        """Test list_styles function"""
        styles = list_styles()
        self.assertEqual(len(styles), 3)
        self.assertIn('cartoon', styles)
        self.assertIn('anime', styles)
        self.assertIn('minimalist', styles)

    def test_get_style_info(self):
        """Test get_style_info function"""
        info = get_style_info('cartoon')
        self.assertEqual(info['name'], 'cartoon')
        self.assertIn('features', info)
        self.assertIn('rendering', info)
        self.assertEqual(info['features']['shading'], 'cell')


class TestStyleApplicator(unittest.TestCase):
    """Tests for style application system (Task 1.3.2)"""

    def setUp(self):
        """Create test images and masks"""
        # Create test image (100x100 RGB)
        self.test_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)

        # Create test mask (circular region)
        y, x = np.ogrid[:100, :100]
        center_y, center_x = 50, 50
        radius = 40
        circle_mask = ((x - center_x)**2 + (y - center_y)**2 <= radius**2)
        self.test_mask = (circle_mask * 255).astype(np.uint8)

        # Create test edge map
        self.test_edges = np.zeros((100, 100), dtype=np.uint8)
        self.test_edges = cv2.circle(self.test_edges, (50, 50), 40, 255, 2)

    def test_applicator_initialization(self):
        """Test StyleApplicator initialization"""
        applicator = StyleApplicator('cartoon')
        self.assertEqual(applicator.style_name, 'cartoon')
        self.assertEqual(applicator.style.name, 'cartoon')

        applicator = StyleApplicator('anime')
        self.assertEqual(applicator.style_name, 'anime')

        # Invalid style
        with self.assertRaises(ValueError):
            StyleApplicator('invalid_style')

    def test_hex_to_rgb(self):
        """Test hex color conversion"""
        applicator = StyleApplicator('cartoon')

        # Test basic hex colors
        rgb = applicator.hex_to_rgb('#FF0000')
        np.testing.assert_array_equal(rgb, [255, 0, 0])

        rgb = applicator.hex_to_rgb('#00FF00')
        np.testing.assert_array_equal(rgb, [0, 255, 0])

        rgb = applicator.hex_to_rgb('#0000FF')
        np.testing.assert_array_equal(rgb, [0, 0, 255])

        # Test with alpha (should ignore)
        rgb = applicator.hex_to_rgb('#FF000080')
        np.testing.assert_array_equal(rgb, [255, 0, 0])

    def test_find_closest_palette_color(self):
        """Test finding closest palette color"""
        applicator = StyleApplicator('cartoon')

        palette = ['#FF0000', '#00FF00', '#0000FF']

        # Red color should match #FF0000
        color = np.array([255, 0, 0])
        closest = applicator.find_closest_palette_color(color, palette)
        np.testing.assert_array_equal(closest, [255, 0, 0])

        # Greenish color should match #00FF00
        color = np.array([50, 200, 50])
        closest = applicator.find_closest_palette_color(color, palette)
        np.testing.assert_array_equal(closest, [0, 255, 0])

    def test_smooth_texture(self):
        """Test texture smoothing"""
        applicator = StyleApplicator('cartoon')

        smoothed = applicator.smooth_texture(
            self.test_image,
            self.test_mask,
            smoothness=0.5
        )

        # Check output shape
        self.assertEqual(smoothed.shape, self.test_image.shape)

        # Check that masked region is modified
        mask_bool = self.test_mask > 127
        self.assertFalse(np.array_equal(
            smoothed[mask_bool],
            self.test_image[mask_bool]
        ))

        # Check that unmasked region is unchanged
        unmask_bool = self.test_mask == 0
        np.testing.assert_array_equal(
            smoothed[unmask_bool],
            self.test_image[unmask_bool]
        )

    def test_recolor_region(self):
        """Test region recoloring"""
        applicator = StyleApplicator('cartoon')

        target_color = np.array([255, 0, 0])  # Red
        recolored = applicator.recolor_region(
            self.test_image,
            self.test_mask,
            target_color
        )

        # Check output shape
        self.assertEqual(recolored.shape, self.test_image.shape)

        # Check that unmasked region is mostly unchanged
        # (HSV conversion may have small rounding errors)
        unmask_bool = self.test_mask == 0
        np.testing.assert_allclose(
            recolored[unmask_bool],
            self.test_image[unmask_bool],
            atol=5  # Allow 5 units difference due to color space conversion
        )

    def test_apply_color_palette(self):
        """Test color palette application"""
        applicator = StyleApplicator('cartoon')

        # Test skin region
        recolored = applicator.apply_color_palette(
            self.test_image,
            'skin',
            self.test_mask
        )
        self.assertEqual(recolored.shape, self.test_image.shape)

        # Test eye region
        recolored = applicator.apply_color_palette(
            self.test_image,
            'left_eye',
            self.test_mask
        )
        self.assertEqual(recolored.shape, self.test_image.shape)

        # Test hair region
        recolored = applicator.apply_color_palette(
            self.test_image,
            'hair',
            self.test_mask
        )
        self.assertEqual(recolored.shape, self.test_image.shape)

    def test_posterize_region(self):
        """Test posterization"""
        applicator = StyleApplicator('cartoon')

        posterized = applicator.posterize_region(
            self.test_image,
            self.test_mask,
            levels=3
        )

        # Check output shape
        self.assertEqual(posterized.shape, self.test_image.shape)

        # Check that masked region has fewer unique values
        mask_bool = self.test_mask > 127
        original_unique = len(np.unique(self.test_image[mask_bool]))
        posterized_unique = len(np.unique(posterized[mask_bool]))
        self.assertLess(posterized_unique, original_unique)

    def test_apply_cell_shading(self):
        """Test cell shading application"""
        applicator = StyleApplicator('cartoon')

        shaded = applicator.apply_cell_shading(
            self.test_image,
            self.test_mask,
            levels=3
        )

        # Check output shape
        self.assertEqual(shaded.shape, self.test_image.shape)

    def test_apply_gradient_shading(self):
        """Test gradient shading application"""
        applicator = StyleApplicator('anime')

        shaded = applicator.apply_gradient_shading(
            self.test_image,
            self.test_mask
        )

        # Check output shape
        self.assertEqual(shaded.shape, self.test_image.shape)

    def test_apply_shading(self):
        """Test shading style application"""
        applicator = StyleApplicator('cartoon')

        # Test cell shading
        shaded = applicator.apply_shading(
            self.test_image,
            self.test_mask,
            'cell'
        )
        self.assertEqual(shaded.shape, self.test_image.shape)

        # Test flat shading
        shaded = applicator.apply_shading(
            self.test_image,
            self.test_mask,
            'flat'
        )
        self.assertEqual(shaded.shape, self.test_image.shape)

        # Test gradient shading
        shaded = applicator.apply_shading(
            self.test_image,
            self.test_mask,
            'gradient'
        )
        self.assertEqual(shaded.shape, self.test_image.shape)

        # Test no shading
        shaded = applicator.apply_shading(
            self.test_image,
            self.test_mask,
            'none'
        )
        self.assertEqual(shaded.shape, self.test_image.shape)

    def test_enhance_edges(self):
        """Test edge enhancement"""
        applicator = StyleApplicator('cartoon')

        enhanced = applicator.enhance_edges(
            self.test_image,
            self.test_edges,
            enhancement=0.8
        )

        # Check output shape
        self.assertEqual(enhanced.shape, self.test_image.shape)

        # Check that edge pixels are modified
        edge_pixels = self.test_edges > 127
        self.assertFalse(np.array_equal(
            enhanced[edge_pixels],
            self.test_image[edge_pixels]
        ))

    def test_apply_style_to_region(self):
        """Test complete region styling"""
        # Test with cartoon style
        applicator = StyleApplicator('cartoon')
        styled = applicator.apply_style_to_region(
            self.test_image,
            'skin',
            self.test_mask,
            self.test_edges
        )
        self.assertEqual(styled.shape, self.test_image.shape)

        # Test with anime style
        applicator = StyleApplicator('anime')
        styled = applicator.apply_style_to_region(
            self.test_image,
            'skin',
            self.test_mask,
            self.test_edges
        )
        self.assertEqual(styled.shape, self.test_image.shape)

        # Test with minimalist style
        applicator = StyleApplicator('minimalist')
        styled = applicator.apply_style_to_region(
            self.test_image,
            'skin',
            self.test_mask,
            self.test_edges
        )
        self.assertEqual(styled.shape, self.test_image.shape)

    def test_apply_style_to_full_face(self):
        """Test full face styling with multiple regions"""
        applicator = StyleApplicator('cartoon')

        # Create multiple region masks
        masks = {
            'skin': self.test_mask,
            'left_eye': np.zeros((100, 100), dtype=np.uint8),
            'right_eye': np.zeros((100, 100), dtype=np.uint8),
        }

        # Add small eye masks
        masks['left_eye'] = cv2.circle(masks['left_eye'], (30, 40), 5, 255, -1)
        masks['right_eye'] = cv2.circle(masks['right_eye'], (70, 40), 5, 255, -1)

        styled = applicator.apply_style_to_full_face(
            self.test_image,
            masks,
            self.test_edges
        )

        # Check output shape
        self.assertEqual(styled.shape, self.test_image.shape)


class TestStyleIntegration(unittest.TestCase):
    """Integration tests for complete style pipeline"""

    def test_cartoon_style_pipeline(self):
        """Test complete cartoon style application"""
        # Create test image
        image = np.random.randint(100, 200, (200, 200, 3), dtype=np.uint8)

        # Create test mask
        mask = np.zeros((200, 200), dtype=np.uint8)
        mask = cv2.circle(mask, (100, 100), 80, 255, -1)

        # Create test edges
        edges = cv2.Canny(cv2.cvtColor(image, cv2.COLOR_RGB2GRAY), 50, 150)

        # Apply style
        applicator = StyleApplicator('cartoon')
        styled = applicator.apply_style_to_region(image, 'skin', mask, edges)

        # Check result
        self.assertEqual(styled.shape, image.shape)
        self.assertEqual(styled.dtype, np.uint8)

    def test_anime_style_pipeline(self):
        """Test complete anime style application"""
        # Create test image
        image = np.random.randint(100, 200, (200, 200, 3), dtype=np.uint8)

        # Create test mask
        mask = np.zeros((200, 200), dtype=np.uint8)
        mask = cv2.circle(mask, (100, 100), 80, 255, -1)

        # Create test edges
        edges = cv2.Canny(cv2.cvtColor(image, cv2.COLOR_RGB2GRAY), 50, 150)

        # Apply style
        applicator = StyleApplicator('anime')
        styled = applicator.apply_style_to_region(image, 'skin', mask, edges)

        # Check result
        self.assertEqual(styled.shape, image.shape)
        self.assertEqual(styled.dtype, np.uint8)

    def test_minimalist_style_pipeline(self):
        """Test complete minimalist style application"""
        # Create test image
        image = np.random.randint(100, 200, (200, 200, 3), dtype=np.uint8)

        # Create test mask
        mask = np.zeros((200, 200), dtype=np.uint8)
        mask = cv2.circle(mask, (100, 100), 80, 255, -1)

        # Create test edges
        edges = cv2.Canny(cv2.cvtColor(image, cv2.COLOR_RGB2GRAY), 50, 150)

        # Apply style
        applicator = StyleApplicator('minimalist')
        styled = applicator.apply_style_to_region(image, 'skin', mask, edges)

        # Check result
        self.assertEqual(styled.shape, image.shape)
        self.assertEqual(styled.dtype, np.uint8)


def run_tests():
    """Run all tests with verbose output"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestStyleConfiguration))
    suite.addTests(loader.loadTestsFromTestCase(TestStyleApplicator))
    suite.addTests(loader.loadTestsFromTestCase(TestStyleIntegration))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\n" + "="*70)
    print("WORKSTREAM 1.3 TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print("\n[PASS] ALL TESTS PASSED!")
    else:
        print("\n[FAIL] SOME TESTS FAILED")

    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
