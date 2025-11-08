# Debugging WebSocket Notifications

## Quick Debug Steps

### Step 1: Check WebSocket Connection

Open browser console (F12) and look for:
```
🔌 Connected to WebSocket server: [socket-id]
🔌 Setting up WebSocket listeners for auction events...
✅ WebSocket listeners registered!
👤 Joined user room for user: [user-id]
```

**If you DON'T see these:**
- WebSocket server might not be running
- Check if backend is running on port 4000
- Check browser console for connection errors

### Step 2: Test WebSocket Connection Manually

Run this in browser console:
```javascript
// Check if socket exists
const socket = window.io?.connect || (() => {
  console.log('Socket.io not loaded. Check if socket hook is working.');
});

// Check socket state
console.log('Socket state:', socket);
```

### Step 3: Trigger Auction and Watch Console

**Trigger the cron job:**
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
.then(data => console.log('✅ Cron result:', data));
```

**Watch for these logs in browser console:**
1. `🎯 Auction opened event received: {...}`
2. `📊 Event data: {...}`
3. `📋 Auction API response: {...}`
4. `✅ Showing participation modal for auction: [group-name]`
5. `✅ Modal state updated!`

**Watch for these logs in server console:**
1. `🧪 [TEST MODE] Checking group: [group-id]`
2. `⏰ Opening auction for group: [group-id]`
3. `📢 Notified X members about auction opening for group [group-id]`

### Step 4: Check Modal State

Run this in browser console to check if modal state is set:
```javascript
// Check React component state (if React DevTools is available)
// Or check if modal is rendered in DOM
document.querySelector('[style*="zIndex: 10000"]') // Should find modal if rendered
```

### Step 5: Verify Group Has Members

Make sure your test group has:
- At least one user with `accepted` or `active` status in `GroupUserShare`
- The user you're logged in as should be a member

Check in browser console:
```javascript
const token = localStorage.getItem('token');
// Get your user ID from token
const tokenData = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
console.log('Your user ID:', tokenData.sub);

// Check your groups
fetch('http://localhost:4000/groups', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(groups => {
  console.log('Your groups:', groups);
  // Check if group has auction settings
  groups.forEach(g => {
    console.log(`Group: ${g.name}`, {
      next_auction_date: g.next_auction_date,
      auction_start_at: g.auction_start_at,
      auction_end_at: g.auction_end_at,
      status: g.status
    });
  });
});
```

## Common Issues

### Issue 1: No WebSocket Connection
**Symptoms:** No "Connected to WebSocket server" message
**Fix:**
- Ensure backend server is running on port 4000
- Check if WebSocket URL is correct in `useSocket.ts`
- Check browser console for connection errors

### Issue 2: Events Not Received
**Symptoms:** No "Auction opened event received" message
**Fix:**
- Verify user is in the user room (check for "Joined user room" message)
- Check server logs to see if events are being emitted
- Verify group has members (userId is not null in GroupUserShare)

### Issue 3: Modal Not Showing
**Symptoms:** See "Modal state updated" but no modal appears
**Fix:**
- Check React DevTools to see if `participationModal` state is set
- Check browser console for React errors
- Verify `AuctionParticipationModal` component is imported correctly
- Check if modal is being rendered but hidden (z-index issues)

### Issue 4: API Verification Failing
**Symptoms:** See "Could not verify auction status" message
**Fix:**
- Check if `/groups/:id/auction` endpoint is working
- Verify token is valid
- Check network tab for failed API calls

## Manual Test Script

Run this complete test in browser console:

```javascript
(async function() {
  console.log('🧪 Starting WebSocket notification test...');
  
  // 1. Check token
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No token found. Please login first.');
    return;
  }
  console.log('✅ Token found');
  
  // 2. Get user ID
  const tokenData = JSON.parse(atob(token.split('.')[1]));
  const userId = tokenData.sub;
  console.log('✅ User ID:', userId);
  
  // 3. Get groups
  const groupsRes = await fetch('http://localhost:4000/groups', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const groups = await groupsRes.json();
  console.log('✅ Groups found:', groups.length);
  
  if (groups.length === 0) {
    console.error('❌ No groups found. Create a group first.');
    return;
  }
  
  // 4. Check if group has auction settings
  const testGroup = groups[0];
  console.log('📋 Test group:', {
    id: testGroup.id,
    name: testGroup.name,
    next_auction_date: testGroup.next_auction_date,
    auction_start_at: testGroup.auction_start_at,
    auction_end_at: testGroup.auction_end_at,
    status: testGroup.status
  });
  
  if (!testGroup.next_auction_date || !testGroup.auction_start_at) {
    console.error('❌ Group missing auction settings. Update group first.');
    return;
  }
  
  // 5. Trigger cron job
  console.log('⏰ Triggering cron job...');
  const cronRes = await fetch('http://localhost:4000/admin/test-auction-cron', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const cronResult = await cronRes.json();
  console.log('✅ Cron result:', cronResult);
  
  if (cronResult.results.opened_auctions > 0) {
    console.log('🎉 Auction opened! Check for WebSocket events in console.');
    console.log('👀 Look for: "🎯 Auction opened event received"');
  } else {
    console.log('⚠️ No auctions opened. Check server logs for details.');
  }
  
  console.log('✅ Test complete! Watch console for WebSocket events.');
})();
```

## Next Steps

1. Run the manual test script above
2. Watch both browser console and server console
3. Share the console logs if issues persist




