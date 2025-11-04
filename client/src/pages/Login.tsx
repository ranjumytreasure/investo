import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function Login() {
    const [phone, setPhone] = useState('')
    const [pin, setPin] = useState('')
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()
    const { dispatch } = useAuth()

    async function login() {
        setError(null)
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, pin })
        })
        const data = await safeJson(res)
        if (res.ok && data?.token) {
            // Save to localStorage
            localStorage.setItem('token', data.token)
            localStorage.setItem('phone', phone)
            if (data.role) {
                localStorage.setItem('role', data.role)
            }
            // Update auth context
            dispatch({ type: 'SET_TOKEN', token: data.token })
            dispatch({ type: 'SET_PHONE', phone })
            if (data.role) {
                dispatch({ type: 'SET_ROLE', role: data.role })
            }
            navigate('/home')
        } else {
            setError(data?.error || 'Invalid credentials')
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                <h2 style={{ marginTop: 0 }}>Login</h2>
                {error && <div style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: 8, borderRadius: 6, marginBottom: 12 }}>{error}</div>}
                <form onSubmit={(e) => { e.preventDefault(); login(); }}>
                    <label style={{ display: 'block', fontWeight: 600 }}>Mobile</label>
                    <input placeholder="e.g. 9876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: 8 }} />
                    <label style={{ display: 'block', fontWeight: 600, marginTop: 12 }}>PIN</label>
                    <input placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} type="password" inputMode="numeric" maxLength={4} style={{ width: '100%', padding: 8, letterSpacing: 4 }} />
                    <button type="submit" style={{ marginTop: 12, width: '100%' }}>Login</button>
                </form>
                <p style={{ marginTop: 12 }}>
                    <Link to="/reset-pin">Forgot PIN?</Link>
                </p>
                <p style={{ marginTop: 8 }}>
                    <Link
                        to="/home"
                        style={{
                            display: 'inline-block',
                            padding: '8px 12px',
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
        </div>
    )
}

async function safeJson(res: Response) {
    try { return await res.json() } catch { return null }
}
