import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * S3 Service for image storage and management
 *
 * In production, this uses AWS S3 with CloudFront
 * In development, falls back to local file storage
 */

// AWS S3 types (will be actual AWS SDK in production)
interface S3Config {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucket?: string;
  cloudfrontDomain?: string;
}

const config: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET_NAME,
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN
};

// Check if AWS is configured
const isAwsConfigured = !!(
  config.accessKeyId &&
  config.secretAccessKey &&
  config.bucket
);

// Local storage fallback
const localStoragePath = path.join(process.cwd(), 'storage');

if (!isAwsConfigured) {
  logger.warn('AWS S3 not configured, using local file storage');
  // Ensure local storage directories exist
  ['originals', 'processed', 'thumbnails'].forEach(dir => {
    const dirPath = path.join(localStoragePath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

export class S3Service {
  /**
   * Upload image to S3 (or local storage)
   */
  static async uploadImage(
    buffer: Buffer,
    key: string,
    _contentType: string = 'image/jpeg'
  ): Promise<string> {
    try {
      if (isAwsConfigured) {
        // In production with AWS SDK:
        // const s3 = new AWS.S3({ ... });
        // await s3.putObject({ Bucket, Key, Body, ContentType }).promise();
        // return `https://${config.cloudfrontDomain}/${key}`;

        // For now, throw error to remind to implement
        throw new Error('AWS S3 integration not yet implemented. Please add aws-sdk package.');
      } else {
        // Local file storage
        const filePath = path.join(localStoragePath, key);
        const directory = path.dirname(filePath);

        if (!fs.existsSync(directory)) {
          fs.mkdirSync(directory, { recursive: true });
        }

        fs.writeFileSync(filePath, buffer);
        logger.debug('Image saved locally', { path: filePath });

        // Return local URL
        return `file://${filePath}`;
      }
    } catch (error) {
      logger.error('Failed to upload image', { error, key });
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload thumbnail
   */
  static async uploadThumbnail(
    buffer: Buffer,
    key: string
  ): Promise<string> {
    const thumbnailKey = key.replace(/(\.[^.]+)$/, '_thumb$1');
    return this.uploadImage(buffer, thumbnailKey, 'image/jpeg');
  }

  /**
   * Download image from S3 (or local storage)
   */
  static async downloadImage(url: string): Promise<Buffer> {
    try {
      if (url.startsWith('file://')) {
        // Local file
        const filePath = url.replace('file://', '');
        if (!fs.existsSync(filePath)) {
          throw new Error('File not found');
        }
        return fs.readFileSync(filePath);
      } else if (isAwsConfigured && config.cloudfrontDomain) {
        // S3/CloudFront URL
        // const key = url.replace(`https://${config.cloudfrontDomain}/`, '');
        // const result = await s3.getObject({ Bucket, Key }).promise();
        // return result.Body as Buffer;

        throw new Error('AWS S3 download not yet implemented');
      } else {
        throw new Error('Invalid image URL or AWS not configured');
      }
    } catch (error) {
      logger.error('Failed to download image', { error, url });
      throw new Error('Failed to download image');
    }
  }

  /**
   * Delete image from S3 (or local storage)
   */
  static async deleteImage(url: string): Promise<void> {
    try {
      if (url.startsWith('file://')) {
        // Local file
        const filePath = url.replace('file://', '');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.debug('Image deleted locally', { path: filePath });
        }
      } else if (isAwsConfigured && config.cloudfrontDomain) {
        // S3 URL
        // const key = url.replace(`https://${config.cloudfrontDomain}/`, '');
        // await s3.deleteObject({ Bucket, Key }).promise();

        logger.warn('AWS S3 delete not yet implemented', { url });
      }
    } catch (error) {
      logger.error('Failed to delete image', { error, url });
      // Don't throw - deletion failure shouldn't break other operations
    }
  }

  /**
   * Generate signed URL for temporary access (AWS only)
   */
  static generateSignedUrl(_key: string, _expiresIn: number = 3600): string {
    if (!isAwsConfigured) {
      throw new Error('AWS S3 not configured');
    }

    // const signedUrl = s3.getSignedUrl('getObject', {
    //   Bucket: config.bucket,
    //   Key: key,
    //   Expires: expiresIn
    // });
    // return signedUrl;

    throw new Error('AWS S3 signed URL generation not yet implemented');
  }

  /**
   * Check if image exists
   */
  static async imageExists(url: string): Promise<boolean> {
    try {
      if (url.startsWith('file://')) {
        const filePath = url.replace('file://', '');
        return fs.existsSync(filePath);
      } else if (isAwsConfigured && config.cloudfrontDomain) {
        // const key = url.replace(`https://${config.cloudfrontDomain}/`, '');
        // await s3.headObject({ Bucket, Key }).promise();
        // return true;

        return false;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage configuration info
   */
  static getStorageInfo(): {
    type: 'aws' | 'local';
    configured: boolean;
    bucket?: string;
    region?: string;
  } {
    return {
      type: isAwsConfigured ? 'aws' : 'local',
      configured: isAwsConfigured,
      bucket: config.bucket,
      region: config.region
    };
  }
}
