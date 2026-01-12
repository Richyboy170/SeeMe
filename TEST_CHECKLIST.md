# SeeMe Chat - Testing Checklist
**Quick Reference for Manual Testing**

---

## Pre-Flight Checks

- [ ] Backend server running
- [ ] Mobile app running
- [ ] Redis running (`redis-cli ping`)
- [ ] Two test accounts created (alice & bob)
- [ ] Test conversation created

---

## Core Features

### Messages Screen
- [ ] Can navigate to Messages tab
- [ ] Shows empty state when no conversations
- [ ] Pull to refresh works

### Conversation Creation
- [ ] Conversation appears for both users
- [ ] Shows correct usernames
- [ ] Shows avatars or placeholders

### Send Messages
- [ ] Can type message
- [ ] Send button enabled when text present
- [ ] Send button disabled when empty
- [ ] Message appears instantly (optimistic)
- [ ] Message delivered to other user real-time

### Receive Messages
- [ ] Incoming messages appear immediately
- [ ] Messages show on correct side (left)
- [ ] Shows sender's username in header
- [ ] Auto-scrolls to bottom

### Typing Indicators
- [ ] "User is typing..." appears when other user types
- [ ] Disappears after 3 seconds
- [ ] Disappears when message sent

### Read Receipts
- [ ] Single checkmark ✓ when sent
- [ ] Double checkmark ✓✓ when read
- [ ] Updates in real-time

### Unread Badges
- [ ] Badge shows unread count
- [ ] Badge disappears when conversation opened
- [ ] Last message bolded when unread

### Long Messages
- [ ] Long text wraps properly
- [ ] Bubble expands vertically
- [ ] Stays within 80% width

### Multiple Messages
- [ ] Multiple messages show in order
- [ ] All messages delivered
- [ ] No duplicates

### Conversation List
- [ ] Shows latest message preview
- [ ] Shows relative timestamp
- [ ] Most recent at top
- [ ] Updates when new message arrives

---

## Advanced Features

### App Lifecycle
- [ ] Socket reconnects after backgrounding
- [ ] Can send/receive after reopen
- [ ] Works after logout/login

### Edge Cases
- [ ] Can't send empty message
- [ ] Character limit (1000) enforced
- [ ] Handles network loss gracefully
- [ ] Pull to refresh works

### Performance
- [ ] Messages send quickly (< 500ms)
- [ ] Typing indicator responsive (< 1s)
- [ ] UI smooth and responsive
- [ ] No lag or freezing

---

## Socket Verification

**Check backend logs for:**
- [ ] "User connected via Socket.io"
- [ ] "Sending message"
- [ ] "User disconnected" on logout

---

## Pass Criteria

**Minimum to Pass:**
- ✅ Can send and receive messages
- ✅ Messages delivered in real-time
- ✅ Typing indicators work
- ✅ Read receipts work
- ✅ No crashes or errors

**Bonus Points:**
- ✅ Fast and responsive
- ✅ Good UX (smooth animations, clear feedback)
- ✅ Handles edge cases well

---

## Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
|       |          |             |
|       |          |             |
|       |          |             |

---

## Overall Rating

- [ ] ⭐⭐⭐⭐⭐ Excellent - Ready for production
- [ ] ⭐⭐⭐⭐ Good - Minor polish needed
- [ ] ⭐⭐⭐ Okay - Needs work
- [ ] ⭐⭐ Poor - Major issues
- [ ] ⭐ Broken - Not functional

---

**Tested By:** __________________
**Date:** __________________
**Status:** [ ] PASS [ ] FAIL [ ] NEEDS WORK
