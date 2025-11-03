import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function ResetPin() {
    const [phone, setPhone] = useState('')
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [pin, setPin] = useState('')
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    async function requestOtp() {
        setError(null)
        const res = await fetch('/auth/request-otp', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone })
        })
        if (!res.ok) { setError('Failed to send OTP'); return }
        setOtpSent(true)
    }

    async function verifyOtp() {
        setError(null)
        const res = await fetch('/auth/verify-otp', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp })
        })
        const data = await safeJson(res)
        if (!res.ok || !data?.ok) { setError(data?.error || 'Invalid OTP'); return }
        setVerified(true)
    }

    async function updatePin() {
        setError(null)
        const res = await fetch('/auth/set-pin', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, pin })
        })
        const data = await safeJson(res)
        if (!res.ok || !data?.ok) { setError(data?.error || 'Failed to set PIN'); return }
        navigate('/login')
    }

    return (
        <div style={{ maxWidth: 360, margin: '40px auto' }}>
            <h2>Reset PIN</h2>
            {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
            {!verified ? (
                <>
                    <input placeholder="Mobile" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: 8 }} />
                    {!otpSent ? (
                        <button onClick={requestOtp} style={{ marginTop: 12 }}>Send OTP</button>
                    ) : (
                        <div style={{ marginTop: 12 }}>
                            <input placeholder="OTP" value={otp} onChange={e => setOtp(e.target.value)} style={{ width: '100%', padding: 8 }} />
                            <button onClick={verifyOtp} style={{ marginTop: 12 }}>Verify OTP</button>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <input placeholder="New 4-digit PIN" value={pin} onChange={e => setPin(e.target.value)} style={{ width: '100%', padding: 8 }} />
                    <button onClick={updatePin} style={{ marginTop: 12 }}>Save PIN</button>
                </>
            )}
            <p style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link to="/login">Back to login</Link>
                <Link
                    to="/home"
                    style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        background: 'var(--page-bg)',
                        color: '#0f172a',
                        border: '1px solid var(--border)',
                        borderRadius: 9999,
                        textDecoration: 'none'
                    }}
                >
                    ← Back to Home
                </Link>
            </p>
        </div>
    )
}

async function safeJson(res: Response) {
    try { return await res.json() } catch { return null }
}


