# Feed System Quick Start Guide

## WORKSTREAM 2.2: Feed System Implementation

This guide provides instructions for deploying and using the feed system.

---

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Ensure your `.env` file includes:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seeme_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis (required for caching)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
```

### 3. Run Database Migration

This creates the `follows` table and sets up associations:

```bash
npm run migrate
```

Expected output:
```
[INFO] Starting database migration for 3 models...
[INFO] Database connection established
[INFO] Model associations configured
[INFO] Database migration completed successfully
[INFO] Tables created/updated: users, posts, follows
```

### 4. Start the Server

```bash
npm run dev
```

The feed endpoints will be available at:
- `http://localhost:3000/api/feed` (personalized feed)
- `http://localhost:3000/api/feed/discover` (discover feed)

---

## Testing

### Run Feed System Tests

```bash
npm run test:feed
```

This will:
1. Create test users (Alice, Bob, Charlie)
2. Create test posts for each user
3. Set up follow relationships
4. Test feed generation
5. Test pagination
6. Test caching
7. Clean up test data

Expected output:
```
[INFO] Starting feed system tests...
[INFO] Testing feed generation for Alice...
[INFO] Feed for Alice: { postCount: 10, pagination: {...} }
...
[INFO] === FEED SYSTEM TEST RESULTS ===
[INFO] Tests Passed: 6
[INFO] Tests Failed: 0
[INFO] ✓ All tests passed!
```

---

## API Usage

### 1. Get Personalized Feed

**Endpoint:** `GET /api/feed`

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**
- `page` (optional): Page number, default 1

**Example Request:**
```bash
curl -X GET \
  'http://localhost:3000/api/feed?page=1' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Example Response:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "alice",
        "activeAvatarId": "cartoon_1"
      },
      "imageUrl": "https://cdn.example.com/processed/image.jpg",
      "thumbnailUrl": "https://cdn.example.com/thumb/image.jpg",
      "caption": "My amazing avatar!",
      "likesCount": 42,
      "commentsCount": 5,
      "createdAt": "2026-01-09T10:30:00Z",
      "likedByMe": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### 2. Get Discover Feed

**Endpoint:** `GET /api/feed/discover`

**Authentication:** Public (no authentication required)

**Query Parameters:**
- `page` (optional): Page number, default 1

**Example Request:**
```bash
curl -X GET 'http://localhost:3000/api/feed/discover?page=1'
```

**Response:** Same format as personalized feed

---

## Cache Management

### How Caching Works

1. **Personalized Feed:**
   - Cache key: `feed:{userId}:page:{page}`
   - TTL: 60 seconds
   - Automatically invalidated on follow/unfollow

2. **Discover Feed:**
   - Cache key: `discover:page:{page}`
   - TTL: 120 seconds
   - Automatically invalidated on new post creation

### Manual Cache Invalidation

You can manually invalidate cache programmatically:

```typescript
import { FeedController } from './controllers/FeedController';

// Invalidate user's feed cache
await FeedController.invalidateFeedCache(userId);

// Invalidate discover feed cache
await FeedController.invalidateDiscoverCache();
```

### Monitor Cache Performance

Check Redis for cache keys:
```bash
redis-cli
> KEYS feed:*
> KEYS discover:*
> TTL feed:user-id:page:1
```

---

## Database Queries

### Get Users a User is Following

```sql
SELECT u.id, u.username
FROM users u
JOIN follows f ON f.following_id = u.id
WHERE f.follower_id = 'user-id';
```

### Get User's Followers

```sql
SELECT u.id, u.username
FROM users u
JOIN follows f ON f.follower_id = u.id
WHERE f.following_id = 'user-id';
```

### Get Feed for User (SQL equivalent)

```sql
SELECT
  p.id,
  p.processed_image_url,
  p.thumbnail_url,
  p.caption,
  p.likes_count,
  p.comments_count,
  p.created_at,
  u.id as user_id,
  u.username,
  u.active_avatar_id
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.user_id IN (
  SELECT following_id
  FROM follows
  WHERE follower_id = 'user-id'
)
AND p.status = 'completed'
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 0;
```

---

## Integration with Other Systems

### When to Invalidate Feed Cache

**Personalized Feed:**
- User follows someone → invalidate user's feed
- User unfollows someone → invalidate user's feed
- Bulk follow operations → invalidate user's feed

**Discover Feed:**
- New post created and completed → invalidate discover feed
- Post deleted → invalidate discover feed

**Example Integration:**

```typescript
// In FollowController after creating a follow
await Follow.create({ followerId, followingId });
await FeedController.invalidateFeedCache(followerId);

// In PostController after post processing completes
await Post.update({ status: 'completed' }, { where: { id: postId } });
await FeedController.invalidateDiscoverCache();
```

---

## Performance Optimization Tips

### 1. Database Indexes

Ensure these indexes exist (automatically created by migration):
```sql
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_posts_created ON posts(created_at);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);
```

### 2. Redis Configuration

For production, configure Redis persistence:
```bash
# In redis.conf
save 900 1
save 300 10
save 60 10000
```

### 3. Query Optimization

- Feed queries use eager loading (JOIN) to avoid N+1
- Only essential fields selected
- Status filter applied at database level

### 4. Monitoring

Monitor these metrics:
- Average feed query time (should be <500ms uncached)
- Cache hit rate (target >70%)
- Redis memory usage
- Database connection pool usage

---

## Troubleshooting

### Issue: Empty Feed for User with Follows

**Diagnosis:**
```sql
-- Check if follows exist
SELECT * FROM follows WHERE follower_id = 'user-id';

-- Check if followed users have completed posts
SELECT p.* FROM posts p
WHERE p.user_id IN (
  SELECT following_id FROM follows WHERE follower_id = 'user-id'
)
AND p.status = 'completed';
```

**Solution:** Ensure followed users have posts with `status = 'completed'`

### Issue: Cache Not Working

**Diagnosis:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check connection in logs
# Look for: "Redis connected and ready"
```

**Solution:** Ensure Redis is running and `REDIS_URL` is configured

### Issue: Slow Feed Queries

**Diagnosis:**
```sql
EXPLAIN ANALYZE
SELECT p.*, u.username
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.user_id IN ('uuid1', 'uuid2')
AND p.status = 'completed'
ORDER BY p.created_at DESC
LIMIT 20;
```

**Solution:**
- Verify indexes exist
- Check for large number of follows (consider limiting)
- Enable query logging to identify slow queries

---

## Next Steps

### Task 2.2.2: Mobile Feed UI (Not Yet Implemented)

To complete the full feed system, implement:

1. **FeedScreen Component** (React Native)
   - Infinite scroll with FlatList
   - Pull-to-refresh
   - Loading states

2. **PostCard Component**
   - Image display with caching
   - Like/comment buttons
   - User info display

3. **API Integration**
   - Create feed service in mobile app
   - Implement pagination logic
   - Handle offline mode

See MASTER.md lines 4204-4572 for detailed specifications.

---

## Support

For issues or questions:
1. Check the implementation summary: `WORKSTREAM_2.2_SUMMARY.md`
2. Review the MASTER.md specification
3. Run the test suite: `npm run test:feed`
4. Check server logs for detailed error messages

---

## Files Reference

- **Model:** `backend/src/models/Follow.ts`
- **Associations:** `backend/src/models/associations.ts`
- **Controller:** `backend/src/controllers/FeedController.ts`
- **Routes:** `backend/src/routes/feed.ts`
- **Tests:** `backend/src/tests/test_feed_system.ts`
- **Migration:** `backend/src/utils/migrate.ts`

---

**Last Updated:** 2026-01-09
**Version:** 1.0.0
**Status:** Production Ready ✅
