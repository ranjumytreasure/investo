import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function Header() {
    const { state, dispatch } = useAuth()
    const navigate = useNavigate()
    const isLoggedIn = !!state.token
    const isAdmin = state.role === 'admin' || state.role === 'productowner'
    const initials = (state.name?.trim()?.[0] ?? state.phone?.trim()?.[0] ?? '?').toUpperCase()

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
                    {!isLoggedIn ? (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/signup">Sign up</Link>
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
                                    Admin
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
                            <button onClick={logout} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc' }}>Logout</button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
