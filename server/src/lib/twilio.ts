import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Your Twilio WhatsApp number (format: whatsapp:+14155238886)

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
} else {
    console.warn('⚠️ Twilio credentials not found. SMS/WhatsApp will not be sent. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
}

/**
 * Format Indian phone number to E.164 format for Twilio
 * @param phone Indian phone number (e.g., "9876543210" or "8122072090")
 * @returns E.164 formatted number (e.g., "+919876543210")
 */
function formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // If already starts with +, return as is
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // If starts with 0, remove it
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // If it's a 10-digit Indian number, add +91
    if (cleaned.length === 10) {
        return `+91${cleaned}`;
    }

    // If it already has country code (11 digits starting with 91), add +
    if (cleaned.length === 11 && cleaned.startsWith('91')) {
        return `+${cleaned}`;
    }

    // Return as is (might be in correct format already)
    return cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
}

/**
 * Send SMS message via Twilio
 * @param to Phone number to send to (Indian format)
 * @param message Message text
 * @returns Twilio message SID if successful, null if failed or Twilio not configured
 */
export async function sendSMS(to: string, message: string): Promise<string | null> {
    if (!twilioClient || !twilioPhoneNumber) {
        console.log('[Twilio] SMS not configured. Would send to', to, ':', message);
        return null;
    }

    try {
        const formattedTo = formatPhoneNumber(to);
        const messageResponse = await twilioClient.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: formattedTo
        });

        console.log(`✅ SMS sent to ${formattedTo}. SID: ${messageResponse.sid}`);
        return messageResponse.sid;
    } catch (error: any) {
        console.error(`❌ Error sending SMS to ${to}:`, error.message);
        return null;
    }
}

/**
 * Send WhatsApp message via Twilio
 * @param to Phone number to send to (Indian format)
 * @param message Message text
 * @returns Twilio message SID if successful, null if failed or Twilio not configured
 */
export async function sendWhatsApp(to: string, message: string): Promise<string | null> {
    if (!twilioClient || !twilioWhatsAppNumber) {
        console.log('[Twilio] WhatsApp not configured. Would send to', to, ':', message);
        return null;
    }

    try {
        const formattedTo = `whatsapp:${formatPhoneNumber(to)}`;
        const from = `whatsapp:${twilioWhatsAppNumber}`;

        const messageResponse = await twilioClient.messages.create({
            body: message,
            from: from,
            to: formattedTo
        });

        console.log(`✅ WhatsApp sent to ${formattedTo}. SID: ${messageResponse.sid}`);
        return messageResponse.sid;
    } catch (error: any) {
        console.error(`❌ Error sending WhatsApp to ${to}:`, error.message);
        return null;
    }
}

/**
 * Send invite message via SMS and/or WhatsApp
 * @param to Phone number to send to
 * @param inviteLink Invite link URL
 * @param groupName Name of the group
 * @param otp OTP for verification (optional)
 * @param via 'sms' | 'whatsapp' | 'both'
 * @returns Object with SMS and WhatsApp message SIDs
 */
export async function sendInvite(
    to: string,
    inviteLink: string,
    groupName: string,
    otp?: string,
    via: 'sms' | 'whatsapp' | 'both' = 'both'
): Promise<{ smsSid: string | null; whatsappSid: string | null }> {
    const message = `🎉 You've been invited to join "${groupName}" on Investo Pools!\n\n` +
        `View details and accept: ${inviteLink}\n\n` +
        (otp ? `Your verification OTP: ${otp}\n\n` : '') +
        `Tap the link above to see group details and accept the invite.`;

    const result = {
        smsSid: null as string | null,
        whatsappSid: null as string | null
    };

    if (via === 'sms' || via === 'both') {
        result.smsSid = await sendSMS(to, message);
    }

    if (via === 'whatsapp' || via === 'both') {
        result.whatsappSid = await sendWhatsApp(to, message);
    }

    return result;
}

/**
 * Send OTP via SMS and/or WhatsApp
 * @param to Phone number to send to
 * @param otp OTP code
 * @param context Context (e.g., "invite verification" or "login")
 * @param via 'sms' | 'whatsapp' | 'both'
 * @returns Object with SMS and WhatsApp message SIDs
 */
export async function sendOTP(
    to: string,
    otp: string,
    context: string = 'verification',
    via: 'sms' | 'whatsapp' | 'both' = 'both'
): Promise<{ smsSid: string | null; whatsappSid: string | null }> {
    const message = `Your Investo Pools ${context} code is: ${otp}\n\n` +
        `This code will expire in 24 hours. Do not share this code with anyone.`;

    const result = {
        smsSid: null as string | null,
        whatsappSid: null as string | null
    };

    if (via === 'sms' || via === 'both') {
        result.smsSid = await sendSMS(to, message);
    }

    if (via === 'whatsapp' || via === 'both') {
        result.whatsappSid = await sendWhatsApp(to, message);
    }

    return result;
}

