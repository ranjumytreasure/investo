# Auction Notification Flow - Complete Implementation

## Overview

The system is configured to:
1. **Open auctions every minute** via cron job (TEST MODE)
2. **Notify all group members** when an auction opens
3. **Close auctions** when end time is reached
4. **Notify all group members** when an auction closes

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Cron Job (Every Minute)                                    │
│  - Checks groups with next_auction_date + auction_start_at  │
│  - Opens auction if conditions met                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: openAuction()                                     │
│  - Creates GroupAccount with status 'open'                  │
│  - Fetches all active group members from DB                 │
│  - Emits 'auction:opened' event to:                         │
│    • group:${groupId} room                                  │
│    • user:${userId} room (for each member)                  │
│    • Global broadcast                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: WebSocket Listener                               │
│  - Receives 'auction:opened' event                          │
│  - Shows browser notification                               │
│  - Displays participation modal                             │
│  - Refreshes live auctions list                             │
└─────────────────────────────────────────────────────────────┘
```

## Backend Implementation

### 1. Cron Job (`server/src/cron/auctions.ts`)

- **Runs every minute** (`* * * * *`)
- **TEST MODE**: Enabled by default (when `NODE_ENV !== 'production'`)
- **Opens auctions** for groups that have:
  - `next_auction_date` set
  - `auction_start_at` set
  - `auction_end_at` in the future (or null)
  - Status is 'new' or 'inprogress'

### 2. Auction Opening (`server/src/services/auctionService.ts`)

When `openAuction()` is called:
1. Creates `GroupAccount` with status `'open'`
2. Fetches all active group members from `GroupUserShare` table
3. Emits `auction:opened` event with message **"Auction has opened"**
4. Notifications sent to:
   - Group room: `io.to('group:${groupId}').emit(...)`
   - Individual user rooms: `io.to('user:${userId}').emit(...)` for each member
   - Global broadcast: `io.emit(...)`

### 3. Auction Closing (`server/src/services/auctionClosingMethods.ts`)

When `closeAuction()` is called:
1. Finds highest bidder
2. Updates `GroupAccount` with winner and status `'closed'`
3. Calculates next auction date based on frequency
4. Emits `auction:closed` event
5. Notifications sent to all group members (same channels as opening)

## Frontend Implementation

### 1. WebSocket Connection (`client/src/hooks/useSocket.ts`)

- Automatically connects to WebSocket server
- Connection handled silently (no logs)

### 2. User Room Join (`client/src/pages/Home.tsx`)

When user logs in:
- Automatically joins `user:${userId}` room
- Ensures user receives notifications even if not viewing group page

### 3. Auction Opened Handler (`client/src/pages/Home.tsx`)

When `auction:opened` event is received:
1. **Shows browser notification** (if permission granted)
   - Title: "Auction Opened: {group_name}"
   - Body: "Auction has opened"
2. **Displays participation modal** (AuctionParticipationModal component)
   - Shows group name, amount, auction times
   - "Participate Now" button to navigate to group
3. **Refreshes live auctions list**

### 4. Auction Closed Handler (`client/src/pages/Home.tsx`)

When `auction:closed` event is received:
1. **Shows browser notification** (if permission granted)
   - Title: "Auction Closed: {group_name}"
   - Body: "Auction has closed"
2. **Closes participation modal** (if open for that group)
3. **Refreshes live auctions list**

## Testing

### Step 1: Setup Test Group

Ensure your group has:
- `next_auction_date`: Any date (e.g., today)
- `auction_start_at`: Any time
- `auction_end_at`: Future time (e.g., 2 hours from now)
- Status: 'new' or 'inprogress'
- At least one member with `accepted` or `active` share

### Step 2: Start Servers

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

### Step 3: Login and Wait

1. Login to frontend as a group member
2. Open browser console (F12)
3. Wait 1 minute (cron job runs every minute)
4. You should see:
   - Browser notification: "Auction Opened: {group_name}"
   - Participation modal appears on screen
   - Console log: `[Auction Status] Auction opened event received...`

### Step 4: Verify Closing

1. Wait for auction end time to pass
2. Or manually close auction via API
3. You should see:
   - Browser notification: "Auction Closed: {group_name}"
   - Participation modal closes (if open)
   - Console log: `[Auction Status] Auction closed event received...`

## Manual Trigger (For Testing)

You can manually trigger the cron job logic:

```javascript
// In browser console
const token = localStorage.getItem('token');
fetch('http://localhost:4000/admin/test-auction-cron', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('Result:', data));
```

## Notification Channels

For each group member, notifications are sent via:
1. **Group Room**: `group:${groupId}` - Users who joined the group room
2. **User Room**: `user:${userId}` - Individual user room (ensures delivery)
3. **Global Broadcast**: All connected users (fallback)

This ensures **all group members receive notifications** regardless of which rooms they've joined.

## Message Format

**Auction Opened:**
```javascript
{
  group_id: string,
  group_name: string,
  message: "Auction has opened",
  group_amount: number,
  auction_start_at: string,
  auction_end_at: string,
  // ... other fields
}
```

**Auction Closed:**
```javascript
{
  group_id: string,
  group_name: string,
  message: "Auction closed",
  winner_share_id: string,
  winning_amount: number,
  next_auction_date: string,
  // ... other fields
}
```

## Console Logs (Auction Status Only)

All remaining console logs are prefixed with `[Auction Status]`:
- `[Auction Status] Opening auction for group...`
- `[Auction Status] Auction opened event received...`
- `[Auction Status] Auction closed event received...`
- `[Auction Status] Sent 5-minute warning...`

## Troubleshooting

**Notifications not appearing?**
1. Check if user is logged in
2. Check if user is a member of the group (has accepted/active share)
3. Check browser console for WebSocket events
4. Verify WebSocket connection is active
5. Check if browser notification permissions are granted

**Modal not showing?**
1. Check browser console for `[Auction Status] Auction opened event received`
2. Check if modal component is rendered (React DevTools)
3. Verify participationModal state is set

**Auction not opening?**
1. Check server console for `[Auction Status] Opening auction...`
2. Verify group has required fields (next_auction_date, auction_start_at)
3. Check if auction is already open (won't open again)
4. Verify TEST_MODE is enabled (or times are correct)




