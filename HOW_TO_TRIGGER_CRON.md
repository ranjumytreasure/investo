# How to Trigger Manual Cron Job

## Step 1: Get Your Auth Token

1. Login to your frontend application
2. Open Browser DevTools (F12) → Console
3. Run this command to get your token:
   ```javascript
   localStorage.getItem('token')
   ```
4. Copy the token (it will look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Method 1: Using curl (Terminal/PowerShell)

**Windows PowerShell:**
```powershell
$token = "YOUR_TOKEN_HERE"
curl.exe -X POST http://localhost:4000/admin/test-auction-cron `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json"
```

**Linux/Mac Terminal:**
```bash
TOKEN="YOUR_TOKEN_HERE"
curl -X POST http://localhost:4000/admin/test-auction-cron \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## Method 2: Using Postman

1. Open Postman
2. Create new request:
   - **Method:** POST
   - **URL:** `http://localhost:4000/admin/test-auction-cron`
3. Go to **Headers** tab:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`
   - Key: `Content-Type`
   - Value: `application/json`
4. Click **Send**

## Method 3: Using Browser Console (JavaScript)

Open browser console (F12) and run:

```javascript
// Get your token
const token = localStorage.getItem('token');

// Trigger the cron job
fetch('http://localhost:4000/admin/test-auction-cron', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Cron job triggered:', data);
})
.catch(err => {
  console.error('❌ Error:', err);
});
```

## Method 4: Using Thunder Client (VS Code Extension)

1. Install Thunder Client extension in VS Code
2. Create new request:
   - **Method:** POST
   - **URL:** `http://localhost:4000/admin/test-auction-cron`
3. Go to **Headers**:
   - `Authorization: Bearer YOUR_TOKEN_HERE`
   - `Content-Type: application/json`
4. Click **Send**

## Expected Response

```json
{
  "success": true,
  "message": "Auction cron job executed manually",
  "results": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "checked_groups": 5,
    "opened_auctions": 1,
    "closed_auctions": 0,
    "warnings_sent": 0,
    "errors": []
  }
}
```

## What Happens After Triggering?

1. **Server Console** will show:
   - `⏰ Opening auction for group: ...`
   - `📢 Notified X members about auction opening...`
   - `⚠️ Sending 5-minute warning...` (if applicable)
   - `⏰ Closing auction...` (if applicable)

2. **Browser Console** will show:
   - `🎯 Auction opened event received: ...`
   - `⚠️ Auction warning event received: ...`
   - `🔒 Auction closed event received: ...`

3. **Frontend UI** will:
   - Show participation modal for `auction:opened`
   - Show browser notification for `auction:warning`
   - Close modal and refresh for `auction:closed`

## Troubleshooting

**Error: ECONNREFUSED**
- Backend server is not running
- Start it: `cd server && npm run dev`

**Error: 401 Unauthorized**
- Token is missing or invalid
- Make sure you're logged in and token is correct

**Error: 404 Not Found**
- Check if endpoint is correct: `/admin/test-auction-cron`
- Make sure server is running on port 4000


