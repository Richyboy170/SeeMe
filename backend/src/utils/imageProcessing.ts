import sharp from 'sharp';
import { logger } from './logger';

/**
 * Image Processing Utilities
 * Handles image validation, optimization, and resizing
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  metadata?: sharp.Metadata;
}

export interface ImageSizes {
  original: Buffer;
  large: Buffer;
  medium: Buffer;
  thumbnail: Buffer;
}

export class ImageProcessor {
  /**
   * Ensure buffer is in a format sharp can fully decode (handles HEIF/HEIC gracefully)
   */
  private static async ensureDecodable(buffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== 'heif') return buffer;

    try {
      const converted = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      logger.debug('HEIF pre-converted to JPEG');
      return converted;
    } catch {
      logger.warn('HEIF codec not available — converting via raw pixel extraction');
      const { data, info } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const converted = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: info.channels as 1 | 2 | 3 | 4 }
      })
        .jpeg({ quality: 90 })
        .toBuffer();
      logger.debug('HEIF converted via raw pixel fallback');
      return converted;
    }
  }

  /**
   * Validate image file
   */
  static async validateImage(buffer: Buffer): Promise<ImageValidationResult> {
    try {
      const metadata = await sharp(buffer).metadata();

      // Check format (heif covers HEIC from iPhones — sharp converts it to JPEG downstream)
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'heif'];
      if (!metadata.format || !allowedFormats.includes(metadata.format.toLowerCase())) {
        return {
          valid: false,
          error: 'Invalid image format. Only JPEG, PNG, WebP, and HEIC allowed.'
        };
      }

      // Check dimensions
      if (!metadata.width || !metadata.height) {
        return {
          valid: false,
          error: 'Could not read image dimensions'
        };
      }

      if (metadata.width < 400 || metadata.height < 400) {
        return {
          valid: false,
          error: 'Image too small. Minimum 400x400 pixels required.'
        };
      }

      if (metadata.width > 4096 || metadata.height > 4096) {
        return {
          valid: false,
          error: 'Image too large. Maximum 4096x4096 pixels.'
        };
      }

      logger.debug('Image validated', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length
      });

      return { valid: true, metadata };

    } catch (error) {
      logger.error('Image validation failed', { error });
      return {
        valid: false,
        error: 'Invalid or corrupted image file'
      };
    }
  }

  /**
   * Optimize image for storage
   * Resizes large images and compresses
   */
  static async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      const input = await this.ensureDecodable(buffer);

      const optimized = await sharp(input)
        .resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      logger.debug('Image optimized', {
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        reduction: ((1 - optimized.length / buffer.length) * 100).toFixed(2) + '%'
      });

      return optimized;

    } catch (error) {
      logger.error('Image optimization failed', { error });
      throw new Error('Failed to optimize image');
    }
  }

  /**
   * Generate thumbnail
   */
  static async generateThumbnail(
    buffer: Buffer,
    size: number = 400
  ): Promise<Buffer> {
    try {
      const input = await this.ensureDecodable(buffer);
      return await sharp(input)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

    } catch (error) {
      logger.error('Thumbnail generation failed', { error });
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Generate multiple sizes
   */
  static async generateSizes(buffer: Buffer): Promise<ImageSizes> {
    try {
      const input = await this.ensureDecodable(buffer);
      const [original, large, medium, thumbnail] = await Promise.all([
        sharp(input).jpeg({ quality: 90 }).toBuffer(),
        sharp(input)
          .resize(1200, 1200, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toBuffer(),
        sharp(input)
          .resize(600, 600, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer(),
        sharp(input)
          .resize(400, 400, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 75 })
          .toBuffer()
      ]);

      logger.debug('Generated multiple image sizes', {
        originalSize: original.length,
        largeSize: large.length,
        mediumSize: medium.length,
        thumbnailSize: thumbnail.length
      });

      return { original, large, medium, thumbnail };

    } catch (error) {
      logger.error('Failed to generate image sizes', { error });
      throw new Error('Failed to generate image sizes');
    }
  }

  /**
   * Get image metadata
   */
  static async getMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(buffer).metadata();
    } catch (error) {
      logger.error('Failed to get image metadata', { error });
      throw new Error('Failed to get image metadata');
    }
  }

  /**
   * Convert image to JPEG
   */
  static async convertToJPEG(buffer: Buffer, quality: number = 85): Promise<Buffer> {
    try {
      const input = await this.ensureDecodable(buffer);
      return await sharp(input)
        .jpeg({ quality, progressive: true })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to convert image to JPEG', { error });
      throw new Error('Failed to convert image');
    }
  }

  /**
   * Resize image to specific dimensions
   */
  static async resize(
    buffer: Buffer,
    width: number,
    height: number,
    options?: {
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      position?: string;
    }
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: options?.fit || 'inside',
          position: options?.position || 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to resize image', { error });
      throw new Error('Failed to resize image');
    }
  }

  /**
   * Check if buffer is a valid image
   */
  static async isValidImage(buffer: Buffer): Promise<boolean> {
    const result = await this.validateImage(buffer);
    return result.valid;
  }
}
