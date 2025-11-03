import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
    const [phone, setPhone] = useState('')
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [pin, setPin] = useState('')
    const [step, setStep] = useState<'otp' | 'pin'>('otp')
    const [error, setError] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const isValidPhone = phone.trim().length >= 8
    const isValidOtp = otp.trim().length === 6
    const isValidPin = /^\d{4}$/.test(pin)

    async function requestOtp() {
        setError(null); setInfo(null); setLoading(true)
        try {
            const res = await fetch('/auth/request-otp', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone })
            })
            const data = await safeJson(res)
            if (!res.ok) { setError(data?.error || 'Failed to send OTP'); return }
            setOtpSent(true)
            if (data?.otp) setInfo(`OTP sent. Dev hint: ${data.otp}`)
        } finally {
            setLoading(false)
        }
    }

    async function verifyOtp() {
        setError(null); setInfo(null); setLoading(true)
        try {
            const res = await fetch('/auth/verify-otp', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp })
            })
            const data = await safeJson(res)
            if (!res.ok || !data?.ok) { setError(data?.error || 'Invalid OTP'); return }
            setStep('pin'); setInfo('OTP verified. Set your 4-digit PIN.')
        } finally {
            setLoading(false)
        }
    }

    async function setUserPin() {
        setError(null); setInfo(null); setLoading(true)
        try {
            const res = await fetch('/auth/set-pin', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, pin })
            })
            const data = await safeJson(res)
            if (!res.ok || !data?.ok) { setError(data?.error || 'Failed to set PIN'); return }
            navigate('/login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>Create your account</h2>
            <p style={{ color: '#667085', marginTop: 0 }}>Join a trusted money pool in minutes.</p>
            {error && <div style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: 8, borderRadius: 6, marginBottom: 12 }}>{error}</div>}
            {info && <div style={{ color: '#065f46', background: '#d1fae5', border: '1px solid #a7f3d0', padding: 8, borderRadius: 6, marginBottom: 12 }}>{info}</div>}

            {/* Phone */}
            <label style={{ display: 'block', fontWeight: 600, marginTop: 8 }}>Mobile number</label>
            <div style={{ display: 'flex', gap: 8 }}>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" type="tel" inputMode="numeric" style={{ flex: 1, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <button onClick={requestOtp} disabled={!isValidPhone || loading || otpSent} style={{ padding: '10px 14px', background: (!isValidPhone || loading || otpSent) ? '#cbd5e1' : '#2563eb', color: '#fff', borderRadius: 8, border: 'none' }}>Send OTP</button>
            </div>
            <small style={{ color: '#6b7280' }}>We’ll send a 6‑digit code to verify your number.</small>

            {/* OTP */}
            {otpSent && step === 'otp' && (
                <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600 }}>Enter OTP</label>
                    <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                    <button onClick={verifyOtp} disabled={!isValidOtp || loading} style={{ width: '100%', marginTop: 12, padding: 12, background: (!isValidOtp || loading) ? '#cbd5e1' : '#16a34a', color: '#fff', borderRadius: 8, border: 'none' }}>Verify OTP</button>
                </div>
            )}

            {/* PIN */}
            {step === 'pin' && (
                <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600 }}>Set 4‑digit PIN</label>
                    <input value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" type="password" inputMode="numeric" maxLength={4} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, letterSpacing: 4 }} />
                    <button onClick={setUserPin} disabled={!isValidPin || loading} style={{ width: '100%', marginTop: 12, padding: 12, background: (!isValidPin || loading) ? '#cbd5e1' : '#2563eb', color: '#fff', borderRadius: 8, border: 'none' }}>Save PIN</button>
                    <small style={{ color: '#6b7280' }}>Use digits only. You’ll use this PIN to sign in.</small>
                </div>
            )}

            <p style={{ marginTop: 16, color: '#6b7280' }}>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    )
}

async function safeJson(res: Response) {
    try { return await res.json() } catch { return null }
}


