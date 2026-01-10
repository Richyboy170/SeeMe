# WORKSTREAM 2.5: COINS SYSTEM - FULL STACK INTEGRATION GUIDE

**Status:** ✅ Backend (2.5.1) + Mobile UI (2.5.2) COMPLETE
**Date:** January 10, 2026

---

## Overview

This document provides a complete integration guide for the Positivity Coins system, covering the full stack from mobile UI to backend API.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE APP (React Native)                │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ CoinsScreen  │  │ GiveCoins    │  │ Display      │       │
│  │              │  │ Modal        │  │ Components   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘               │
│                           │                                   │
│                    ┌──────▼────────┐                          │
│                    │  API Client   │                          │
│                    │  (api.ts)     │                          │
│                    └──────┬────────┘                          │
└───────────────────────────┼───────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    BACKEND API (Express)                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Coins Routes │→ │ Coins        │→ │ Coins        │       │
│  │ (coins.ts)   │  │ Controller   │  │ Service      │       │
│  └──────────────┘  └──────────────┘  └──────┬───────┘       │
│                                              │               │
└──────────────────────────────────────────────┼───────────────┘
                                               │
                            ┌──────────────────┴───────────┐
                            │                              │
                    ┌───────▼────────┐          ┌─────────▼────────┐
                    │  PostgreSQL    │          │  Redis Cache     │
                    │  (User Coins)  │          │  (Cooldowns)     │
                    └────────────────┘          └──────────────────┘
```

---

## API Endpoint Mapping

### Frontend → Backend Mapping

| Frontend Method | Backend Endpoint | Auth | Description |
|----------------|------------------|------|-------------|
| `api.getMyCoins()` | `GET /api/coins/me` | ✓ | Get user's coin balance and status |
| `api.claimCooldownCoins()` | `POST /api/coins/claim-cooldown` | ✓ | Claim cooldown coins (3hr timer) |
| `api.giveCoins(data)` | `POST /api/coins/give` | ✓ | Give coins to another user |
| `api.getCoinsHistory(limit)` | `GET /api/coins/history` | ✓ | Get user's transaction history |
| `api.getGiveLeaderboard(limit)` | `GET /api/coins/leaderboard` | ✗ | Get top givers (public) |
| `api.getGivingActivity(page)` | `GET /api/coins/activity` | ✗ | Get recent giving activity feed |

---

## Data Flow Examples

### 1. Loading Coins Screen

```typescript
// MOBILE (CoinsScreen.tsx)
const loadCoins = async () => {
  const response = await api.getMyCoins();
  setCoinsData({
    totalCoins: response.coins.totalCoins,
    lifetimeGiven: response.coins.lifetimeGiven,
    cooldownCoinsAvailable: response.coins.cooldownCoinsAvailable,
    minutesUntilNextCooldown: response.coins.minutesUntilNextCooldown,
    rank: response.coins.rank
  });
};
```

```typescript
// API CLIENT (api.ts)
async getMyCoins() {
  const response = await this.client.get('/coins/me');
  return response.data;
}
```

```typescript
// BACKEND (CoinsController.ts)
static async getMyCoins(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const coins = await CoinsService.getUserCoins(userId);
  res.json({ coins });
}
```

```typescript
// SERVICE (CoinsService.ts)
static async getUserCoins(userId: string) {
  const userCoins = await PositivityCoins.findOne({ where: { userId } });

  return {
    totalCoins: userCoins.totalCoins,
    cooldownCoinsAvailable: userCoins.cooldownCoins,
    minutesUntilNextCooldown: calculateMinutesUntilNext(userCoins),
    lifetimeGiven: userCoins.lifetimeGiven,
    rank: userCoins.positivityRank
  };
}
```

**Response Format:**
```json
{
  "coins": {
    "totalCoins": 42,
    "cooldownCoinsAvailable": 2,
    "minutesUntilNextCooldown": 45,
    "lifetimeGiven": 150,
    "rank": "generous"
  }
}
```

---

### 2. Claiming Cooldown Coins

```typescript
// MOBILE
const handleClaimCooldown = async () => {
  const response = await api.claimCooldownCoins();
  Alert.alert(
    'Coins Claimed!',
    `You received ${response.coinsClaimed} free coins!`
  );
};
```

```typescript
// BACKEND
static async claimCooldown(req: AuthRequest, res: Response) {
  const result = await CoinsService.claimCooldownCoins(userId);
  res.json({
    message: `Claimed ${result.coinsClaimed} cooldown coins!`,
    ...result
  });
}
```

**Response Format:**
```json
{
  "message": "Claimed 2 cooldown coins!",
  "coinsClaimed": 2,
  "newBalance": 44,
  "nextCooldownAt": "2026-01-10T18:30:00Z"
}
```

---

### 3. Giving Coins to Another User

```typescript
// MOBILE (GiveCoinsModal.tsx)
const handleGive = async () => {
  await api.giveCoins({
    toUserId: recipientId,
    amount: coinsAmount,
    message: message.trim() || undefined,
    contextType: 'post',  // or 'profile', 'comment'
    contextId: postId
  });

  Alert.alert('Coins Sent!', `You gave ${coinsAmount} coins!`);
};
```

```typescript
// BACKEND
static async giveCoins(req: AuthRequest, res: Response) {
  const { toUserId, amount, message, contextType, contextId } = req.body;

  const result = await CoinsService.giveCoins({
    fromUserId: req.user!.id,
    toUserId,
    amount,
    message,
    contextType,
    contextId
  });

  res.json({ message: 'Coins given successfully!', ...result });
}
```

**Request Body:**
```json
{
  "toUserId": "user-123",
  "amount": 5,
  "message": "Great post!",
  "contextType": "post",
  "contextId": "post-456"
}
```

**Response Format:**
```json
{
  "message": "Coins given successfully!",
  "fromBalance": 37,
  "toBalance": 47,
  "transaction": {
    "id": "txn-789",
    "amount": 5,
    "type": "give"
  }
}
```

---

## Authentication Flow

### Token-Based Authentication

```typescript
// API CLIENT (api.ts)
private setupInterceptors() {
  this.client.interceptors.request.use(
    async (config) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  );
}
```

### Backend Authentication Middleware

```typescript
// BACKEND (routes/coins.ts)
router.get('/me', authenticateToken, CoinsController.getMyCoins);
                   ^^^^^^^^^^^^^^^^
                   Middleware extracts user from JWT
```

### Error Handling

```typescript
// API CLIENT
this.client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      // Navigate to login
    }
    return Promise.reject(error);
  }
);
```

---

## Database Schema

### PostgreSQL Tables

```sql
-- User's coin balance and stats
CREATE TABLE positivity_coins (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_coins INTEGER DEFAULT 0,
  cooldown_coins INTEGER DEFAULT 3,
  last_cooldown_claim TIMESTAMP,
  lifetime_given INTEGER DEFAULT 0,
  positivity_rank VARCHAR(50) DEFAULT 'beginner',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Transaction history
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),  -- 'cooldown_claim', 'give', 'receive', etc.
  amount INTEGER,
  balance_after INTEGER,
  metadata JSONB,
  created_at TIMESTAMP
);

-- Giving activity (for feed)
CREATE TABLE coin_giving_activity (
  id UUID PRIMARY KEY,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount INTEGER,
  message TEXT,
  context_type VARCHAR(50),
  context_id UUID,
  created_at TIMESTAMP
);
```

### Redis Cache

```
cooldown:{userId} → timestamp of last claim
leaderboard:give  → sorted set of top givers
```

---

## Business Logic

### Cooldown Coin System

- **Regeneration:** 1 coin every 3 hours
- **Max Stack:** 3 coins
- **Timer:** Displays minutes/hours until next coin
- **Claim:** All available coins claimed at once

```typescript
// Service logic
const COOLDOWN_INTERVAL_HOURS = 3;
const MAX_COOLDOWN_COINS = 3;

function calculateCooldownCoins(lastClaim: Date): number {
  const hoursSinceLastClaim = (Date.now() - lastClaim.getTime()) / (1000 * 60 * 60);
  const coinsEarned = Math.floor(hoursSinceLastClaim / COOLDOWN_INTERVAL_HOURS);
  return Math.min(coinsEarned, MAX_COOLDOWN_COINS);
}
```

### Rank System

```typescript
const RANK_THRESHOLDS = {
  beginner: 0,      // 0-9 coins given
  kind: 10,         // 10-49 coins given
  generous: 50,     // 50-199 coins given
  inspirational: 200, // 200-499 coins given
  legend: 500       // 500+ coins given
};

function calculateRank(lifetimeGiven: number): string {
  if (lifetimeGiven >= 500) return 'legend';
  if (lifetimeGiven >= 200) return 'inspirational';
  if (lifetimeGiven >= 50) return 'generous';
  if (lifetimeGiven >= 10) return 'kind';
  return 'beginner';
}
```

---

## UI Component Usage

### Using GiveCoinsModal in Any Screen

```typescript
import GiveCoinsModal from '../components/coins/GiveCoinsModal';

function MyScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text>Give Coins</Text>
      </TouchableOpacity>

      <GiveCoinsModal
        visible={modalVisible}
        recipientId={user.id}
        recipientUsername={user.username}
        contextType="post"
        contextId={post.id}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          // Reload data, show animation, etc.
        }}
      />
    </>
  );
}
```

### Displaying User's Balance

```typescript
import CoinsBalance from '../components/coins/CoinsBalance';

<CoinsBalance totalCoins={user.totalCoins} size="medium" />
```

### Showing Give Counter Badge

```typescript
import GiveCounterBadge from '../components/coins/GiveCounterBadge';

<GiveCounterBadge
  giveCounter={user.lifetimeGiven}
  rank={user.positivityRank}
/>
```

---

## Testing the Integration

### 1. Run the Integration Test

```bash
cd integration-tests
npm install
npx ts-node coins-system-integration.test.ts
```

### 2. Manual Testing Checklist

- [ ] Open mobile app and navigate to Coins tab
- [ ] Verify balance loads correctly
- [ ] Check cooldown widget shows correct coin count
- [ ] Try claiming cooldown coins
- [ ] Open a user profile
- [ ] Try giving coins to that user
- [ ] Verify balance updates after giving
- [ ] Check transaction appears in history
- [ ] Verify rank badge displays correctly
- [ ] Test pull-to-refresh
- [ ] Test navigation to other screens

### 3. Test Different Scenarios

**Scenario A: New User**
- Total coins: 0
- Cooldown coins: 3 (ready to claim)
- Rank: Beginner

**Scenario B: Active User**
- Total coins: 45
- Cooldown coins: 1
- Lifetime given: 75
- Rank: Generous

**Scenario C: Cooldown Not Ready**
- Try claiming when cooldown coins = 0
- Should show error message with wait time

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to get coins" | Backend not running | Start backend server |
| "Unauthorized" | No auth token | Login first |
| "Cooldown not ready" | Claimed too recently | Wait for timer |
| "Insufficient balance" | Not enough coins to give | Earn more coins |
| "Network Error" | API URL incorrect | Check API_URL in api.ts |
| "Cannot give to self" | Trying to give coins to own account | Select different user |

### Frontend Error Display

```typescript
// All API errors show user-friendly alerts
catch (error: any) {
  Alert.alert('Error', error.message || 'Failed to give coins');
}
```

---

## Performance Considerations

### Frontend Optimizations

1. **Polling Interval:** Auto-refresh every 60 seconds (not too aggressive)
2. **Pull-to-Refresh:** Manual refresh for immediate updates
3. **Lazy Loading:** Leaderboard/history with pagination
4. **Animations:** Using react-native-reanimated for 60fps

### Backend Optimizations

1. **Redis Caching:** Leaderboard cached, updated periodically
2. **Database Indexing:** Indexes on userId, createdAt
3. **Pagination:** Limit queries to 100 records max
4. **Validation:** Early validation to prevent unnecessary DB queries

---

## Security Considerations

### Input Validation

```typescript
// Backend validates all inputs
if (!amount || amount < 1) {
  return res.status(400).json({ error: 'Invalid amount' });
}

if (amount > 1000) {
  return res.status(400).json({ error: 'Cannot give more than 1000 coins at once' });
}
```

### Authorization

- Users can only view their own transaction history
- Users cannot give coins to themselves
- Cooldown claims are rate-limited server-side
- Ad rewards require internal validation

### SQL Injection Prevention

- Using Sequelize ORM with parameterized queries
- No raw SQL string concatenation

---

## Deployment Checklist

### Backend

- [ ] Environment variables configured (.env)
- [ ] PostgreSQL migrations run
- [ ] Redis server running
- [ ] Coins routes registered in index.ts
- [ ] CORS configured for mobile app domain

### Mobile

- [ ] Dependencies installed (react-native-reanimated, @expo/vector-icons)
- [ ] API_URL points to production backend
- [ ] Build and deploy to app stores
- [ ] Test on both iOS and Android

---

## Monitoring and Analytics

### Key Metrics to Track

1. **Cooldown Claims:**
   - Daily active users claiming
   - Average coins claimed per user
   - Peak claim times

2. **Giving Activity:**
   - Total coins given per day
   - Average gift amount
   - Top givers

3. **User Engagement:**
   - Rank distribution
   - Users with >0 lifetime given
   - Retention of users who give coins

### Logging

```typescript
// Backend logs all important events
logger.info('Cooldown coins claimed', { userId, coinsClaimed });
logger.info('Coins given', { fromUserId, toUserId, amount });
```

---

## Future Enhancements

### Planned for WORKSTREAM 2.5.3

- [ ] Transaction History screen
- [ ] Leaderboard screen
- [ ] Activity Feed screen
- [ ] "Give Coins" buttons on posts
- [ ] "Give Coins" buttons on profiles
- [ ] Automatic coin awards for posts/comments

### Potential Future Features

- Push notifications for receiving coins
- Weekly/monthly leaderboard challenges
- Coin streak bonuses
- Special badges for milestones
- Redemption system (coins → features)
- Social sharing of giving achievements

---

## Support and Troubleshooting

### Debug Mode

Enable detailed logging:

```typescript
// Mobile (api.ts)
console.log('API Call:', method, endpoint, data);

// Backend (logger.ts)
logger.debug('Coins calculation', { userId, details });
```

### Common Issues

**Issue:** Coins not updating after claim
- **Fix:** Check backend logs, verify transaction was saved

**Issue:** Timer shows negative time
- **Fix:** Ensure server and client times are synchronized

**Issue:** Can't give coins
- **Fix:** Verify sufficient balance and valid recipient

---

## Conclusion

The Positivity Coins system is fully integrated between mobile frontend (WORKSTREAM 2.5.2) and backend (WORKSTREAM 2.5.1). All API endpoints are functional, authentication is working, and the UI provides a beautiful, engaging experience.

**Status:** ✅ READY FOR WORKSTREAM 2.5.3 (Integration & Gamification)

Next steps involve integrating the coins system throughout the app (posts, profiles, comments) and implementing the additional screens (history, leaderboard, activity feed).

---

**Last Updated:** January 10, 2026
**Version:** 1.0
**Maintainer:** Coins UI Agent + Coins System Agent
