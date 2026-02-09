# Theme & Responsive Design - Full App Implementation Plan

## Overview
Apply the **existing** theme system (light/dark mode following device preference) consistently across the entire app, and add responsive design utilities for small phones through tablets.

## Current State
- Theme infrastructure exists: `ThemeProvider`, `useTheme()`, `Colors.light`/`Colors.dark`, `Spacing`, `Typography`, `Shadows`
- Only **5 of 23 screens** use `useTheme()` (ChatScreen, ConversationsScreen, ProfileScreen, CreatePostScreen, CreateTopicScreen)
- **18 screens + ~25 components** have hardcoded hex colors
- FeedScreen and ChatDrawer have their own local theme objects (bypassing the global system)
- Navigation tab bar uses hardcoded colors
- No centralized responsive utilities

---

## Phase 1: Extend Color Palette
**File:** `mobile/src/theme/colors.ts`

Add missing colors needed across the app to both light & dark themes:
- `card` - card background color
- `inputBackground` - general input bg (not just chat)
- `separator` - list separator / divider color
- `disabled` - disabled state color
- `overlay` - modal overlay color
- `like` - like/heart color
- `gift` - gift/coin accent
- `tabActive` - tab bar active color
- `tabInactive` - tab bar inactive color

---

## Phase 2: Add Responsive Utilities
**New file:** `mobile/src/theme/responsive.ts`
**Update:** `mobile/src/theme/index.ts` (add export)

Create a simple `useResponsive()` hook:
- Detects screen width via `useWindowDimensions()`
- Returns: `{ isSmall, isMedium, isLarge, isTablet, screenWidth, contentWidth }`
- Breakpoints: small (<375), medium (375-600), large/tablet (>600)
- `contentWidth`: capped at 600px for tablets (existing pattern)
- Responsive font scaling: `rs(size)` function that scales fonts for small screens (x0.9) and tablets (x1.1)

---

## Phase 3: Theme the Navigation
**File:** `mobile/src/navigation/index.tsx`

- Import `useTheme` from theme
- Pass React Navigation's built-in `theme` prop to `NavigationContainer`
- Apply `colors.background`, `colors.text.primary`, `colors.border` to all stack navigator `screenOptions`
- Replace hardcoded `tabBarActiveTintColor: '#FBBF24'` / `tabBarInactiveTintColor: 'gray'` with theme colors
- Replace hardcoded `headerTintColor` / `headerStyle` with theme colors

---

## Phase 4: Migrate Auth Screens (2 screens)
1. `mobile/src/screens/auth/LoginScreen.tsx`
2. `mobile/src/screens/auth/RegisterScreen.tsx`

Replace `#fff`, `#007AFF`, `#ddd`, `#666`, `#333` with theme colors.

---

## Phase 5: Migrate Feed & Post Screens (3 screens + 3 components)
1. `mobile/src/screens/main/FeedScreen.tsx` - **Remove local `themes` object**, use `useTheme()` instead
2. `mobile/src/screens/main/CommentsScreen.tsx`
3. `mobile/src/screens/main/FollowRequestsScreen.tsx`
4. `mobile/src/components/PostCard.tsx`
5. `mobile/src/components/feed/CommentPreview.tsx`
6. `mobile/src/components/feed/RepostOptionsModal.tsx`

---

## Phase 6: Migrate Coins Screens (4 screens + 5 components)
1. `mobile/src/screens/coins/CoinsScreen.tsx`
2. `mobile/src/screens/coins/GiveLeaderboardScreen.tsx`
3. `mobile/src/screens/coins/CoinHistoryScreen.tsx`
4. `mobile/src/screens/coins/GivingActivityScreen.tsx`
5. `mobile/src/components/coins/GiveCoinsModal.tsx`
6. `mobile/src/components/coins/CoinCelebration.tsx`
7. `mobile/src/components/coins/CoinInvestAnimation.tsx`
8. `mobile/src/components/coins/CoinsBalance.tsx`
9. `mobile/src/components/TrustConnectionItem.tsx`

---

## Phase 7: Migrate Discover & Topics Screens (5 screens)
1. `mobile/src/screens/discover/DiscoverScreen.tsx`
2. `mobile/src/screens/discover/PeopleTab.tsx`
3. `mobile/src/screens/discover/CommunitiesTab.tsx`
4. `mobile/src/screens/topics/TopicPageScreen.tsx`
5. `mobile/src/screens/topics/BrowseTopicsScreen.tsx`

---

## Phase 8: Migrate Remaining Components & Screens
1. `mobile/src/components/chat/ChatDrawer.tsx` - **Remove local `themes` object**, use `useTheme()`
2. `mobile/src/components/SharePostModal.tsx`
3. `mobile/src/components/PostActionsBar.tsx`
4. `mobile/src/components/PostViewerModal.tsx`
5. `mobile/src/components/AccountSwitcherModal.tsx`
6. `mobile/src/components/ProfileTabButton.tsx`
7. `mobile/src/components/TopicMembersModal.tsx`
8. `mobile/src/components/TopicEditModal.tsx`
9. `mobile/src/components/chat/GifPicker.tsx`
10. `mobile/src/components/coins/CooldownCoinsWidget.tsx`
11. `mobile/src/components/ImageEditor.tsx`
12. `mobile/src/components/TrustGauge.tsx`
13. `mobile/src/components/favorites/FavoriteButton.tsx`
14. `mobile/src/screens/main/SearchUsersScreen.tsx`
15. `mobile/src/screens/main/AvatarCustomizationScreen.tsx`
16. `mobile/src/screens/main/FullBodyAvatarScreen.tsx`
17. `mobile/src/screens/main/FullBodyAvatarScreenVRM.tsx`

---

## Color Mapping Reference

| Hardcoded Color | Theme Property |
|----------------|---------------|
| `#FFFFFF` / `#fff` | `colors.background` |
| `#FAFAFA` / `#F7F9F9` | `colors.surface` |
| `#F3F4F6` / `#EFEFEF` | `colors.surfaceVariant` |
| `#000000` | `colors.background` (dark) |
| `#121212` / `#16181C` | `colors.surface` (dark) |
| `#111827` / `#0F1419` / `#262626` | `colors.text.primary` |
| `#374151` / `#536471` | `colors.text.secondary` |
| `#6B7280` / `#71767B` / `#8E8E8E` / `#9CA3AF` | `colors.text.secondary` |
| `#C7C7C7` / `#D1D5DB` | `colors.text.tertiary` |
| `#E5E7EB` / `#DBDBDB` / `#CFD9DE` | `colors.border` |
| `#EFF3F4` / `#2F3336` | `colors.separator` (new) |
| `#007AFF` / `#0095F6` / `#1D9BF0` | `colors.text.link` |
| `#F91880` | `colors.like` (new) |
| `#FBBF24` | `colors.gift` (new) |

---

## Total: ~42 files (1 new + 41 modified)
