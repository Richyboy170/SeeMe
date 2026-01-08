import admin from 'firebase-admin';
import { logger } from '../utils/logger';

/**
 * Initializes Firebase Admin SDK
 * Used for authentication and cloud services integration
 */
export const initializeFirebase = (): void => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      logger.info('Firebase Admin SDK already initialized');
      return;
    }

    // Initialize with service account credentials
    // In production, use service account JSON file
    // For development, you can use application default credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      logger.info('Firebase Admin SDK initialized with service account');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use application default credentials (for development)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      logger.info('Firebase Admin SDK initialized with default credentials');
    } else {
      logger.warn('Firebase Admin SDK not initialized - missing configuration');
    }
  } catch (error) {
    logger.error('Firebase Admin SDK initialization failed', { error });
    throw error;
  }
};

/**
 * Returns the Firebase Admin Auth instance
 */
export const getFirebaseAuth = () => {
  return admin.auth();
};

/**
 * Returns the Firebase Admin Storage instance
 */
export const getFirebaseStorage = () => {
  return admin.storage();
};

export default admin;
