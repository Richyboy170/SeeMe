import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required for web-based OAuth
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Configuration
// IMPORTANT: Replace these with your actual Google Cloud Console client IDs
// WARNING: Google Sign-In will NOT work until you replace the placeholder values below
// Get your OAuth credentials from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CONFIG = {
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com', // TODO: Replace with actual Android Client ID
  iosClientId: '20449660740-db3e4niq4dn79524sjgmltp51fv0fabd.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // TODO: Replace with actual Web Client ID
};

export interface GoogleSignInResult {
  idToken: string;
  user: {
    email: string;
    name: string;
    photo?: string;
  };
}

/**
 * Hook to handle Google Sign-In flow
 * Returns request, response, and promptAsync function
 */
export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CONFIG.webClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
  });

  return {
    request,
    response,
    promptAsync,
  };
}

/**
 * Extract ID token from Google auth response
 * @param response - The OAuth response from Google
 * @returns ID token string or null if not available
 */
export function extractGoogleIdToken(response: any): string | null {
  if (response?.type === 'success' && response.params.id_token) {
    return response.params.id_token;
  }
  return null;
}
