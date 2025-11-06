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
            
            // Fetch user profile to get name
            try {
                const profileRes = await fetch('/profile', {
                    headers: {
                        'Authorization': `Bearer ${data.token}`
                    }
                })
                if (profileRes.ok) {
                    const profileData = await profileRes.json()
                    if (profileData?.user?.name) {
                        dispatch({ type: 'SET_PROFILE', name: profileData.user.name })
                    }
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err)
                // Continue even if profile fetch fails
            }
            
            navigate('/home')
        } else {
            setError(data?.error || 'Invalid credentials')
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: '60px auto', padding: 16 }}>
            {/* Back to Home button at top left */}
            <div style={{ marginBottom: 24 }}>
                <Link
                    to="/home"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff'
                        e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                >
                    <span>←</span>
                    <span>Back to Home</span>
                </Link>
            </div>

            {/* Login Form Card */}
            <div style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: 12, 
                padding: 32, 
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>Login</h2>
                <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 24, fontSize: '0.875rem' }}>Sign in to your account to continue</p>
                
                {error && (
                    <div style={{ 
                        color: '#b91c1c', 
                        background: '#fee2e2', 
                        border: '1px solid #fecaca', 
                        padding: 12, 
                        borderRadius: 8, 
                        marginBottom: 20,
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}
                
                <form onSubmit={(e) => { e.preventDefault(); login(); }}>
                    <label style={{ 
                        display: 'block', 
                        fontWeight: 600, 
                        marginBottom: 8,
                        color: '#374151',
                        fontSize: '0.875rem'
                    }}>
                        Mobile Number
                    </label>
                    <input 
                        placeholder="e.g. 9876543210" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        type="tel"
                        inputMode="numeric"
                        style={{ 
                            width: '100%', 
                            padding: 12, 
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            fontSize: '1rem',
                            marginBottom: 20,
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                    
                    <label style={{ 
                        display: 'block', 
                        fontWeight: 600, 
                        marginBottom: 8,
                        color: '#374151',
                        fontSize: '0.875rem'
                    }}>
                        PIN
                    </label>
                    <input 
                        placeholder="••••" 
                        value={pin} 
                        onChange={e => setPin(e.target.value)} 
                        type="password" 
                        inputMode="numeric" 
                        maxLength={4} 
                        style={{ 
                            width: '100%', 
                            padding: 12, 
                            letterSpacing: 8,
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            fontSize: '1rem',
                            marginBottom: 24,
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                    
                    <button 
                        type="submit" 
                        style={{ 
                            width: '100%',
                            padding: 12,
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            marginBottom: 16
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                    >
                        Login
                    </button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Link 
                        to="/reset-pin" 
                        style={{
                            color: '#2563eb',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                        Forgot PIN?
                    </Link>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                        Don't have an account?{' '}
                        <Link 
                            to="/signup" 
                            style={{
                                color: '#2563eb',
                                textDecoration: 'none',
                                fontWeight: 600
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

async function safeJson(res: Response) {
    try { return await res.json() } catch { return null }
}
