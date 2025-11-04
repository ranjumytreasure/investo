import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { useLanguage } from '../state/LanguageContext'
import { useState, useEffect, useCallback } from 'react'
import LoadingBar from '../components/LoadingBar'

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
    added_members?: number
    pending_members?: number
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
    const { t } = useLanguage()
    const navigate = useNavigate()
    // Check both state.token and localStorage for token (in case state hasn't updated yet)
    const tokenFromStorage = localStorage.getItem('token')
    const isLoggedIn = !!(state.token || tokenFromStorage)
    const currentToken = state.token || tokenFromStorage
    const currentUserId = getUserIdFromToken(currentToken)
    
    console.log('[Home] Auth state:', {
        stateToken: !!state.token,
        storageToken: !!tokenFromStorage,
        isLoggedIn,
        phone: state.phone
    })
    const [groupTab, setGroupTab] = useState<'all' | 'inprogress' | 'new' | 'closed'>('all')
    const [groups, setGroups] = useState<Group[]>([])
    const [allGroups, setAllGroups] = useState<Group[]>([]) // Store all groups for counts
    const [loading, setLoading] = useState(true)
    
    // Safety timeout to prevent infinite loading
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('Loading timeout - forcing loading state to false')
                setLoading(false)
            }
        }, 10000) // 10 second timeout
        
        return () => clearTimeout(timeout)
    }, [loading])
    const [error, setError] = useState<string | null>(null)
    const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)
    const [showScrollTop, setShowScrollTop] = useState(false)
    const [profileData, setProfileData] = useState<{
        name: string | null
        email: string | null
        phone: string | null
        kyc_verified: boolean
        addressCount: number
    } | null>(null)

    // Fetch all groups for counts
    useEffect(() => {
        const token = state.token || localStorage.getItem('token')
        if (isLoggedIn && token) {
            fetchAllGroups()
        } else {
            // If not logged in, clear groups and stop loading
            setGroups([])
            setAllGroups([])
            setLoading(false)
        }
    }, [isLoggedIn, state.token])

    const fetchProfileData = useCallback(async () => {
        const token = state.token || localStorage.getItem('token')
        if (!token) return
        try {
            const response = await fetch('/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setProfileData({
                    name: data.user?.name || null,
                    email: data.user?.email || null,
                    phone: data.user?.phone || null,
                    kyc_verified: data.user?.kyc_verified || false,
                    addressCount: data.addresses?.length || 0
                })
            }
        } catch (err) {
            console.error('Error fetching profile data:', err)
        }
    }, [state.token])

    // Fetch filtered groups based on tab
    useEffect(() => {
        const token = state.token || localStorage.getItem('token')
        console.log('[Home] Fetch groups effect triggered:', { isLoggedIn, hasStateToken: !!state.token, hasStorageToken: !!localStorage.getItem('token'), groupTab })
        if (isLoggedIn && token) {
            console.log('[Home] Calling fetchGroups')
            fetchGroups()
        } else if (!isLoggedIn) {
            // If not logged in, stop loading
            setLoading(false)
            console.log('[Home] Not logged in in fetchGroups effect, stopping loading')
        }
    }, [isLoggedIn, groupTab, state.token])

    // Fetch profile data for completion percentage
    useEffect(() => {
        if (isLoggedIn && state.token) {
            fetchProfileData()
        }
    }, [isLoggedIn, state.token, fetchProfileData])

    // Refresh profile data when page becomes visible (user returns from profile page)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isLoggedIn && state.token) {
                fetchProfileData()
            }
        }
        
        const handleFocus = () => {
            if (isLoggedIn && state.token) {
                fetchProfileData()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleFocus)
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleFocus)
        }
    }, [isLoggedIn, state.token, fetchProfileData])

    // Handle scroll to show/hide scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            // Show button when user has scrolled down more than 300px
            const scrollPosition = window.scrollY || document.documentElement.scrollTop
            setShowScrollTop(scrollPosition > 300)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    function calculateProfileCompletion(): number {
        if (!profileData) return 5 // Default minimum
        
        let percentage = 0
        
        // Phone: 20% (required, they're logged in)
        if (profileData.phone) percentage += 20
        
        // Name: 20%
        if (profileData.name && profileData.name.trim()) percentage += 20
        
        // Email: 20%
        if (profileData.email && profileData.email.trim()) percentage += 20
        
        // Address: 20% (at least one address)
        if (profileData.addressCount > 0) percentage += 20
        
        // KYC Verified: 20%
        if (profileData.kyc_verified) percentage += 20
        
        return Math.min(percentage, 100)
    }

    async function fetchAllGroups() {
        const token = state.token || localStorage.getItem('token')
        if (!token) {
            setLoading(false)
            return
        }
        try {
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${token}`
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
                setLoading(false)
            }
        } catch (err) {
            console.error('Error fetching all groups:', err)
            setLoading(false)
        }
    }

    async function fetchGroups() {
        const token = state.token || localStorage.getItem('token')
        if (!token) {
            setLoading(false)
            setError('Not logged in')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${token}`
            }

            const url = groupTab === 'all'
                ? '/groups'
                : `/groups?status=${groupTab}`

            console.log('[Home] Fetching groups from:', url)
            const response = await fetch(url, { headers })
            console.log('[Home] Groups response status:', response.status)
            
            if (response.ok) {
                const data = await response.json()
                console.log('[Home] Groups data received:', data?.length || 0, 'groups')
                setGroups(data || [])
            } else if (response.status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token')
                localStorage.removeItem('phone')
                localStorage.removeItem('role')
                dispatch({ type: 'LOGOUT' })
                setError('Session expired. Please login again.')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to load groups' }))
                console.error('[Home] Error loading groups:', errorData)
                setError(errorData.message || 'Failed to load groups')
            }
        } catch (err) {
            console.error('[Home] Error fetching groups:', err)
            setError('Failed to load groups')
        } finally {
            setLoading(false)
            console.log('[Home] Loading set to false')
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
    
    // Debug logging
    console.log('[Home] Render state:', {
        loading,
        error,
        isLoggedIn,
        groupsCount: groups.length,
        allGroupsCount: allGroups.length,
        hasToken: !!state.token
    })
    
    return (
        <>
            {loading && <LoadingBar />}
            <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px' }}>
            {isLoggedIn ? (() => {
                const completionPercentage = calculateProfileCompletion()
                const canStartGroup = completionPercentage === 100
                
                return (
                    <section style={{ marginBottom: 24 }}>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, background: '#ffffff' }}>
                            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Welcome{state.phone ? `, ${state.phone}` : ''} 👋</h2>
                            <p style={{ color: '#555', marginTop: 0 }}>
                                Profile completion: <strong>{completionPercentage}%</strong>. 
                                {completionPercentage < 100 ? (
                                    <> Update phone, address, and complete KYC to reach 100%. Only at 100% you can start a group.</>
                                ) : (
                                    <> Your profile is complete! You can now start a group.</>
                                )}
                            </p>
                            <div style={{ height: 10, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden', marginTop: 8 }}>
                                <div style={{ 
                                    width: `${completionPercentage}%`, 
                                    height: '100%', 
                                    background: completionPercentage === 100 ? '#16a34a' : '#2563eb',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                                <Link to="/profile" style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8 }}>Update Profile</Link>
                                <Link to="/verify" style={{ padding: '10px 14px', background: '#16a34a', color: '#fff', borderRadius: 8, border: '1px solid #15803d' }}>Verify Account</Link>
                                {canStartGroup ? (
                                    <Link to="/groups/new" style={{ padding: '10px 14px', border: '1px solid #1e40af', background: '#2563eb', color: '#fff', borderRadius: 8 }}>Start a group</Link>
                                ) : (
                                    <button
                                        disabled
                                        style={{
                                            padding: '10px 14px',
                                            border: '1px solid #cbd5e1',
                                            background: '#f1f5f9',
                                            color: '#94a3b8',
                                            borderRadius: 8,
                                            cursor: 'not-allowed'
                                        }}
                                        title="Complete your profile to 100% to start a group"
                                    >
                                        Start a group
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                )
            })() : null}

            <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                <h3 style={{ marginTop: 0 }}>{t('myGroups')}</h3>
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
                        {t('allGroups')} ({counts.all})
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
                        {t('inProgressGroups')} ({counts.inprogress})
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
                        {t('newGroups')} ({counts.new})
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
                        {t('closedGroups')} ({counts.closed})
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>{t('loadingGroups')}</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>{error}</div>
                ) : groups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <p>{t('noGroupsFound')}</p>
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
                                {t('createFirstGroup')}
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
                                        {/* Group name, Manage Features, and Delete button in one row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
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
                                                        {t('createdByMe')}
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
                                                        {t('joined')}
                                                    </div>
                                                )}
                                            </div>
                                            {isLoggedIn && (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <Link
                                                        to={`/groups/${group.id}/features`}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.875rem',
                                                            background: '#f1f5f9',
                                                            color: '#1e293b',
                                                            borderRadius: 6,
                                                            textDecoration: 'none',
                                                            border: '1px solid #e2e8f0',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {t('manageFeatures')}
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
                                                            fontWeight: 500,
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {deletingGroupId === group.id ? 'Deleting...' : `🗑️ ${t('delete')}`}
                                                    </button>
                                                )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Status badge and created date */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.75rem' }}>
                                                {t('created')}: {formattedDate}
                                            </p>
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
                                                {group.status === 'new' ? t('new') :
                                                    group.status === 'inprogress' ? t('inProgress') : t('closed')}
                                            </span>
                                        </div>
                                        
                                        {/* Amount, Members, First Auction, and Add Members Button in row layout */}
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: group.pending_members && group.pending_members > 0 
                                                ? 'repeat(auto-fit, minmax(100px, 1fr))' 
                                                : 'repeat(auto-fit, minmax(100px, 1fr))', 
                                            gap: 12,
                                            marginTop: 8,
                                            padding: '12px',
                                            background: '#f8fafc',
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <div>
                                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>{t('amount')}</div>
                                                <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 600 }}>
                                                    ₹{amount.toLocaleString()}
                                                </div>
                                            </div>
                                            {group.number_of_members && (
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>{t('members')}</div>
                                                    <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 600 }}>
                                                        {group.number_of_members}
                                                    </div>
                                                </div>
                                            )}
                                            {group.first_auction_date && (
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>{t('firstAuction')}</div>
                                                    <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 600 }}>
                                                        {new Date(group.first_auction_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Add Pending Members Button */}
                                            {group.pending_members && group.pending_members > 0 && (
                                                <div style={{ gridColumn: group.first_auction_date ? 'span 1' : 'span 1' }}>
                                                    <Link
                                                        to={`/groups/${group.id}`}
                                                        className="pending-members-button"
                                                        style={{
                                                            display: 'block',
                                                            padding: '10px 12px',
                                                            fontSize: '0.75rem',
                                                            background: '#10b981',
                                                            color: '#fff',
                                                            borderRadius: 8,
                                                            textDecoration: 'none',
                                                            textAlign: 'center',
                                                            fontWeight: 600,
                                                            border: '1px solid #059669',
                                                            transition: 'all 0.2s',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#059669'
                                                            e.currentTarget.style.animation = 'none'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#10b981'
                                                            e.currentTarget.style.animation = 'pulse-glow-bounce 2.5s ease-in-out infinite'
                                                        }}
                                                    >
                                                        {t('addMember')} {group.pending_members} {t('member')}
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </section>
            <section style={{ marginTop: 24 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#ffffff' }}>
                    <h2 style={{ marginTop: 0, marginBottom: 8 }}>{t('smartPools')}</h2>
                    <p style={{ color: '#555', marginTop: 0 }}>
                        Create or join rotating savings pools (chit-like) with automated schedules, transparent auctions, and instant notifications.
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                        <Link to="/signup" style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', borderRadius: 8, border: '1px solid #1e40af' }}>{t('getStarted')}</Link>
                        <Link to="/login" style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 8 }}>{t('alreadyHaveAccount')}</Link>
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
            
            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                        transition: 'all 0.3s ease',
                        zIndex: 1000,
                        fontWeight: 'bold'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1e40af'
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#2563eb'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)'
                    }}
                    aria-label="Scroll to top"
                >
                    ↑
                </button>
            )}
        </div>
        </>
    )
}


