# Twilio SMS/WhatsApp Setup Guide

This guide will help you set up Twilio for sending SMS and WhatsApp messages for group invites and OTP verification.

## Prerequisites

1. Create a Twilio account at https://www.twilio.com/
2. Verify your phone number (free trial account)
3. Get your Account SID and Auth Token from the Twilio Console

## Step 1: Get Twilio Credentials

1. Log in to your [Twilio Console](https://www.twilio.com/console)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Copy these values (you'll need them for environment variables)

## Step 2: Get a Twilio Phone Number

### For SMS:
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a phone number with SMS capabilities
3. Note down the phone number (format: `+1234567890`)

### For WhatsApp (Optional):
1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Twilio provides a WhatsApp sandbox number for testing: `whatsapp:+14155238886`
3. For production, you need to request WhatsApp access from Twilio
4. Your WhatsApp number format: `whatsapp:+1234567890` or just the number: `+14155238886`

## Step 3: Configure Environment Variables

Create or update your `.env` file in the `server/` directory:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

# How to send messages: 'sms', 'whatsapp', or 'both'
TWILIO_SEND_VIA=both

# Frontend URL (for invite links)
FRONTEND_URL=http://localhost:5173

# Deployment environment
DEPLOY_ENV=development
```

### Example for Indian Numbers:
```env
TWILIO_PHONE_NUMBER=+919876543210
TWILIO_WHATSAPP_NUMBER=+919876543210
```

## Step 4: Test the Setup

1. Start your server: `npm run dev`
2. Create a group and invite a user
3. Check your server logs for SMS/WhatsApp SIDs
4. The invited user should receive:
   - **SMS/WhatsApp** with the invite link
   - **OTP** when they request it via the invite page

## How It Works

### Invite Flow:
1. User A invites User B to join a group
2. System sends SMS/WhatsApp to User B with:
   - Group name
   - Invite link
   - Instructions
3. User B clicks the link, views group details, and requests OTP
4. System sends OTP via SMS/WhatsApp
5. User B verifies OTP and accepts the invite

### Phone Number Format:
- The system automatically formats Indian phone numbers to E.164 format
- Input: `9876543210` or `8122072090`
- Output: `+919876543210`
- Works with or without country code

## Troubleshooting

### Messages Not Sending:
1. **Check credentials**: Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
2. **Check phone numbers**: Ensure `TWILIO_PHONE_NUMBER` is in E.164 format (`+1234567890`)
3. **Check balance**: Free trial accounts have limited credits
4. **Check logs**: Server logs will show error messages if Twilio API calls fail

### WhatsApp Not Working:
1. **Sandbox mode**: You need to join the Twilio WhatsApp sandbox first
   - Send `join <your-code>` to `whatsapp:+14155238886`
   - Find your code in Twilio Console → Messaging → Try it out
2. **Production**: Request WhatsApp access from Twilio for production use

### Development Mode:
- In development (`DEPLOY_ENV=development`), OTPs are also returned in API responses
- In production, OTPs are only sent via SMS/WhatsApp for security

## Cost Considerations

- **SMS**: ~$0.0075 per message (varies by country)
- **WhatsApp**: ~$0.005 per message (varies by country)
- Free trial accounts come with a small credit ($15-20)

## Security Notes

1. Never commit `.env` file to version control
2. Use environment variables in production
3. In production, never return OTPs in API responses
4. Set `DEPLOY_ENV=production` in production environment

## Additional Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [E.164 Phone Number Format](https://www.twilio.com/docs/glossary/what-e164)

