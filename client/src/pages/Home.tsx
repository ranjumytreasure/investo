import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { useState, useEffect } from 'react'

interface Group {
    id: string
    name: string
    amount: number
    status: 'new' | 'inprogress' | 'closed'
    first_auction_date: string | null
    auction_frequency: string | null
    number_of_members: number | null
    created_by: string | null
    created_at: string
}

// Helper function to decode JWT token and get user ID
function getUserIdFromToken(token: string | null): string | null {
    if (!token) return null
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        const decoded = JSON.parse(jsonPayload)
        return decoded.sub || null
    } catch (e) {
        console.error('Error decoding token:', e)
        return null
    }
}

export default function Home() {
    const { state, dispatch } = useAuth()
    const navigate = useNavigate()
    const isLoggedIn = !!state.token
    const currentUserId = getUserIdFromToken(state.token)
    const [groupTab, setGroupTab] = useState<'all' | 'inprogress' | 'new' | 'closed'>('all')
    const [groups, setGroups] = useState<Group[]>([])
    const [allGroups, setAllGroups] = useState<Group[]>([]) // Store all groups for counts
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

    // Fetch all groups for counts
    useEffect(() => {
        if (isLoggedIn && state.token) {
            fetchAllGroups()
        } else if (!isLoggedIn) {
            // If not logged in, clear groups and stop loading
            setGroups([])
            setAllGroups([])
            setLoading(false)
        }
    }, [isLoggedIn, state.token])

    // Fetch filtered groups based on tab
    useEffect(() => {
        if (isLoggedIn && state.token) {
            fetchGroups()
        }
    }, [isLoggedIn, groupTab, state.token])

    async function fetchAllGroups() {
        if (!state.token) return
        try {
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${state.token}`
            }

            const response = await fetch('/groups', { headers })
            if (response.ok) {
                const data = await response.json()
                setAllGroups(data)
            } else if (response.status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token')
                localStorage.removeItem('phone')
                localStorage.removeItem('role')
                dispatch({ type: 'LOGOUT' })
            }
        } catch (err) {
            console.error('Error fetching all groups:', err)
        }
    }

    async function fetchGroups() {
        if (!state.token) {
            setLoading(false)
            setError('Not logged in')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${state.token}`
            }

            const url = groupTab === 'all'
                ? '/groups'
                : `/groups?status=${groupTab}`

            const response = await fetch(url, { headers })
            if (response.ok) {
                const data = await response.json()
                setGroups(data)
            } else if (response.status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token')
                localStorage.removeItem('phone')
                localStorage.removeItem('role')
                dispatch({ type: 'LOGOUT' })
                setError('Session expired. Please login again.')
            } else {
                setError('Failed to load groups')
            }
        } catch (err) {
            console.error('Error fetching groups:', err)
            setError('Failed to load groups')
        } finally {
            setLoading(false)
        }
    }

    async function handleDeleteGroup(groupId: string, groupName: string) {
        // Double confirmation
        const confirm1 = window.confirm(
            `Are you sure you want to delete the group "${groupName}"?\n\n` +
            `This will permanently delete:\n` +
            `- The group itself\n` +
            `- All user shares\n` +
            `- All features\n\n` +
            `This action cannot be undone.`
        )

        if (!confirm1) return

        const confirm2 = window.confirm('This is your final confirmation. Delete the group?')
        if (!confirm2) return

        setDeletingGroupId(groupId)
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/groups/${groupId}`, {
                method: 'DELETE',
                headers
            })

            if (response.ok) {
                alert('Group deleted successfully')
                // Refresh groups list
                fetchGroups()
                fetchAllGroups()
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete group' }))
                alert(errorData.message || 'Failed to delete group')
            }
        } catch (err) {
            console.error('Error deleting group:', err)
            alert('An error occurred while deleting the group')
        } finally {
            setDeletingGroupId(null)
        }
    }

    const counts = {
        all: allGroups.length,
        inprogress: allGroups.filter(g => g.status === 'inprogress').length,
        new: allGroups.filter(g => g.status === 'new').length,
        closed: allGroups.filter(g => g.status === 'closed').length
    }
    return (
        <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px' }}>
            {isLoggedIn && (
                <section style={{ marginBottom: 24 }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, background: '#ffffff' }}>
                        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Welcome{state.phone ? `, ${state.phone}` : ''} 👋</h2>
                        <p style={{ color: '#555', marginTop: 0 }}>Profile completion: <strong>5%</strong>. Update phone, address, and complete KYC to reach 100%. Only at 100% you can start a group.</p>
                        <div style={{ height: 10, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden', marginTop: 8 }}>
                            <div style={{ width: '5%', height: '100%', background: '#2563eb' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                            <Link to="/profile" style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8 }}>Update Profile</Link>
                            <Link to="/verify" style={{ padding: '10px 14px', background: '#16a34a', color: '#fff', borderRadius: 8, border: '1px solid #15803d' }}>Verify Account</Link>
                            <Link to="/groups/new" style={{ padding: '10px 14px', border: '1px solid #1e40af', background: '#2563eb', color: '#fff', borderRadius: 8 }}>Start a group</Link>
                        </div>
                    </div>
                </section>
            )}

            <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                <h3 style={{ marginTop: 0 }}>My groups</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setGroupTab('all')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 9999,
                            border: '1px solid #cbd5e1',
                            background: groupTab === 'all' ? '#2563eb' : '#f8fafc',
                            color: groupTab === 'all' ? '#fff' : '#0f172a',
                            cursor: 'pointer'
                        }}
                    >
                        All groups ({counts.all})
                    </button>
                    <button
                        onClick={() => setGroupTab('inprogress')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 9999,
                            border: '1px solid #cbd5e1',
                            background: groupTab === 'inprogress' ? '#2563eb' : '#f8fafc',
                            color: groupTab === 'inprogress' ? '#fff' : '#0f172a',
                            cursor: 'pointer'
                        }}
                    >
                        In‑progress groups ({counts.inprogress})
                    </button>
                    <button
                        onClick={() => setGroupTab('new')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 9999,
                            border: '1px solid #cbd5e1',
                            background: groupTab === 'new' ? '#2563eb' : '#f8fafc',
                            color: groupTab === 'new' ? '#fff' : '#0f172a',
                            cursor: 'pointer'
                        }}
                    >
                        New groups ({counts.new})
                    </button>
                    <button
                        onClick={() => setGroupTab('closed')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 9999,
                            border: '1px solid #cbd5e1',
                            background: groupTab === 'closed' ? '#2563eb' : '#f8fafc',
                            color: groupTab === 'closed' ? '#fff' : '#0f172a',
                            cursor: 'pointer'
                        }}
                    >
                        Closed groups ({counts.closed})
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading groups...</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>{error}</div>
                ) : groups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <p>No groups found.</p>
                        {isLoggedIn && (
                            <Link
                                to="/groups/new"
                                style={{
                                    display: 'inline-block',
                                    marginTop: 12,
                                    padding: '10px 16px',
                                    background: '#2563eb',
                                    color: '#fff',
                                    borderRadius: 8,
                                    textDecoration: 'none'
                                }}
                            >
                                Create Your First Group
                            </Link>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        {groups.map(group => {
                            const createdDate = new Date(group.created_at)
                            const formattedDate = createdDate.toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })
                            const amount = parseFloat(group.amount.toString())
                            const isCreatedByMe = currentUserId && group.created_by === currentUserId
                            const isJoinedGroup = !isCreatedByMe // If not created by me, it's a joined group

                            return (
                                <Link
                                    to={`/groups/${group.id}`}
                                    key={group.id}
                                    style={{
                                        textDecoration: 'none',
                                        color: 'inherit'
                                    }}
                                >
                                    <div
                                        style={{
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 12,
                                            padding: 16,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: isJoinedGroup ? '#f8fafc' : '#ffffff'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#2563eb'
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.1)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb'
                                            e.currentTarget.style.boxShadow = 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: '1.125rem', color: '#1e293b' }}>{group.name}</strong>
                                                {isCreatedByMe && (
                                                    <div style={{
                                                        display: 'inline-block',
                                                        marginLeft: 8,
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontSize: '0.7rem',
                                                        background: '#dbeafe',
                                                        color: '#1e40af',
                                                        fontWeight: 600
                                                    }}>
                                                        Created by me
                                                    </div>
                                                )}
                                                {isJoinedGroup && (
                                                    <div style={{
                                                        display: 'inline-block',
                                                        marginLeft: 8,
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontSize: '0.7rem',
                                                        background: '#dcfce7',
                                                        color: '#166534',
                                                        fontWeight: 600
                                                    }}>
                                                        Joined
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                background: group.status === 'new' ? '#eff6ff' :
                                                    group.status === 'inprogress' ? '#fef3c7' : '#f3f4f6',
                                                color: group.status === 'new' ? '#2563eb' :
                                                    group.status === 'inprogress' ? '#d97706' : '#6b7280'
                                            }}>
                                                {group.status === 'new' ? 'New' :
                                                    group.status === 'inprogress' ? 'In Progress' : 'Closed'}
                                            </span>
                                        </div>
                                        <p style={{ color: '#6b7280', margin: '4px 0', fontSize: '0.875rem' }}>
                                            Amount: <strong style={{ color: '#1e293b' }}>₹{amount.toLocaleString()}</strong>
                                        </p>
                                        {group.number_of_members && (
                                            <p style={{ color: '#6b7280', margin: '4px 0', fontSize: '0.875rem' }}>
                                                Members: <strong style={{ color: '#1e293b' }}>{group.number_of_members}</strong>
                                            </p>
                                        )}
                                        {group.first_auction_date && (
                                            <p style={{ color: '#6b7280', margin: '4px 0', fontSize: '0.875rem' }}>
                                                First Auction: <strong style={{ color: '#1e293b' }}>{new Date(group.first_auction_date).toLocaleDateString()}</strong>
                                            </p>
                                        )}
                                        <p style={{ color: '#9ca3af', margin: '8px 0 0', fontSize: '0.75rem' }}>
                                            Created: {formattedDate}
                                        </p>
                                        {isLoggedIn && (
                                            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <Link
                                                    to={`/groups/${group.id}/features`}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: '0.875rem',
                                                        background: '#f1f5f9',
                                                        color: '#1e293b',
                                                        borderRadius: 6,
                                                        textDecoration: 'none',
                                                        border: '1px solid #e2e8f0'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Manage Features
                                                </Link>
                                                {/* Show delete button only if group is new and created by current user */}
                                                {group.status === 'new' && isCreatedByMe && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleDeleteGroup(group.id, group.name)
                                                        }}
                                                        disabled={deletingGroupId === group.id}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.875rem',
                                                            background: deletingGroupId === group.id ? '#94a3b8' : '#dc2626',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: 6,
                                                            cursor: deletingGroupId === group.id ? 'not-allowed' : 'pointer',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {deletingGroupId === group.id ? 'Deleting...' : '🗑️ Delete'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </section>
            <section style={{ marginTop: 24 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#ffffff' }}>
                    <h2 style={{ marginTop: 0, marginBottom: 8 }}>Smart, trusted money pools with friends and community</h2>
                    <p style={{ color: '#555', marginTop: 0 }}>
                        Create or join rotating savings pools (chit-like) with automated schedules, transparent auctions, and instant notifications.
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                        <Link to="/signup" style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', borderRadius: 8, border: '1px solid #1e40af' }}>Get started</Link>
                        <Link to="/login" style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 8 }}>I already have an account</Link>
                    </div>
                </div>
            </section>
            <section style={{ marginTop: 24, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fcfcfd' }}>
                    <h3 style={{ marginTop: 0 }}>Transparent</h3>
                    <p style={{ color: '#555' }}>Live auction logs, member activity, and payout history for full trust.</p>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fcfcfd' }}>
                    <h3 style={{ marginTop: 0 }}>Flexible</h3>
                    <p style={{ color: '#555' }}>Set pool amount, tenure, and frequency that works for your group.</p>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fcfcfd' }}>
                    <h3 style={{ marginTop: 0 }}>Secure</h3>
                    <p style={{ color: '#555' }}>PIN-based login with OTP verification. Your data stays protected.</p>
                </div>
            </section>
        </div>
    )
}


