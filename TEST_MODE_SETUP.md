# Test Mode Setup - Opening Auctions Every Minute

## What Changed

### 1. Frontend Modal Fix ✅
- **Fixed:** Modal now **always shows** when `auction:opened` WebSocket event is received
- **Removed:** Strict group membership check that was preventing modal from appearing
- **Added:** Fallback to show modal even if API verification fails

### 2. Cron Job Test Mode ✅
- **Added:** TEST MODE that opens auctions every minute regardless of time
- **Enabled by default** when `NODE_ENV !== 'production'`
- **Can also enable** by setting `AUCTION_TEST_MODE=true` in `.env`

### How Test Mode Works

In **TEST MODE**, the cron job will:
- ✅ Open auctions for **any group** that has:
  - `next_auction_date` set
  - `auction_start_at` set
  - `auction_end_at` in the future (or null)
  - Status is 'new' or 'inprogress'
- ✅ **Ignore** whether the start time has passed
- ✅ **Runs every minute** checking all eligible groups

## How to Test

### Step 1: Ensure Your Group Has Required Fields

Make sure your test group has:
- `next_auction_date` - Any date (e.g., today)
- `auction_start_at` - Any time
- `auction_end_at` - Future time (e.g., 2 hours from now)
- Status: 'new' or 'inprogress'
- At least one member with accepted/active share

### Step 2: Start Your Servers

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

### Step 3: Login and Open Browser Console

1. Login to your frontend
2. Open DevTools (F12) → Console tab
3. You should see: `👤 Joined user room for user: ...`

### Step 4: Wait for Cron Job (or Trigger Manually)

**Option A: Wait 1 minute** - The cron job runs automatically every minute

**Option B: Trigger manually** - Run this in browser console:
```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:4000/admin/test-auction-cron', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('✅ Result:', data));
```

### Step 5: Check Results

**In Browser Console:**
- `🎯 Auction opened event received: ...`
- `✅ Showing participation modal for auction: ...`

**On Screen:**
- Participation modal should appear automatically

**In Server Console:**
- `🧪 [TEST MODE] Checking group: ...`
- `⏰ Opening auction for group: ...`
- `📢 Notified X members about auction opening...`

## Expected Behavior

### Every Minute:
1. Cron job checks all groups
2. If a group has `next_auction_date` + `auction_start_at` set and `auction_end_at` is in future
3. And no auction is currently open for that group
4. **Opens the auction** and sends WebSocket notification
5. **Frontend receives** `auction:opened` event
6. **Modal appears** automatically on screen

## Disabling Test Mode (Production)

To disable test mode and use normal time-based logic:

**Option 1:** Set in `.env`:
```
AUCTION_TEST_MODE=false
NODE_ENV=production
```

**Option 2:** Remove the TEST_MODE check from code (or set to `false`)

## Troubleshooting

### Modal Not Showing?
1. Check browser console for `🎯 Auction opened event received`
2. Check browser console for `✅ Showing participation modal`
3. Check if `AuctionParticipationModal` component is rendered (check React DevTools)
4. Verify WebSocket connection is active

### Auction Not Opening?
1. Check server console for `🧪 [TEST MODE] Checking group` messages
2. Verify group has `next_auction_date` and `auction_start_at` set
3. Verify group status is 'new' or 'inprogress'
4. Check if auction is already open (it won't open again if already open)

### No WebSocket Events?
1. Verify user is logged in
2. Check if user joined user room: `👤 Joined user room for user: ...`
3. Verify WebSocket connection in Network tab (should see WebSocket connection)
4. Check server logs for WebSocket emissions

## Notes

- Test mode is **enabled by default** in development
- Test mode will **not open** auctions that are already open
- Each auction will only open **once** per group
- Modal will appear **every time** `auction:opened` event is received (even if already showing)




