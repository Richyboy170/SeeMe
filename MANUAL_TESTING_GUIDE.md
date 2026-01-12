# SeeMe Chat - Manual Testing Guide
**Version:** 1.0
**Date:** 2026-01-12
**Workstreams:** 2.6.1 (Backend) + 2.6.2 (Mobile UI)

---

## 📋 Pre-Testing Checklist

### Backend Requirements
- [ ] Node.js 18+ installed
- [ ] PostgreSQL or SQLite database configured
- [ ] MongoDB running
- [ ] Redis server running
- [ ] Environment variables configured (.env file)
- [ ] Backend dependencies installed (`npm install`)

### Mobile Requirements
- [ ] Expo CLI installed globally
- [ ] iOS Simulator or Android Emulator running, OR
- [ ] Physical device with Expo Go app installed
- [ ] Mobile dependencies installed (`npm install`)
- [ ] Mobile and backend on same network (if testing on physical device)

### Network Requirements
- [ ] Backend server IP: `192.168.2.35` (update if different)
- [ ] Port 3000 is open and accessible
- [ ] Firewall allows connections on port 3000

---

## 🚀 Step 1: Start the Backend Server

### Terminal 1: Start Backend

```bash
cd backend
npm run dev
```

**Expected Output:**
```
[INFO] Connecting to databases...
[INFO] Database connections established
[INFO] Socket.io initialized
[INFO] Server running on 0.0.0.0:3000
[INFO] Environment: development
[INFO] Health check available at http://0.0.0.0:3000/health
[INFO] Auth API available at http://0.0.0.0:3000/api/auth
[INFO] Socket.io available at ws://0.0.0.0:3000
```

**Troubleshooting:**
- If PostgreSQL fails, backend will fallback to SQLite
- If MongoDB fails, check connection string in `.env`
- If Redis fails, check Redis server is running: `redis-cli ping` should return `PONG`

### Verify Backend Health

Open browser: `http://localhost:3000/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-12T...",
  "uptime": 1.234,
  "environment": "development"
}
```

---

## 📱 Step 2: Start the Mobile App

### Update Mobile Configuration (if needed)

**File:** `mobile/src/services/api.ts`

If your computer's IP is different from `192.168.2.35`, update:

```typescript
export const API_URL = __DEV__
  ? 'http://YOUR_IP_HERE:3000/api'  // <-- Change this
  : 'https://api.seeme.app/api';
```

**File:** `mobile/src/services/socket.ts`

```typescript
const SOCKET_URL = __DEV__
  ? 'http://YOUR_IP_HERE:3000'  // <-- Change this
  : 'https://api.seeme.app';
```

**To find your IP:**
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

### Terminal 2: Start Mobile App

```bash
cd mobile
npm start
```

**Expected Output:**
```
› Metro waiting on exp://192.168.2.35:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### Connect Your Device

**Option A: Physical Device**
1. Install Expo Go app from App Store/Play Store
2. Scan the QR code with Expo Go (Android) or Camera (iOS)
3. Wait for app to load

**Option B: Emulator/Simulator**
1. Press `a` for Android emulator
2. Press `i` for iOS simulator
3. Wait for app to load

---

## 🧪 Step 3: Manual Test Scenarios

### Test Scenario 1: User Registration & Login

**Objective:** Create two test accounts for chat testing

#### Account 1: Create First User
1. Open app → Should show Login screen
2. Tap "Register" or "Sign Up"
3. Enter details:
   - Username: `testuser1`
   - Email: `test1@example.com`
   - Password: `Test123!@#`
4. Tap "Register"

**Expected Result:**
- ✅ Registration successful
- ✅ Automatically logged in
- ✅ Redirected to main app (Feed screen)
- ✅ Bottom navigation shows: Feed, Create Post, Messages, Coins, Profile

#### Account 2: Create Second User
1. **Logout first user** (Profile → Logout)
2. Tap "Register" on login screen
3. Enter details:
   - Username: `testuser2`
   - Email: `test2@example.com`
   - Password: `Test123!@#`
4. Tap "Register"

**Expected Result:**
- ✅ Registration successful
- ✅ Logged in as testuser2

**Pass Criteria:** Both accounts created successfully
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 2: Socket Connection

**Objective:** Verify Socket.IO connection establishes

#### Check Backend Logs

**Terminal 1 (Backend)** should show:
```
[INFO] User connected via Socket.io { userId: '...', socketId: '...' }
```

**Pass Criteria:** Socket connection logged for logged-in user
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 3: Navigate to Messages Screen

**Objective:** Access the chat interface

1. While logged in as testuser2
2. Tap **"Messages"** tab in bottom navigation

**Expected Result:**
- ✅ Messages screen opens
- ✅ Header shows "Messages"
- ✅ Empty state shows: "No conversations yet" and "Start chatting with your friends!"

**Pass Criteria:** Messages screen accessible and shows empty state
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 4: Create a Conversation (Manual)

**Objective:** Test conversation creation via API

Since we don't have a user search UI yet, we'll create a conversation via backend:

#### Option A: Using Backend API Directly

**Terminal 3: Get User IDs**
```bash
# Login as testuser1 to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"Test123!@#"}'
```

Copy the `token` from response.

**Get testuser2's ID:**
```bash
# Replace YOUR_TOKEN with token from above
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Copy `id` from response (this is testuser1's ID).

**Login as testuser2 and get ID:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"Test123!@#"}'
```

**Create conversation from testuser1 to testuser2:**
```bash
# Replace YOUR_TOKEN_TESTUSER1 and TESTUSER2_ID
curl -X POST http://localhost:3000/api/chat/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_TESTUSER1" \
  -d '{"otherUserId":"TESTUSER2_ID"}'
```

#### Option B: Quick Test (Recommended)

For faster testing, I'll create a test script.

**Pass Criteria:** Conversation created successfully
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 5: View Conversations List

**Objective:** Verify conversations appear in the list

1. **On testuser1's device:** Pull down to refresh Messages screen

**Expected Result:**
- ✅ Conversation appears in list
- ✅ Shows testuser2's username
- ✅ Shows avatar (or placeholder)
- ✅ No last message yet (just created)

2. **On testuser2's device:** Pull down to refresh Messages screen

**Expected Result:**
- ✅ Same conversation appears
- ✅ Shows testuser1's username

**Pass Criteria:** Both users see the conversation
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 6: Send First Message

**Objective:** Test real-time messaging

1. **On testuser1's device:**
   - Tap on the conversation with testuser2
   - Should open Chat screen
   - Header shows "testuser2"

2. **Type a message:** "Hello from testuser1!"
3. **Tap "Send"**

**Expected Result (testuser1's device):**
- ✅ Message appears instantly (optimistic update)
- ✅ Message shows on right side (blue bubble)
- ✅ Shows timestamp
- ✅ Shows single checkmark ✓ (sent)
- ✅ Input field clears

**Expected Result (testuser2's device):**
- ✅ Message appears immediately (real-time)
- ✅ Message shows on left side (white bubble)
- ✅ Shows timestamp
- ✅ Shows sender username in header

**Backend Logs (Terminal 1):**
```
[DEBUG] Sending message { userId: '...', conversationId: '...', receiverId: '...', messageType: 'text' }
```

**Pass Criteria:** Message delivered in real-time to both users
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 7: Reply to Message

**Objective:** Test bi-directional messaging

1. **On testuser2's device:**
   - Type: "Hi testuser1! How are you?"
   - Tap "Send"

**Expected Result (testuser2's device):**
- ✅ Message appears on right (blue)
- ✅ Single checkmark ✓

**Expected Result (testuser1's device):**
- ✅ Message appears immediately on left (white)
- ✅ Auto-scrolls to bottom

**Pass Criteria:** Reply delivered successfully
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 8: Typing Indicators

**Objective:** Test typing indicator functionality

1. **On testuser1's device:**
   - Start typing in the input field
   - Type slowly: "I am typing..."
   - **DO NOT send yet**

**Expected Result (testuser2's device):**
- ✅ Below messages, should show: "testuser1 is typing..."
- ✅ Indicator appears within 1 second
- ✅ Indicator disappears after 3 seconds of no typing

2. **On testuser1's device:**
   - Send the message

**Expected Result (testuser2's device):**
- ✅ Typing indicator disappears
- ✅ Message appears

**Pass Criteria:** Typing indicator shows and hides correctly
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 9: Read Receipts

**Objective:** Test message read receipts

1. **On testuser1's device:**
   - Look at the messages you sent
   - Should see single checkmark ✓

2. **On testuser2's device:**
   - Open the conversation (if not already open)
   - View the messages

**Expected Result (testuser1's device):**
- ✅ Checkmarks change from single ✓ to double ✓✓
- ✅ Change happens within 1-2 seconds

**Pass Criteria:** Read receipts update when messages are viewed
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 10: Multiple Messages

**Objective:** Test message flow and scrolling

1. **On testuser1's device:**
   - Send 10 rapid messages:
     - "Message 1"
     - "Message 2"
     - ...
     - "Message 10"

**Expected Result:**
- ✅ All messages appear in correct order
- ✅ Auto-scrolls to bottom
- ✅ No duplicate messages
- ✅ All messages have checkmarks

**Pass Criteria:** All messages delivered in order
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 11: Long Messages

**Objective:** Test long message handling

1. **On testuser2's device:**
   - Type a long message (200+ characters):
     ```
     This is a very long message to test how the chat interface handles longer text content. The message should wrap properly within the bubble and maintain good readability. The bubble should expand to fit the content without breaking the layout.
     ```
   - Send

**Expected Result:**
- ✅ Message bubble expands vertically
- ✅ Text wraps properly
- ✅ Remains within 80% screen width
- ✅ Readable and properly formatted

**Pass Criteria:** Long messages display correctly
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 12: Conversation List Update

**Objective:** Verify conversation list shows latest message

1. **On both devices:**
   - Navigate back to Messages screen (conversation list)
   - Pull to refresh

**Expected Result:**
- ✅ Conversation shows latest message preview
- ✅ Shows relative timestamp ("2 minutes ago")
- ✅ testuser2 sees unread count badge
- ✅ Most recent conversation appears at top

**Pass Criteria:** Conversation list updates with latest message
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 13: Unread Badge

**Objective:** Test unread message indicators

1. **On testuser1's device:**
   - Navigate away from chat (go to Feed or Profile)
   - **On testuser2's device:** Send message: "Are you there?"

2. **On testuser1's device:**
   - Go to Messages tab

**Expected Result:**
- ✅ Conversation shows blue badge with "1"
- ✅ Last message text is bolded
- ✅ Message preview shows: "Are you there?"

3. **Open the conversation**

**Expected Result:**
- ✅ Badge disappears
- ✅ Message marked as read
- ✅ testuser2 sees double checkmarks ✓✓

**Pass Criteria:** Unread badges work correctly
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 14: App Backgrounding

**Objective:** Test socket reconnection

1. **On testuser1's device:**
   - Open the conversation

2. **Background the app** (press home button)
3. **Wait 10 seconds**
4. **Reopen the app**

**Expected Result:**
- ✅ App resumes at same screen
- ✅ Socket reconnects (check backend logs)
- ✅ Can send and receive messages normally

**Backend Logs:**
```
[INFO] User disconnected { userId: '...', reason: '...' }
[INFO] User connected via Socket.io { userId: '...', socketId: '...' }
```

**Pass Criteria:** Socket reconnects after backgrounding
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 15: Logout/Login

**Objective:** Test socket cleanup on logout

1. **On testuser1's device:**
   - Go to Profile tab
   - Tap "Logout"

**Backend Logs:**
```
[INFO] User disconnected { userId: '...', reason: 'client namespace disconnect' }
```

2. **Login again:**
   - Email: `test1@example.com`
   - Password: `Test123!@#`

**Expected Result:**
- ✅ Logged in successfully
- ✅ Socket reconnects (check backend logs)
- ✅ Can access Messages tab
- ✅ Previous conversation still visible
- ✅ All previous messages visible

**Pass Criteria:** Socket disconnects on logout and reconnects on login
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 16: Simultaneous Typing

**Objective:** Test concurrent typing indicators

1. **On both devices simultaneously:**
   - testuser1: Start typing
   - testuser2: Start typing

**Expected Result:**
- ✅ testuser1 sees "testuser2 is typing..."
- ✅ testuser2 sees "testuser1 is typing..."
- ✅ Both indicators work independently

**Pass Criteria:** Typing indicators don't interfere with each other
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 17: Pull to Refresh

**Objective:** Test conversation list refresh

1. **On any device:**
   - Go to Messages screen (conversation list)
   - Pull down from top

**Expected Result:**
- ✅ Refresh animation shows
- ✅ List refreshes
- ✅ Latest messages appear
- ✅ No errors

**Pass Criteria:** Pull to refresh works
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 18: Empty Input Send

**Objective:** Test send button disabled state

1. **Open any conversation**
2. **Without typing anything:**
   - Tap "Send" button

**Expected Result:**
- ✅ Send button is disabled (grayed out)
- ✅ Nothing happens when tapped
- ✅ No empty message sent

3. **Type a space only:** " "
4. **Tap "Send"**

**Expected Result:**
- ✅ Button still disabled (whitespace trimmed)
- ✅ No message sent

**Pass Criteria:** Cannot send empty messages
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 19: Character Limit

**Objective:** Test 1000 character limit

1. **Type or paste 1001 characters**
2. **Try to send**

**Expected Result:**
- ✅ Input limited to 1000 characters
- ✅ Cannot type beyond limit
- ✅ Message sends successfully if at/under limit

**Pass Criteria:** Character limit enforced
**Status:** [ ] PASS [ ] FAIL

---

### Test Scenario 20: Network Interruption

**Objective:** Test offline behavior

1. **On testuser1's device:**
   - Turn on Airplane Mode
   - Try to send message: "Testing offline"

**Expected Result:**
- ✅ Message appears (optimistic update)
- ✅ Shows single checkmark ✓
- ✅ Backend doesn't receive message (check logs)

2. **Turn off Airplane Mode**

**Expected Result:**
- ✅ Socket reconnects
- ✅ Message eventually sends (or shows error)

**Note:** Current implementation may not retry failed messages. This is expected.

**Pass Criteria:** App handles network loss gracefully
**Status:** [ ] PASS [ ] FAIL

---

## 📊 Test Results Summary

### Overall Results

**Total Test Scenarios:** 20

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. User Registration & Login | [ ] PASS [ ] FAIL | |
| 2. Socket Connection | [ ] PASS [ ] FAIL | |
| 3. Navigate to Messages | [ ] PASS [ ] FAIL | |
| 4. Create Conversation | [ ] PASS [ ] FAIL | |
| 5. View Conversations List | [ ] PASS [ ] FAIL | |
| 6. Send First Message | [ ] PASS [ ] FAIL | |
| 7. Reply to Message | [ ] PASS [ ] FAIL | |
| 8. Typing Indicators | [ ] PASS [ ] FAIL | |
| 9. Read Receipts | [ ] PASS [ ] FAIL | |
| 10. Multiple Messages | [ ] PASS [ ] FAIL | |
| 11. Long Messages | [ ] PASS [ ] FAIL | |
| 12. Conversation List Update | [ ] PASS [ ] FAIL | |
| 13. Unread Badge | [ ] PASS [ ] FAIL | |
| 14. App Backgrounding | [ ] PASS [ ] FAIL | |
| 15. Logout/Login | [ ] PASS [ ] FAIL | |
| 16. Simultaneous Typing | [ ] PASS [ ] FAIL | |
| 17. Pull to Refresh | [ ] PASS [ ] FAIL | |
| 18. Empty Input Send | [ ] PASS [ ] FAIL | |
| 19. Character Limit | [ ] PASS [ ] FAIL | |
| 20. Network Interruption | [ ] PASS [ ] FAIL | |

**Pass Rate:** _____ / 20 (____%)

---

## 🐛 Bug Tracking

### Bugs Found During Testing

| # | Scenario | Description | Severity | Status |
|---|----------|-------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severity Levels:**
- **Critical:** App crashes or data loss
- **High:** Feature completely broken
- **Medium:** Feature works but has issues
- **Low:** Minor cosmetic or UX issue

---

## 📝 Additional Notes

### Performance Observations
- Message delivery latency: _____ ms
- Typing indicator latency: _____ ms
- Socket reconnection time: _____ seconds
- App responsiveness: [ ] Excellent [ ] Good [ ] Fair [ ] Poor

### UI/UX Observations
- Message bubbles: [ ] Well designed [ ] Needs improvement
- Typing indicator: [ ] Noticeable [ ] Too subtle
- Read receipts: [ ] Clear [ ] Confusing
- Overall chat experience: [ ] Excellent [ ] Good [ ] Fair [ ] Poor

### Suggestions for Improvement
1. ______________________________
2. ______________________________
3. ______________________________

---

## ✅ Sign-Off

**Tested By:** __________________
**Date:** __________________
**Device:** __________________
**OS Version:** __________________
**App Version:** 1.0.0

**Overall Assessment:**
- [ ] Ready for production
- [ ] Ready with minor fixes
- [ ] Needs major fixes
- [ ] Not ready

---

## 🔗 Quick Reference

### Backend Health Check
```
http://localhost:3000/health
```

### Get Auth Token (testuser1)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"Test123!@#"}'
```

### Get Conversations
```bash
curl -X GET http://localhost:3000/api/chat/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Send Message (API)
```bash
curl -X POST http://localhost:3000/api/chat/conversations/CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"messageType":"text","content":"Test message via API"}'
```

---

**End of Testing Guide**
