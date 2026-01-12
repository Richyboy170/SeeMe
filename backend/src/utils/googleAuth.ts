import { OAuth2Client } from 'google-auth-library';
import { logger } from './logger';

/**
 * Google user information extracted from ID token
 */
export interface GoogleUserInfo {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
  givenName?: string;
  familyName?: string;
}

/**
 * Google Authentication Service
 * Handles verification of Google ID tokens
 */
export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    // Client accepts all three client IDs (Android, iOS, Web)
    const clientIds = [
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_WEB
    ].filter(Boolean);

    if (clientIds.length === 0) {
      logger.warn('No Google Client IDs configured - Google Sign-In will not work');
    }

    this.client = new OAuth2Client();
  }

  /**
   * Verify Google ID token and extract user information
   * @param idToken - The ID token from Google Sign-In
   * @returns Verified user information
   * @throws Error if token is invalid
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: [
          process.env.GOOGLE_CLIENT_ID_ANDROID,
          process.env.GOOGLE_CLIENT_ID_IOS,
          process.env.GOOGLE_CLIENT_ID_WEB
        ].filter(Boolean) as string[]
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid token payload');
      }

      if (!payload.email || !payload.sub) {
        throw new Error('Missing required user information');
      }

      logger.info('Google token verified', {
        googleId: payload.sub,
        email: payload.email
      });

      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified || false,
        name: payload.name || '',
        picture: payload.picture,
        givenName: payload.given_name,
        familyName: payload.family_name
      };
    } catch (error) {
      logger.error('Google token verification failed', { error });
      throw new Error('Invalid Google ID token');
    }
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
