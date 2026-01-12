# SeeMe Chat - Quick Start Guide
**Get Testing in 5 Minutes!**

---

## ⚡ Prerequisites Check

### Required Services
Run these commands to check:

```bash
# Check Node.js (need 18+)
node --version

# Check Redis (must be running)
redis-cli ping
# Should return: PONG

# If Redis not running:
# Windows: Start Redis service from Services app
# Mac: brew services start redis
# Linux: sudo systemctl start redis
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

**Wait for:**
```
✅ Server running on 0.0.0.0:3000
✅ Socket.io initialized
```

---

### Step 2: Start Mobile App (Terminal 2)

```bash
cd mobile
npm start
```

**Wait for QR code, then:**
- **Scan with Expo Go app** (on your phone), OR
- **Press 'a'** for Android emulator, OR
- **Press 'i'** for iOS simulator

---

### Step 3: Create Test Users

**On Device 1 (or first emulator):**
1. Tap "Register"
2. Username: `alice`
3. Email: `alice@test.com`
4. Password: `Test123!@#`
5. Tap "Register"

**On Device 2 (or second emulator/browser):**
1. Tap "Register"
2. Username: `bob`
3. Email: `bob@test.com`
4. Password: `Test123!@#`
5. Tap "Register"

---

## 💬 Start Chatting!

### Method 1: Create Conversation via API

**Terminal 3:**

```bash
# Login as alice and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@test.com\",\"password\":\"Test123!@#\"}"
```

**Copy the token from response**, then:

```bash
# Get bob's user ID (first get alice's profile to confirm token works)
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Find bob in the users list**, copy his `id`, then:

```bash
# Create conversation between alice and bob
curl -X POST http://localhost:3000/api/chat/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"otherUserId\":\"BOBS_USER_ID_HERE\"}"
```

### Method 2: Use Helper Script

Create this file: `backend/create-test-conversation.js`

```javascript
const axios = require('axios');

async function createTestConversation() {
  const API = 'http://localhost:3000/api';

  // Login alice
  const aliceAuth = await axios.post(`${API}/auth/login`, {
    email: 'alice@test.com',
    password: 'Test123!@#'
  });
  const aliceToken = aliceAuth.data.token;

  // Login bob
  const bobAuth = await axios.post(`${API}/auth/login`, {
    email: 'bob@test.com',
    password: 'Test123!@#'
  });
  const bobId = bobAuth.data.user.id;

  // Create conversation
  const conv = await axios.post(`${API}/chat/conversations`,
    { otherUserId: bobId },
    { headers: { Authorization: `Bearer ${aliceToken}` } }
  );

  console.log('✅ Conversation created:', conv.data.conversation.id);
}

createTestConversation().catch(console.error);
```

Run: `node backend/create-test-conversation.js`

---

## 📱 Test the Chat

**On both devices:**
1. Tap "Messages" tab (bottom nav)
2. Pull down to refresh
3. See the conversation appear!
4. Tap to open
5. Send messages back and forth

**Features to test:**
- ✅ Send messages
- ✅ Real-time delivery
- ✅ Typing indicators
- ✅ Read receipts (checkmarks)
- ✅ Unread badges

---

## 🔍 Check Backend Logs

**Terminal 1** should show:
```
[INFO] User connected via Socket.io { userId: '...', socketId: '...' }
[DEBUG] Sending message { userId: '...', conversationId: '...', ... }
```

---

## ❌ Troubleshooting

### Backend won't start

**Check Redis:**
```bash
redis-cli ping
```
If fails: Start Redis service

**Check MongoDB:**
MongoDB is required. If connection fails, check `.env` MONGODB_URI

### Can't see conversations

**Pull to refresh** on Messages screen

### Messages not sending

**Check Socket connection** in backend logs:
- Should see "User connected via Socket.io"
- If not, check firewall/network

### Mobile app won't connect

**Update IP address** in:
- `mobile/src/services/api.ts` (line 4-6)
- `mobile/src/services/socket.ts` (line 5-7)

**Find your IP:**
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

---

## 📚 Full Testing Guide

See **MANUAL_TESTING_GUIDE.md** for complete test scenarios

---

## 🎉 You're Ready!

Happy Testing! 🚀

For issues, check:
- Backend logs (Terminal 1)
- Mobile logs (Terminal 2)
- Network connectivity
- Redis/MongoDB running
