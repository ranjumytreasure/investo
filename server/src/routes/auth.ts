import { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// import { sendOTP } from '../lib/twilio'; // Parked for now

function generateOtp(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export function registerAuthRoutes(app: Express, io: SocketIOServer) {
	app.post('/auth/request-otp', async (req, res) => {
		const { phone } = req.body as { phone: string };
		if (!phone) return res.status(400).json({ error: 'phone required' });
		const otp = generateOtp();
		const expires = new Date(Date.now() + 5 * 60 * 1000);
		const [user, created] = await User.findOrCreate({
			where: { phone },
			defaults: { phone }
		});

		// Self-registration: If user is newly created, set referred_by to their own id (self-referral)
		if (created && !user.referred_by) {
			user.referred_by = user.id;
			console.log(`✅ Self-registration: User ${user.id} created with self-referral (referred_by = ${user.id})`);
		}

		user.otp = otp;
		user.otp_expires_at = expires as any;
		await user.save();

		// Send OTP via SMS/WhatsApp (Parked for now - Twilio disabled)
		// const sendMethod = (process.env.TWILIO_SEND_VIA as 'sms' | 'whatsapp' | 'both') || 'both';
		// const otpResult = await sendOTP(phone, otp, 'login', sendMethod);

		console.log(`📱 [DEV] Login OTP for ${phone}: ${otp}`);
		// console.log(`   SMS SID: ${otpResult.smsSid || 'Not sent'}`);
		// console.log(`   WhatsApp SID: ${otpResult.whatsappSid || 'Not sent'}`);

		const isProd = process.env.DEPLOY_ENV === 'production';
		return res.json(isProd ? { ok: true } : { ok: true, otp });
	});

	app.post('/auth/verify-otp', async (req, res) => {
		try {
			const { phone, otp } = req.body as { phone: string; otp: string };
			if (!phone || !otp) return res.status(400).json({ error: 'phone and otp required' });
			const user = await User.findOne({ where: { phone } });
			if (!user || !user.otp || !user.otp_expires_at) return res.status(400).json({ error: 'invalid' });
			const expiresAtMs = new Date(user.otp_expires_at as any).getTime();
			if (user.otp !== otp || expiresAtMs < Date.now()) return res.status(400).json({ error: 'invalid' });
			user.otp = null;
			user.otp_expires_at = null as any;
			await user.save();
			return res.json({ ok: true, pin_set: user.pin_set });
		} catch (err) {
			console.error('verify-otp failed', err);
			return res.status(500).json({ error: 'server_error' });
		}
	});

	app.post('/auth/set-pin', async (req, res) => {
		const { phone, pin } = req.body as { phone: string; pin: string };
		const user = await User.findOne({ where: { phone } });
		if (!user) return res.status(404).json({ error: 'not found' });

		// Self-registration: If referred_by is not set, set it to user's own id (self-referral)
		if (!user.referred_by) {
			user.referred_by = user.id;
			console.log(`✅ Self-registration: User ${user.id} setting PIN with self-referral (referred_by = ${user.id})`);
		}

		user.pin = await bcrypt.hash(pin, 10);
		user.pin_set = true;
		await user.save();
		return res.json({ ok: true });
	});

	app.post('/auth/login', async (req, res) => {
		try {
			console.log('🔐 Login attempt:', { phone: req.body?.phone, hasPin: !!req.body?.pin, pinLength: req.body?.pin?.length });
			
			const { phone, pin } = req.body as { phone: string; pin: string };
			if (!phone || !pin) {
				console.log('❌ Missing phone or pin');
				return res.status(400).json({ error: 'phone and pin required' });
			}
			
			// Trim and normalize phone number
			const normalizedPhone = phone.trim();
			if (!normalizedPhone) {
				console.log('❌ Phone number is empty after trimming');
				return res.status(400).json({ error: 'Phone number is required' });
			}
			
			console.log('🔍 Looking for user with phone:', normalizedPhone);
			const user = await User.findOne({ where: { phone: normalizedPhone } });
			
			if (!user) {
				console.log('❌ User not found with phone:', normalizedPhone);
				// Also check if there's a user with similar phone (for debugging)
				const allUsers = await User.findAll({ attributes: ['id', 'phone'], limit: 5 });
				console.log('📋 Sample users in database:', allUsers.map(u => ({ id: u.id, phone: u.phone })));
				return res.status(400).json({ error: 'Invalid phone number or PIN' });
			}
			
			console.log('✅ User found:', { id: user.id, phone: user.phone, hasPin: !!user.pin, pinSet: user.pin_set, status: user.status });
			
			if (!user.pin) {
				console.log('❌ User has no pin set. pin_set:', user.pin_set);
				return res.status(400).json({ error: 'PIN not set. Please set your PIN first.' });
			}
			
			// Check status - handle null/undefined status as 'active' for backward compatibility
			const userStatus = user.status || 'active';
			if (userStatus !== 'active') {
				console.log('❌ User status is not active:', userStatus);
				return res.status(403).json({ error: 'Account is not active. Please verify your invite via OTP first.' });
			}
			
			console.log('🔐 Comparing PIN...');
			const ok = await bcrypt.compare(pin, user.pin);
			if (!ok) {
				console.log('❌ PIN comparison failed for user:', user.id);
				return res.status(400).json({ error: 'Invalid phone number or PIN' });
			}
			
			console.log('✅ PIN valid, generating token...');
			const jwtSecret = process.env.JWT_SECRET || 'secret';
			if (!jwtSecret || jwtSecret === 'secret') {
				console.warn('⚠️ Using default JWT_SECRET - not recommended for production');
			}
			
			const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
			console.log('✅ Login successful for user:', user.id, 'phone:', user.phone);
			return res.json({ 
				token, 
				role: user.role || 'user' // Ensure role is always a valid value
			});
		} catch (err: any) {
			console.error('❌ Login error:', err);
			console.error('Error stack:', err.stack);
			return res.status(500).json({ 
				error: err.message || 'Internal server error',
				details: process.env.NODE_ENV === 'development' ? err.stack : undefined
			});
		}
	});
}



