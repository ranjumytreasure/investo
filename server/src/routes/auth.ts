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
		const { phone, pin } = req.body as { phone: string; pin: string };
		const user = await User.findOne({ where: { phone } });
		if (!user || !user.pin) return res.status(400).json({ error: 'invalid' });
		if (user.status !== 'active') {
			return res.status(403).json({ error: 'Account is not active. Please verify your invite via OTP first.' });
		}
		const ok = await bcrypt.compare(pin, user.pin);
		if (!ok) return res.status(400).json({ error: 'invalid' });
		const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
		return res.json({ token, role: user.role });
	});
}



