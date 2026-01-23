# AI Avatar System Implementation Plan

## Current State Analysis

### What's Already Implemented (ML Service)
The core ML pipeline is **complete** but **not integrated** with the app:

1. **WORKSTREAM 1.1: Face Detection & Segmentation** - COMPLETE
   - MediaPipe Face Detection (50-100ms)
   - BiSeNet Face Parsing (19-class segmentation)
   - Face Region Extraction with feathered masks

2. **WORKSTREAM 1.2: Structure Extraction** - COMPLETE
   - MiDaS Depth Estimation
   - Normal Map Generation
   - Multi-scale Edge Detection

3. **WORKSTREAM 1.3: Avatar Style System** - COMPLETE
   - 3 styles: Cartoon, Anime, Minimalist
   - Region-based style application
   - Color palette mapping, texture smoothing, shading
   - Total pipeline: ~2-4 seconds per image

### What's Missing (The Gap)
The mobile app's photo upload flow **does not use the ML service**:
- Users currently create manual avatar customizations (wrong approach)
- Photos uploaded to posts are NOT processed through the ML pipeline
- No integration between backend and ML service for real-time processing

---

## Implementation Plan

### Phase 1: Backend-ML Service Integration

#### Task 1.1: Set Up ML Service Communication
**Files to create/modify:**
- `backend/src/services/MLService.ts` (new)
- `backend/src/config/index.ts`

**Work:**
- Create MLService wrapper to communicate with the Python ML service
- Configure ML service URL endpoint (default: http://localhost:8000)
- Implement HTTP client for ML service API calls
- Add timeout handling and error recovery

#### Task 1.2: Update Post Creation Flow
**Files to modify:**
- `backend/src/controllers/FeedController.ts`
- `backend/src/models/Post.ts` (add processing status fields)

**Work:**
- When a post with an image is created:
  1. Save original image
  2. Call ML service to process the image
  3. Store processed (avatarized) image URL
  4. Update post status from 'processing' to 'ready'
- Add `processingStatus` field: 'pending' | 'processing' | 'completed' | 'failed'
- Add `processedImageUrl` field for avatarized image

#### Task 1.3: ML Service Callback Route
**Files to create/modify:**
- `backend/src/routes/processing.ts` (new)
- `backend/src/index.ts`

**Work:**
- Create callback endpoint for ML service to report completion
- Handle processing results (success/failure)
- Update post record with processed image URL

---

### Phase 2: User Avatar Style Selection

#### Task 2.1: Store User's Preferred Style
**Files to modify:**
- `backend/src/models/User.ts`
- `backend/src/controllers/UserController.ts`
- `backend/src/routes/users.ts`

**Work:**
- Add `avatarStyle` field to User model: 'cartoon' | 'anime' | 'minimalist'
- Default to 'cartoon' for new users
- Create endpoint to update style preference: `PATCH /api/users/avatar-style`

#### Task 2.2: Mobile App Style Selection Screen
**Files to create/modify:**
- `mobile/src/screens/main/AvatarStyleScreen.tsx` (new - replaces AvatarCustomizationScreen)
- `mobile/src/navigation/index.tsx`
- `mobile/src/services/api.ts`

**Work:**
- Create style selection screen with previews of each style
- Show sample avatar for each style (cartoon, anime, minimalist)
- Allow user to select and save their preferred style
- Update navigation to include new screen in settings

---

### Phase 3: Image Processing Integration

#### Task 3.1: Profile Photo Processing
**Files to modify:**
- `backend/src/controllers/UserController.ts`
- `mobile/src/screens/main/ProfileScreen.tsx`

**Work:**
- When user uploads a profile photo:
  1. Send to ML service for processing
  2. Apply user's selected style
  3. Store avatarized version as profile image
- Display processed avatar in profile

#### Task 3.2: Post Image Processing
**Files to modify:**
- `backend/src/controllers/FeedController.ts`
- `mobile/src/screens/main/CreatePostScreen.tsx`
- `mobile/src/screens/main/FeedScreen.tsx`

**Work:**
- Modify post creation to process images through ML pipeline
- Show loading indicator while image is being processed
- Display processed (avatarized) image in feed
- Handle processing failures gracefully

#### Task 3.3: Chat Image Processing
**Files to modify:**
- `backend/src/services/ChatService.ts`
- `mobile/src/screens/chat/ChatScreen.tsx`

**Work:**
- Process images sent in chat messages
- Apply sender's avatar style to images
- Display processed images in chat

---

### Phase 4: Processing Status & Feedback

#### Task 4.1: Real-time Processing Status
**Files to create/modify:**
- `mobile/src/hooks/useProcessingStatus.ts` (new)
- `mobile/src/components/ProcessingIndicator.tsx` (new)

**Work:**
- Show progress indicator in mobile app during processing
- Poll for status or use WebSocket for real-time updates
- Update UI when processing completes

#### Task 4.2: Error Handling & Retry
**Files to modify:**
- `backend/src/services/MLService.ts`

**Work:**
- Handle ML service failures
- Implement retry logic for transient errors
- Show user-friendly error messages
- Allow manual retry for failed processing

---

### Phase 5: Cleanup Legacy Avatar System

#### Task 5.1: Remove Manual Avatar Customization
**Files to remove/modify:**
- `mobile/src/screens/main/AvatarCustomizationScreen.tsx` (convert to style selection only)
- `backend/src/controllers/AvatarController.ts` (simplify)
- `backend/src/models/AvatarConfigSQL.ts` (simplify to just style preference)

**Work:**
- Remove manual avatar customization features (skin tone picker, eye color, etc.)
- Keep only style selection (cartoon/anime/minimalist)
- Simplify avatar storage to just style preference + processed image URLs

---

## Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│  Node.js API    │────▶│ Python ML Svc   │
│                 │     │                 │     │                 │
│ - Upload Photo  │     │ - Store Original│     │ - Face Detect   │
│ - Show Progress │     │ - Call ML API   │     │ - Segmentation  │
│ - Display Avatar│     │ - Handle Result │     │ - Style Transfer│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   PostgreSQL    │     │  File Storage   │
                        │ - User data     │     │ - Original imgs │
                        │ - Posts         │     │ - Processed imgs│
                        │ - Style prefs   │     │                 │
                        └─────────────────┘     └─────────────────┘
```

---

## Image Processing Flow

```
1. User Takes/Selects Photo
        │
        ▼
2. Mobile App Uploads to Backend
        │
        ▼
3. Backend Saves Original Image
        │
        ▼
4. Backend Calls ML Service API
   POST http://localhost:8000/api/face/process
   - file: [image]
   - user_id: [user_id]
   - style_name: [user's preferred style]
        │
        ▼
5. ML Service Processes Image (~2-4s)
   - Face Detection (MediaPipe)
   - Face Parsing (BiSeNet)
   - Depth & Edge Extraction
   - Style Transfer (cartoon/anime/minimalist)
        │
        ▼
6. ML Service Returns Processed Image
        │
        ▼
7. Backend Saves Processed Image
        │
        ▼
8. Backend Updates Post/Profile Record
   - processedImageUrl: [new URL]
   - processingStatus: 'completed'
        │
        ▼
9. Mobile App Displays Avatarized Image
```

---

## Priority Order

1. **Phase 1** - Backend-ML Integration (Critical foundation)
2. **Phase 2** - User Style Selection (User experience)
3. **Phase 3** - Image Processing Integration (Core feature)
4. **Phase 4** - Processing Status (Polish)
5. **Phase 5** - Cleanup (Technical debt)

---

## Dependencies

- ML Service must be running at http://localhost:8000 (or configured URL)
- BiSeNet pretrained model weights must be downloaded
- Storage configured for both original and processed images

---

## Files Summary

### New Files to Create
1. `backend/src/services/MLService.ts` - ML service client wrapper
2. `backend/src/routes/processing.ts` - Processing callback routes
3. `mobile/src/screens/main/AvatarStyleScreen.tsx` - Style selection UI
4. `mobile/src/hooks/useProcessingStatus.ts` - Processing status hook
5. `mobile/src/components/ProcessingIndicator.tsx` - Loading UI

### Files to Modify
1. `backend/src/models/User.ts` - Add avatarStyle field
2. `backend/src/models/Post.ts` - Add processingStatus, processedImageUrl
3. `backend/src/controllers/FeedController.ts` - ML processing integration
4. `backend/src/controllers/UserController.ts` - Style preference APIs
5. `backend/src/routes/users.ts` - New style endpoint
6. `backend/src/index.ts` - Register new routes
7. `mobile/src/screens/main/CreatePostScreen.tsx` - Processing flow
8. `mobile/src/screens/main/FeedScreen.tsx` - Display processed images
9. `mobile/src/screens/main/ProfileScreen.tsx` - Profile avatar processing
10. `mobile/src/services/api.ts` - New API methods

### Files to Remove/Simplify
1. `mobile/src/screens/main/AvatarCustomizationScreen.tsx` - Convert to style selection
2. `backend/src/controllers/AvatarController.ts` - Simplify
3. `mobile/src/components/AvatarRenderer.tsx` - May be unnecessary

---

## Success Criteria

- [ ] User uploads photo → ML service processes it → Avatarized image displayed
- [ ] User can select avatar style (cartoon/anime/minimalist)
- [ ] All posts show avatarized faces, not real faces
- [ ] Profile photo shows avatarized version
- [ ] Processing completes within 5 seconds
- [ ] Facial expressions are preserved in avatarized output (>90% accuracy)
- [ ] Manual avatar customization removed (skin tone picker, etc.)
