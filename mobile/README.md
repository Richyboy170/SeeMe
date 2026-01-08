# SeeMe Mobile Application

React Native + Expo mobile application for iOS and Android.

## Tech Stack
- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript
- **Navigation:** React Navigation (Stack + Bottom Tabs)
- **State Management:** React Hooks + AsyncStorage
- **API Client:** Axios
- **Image Handling:** expo-image-picker

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- For iOS: macOS with Xcode (or use Expo Go app)
- For Android: Android Studio with emulator (or use Expo Go app)
- Expo CLI (installed automatically with npx)

## Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

## Running the App

### Development Server

Start the Expo development server:
```bash
npx expo start
```

This will open the Expo DevTools in your browser with a QR code.

### Running on Devices

**Option 1: Expo Go (Easiest)**
- Install Expo Go app from App Store (iOS) or Play Store (Android)
- Scan the QR code from the terminal with your phone

**Option 2: iOS Simulator (macOS only)**
```bash
npx expo start --ios
```

**Option 3: Android Emulator**
```bash
npx expo start --android
```

**Option 4: Web Browser**
```bash
npx expo start --web
```

## Project Structure

```
mobile/
├── App.tsx                     # Root component
├── app.json                    # Expo configuration
├── src/
│   ├── navigation/
│   │   └── index.tsx          # Navigation structure (Auth/Main flow)
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   └── main/
│   │       ├── FeedScreen.tsx
│   │       ├── CreatePostScreen.tsx
│   │       └── ProfileScreen.tsx
│   ├── services/
│   │   └── api.ts             # API client with Axios
│   └── types/                 # TypeScript type definitions
├── assets/                     # Images, fonts, etc.
└── package.json
```

## Features Implemented (WORKSTREAM 0.4)

### Task 0.4.1: React Native Project Setup ✅
- Expo project with TypeScript
- All required dependencies installed
- App configuration for iOS/Android
- Camera and photo library permissions configured

### Task 0.4.2: Navigation Structure ✅
- Stack navigator for auth flow (Login/Register)
- Bottom tab navigator for main app (Feed/CreatePost/Profile)
- Auth state management with AsyncStorage
- Automatic navigation based on authentication status

### Task 0.4.3: API Client Setup ✅
- Axios instance with base URL configuration
- Request interceptor for automatic token injection
- Response interceptor for error handling
- Token management with AsyncStorage
- Methods: register, login, logout, getFeed, createPost, getProfile

### Task 0.4.4: Basic Screens Skeleton ✅
- **Login Screen:** Email/password form with validation
- **Register Screen:** Username/email/password form
- **Feed Screen:** List view with pull-to-refresh
- **Create Post Screen:** Image picker + caption input
- **Profile Screen:** User info + logout functionality

## API Configuration

The app connects to the backend API:
- **Development:** `http://localhost:3000/api`
- **Production:** `https://api.seeme.app/api`

The environment is automatically detected using `__DEV__` flag.

## Environment Variables

No environment file needed for this phase. API URLs are configured in:
- `src/services/api.ts`

## Key Dependencies

```json
{
  "@react-navigation/native": "^7.0.x",
  "@react-navigation/stack": "^7.0.x",
  "@react-navigation/bottom-tabs": "^7.0.x",
  "@react-native-async-storage/async-storage": "^2.0.x",
  "axios": "^1.7.x",
  "expo-image-picker": "^16.0.x",
  "react-native-screens": "^4.5.x",
  "react-native-safe-area-context": "^5.0.x"
}
```

## Development Commands

```bash
# Start development server
npx expo start

# Start with cache cleared
npx expo start --clear

# Type checking
npx tsc --noEmit

# Install new dependency (SDK compatible)
npx expo install <package-name>
```

## Quality Checks ✅

All WORKSTREAM 0.4 quality checks passing:

- [x] Expo project initialized with TypeScript
- [x] Project runs without errors
- [x] Navigation library installed and configured
- [x] Environment variables configured
- [x] Stack navigator working
- [x] Tab navigator for main app
- [x] Auth flow separate from main app
- [x] Axios instance configured
- [x] Request/response interceptors working
- [x] Token management implemented
- [x] All screens created with basic UI
- [x] Consistent design tokens
- [x] No TypeScript compilation errors
- [x] Hot reload works

## Next Steps (Future Workstreams)

1. **Backend Integration:** Connect to real API endpoints
2. **State Management:** Add React Query for data fetching
3. **UI Enhancement:** Implement final designs
4. **Image Processing:** Integrate with ML service
5. **Real-time Features:** WebSocket support for notifications
6. **Testing:** Unit tests and E2E tests

## Troubleshooting

**Port already in use:**
```bash
npx expo start --port 8081
```

**Metro bundler issues:**
```bash
npx expo start --clear
```

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**iOS build issues:**
```bash
cd ios && pod install && cd ..
```

## Version Information

- **Expo SDK:** 54.0.x
- **React Native:** 0.76.x
- **TypeScript:** 5.3.x
- **Node:** 18+

## Status

**WORKSTREAM 0.4: COMPLETE** ✅

All tasks completed successfully. The mobile app skeleton is ready for backend integration and feature development.
