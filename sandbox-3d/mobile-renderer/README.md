# Mobile 3D Renderer - Sandbox

React Native app for testing VRM avatar rendering with pose application.

## Setup

```bash
npm install
npx expo start
```

## Requirements

- CV Service running at http://localhost:8001
- VRM model URL (default uses sample from Glitch CDN)

## Features

- VRM model loading with progress indicator
- Pose application with smoothing
- Test poses (T-pose, Wave, Arms Up)
- Image-to-pose processing via CV Service
- Real-time API health checking

## Testing

1. Start the CV Service first: `cd ../cv-service && python main.py`
2. Start this app: `npx expo start`
3. Use test poses or pick an image to extract pose
