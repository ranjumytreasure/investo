import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { useLanguage } from '../state/LanguageContext'
import { useState } from 'react'

export default function Header() {
    const { state, dispatch } = useAuth()
    const navigate = useNavigate()
    const { language, setLanguage, t } = useLanguage()
    const isLoggedIn = !!state.token
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
            <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '12px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link to="/home" style={{ textDecoration: 'none', color: '#111827' }}>
                    <strong>Investo Pools</strong>
                </Link>
                <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Language Selector */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
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
                            <Link to="/login">{t('login')}</Link>
                            <Link to="/signup">{t('signup')}</Link>
                        </>
                    ) : (
                        <>
                            {isAdmin && (
                                <Link
                                    to="/admin/features"
                                    style={{
                                        padding: '6px 12px',
                                        background: '#2563eb',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        borderRadius: 6,
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}
                                >
                                    {t('admin')}
                                </Link>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {state.avatarUrl ? (
                                    <img src={state.avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                                ) : (
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                        {initials}
                                    </div>
                                )}
                                <span style={{ color: '#334155' }}>{state.name ?? state.phone}</span>
                            </div>
                            <button onClick={logout} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc' }}>{t('logout')}</button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
