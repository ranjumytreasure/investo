import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { useLanguage } from '../state/LanguageContext'
import { useState, useEffect } from 'react'

export default function Header() {
    const { state, dispatch } = useAuth()
    const navigate = useNavigate()
    const { language, setLanguage, t } = useLanguage()
    // Check both state.token and localStorage for token (similar to Home.tsx)
    const tokenFromStorage = localStorage.getItem('token')
    const isLoggedIn = !!(state.token || tokenFromStorage)
    const isAdmin = state.role === 'admin' || state.role === 'productowner'
    const initials = (state.name?.trim()?.[0] ?? state.phone?.trim()?.[0] ?? '?').toUpperCase()
    const [showLangDropdown, setShowLangDropdown] = useState(false)

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'ta', name: 'தமிழ்' },
        { code: 'ml', name: 'മലയാളം' },
        { code: 'kn', name: 'ಕನ್ನಡ' },
        { code: 'hi', name: 'हिंदी' }
    ]

    // Fetch user name if logged in but name is not available
    useEffect(() => {
        const token = state.token || tokenFromStorage
        // Fetch if we have a token but no name (or name is empty/whitespace)
        if (token && (!state.name || !state.name.trim())) {
            console.log('[Header] Fetching profile to get user name...', { hasToken: !!token, currentName: state.name })
            fetch('/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => {
                    console.log('[Header] Profile response status:', res.status, res.statusText)
                    if (res.ok) {
                        return res.json()
                    }
                    console.error('[Header] Profile fetch failed:', res.status, res.statusText)
                    return null
                })
                .then(data => {
                    console.log('[Header] Profile data received:', data)
                    if (data?.user) {
                        console.log('[Header] User data:', { name: data.user.name, phone: data.user.phone, email: data.user.email })
                        if (data.user.name && data.user.name.trim()) {
                            console.log('[Header] Setting name in auth context:', data.user.name.trim())
                            dispatch({ type: 'SET_PROFILE', name: data.user.name.trim() })
                        } else {
                            console.log('[Header] User name is empty or null in database')
                        }
                    } else {
                        console.log('[Header] No user data found in profile response')
                    }
                })
                .catch(err => {
                    console.error('[Header] Failed to fetch profile:', err)
                })
        }
    }, [state.token, state.name, tokenFromStorage, dispatch])

    function logout() {
        // Clear localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('phone')
        localStorage.removeItem('role')
        // Clear auth context
        dispatch({ type: 'LOGOUT' })
        navigate('/login')
    }

    return (
        <header style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--page-bg)',
            position: 'sticky',
            top: 0,
            zIndex: 10
        }}>
            <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link to="/home" style={{ textDecoration: 'none', color: '#111827' }}>
                    <strong style={{ fontSize: '1.25rem' }}>Investo Pools</strong>
                </Link>
                <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {/* Language Selector */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                fontSize: '0.9375rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <span>🌐</span>
                            <span>{languages.find(l => l.code === language)?.name || 'English'}</span>
                            <span>▼</span>
                        </button>
                        {showLangDropdown && (
                            <>
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 998
                                    }}
                                    onClick={() => setShowLangDropdown(false)}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: 4,
                                        background: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 8,
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                        zIndex: 999,
                                        minWidth: 150
                                    }}
                                >
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code as any)
                                                setShowLangDropdown(false)
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                border: 'none',
                                                background: language === lang.code ? '#eff6ff' : '#fff',
                                                color: language === lang.code ? '#2563eb' : '#1e293b',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                fontSize: '0.875rem',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (language !== lang.code) {
                                                    e.currentTarget.style.background = '#f8fafc'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (language !== lang.code) {
                                                    e.currentTarget.style.background = '#fff'
                                                }
                                            }}
                                        >
                                            {lang.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {!isLoggedIn ? (
                        <>
                            <Link 
                                to="/login" 
                                style={{
                                    padding: '10px 16px',
                                    textDecoration: 'none',
                                    color: '#374151',
                                    fontSize: '0.9375rem',
                                    fontWeight: 500,
                                    borderRadius: 8,
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {t('login')}
                            </Link>
                            <Link 
                                to="/signup" 
                                style={{
                                    padding: '10px 20px',
                                    textDecoration: 'none',
                                    color: '#ffffff',
                                    fontSize: '0.9375rem',
                                    fontWeight: 500,
                                    background: '#2563eb',
                                    borderRadius: 8,
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                            >
                                {t('signup')}
                            </Link>
                        </>
                    ) : (
                        <>
                            {isAdmin && (
                                <Link
                                    to="/admin/features"
                                    style={{
                                        padding: '10px 16px',
                                        background: '#2563eb',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        borderRadius: 8,
                                        fontSize: '0.9375rem',
                                        fontWeight: 500
                                    }}
                                >
                                    {t('admin')}
                                </Link>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {state.avatarUrl ? (
                                    <img src={state.avatarUrl} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                                ) : (
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
                                        {initials}
                                    </div>
                                )}
                                <span style={{ color: '#334155', fontSize: '0.9375rem', fontWeight: 500 }}>
                                    {(() => {
                                        console.log('[Header] Rendering name display:', { name: state.name, phone: state.phone })
                                        if (state.name && state.name.trim()) {
                                            return `Hi ${state.name}`
                                        } else if (state.phone) {
                                            return `Hi ${state.phone}`
                                        } else {
                                            return 'Hi User'
                                        }
                                    })()}
                                </span>
                            </div>
                            <button 
                                onClick={logout} 
                                style={{ 
                                    padding: '10px 16px', 
                                    borderRadius: 8, 
                                    border: '1px solid #cbd5e1', 
                                    background: '#f8fafc',
                                    fontSize: '0.9375rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                            >
                                {t('logout')}
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
