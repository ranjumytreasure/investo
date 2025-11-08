# Testing Auction Notifications

## How to Test the Cron Job Manually

### Step 1: Trigger the Cron Job Manually

**Endpoint:** `POST /admin/test-auction-cron`

**Authentication:** Required (Bearer token)

**Example using curl:**
```bash
curl -X POST http://localhost:4000/admin/test-auction-cron \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Example using Postman/Browser:**
- Method: POST
- URL: `http://localhost:4000/admin/test-auction-cron`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

### Step 2: Check Server Console Logs

The server will log:
- `⏰ Opening auction for group: ...`
- `📢 Notified X members about auction opening for group ...`
- `⚠️ Sending 5-minute warning for auction: ...`
- `📢 Sent 5-minute warning to X members for group ...`
- `⏰ Closing auction for group: ...`
- `📢 Notified X members about auction closing for group ...`

### Step 3: Check Frontend Console

Open browser DevTools (F12) and check the Console tab. You should see:

**For Auction Opened:**
```
🎯 Auction opened event received: {group_id: "...", group_name: "...", ...}
```

**For 5-Minute Warning:**
```
⚠️ Auction warning event received: {group_id: "...", message: "Auction ending in 5 minutes", ...}
```

**For Auction Closed:**
```
🔒 Auction closed event received: {group_id: "...", ...}
```

## Frontend Notification Setup

### 1. WebSocket Connection
- Frontend automatically connects to WebSocket on page load
- Users automatically join their `user:${userId}` room when logged in
- Users can join `group:${groupId}` rooms when viewing specific groups

### 2. Event Listeners (in Home.tsx)
- `auction:opened` - Shows participation modal
- `auction:warning` - Shows browser notification or alert
- `auction:closed` - Closes participation modal and refreshes data

### 3. Browser Notifications
- First time: Browser will ask for notification permission
- If granted: Shows native browser notification
- If denied: Falls back to alert() popup

## Testing Checklist

1. ✅ Create a group with `next_auction_date` and `auction_start_at`
2. ✅ Set `auction_start_at` to a past time (so auction should open)
3. ✅ Set `auction_end_at` to a future time
4. ✅ Add users to the group (with accepted/active shares)
5. ✅ Open frontend and login as one of those users
6. ✅ Trigger manual cron: `POST /admin/test-auction-cron`
7. ✅ Check browser console for `auction:opened` event
8. ✅ Check if participation modal appears
9. ✅ Verify notification is received by all group members

## Notes

- The cron job runs automatically every minute
- Manual trigger runs the same logic immediately
- Users must be logged in to receive notifications
- WebSocket connection must be established
- Users automatically join their user room on login




