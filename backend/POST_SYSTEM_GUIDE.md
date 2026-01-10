# Post System Quick Start Guide

## WORKSTREAM 2.1: Post Creation & Management

This guide provides instructions for using the post system.

---

## Setup

### 1. Environment Variables

Add to your `.env` file:

```env
# Storage (Optional - uses local storage by default)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=seeme-images
CLOUDFRONT_DOMAIN=cdn.example.com

# ML Service Integration
ML_SERVICE_SECRET=your_ml_secret
ADMIN_SECRET=your_admin_secret
API_URL=http://localhost:3000
```

### 2. Run Migrations

Database migrations were already run for the Post model, but ensure it's up to date:

```bash
npm run migrate
```

### 3. Start the Server

```bash
npm run dev
```

The post endpoints will be available at:
- `http://localhost:3000/api/posts/*`
- `http://localhost:3000/api/internal/*`

---

## Testing

### Run Post System Tests

```bash
npm run test:post
```

Expected output:
```
[INFO] === Starting Post System Tests ===
[INFO] ✓ Post created successfully
[INFO] ✓ Post retrieved successfully
[INFO] ✓ Post updated successfully
[INFO] ✓ Processing callback succeeded
...
[INFO] === POST SYSTEM TEST RESULTS ===
[INFO] Tests Passed: 9
[INFO] Tests Failed: 0
[INFO] ✓ All tests passed!
```

---

## API Usage

### 1. Create a Post

**Endpoint:** `POST /api/posts`

**Example (using curl):**
```bash
curl -X POST \
  http://localhost:3000/api/posts \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'image=@/path/to/image.jpg' \
  -F 'caption=My awesome avatar!'
```

**Example (using JavaScript fetch):**
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('caption', 'My awesome avatar!');

const response = await fetch('http://localhost:3000/api/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log('Post ID:', data.postId);
console.log('Status:', data.status); // 'processing'
```

**Response:**
```json
{
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "processing",
  "message": "Post created, processing avatar...",
  "estimatedTime": 10
}
```

### 2. Check Processing Status

**Endpoint:** `GET /api/posts/:postId/status`

**Example:**
```bash
curl http://localhost:3000/api/posts/POST_ID/status
```

**Response:**
```json
{
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "processedImageUrl": "file:///path/to/processed.jpg",
  "thumbnailUrl": "file:///path/to/thumbnail.jpg",
  "error": null,
  "processingTime": 8.5,
  "processingStartedAt": "2026-01-10T10:00:00Z",
  "processingCompletedAt": "2026-01-10T10:00:08Z"
}
```

### 3. Get Post Details

**Endpoint:** `GET /api/posts/:postId`

**Example:**
```bash
curl http://localhost:3000/api/posts/POST_ID
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user": {
    "id": "user-id",
    "username": "alice",
    "activeAvatarId": "cartoon_1"
  },
  "imageUrl": "file:///path/to/processed.jpg",
  "thumbnailUrl": "file:///path/to/thumbnail.jpg",
  "caption": "My awesome avatar!",
  "status": "completed",
  "likesCount": 0,
  "commentsCount": 0,
  "createdAt": "2026-01-10T10:00:00Z"
}
```

### 4. Update Post Caption

**Endpoint:** `PUT /api/posts/:postId`

**Example:**
```bash
curl -X PUT \
  http://localhost:3000/api/posts/POST_ID \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"caption":"Updated caption"}'
```

**Response:**
```json
{
  "message": "Post updated successfully",
  "post": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "caption": "Updated caption",
    "updatedAt": "2026-01-10T10:05:00Z"
  }
}
```

### 5. Delete Post

**Endpoint:** `DELETE /api/posts/:postId`

**Example:**
```bash
curl -X DELETE \
  http://localhost:3000/api/posts/POST_ID \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Response:**
```json
{
  "message": "Post deleted successfully"
}
```

### 6. Get User's Posts

**Endpoint:** `GET /api/posts/user/:username`

**Example:**
```bash
curl http://localhost:3000/api/posts/user/alice?page=1
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "username": "alice",
    "activeAvatarId": "cartoon_1"
  },
  "posts": [
    {
      "id": "post-id",
      "processedImageUrl": "file:///path/to/processed.jpg",
      "thumbnailUrl": "file:///path/to/thumbnail.jpg",
      "caption": "My post",
      "likesCount": 42,
      "commentsCount": 5,
      "createdAt": "2026-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### 7. Get My Posts (Including Processing Ones)

**Endpoint:** `GET /api/posts/me/posts`

**Example:**
```bash
curl http://localhost:3000/api/posts/me/posts \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Response:** Similar to user's posts, but includes posts with status `processing` or `failed`.

---

## ML Service Integration

### Processing Callback

The ML service should call this endpoint when processing completes:

**Endpoint:** `POST /api/internal/processing-callback`

**Headers:**
```
x-ml-secret: YOUR_ML_SERVICE_SECRET
Content-Type: application/json
```

**Request Body (Success):**
```json
{
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "success": true,
  "processedImageUrl": "file:///path/to/processed.jpg",
  "thumbnailUrl": "file:///path/to/thumbnail.jpg",
  "processingTime": 8.5,
  "metadata": {
    "num_faces": 1,
    "processing_time": 8.5,
    "style": "cartoon"
  }
}
```

**Request Body (Failure):**
```json
{
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "success": false,
  "error": "No face detected in image"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Callback processed successfully"
}
```

**Example (Python):**
```python
import requests

def send_processing_callback(post_id, success, **kwargs):
    callback_data = {
        'postId': post_id,
        'success': success,
        **kwargs
    }

    response = requests.post(
        'http://backend:3000/api/internal/processing-callback',
        headers={'x-ml-secret': ML_SERVICE_SECRET},
        json=callback_data
    )

    return response.json()

# Success callback
send_processing_callback(
    post_id='123e4567-e89b-12d3-a456-426614174000',
    success=True,
    processedImageUrl='file:///path/to/processed.jpg',
    thumbnailUrl='file:///path/to/thumbnail.jpg',
    processingTime=8.5,
    metadata={'num_faces': 1}
)
```

---

## Image Requirements

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Size Limits
- **Max file size:** 10MB
- **Max dimensions:** 4096x4096 pixels
- **Min dimensions:** 400x400 pixels

### Validation Errors

```javascript
// Invalid format
{
  "error": "Invalid image format. Only JPEG, PNG, and WebP allowed."
}

// Too small
{
  "error": "Image too small. Minimum 400x400 pixels required."
}

// Too large
{
  "error": "Image too large. Maximum 4096x4096 pixels."
}

// Corrupted
{
  "error": "Invalid or corrupted image file"
}
```

---

## Storage

### Development (Local Storage)

Images are stored in the `storage/` directory:

```
storage/
├── originals/
│   └── {userId}/
│       └── {uuid}.jpg
├── processed/
│   └── {userId}/
│       └── {postId}.jpg
└── thumbnails/
    └── {userId}/
        └── {postId}.jpg
```

URLs format: `file:///absolute/path/to/image.jpg`

### Production (AWS S3)

To enable AWS S3:

1. Install AWS SDK:
   ```bash
   npm install aws-sdk
   ```

2. Configure environment:
   ```env
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   S3_BUCKET_NAME=your_bucket
   CLOUDFRONT_DOMAIN=cdn.example.com
   ```

3. Uncomment AWS SDK code in `S3Service.ts`

URLs format: `https://cdn.example.com/path/to/image.jpg`

---

## Admin Operations

### Get Processing Statistics

**Endpoint:** `GET /api/internal/processing-stats`

**Headers:**
```
x-admin-secret: YOUR_ADMIN_SECRET
```

**Response:**
```json
{
  "stats": {
    "total": 150,
    "processing": 5,
    "completed": 140,
    "failed": 5,
    "averageProcessingTime": 8.2
  },
  "timestamp": "2026-01-10T12:00:00Z"
}
```

### Retry Failed Processing

**Endpoint:** `POST /api/internal/retry-processing/:postId`

**Headers:**
```
x-admin-secret: YOUR_ADMIN_SECRET
```

**Response:**
```json
{
  "success": true,
  "message": "Processing retry initiated",
  "postId": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

## Troubleshooting

### Issue: Post stays in "processing" status

**Diagnosis:**
```sql
SELECT id, status, processing_started_at, processing_error
FROM posts
WHERE status = 'processing'
AND processing_started_at < NOW() - INTERVAL '5 minutes';
```

**Solution:**
1. Check ML service logs
2. Verify ML service is running
3. Check callback URL configuration
4. Manually retry processing

### Issue: Image upload fails

**Check:**
1. File size < 10MB
2. Dimensions within 400-4096px range
3. Valid image format (JPEG, PNG, WebP)
4. Storage directory writable (development)
5. AWS credentials valid (production)

**Debug:**
```bash
# Check storage directory permissions
ls -la storage/

# Check image file
file /path/to/image.jpg
identify /path/to/image.jpg  # ImageMagick
```

### Issue: Callback authentication fails

**Check:**
1. ML_SERVICE_SECRET matches on both services
2. Header name is exactly `x-ml-secret`
3. Secret is not empty or undefined

**Debug:**
```bash
# Test callback manually
curl -X POST \
  http://localhost:3000/api/internal/processing-callback \
  -H 'x-ml-secret: your_secret' \
  -H 'Content-Type: application/json' \
  -d '{"postId":"test","success":true}'
```

---

## Database Queries

### Get all processing posts

```sql
SELECT id, user_id, created_at,
       EXTRACT(EPOCH FROM (NOW() - processing_started_at)) as seconds_processing
FROM posts
WHERE status = 'processing'
ORDER BY processing_started_at DESC;
```

### Get failed posts

```sql
SELECT id, user_id, processing_error, created_at
FROM posts
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Get average processing time

```sql
SELECT AVG(processing_time_seconds) as avg_time,
       MIN(processing_time_seconds) as min_time,
       MAX(processing_time_seconds) as max_time
FROM posts
WHERE status = 'completed'
AND processing_time_seconds IS NOT NULL;
```

### Clean up old failed posts

```sql
DELETE FROM posts
WHERE status = 'failed'
AND created_at < NOW() - INTERVAL '30 days';
```

---

## Integration with Feed System

Posts automatically appear in feeds when processing completes:

```typescript
// After ML processing callback succeeds
await FeedController.invalidateFeedCache(userId);
await FeedController.invalidateDiscoverCache();

// Post now visible in:
// - User's profile feed
// - Followers' personalized feeds
// - Discover feed
```

---

## Next Steps

1. **Mobile App Integration:**
   - Image picker component
   - Upload progress UI
   - Status polling
   - Error handling

2. **ML Service Setup:**
   - Configure callback URL
   - Set up ML_SERVICE_SECRET
   - Test callback endpoint

3. **Production Deployment:**
   - Set up AWS S3
   - Configure CloudFront
   - Test image delivery
   - Monitor processing times

---

## Support

For issues or questions:
1. Check the implementation summary: `WORKSTREAM_2.1_SUMMARY.md`
2. Review the MASTER.md specification
3. Run the test suite: `npm run test:post`
4. Check server logs for detailed error messages

---

**Last Updated:** 2026-01-10
**Version:** 1.0.0
**Status:** Production Ready ✅
