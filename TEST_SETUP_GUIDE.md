# How to Set Up Test Data for Auction Notifications

## Problem: No auctions were opened/closed

The cron job ran but found no groups that needed auction actions. Here's how to set up test data:

## Option 1: Create a New Test Group (Recommended)

### Step 1: Create Group via API/Frontend

**Via Frontend:**
1. Go to Create Group page
2. Fill in:
   - Group Name: "Test Auction Group"
   - Amount: 10000
   - Number of Members: 5
   - **Next Auction Date:** Today's date (or any date)
   - **Auction Start Time:** Set to a time in the past (e.g., 1 hour ago)
   - **Auction End Time:** Set to a time in the future (e.g., 2 hours from now)
   - Auction Frequency: monthly

### Step 2: Update Group via API (if dates need adjustment)

**To set auction to open NOW:**
```javascript
// In browser console
const token = localStorage.getItem('token');
const groupId = "YOUR_GROUP_ID_HERE";

const now = new Date();
const startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

fetch(`http://localhost:4000/groups/${groupId}/auction`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    next_auction_date: now.toISOString().split('T')[0], // Today
    auction_start_at: startTime.toISOString(),
    auction_end_at: endTime.toISOString()
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Group updated:', data);
})
.catch(err => console.error('❌ Error:', err));
```

## Option 2: Update Existing Group

### Step 1: Find Your Group ID

In browser console:
```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:4000/groups', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(groups => {
  console.log('Your groups:', groups);
  // Find the group ID you want to test
});
```

### Step 2: Update Auction Times

```javascript
const token = localStorage.getItem('token');
const groupId = "YOUR_GROUP_ID"; // Replace with actual group ID

// Set auction to open NOW and close in 10 minutes
const now = new Date();
const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago (so it opens)
const endTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

fetch(`http://localhost:4000/groups/${groupId}/auction`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    next_auction_date: now.toISOString().split('T')[0], // Today
    auction_start_at: startTime.toISOString(),
    auction_end_at: endTime.toISOString()
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Group auction times updated!', data);
  console.log('Now trigger the cron job again!');
})
.catch(err => console.error('❌ Error:', err));
```

## Step 3: Add Users to Group

Make sure the group has users with `accepted` or `active` status:
1. Go to Group Detail page
2. Add members (invite users)
3. Accept invites (or set status to 'accepted'/'active')

## Step 4: Trigger Cron Job Again

After updating the group, trigger the cron job again:
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
.then(data => {
  console.log('✅ Cron job result:', data);
  if (data.results.opened_auctions > 0) {
    console.log('🎉 Auction opened! Check browser console for WebSocket events!');
  }
})
.catch(err => console.error('❌ Error:', err));
```

## Expected Results After Setup

**If setup correctly, you should see:**
- `opened_auctions: 1` (or more)
- Server console: `⏰ Opening auction for group: ...`
- Browser console: `🎯 Auction opened event received: ...`
- Participation modal appears on frontend

## Quick Test Script (All-in-One)

```javascript
// Complete test setup - run this in browser console
const token = localStorage.getItem('token');

// 1. Get your groups
fetch('http://localhost:4000/groups', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(groups => {
  console.log('📋 Your groups:', groups);
  
  if (groups.length === 0) {
    console.log('❌ No groups found. Please create a group first.');
    return;
  }
  
  // Use first group
  const group = groups[0];
  console.log('🎯 Using group:', group.name, 'ID:', group.id);
  
  // 2. Update auction times to open NOW
  const now = new Date();
  const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago
  const endTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 min from now
  
  return fetch(`http://localhost:4000/groups/${group.id}/auction`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      next_auction_date: now.toISOString().split('T')[0],
      auction_start_at: startTime.toISOString(),
      auction_end_at: endTime.toISOString()
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Group updated!', data);
    
    // 3. Trigger cron job
    return fetch('http://localhost:4000/admin/test-auction-cron', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Cron job triggered!', data);
    if (data.results.opened_auctions > 0) {
      console.log('🎉 SUCCESS! Auction opened! Check for WebSocket events!');
    } else {
      console.log('⚠️ No auctions opened. Check if group has members.');
    }
  });
})
.catch(err => console.error('❌ Error:', err));
```




