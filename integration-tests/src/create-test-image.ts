import fs from 'fs';
import path from 'path';

/**
 * Create a simple test image for integration tests
 * This creates a minimal valid PNG file
 */
export function createTestImage(): Buffer {
  // Minimal 1x1 red pixel PNG (base64 encoded)
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return Buffer.from(base64PNG, 'base64');
}

/**
 * Save test image to file
 */
export function saveTestImage(filename: string = 'sample-photo.jpg'): string {
  const testAssetsDir = path.join(__dirname, '..', 'test-assets');

  // Create directory if it doesn't exist
  if (!fs.existsSync(testAssetsDir)) {
    fs.mkdirSync(testAssetsDir, { recursive: true });
  }

  const filePath = path.join(testAssetsDir, filename);
  const imageBuffer = createTestImage();

  fs.writeFileSync(filePath, imageBuffer);

  return filePath;
}

// Create test image when this module is imported
if (require.main === module) {
  const filePath = saveTestImage();
  console.log(`Test image created at: ${filePath}`);
}
