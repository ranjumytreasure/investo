import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { useLanguage } from '../state/LanguageContext'
import { useState, useEffect, useCallback } from 'react'
import LoadingBar from '../components/LoadingBar'
import AuctionParticipationModal from '../components/AuctionParticipationModal'
import { useSocket } from '../hooks/useSocket'

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
    auction_start_at?: string | null
    auction_end_at?: string | null
    auction_status?: 'open' | 'closed' | 'no_auction' // Auction status from group_accounts
}

interface LiveAuction {
    group_id: string
    group_name: string
    group_account_id: string
    minimum_bid: number
    commission: number
    group_amount: number
    opened_at: string
    auction_start_at: string
    auction_end_at: string
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
    const [groupView, setGroupView] = useState<'card' | 'list'>('card') // View mode: card or list
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
    const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([])
    const [participationModal, setParticipationModal] = useState<{
        groupId: string
        groupName: string
        groupAmount: number
        auctionStartAt: string
        auctionEndAt: string
    } | null>(null)
    const socket = useSocket()

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

    // Fetch live auctions
    async function fetchLiveAuctions() {
        if (!isLoggedIn) return
        
        try {
            const token = state.token || localStorage.getItem('token')
            const headers: Record<string, string> = {}
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            // Get all groups and check which ones have open auctions
            const response = await fetch('/groups', { headers })
            if (response.ok) {
                const allGroups: Group[] = await response.json()
                const liveAuctionsList: LiveAuction[] = []

                // Check each group for open auction
                for (const group of allGroups) {
                    if (group.auction_start_at && group.auction_end_at) {
                        const startTime = new Date(group.auction_start_at).getTime()
                        const endTime = new Date(group.auction_end_at).getTime()
                        const now = Date.now()

                        // If auction is currently open (between start and end)
                        if (now >= startTime && now <= endTime) {
                            try {
                                const auctionResponse = await fetch(`/groups/${group.id}/auction`, { headers })
                                if (auctionResponse.ok) {
                                    const auctionData = await auctionResponse.json()
                                    if (auctionData.status === 'open') {
                                        liveAuctionsList.push({
                                            group_id: group.id,
                                            group_name: group.name,
                                            group_account_id: auctionData.group_account_id,
                                            minimum_bid: auctionData.minimum_bid,
                                            commission: auctionData.commission,
                                            group_amount: group.amount,
                                            opened_at: auctionData.created_at,
                                            auction_start_at: group.auction_start_at,
                                            auction_end_at: group.auction_end_at
                                        })
                                    }
                                }
                            } catch (err) {
                                console.error(`Error fetching auction for group ${group.id}:`, err)
                            }
                        }
                    }
                }

                setLiveAuctions(liveAuctionsList)
            }
        } catch (err) {
            console.error('Error fetching live auctions:', err)
        }
    }

    // Set up WebSocket listeners for auction events
    useEffect(() => {
        if (!socket) return

        socket.on('auction:opened', async (data: LiveAuction) => {
            console.log('🎯 Auction opened event received:', data)
            
            // Verify auction is actually open by checking the API
            const token = state.token || localStorage.getItem('token')
            if (!token) return
            
            try {
                const auctionResponse = await fetch(`/groups/${data.group_id}/auction`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                
                if (auctionResponse.ok) {
                    const auctionData = await auctionResponse.json()
                    
                    // Only show modal if auction is actually open
                    if (auctionData.status === 'open') {
                        // Check if user is a member of this group
                        const userGroups = allGroups.filter(g => 
                            g.id === data.group_id && (
                                g.created_by === currentUserId ||
                                // Check if user has shares in this group
                                true // We'll check this properly when we have share data
                            )
                        )

                        if (userGroups.length > 0) {
                            // Show participation modal
                            setParticipationModal({
                                groupId: data.group_id,
                                groupName: data.group_name,
                                groupAmount: data.group_amount,
                                auctionStartAt: data.auction_start_at || auctionData.auction_start_at,
                                auctionEndAt: data.auction_end_at || auctionData.auction_end_at
                            })
                        }
                    } else {
                        console.log('⚠️ Auction opened event received but auction status is not open:', auctionData.status)
                    }
                }
            } catch (err) {
                console.error('Error verifying auction status:', err)
            }

            // Refresh live auctions list
            fetchLiveAuctions()
        })

        socket.on('auction:closed', (data: any) => {
            console.log('🔒 Auction closed event received:', data)
            
            // Close modal if it's for this group
            if (participationModal && participationModal.groupId === data.group_id) {
                setParticipationModal(null)
            }
            
            // Refresh live auctions list
            fetchLiveAuctions()
        })

        return () => {
            socket.off('auction:opened')
            socket.off('auction:closed')
        }
    }, [socket, allGroups, currentUserId, state.token, participationModal])

    // Fetch live auctions on mount and when groups change
    useEffect(() => {
        if (isLoggedIn && allGroups.length > 0) {
            fetchLiveAuctions()
        }
    }, [isLoggedIn, allGroups])

    // Periodic check to verify auction status and close modal if auction has closed
    useEffect(() => {
        if (!participationModal) return

        const checkInterval = setInterval(async () => {
            const token = state.token || localStorage.getItem('token')
            if (!token) return

            try {
                const auctionResponse = await fetch(`/groups/${participationModal.groupId}/auction`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (auctionResponse.ok) {
                    const auctionData = await auctionResponse.json()
                    
                    // Close modal if auction is no longer open
                    if (auctionData.status !== 'open') {
                        console.log('⚠️ Auction closed, closing modal')
                        setParticipationModal(null)
                    }
                }
            } catch (err) {
                console.error('Error checking auction status:', err)
            }
        }, 30000) // Check every 30 seconds

        return () => clearInterval(checkInterval)
    }, [participationModal, state.token])

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
                {/* Combined Welcome + Live Auctions Section */}
                {isLoggedIn ? (() => {
                    const completionPercentage = calculateProfileCompletion()
                    const canStartGroup = completionPercentage === 100
                    
                    return (
                        <section style={{ marginBottom: 24 }}>
                            <div style={{ 
                                border: '1px solid #e5e7eb',
                                borderRadius: 16,
                                padding: 24,
                                background: '#ffffff',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                            }}>
                                {/* Welcome Section */}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <div style={{ fontSize: '2rem' }}>👋</div>
                                        <div style={{ flex: 1 }}>
                                            <h2 style={{ margin: 0, marginBottom: 4, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                                                Welcome{state.phone ? `, ${state.phone}` : ''}
                                            </h2>
                                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                                                Profile completion: <strong style={{ color: '#1e293b' }}>{completionPercentage}%</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden', marginBottom: 16 }}>
                                        <div style={{ 
                                            width: `${completionPercentage}%`, 
                                            height: '100%', 
                                            background: completionPercentage === 100 ? '#16a34a' : '#2563eb',
                                            transition: 'width 0.3s ease',
                                            borderRadius: 9999
                                        }} />
                                    </div>
                                    <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.875rem', lineHeight: 1.6 }}>
                                        {completionPercentage < 100 ? (
                                            <>Update phone, address, and complete KYC to reach 100%. Only at 100% you can start a group.</>
                                        ) : (
                                            <>Your profile is complete! You can now start a group.</>
                                        )}
                                    </p>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <Link 
                                            to="/profile" 
                                            style={{ 
                                                padding: '8px 16px', 
                                                border: '1px solid #cbd5e1', 
                                                borderRadius: 8,
                                                fontSize: '0.875rem',
                                                textDecoration: 'none',
                                                color: '#475569',
                                                fontWeight: 500,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#f8fafc'
                                                e.currentTarget.style.borderColor = '#94a3b8'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent'
                                                e.currentTarget.style.borderColor = '#cbd5e1'
                                            }}
                                        >
                                            Update Profile
                                        </Link>
                                        <Link 
                                            to="/verify" 
                                            style={{ 
                                                padding: '8px 16px', 
                                                background: '#16a34a', 
                                                color: '#fff', 
                                                borderRadius: 8, 
                                                border: '1px solid #15803d',
                                                fontSize: '0.875rem',
                                                textDecoration: 'none',
                                                fontWeight: 500,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#15803d'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#16a34a'
                                            }}
                                        >
                                            Verify Account
                                        </Link>
                                        {canStartGroup ? (
                                            <Link 
                                                to="/groups/new" 
                                                style={{ 
                                                    padding: '8px 16px', 
                                                    border: '1px solid #1e40af', 
                                                    background: '#2563eb', 
                                                    color: '#fff', 
                                                    borderRadius: 8,
                                                    fontSize: '0.875rem',
                                                    textDecoration: 'none',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#1e40af'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#2563eb'
                                                }}
                                            >
                                                Start a group
                                            </Link>
                                        ) : (
                                            <button
                                                disabled
                                                style={{
                                                    padding: '8px 16px',
                                                    border: '1px solid #cbd5e1',
                                                    background: '#f1f5f9',
                                                    color: '#94a3b8',
                                                    borderRadius: 8,
                                                    cursor: 'not-allowed',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500
                                                }}
                                                title="Complete your profile to 100% to start a group"
                                            >
                                                Start a group
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )
                })() : null}

                {/* Main Layout: Content Area */}
                <div style={{ minWidth: 0 }}>

                    {/* My Groups Section */}
                    <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <h3 style={{ margin: 0 }}>{t('myGroups')}</h3>
                            
                            {/* View Toggle Buttons */}
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#f1f5f9', padding: 4, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <button
                                    onClick={() => setGroupView('card')}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: groupView === 'card' ? '#2563eb' : 'transparent',
                                        color: groupView === 'card' ? '#fff' : '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        transition: 'all 0.2s'
                                    }}
                                    title="Card View"
                                >
                                    <span>⬜</span>
                                    <span>Card</span>
                                </button>
                                <button
                                    onClick={() => setGroupView('list')}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: groupView === 'list' ? '#2563eb' : 'transparent',
                                        color: groupView === 'list' ? '#fff' : '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        transition: 'all 0.2s'
                                    }}
                                    title="List View"
                                >
                                    <span>☰</span>
                                    <span>List</span>
                                </button>
                            </div>
                        </div>
                        
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
                                {t('inProgress')} ({counts.inprogress})
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
                                <div style={groupView === 'card' 
                                    ? { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }
                                    : { display: 'flex', flexDirection: 'column', gap: 12 }
                                }>
                                    {groups.map(group => {
                                        const createdDate = new Date(group.created_at)
                                        const formattedDate = createdDate.toLocaleDateString('en-US', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })
                                        const pendingMembers = group.pending_members || 0
                                        const addedMembers = group.added_members || 0
                                        const amount = parseFloat(group.amount.toString())
                                        const isCreatedByMe = currentUserId && group.created_by === currentUserId
                                        const isJoinedGroup = !isCreatedByMe
                                        
                                        // List view layout
                                        if (groupView === 'list') {
                                            return (
                                                <Link
                                                    to={`/groups/${group.id}`}
                                                    key={group.id}
                                                    style={{
                                                        textDecoration: 'none',
                                                        color: 'inherit',
                                                        display: 'block'
                                                    }}
                                                >
                                                    <div style={{
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: 12,
                                                        padding: 16,
                                                        background: isJoinedGroup ? '#f8fafc' : '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 16,
                                                        transition: 'all 0.2s',
                                                        cursor: 'pointer'
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
                                                        {/* Group Name */}
                                                        <div style={{ flex: '0 0 200px', minWidth: 0 }}>
                                                            <h4 style={{ 
                                                                margin: 0, 
                                                                fontSize: '1rem', 
                                                                fontWeight: 700, 
                                                                color: '#1e293b',
                                                                marginBottom: 4
                                                            }}>
                                                                {group.name}
                                                            </h4>
                                                            <p style={{ 
                                                                margin: 0, 
                                                                fontSize: '0.75rem', 
                                                                color: '#64748b' 
                                                            }}>
                                                                Created: {formattedDate}
                                                            </p>
                                                        </div>

                                                        {/* Status Badge */}
                                                        <div style={{ flex: '0 0 100px' }}>
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

                                                        {/* Amount */}
                                                        <div style={{ flex: '0 0 120px', textAlign: 'right' }}>
                                                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 2 }}>Amount</div>
                                                            <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 700 }}>
                                                                ₹{amount.toLocaleString()}
                                                            </div>
                                                        </div>

                                                        {/* Members */}
                                                        <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
                                                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 2 }}>Members</div>
                                                            <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 600 }}>
                                                                {group.number_of_members || 0}
                                                            </div>
                                                        </div>

                                                        {/* First Auction */}
                                                        {group.first_auction_date && (
                                                            <div style={{ flex: '0 0 120px', textAlign: 'right' }}>
                                                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 2 }}>First Auction</div>
                                                                <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 600 }}>
                                                                    {new Date(group.first_auction_date).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Auction Status Badge for inprogress groups */}
                                                        {group.status === 'inprogress' && group.auction_status && (
                                                            <div style={{ flex: '0 0 auto' }}>
                                                                {group.auction_status === 'open' ? (
                                                                    <div
                                                                        className="live-auction-open"
                                                                        style={{
                                                                            padding: '6px 12px',
                                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                            color: '#fff',
                                                                            borderRadius: 6,
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 700,
                                                                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                                                                            whiteSpace: 'nowrap',
                                                                            animation: 'live-auction-pulse 2s infinite',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 6
                                                                        }}
                                                                    >
                                                                        <span style={{ 
                                                                            animation: 'live-auction-blink 1.5s infinite'
                                                                        }}>🔴</span>
                                                                        <span style={{ animation: 'live-auction-text-glow 2s infinite' }}>
                                                                            LIVE
                                                                        </span>
                                                                    </div>
                                                                ) : group.auction_status === 'closed' ? (
                                                                    <div
                                                                        style={{
                                                                            padding: '6px 12px',
                                                                            background: '#fee2e2',
                                                                            color: '#dc2626',
                                                                            borderRadius: 6,
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 700,
                                                                            border: '2px solid #dc2626',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                    >
                                                                        Closed
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        )}

                                                        {/* Actions */}
                                                        <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            {isLoggedIn && (
                                                                <>
                                                                    {group.status === 'inprogress' ? (
                                                                        <Link
                                                                            to={`/groups/${group.id}`}
                                                                            style={{
                                                                                padding: '8px 16px',
                                                                                fontSize: '0.75rem',
                                                                                background: group.auction_status === 'open' 
                                                                                    ? 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'
                                                                                    : '#2563eb',
                                                                                color: '#fff',
                                                                                borderRadius: 6,
                                                                                textDecoration: 'none',
                                                                                fontWeight: 700,
                                                                                whiteSpace: 'nowrap',
                                                                                boxShadow: group.auction_status === 'open' 
                                                                                    ? '0 4px 12px rgba(37, 99, 235, 0.4)'
                                                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                                                                                animation: group.auction_status === 'open' 
                                                                                    ? 'live-auction-button-pulse 2s infinite' 
                                                                                    : 'none',
                                                                                transition: 'all 0.2s'
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.transform = 'translateY(-2px)'
                                                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)'
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.transform = 'translateY(0)'
                                                                                e.currentTarget.style.boxShadow = group.auction_status === 'open' 
                                                                                    ? '0 4px 12px rgba(37, 99, 235, 0.4)'
                                                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)'
                                                                            }}
                                                                        >
                                                                            {group.auction_status === 'open' ? '🚀 Participate' : 'View'}
                                                                        </Link>
                                                                    ) : group.status === 'new' ? (
                                                                        // For new groups, only show "Add X members" button if there are pending members
                                                                        pendingMembers > 0 ? (
                                                                            <Link
                                                                                to={`/groups/${group.id}`}
                                                                                className="pending-members-button"
                                                                                style={{
                                                                                    display: 'inline-block',
                                                                                    padding: '8px 16px',
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
                                                                                Add {pendingMembers} member{pendingMembers !== 1 ? 's' : ''}
                                                                            </Link>
                                                                        ) : null
                                                                    ) : (
                                                                        // For closed groups, show Manage Features and Delete (if creator)
                                                                        <>
                                                                            <Link
                                                                                to={`/groups/${group.id}/features`}
                                                                                style={{
                                                                                    padding: '6px 12px',
                                                                                    fontSize: '0.75rem',
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
                                                                                        fontSize: '0.75rem',
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
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        }
                                        
                                        // Card view layout (existing)
                                        return (
                                            <Link
                                                to={`/groups/${group.id}`}
                                                key={group.id}
                                                style={{
                                                    textDecoration: 'none',
                                                    color: 'inherit'
                                                }}
                                            >
                                                <div style={{
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
                                                {/* Group Name, Manage Features, Delete Button Row */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', flex: 1, lineHeight: 1.3 }}>
                                                        {group.name}
                                                    </h4>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Link
                                                            to={`/groups/${group.id}/features`}
                                                            style={{
                                                                padding: '6px 12px',
                                                                background: '#f1f5f9',
                                                                color: '#475569',
                                                                borderRadius: 6,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                textDecoration: 'none',
                                                                border: '1px solid #e2e8f0'
                                                            }}
                                                        >
                                                            Manage Features
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteGroup(group.id, group.name)}
                                                            disabled={deletingGroupId === group.id}
                                                            style={{
                                                                padding: '6px 12px',
                                                                background: deletingGroupId === group.id ? '#f1f5f9' : '#fee2e2',
                                                                color: deletingGroupId === group.id ? '#94a3b8' : '#dc2626',
                                                                borderRadius: 6,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                border: '1px solid #fecaca',
                                                                cursor: deletingGroupId === group.id ? 'not-allowed' : 'pointer'
                                                            }}
                                                        >
                                                            {deletingGroupId === group.id ? 'Deleting...' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Created Date */}
                                                <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#64748b' }}>
                                                    Created: {formattedDate}
                                                </p>

                                                {/* Amount, Members, First Auction, Add Members Row */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                                                    <div style={{ fontSize: '0.875rem' }}>
                                                        <span style={{ color: '#64748b' }}>Amount: </span>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{group.amount.toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.875rem' }}>
                                                        <span style={{ color: '#64748b' }}>Members: </span>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{group.number_of_members || 0}</span>
                                                    </div>
                                                    {group.first_auction_date && (
                                                        <div style={{ fontSize: '0.875rem' }}>
                                                            <span style={{ color: '#64748b' }}>First Auction: </span>
                                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                                {new Date(group.first_auction_date).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Auction Status and View Button for inprogress groups */}
                                                {group.status === 'inprogress' ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        {/* Auction Status */}
                                                        {group.auction_status === 'open' ? (
                                                            <div
                                                                className="live-auction-open"
                                                                style={{
                                                                    padding: '10px 16px',
                                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                    color: '#fff',
                                                                    borderRadius: 8,
                                                                    textAlign: 'center',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: 700,
                                                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                                                                    position: 'relative',
                                                                    overflow: 'hidden',
                                                                    animation: 'live-auction-pulse 2s infinite'
                                                                }}
                                                            >
                                                                <span style={{ 
                                                                    display: 'inline-block',
                                                                    animation: 'live-auction-blink 1.5s infinite',
                                                                    marginRight: 8
                                                                }}>🔴</span>
                                                                <span style={{ animation: 'live-auction-text-glow 2s infinite' }}>
                                                                    LIVE AUCTION OPEN
                                                                </span>
                                                            </div>
                                                        ) : group.auction_status === 'closed' ? (
                                                            <div
                                                                style={{
                                                                    padding: '10px 16px',
                                                                    background: '#fee2e2',
                                                                    color: '#dc2626',
                                                                    borderRadius: 8,
                                                                    textAlign: 'center',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: 700,
                                                                    border: '2px solid #dc2626'
                                                                }}
                                                            >
                                                                Live Auction Closed
                                                            </div>
                                                        ) : null}
                                                        
                                                        {/* View Button */}
                                                        <Link
                                                            to={`/groups/${group.id}`}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 16px',
                                                                background: group.auction_status === 'open' 
                                                                    ? 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'
                                                                    : '#2563eb',
                                                                color: '#fff',
                                                                borderRadius: 8,
                                                                textAlign: 'center',
                                                                textDecoration: 'none',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 700,
                                                                transition: 'all 0.2s',
                                                                boxShadow: group.auction_status === 'open' 
                                                                    ? '0 4px 12px rgba(37, 99, 235, 0.4)'
                                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                                                                animation: group.auction_status === 'open' 
                                                                    ? 'live-auction-button-pulse 2s infinite' 
                                                                    : 'none'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#1e40af'
                                                                e.currentTarget.style.transform = 'translateY(-2px)'
                                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = group.auction_status === 'open' 
                                                                    ? 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'
                                                                    : '#2563eb'
                                                                e.currentTarget.style.transform = 'translateY(0)'
                                                                e.currentTarget.style.boxShadow = group.auction_status === 'open' 
                                                                    ? '0 4px 12px rgba(37, 99, 235, 0.4)'
                                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)'
                                                            }}
                                                        >
                                                            {group.auction_status === 'open' ? '🚀 Participate Now' : 'View'}
                                                        </Link>
                                                    </div>
                                                ) : group.status === 'new' ? (
                                                    // For new groups, only show "Add X members" button if there are pending members
                                                    pendingMembers > 0 ? (
                                                        <button
                                                            onClick={() => navigate(`/groups/${group.id}`)}
                                                            className="pending-members-button"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 16px',
                                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: 8,
                                                                fontSize: '0.875rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                                            }}
                                                        >
                                                            Add {pendingMembers} member{pendingMembers !== 1 ? 's' : ''}
                                                        </button>
                                                    ) : null
                                                ) : (
                                                    // For closed groups, show View and Details buttons
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Link
                                                            to={`/groups/${group.id}`}
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px 12px',
                                                                background: '#2563eb',
                                                                color: '#fff',
                                                                borderRadius: 6,
                                                                textAlign: 'center',
                                                                textDecoration: 'none',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600,
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#1e40af'
                                                                e.currentTarget.style.transform = 'translateY(-1px)'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#2563eb'
                                                                e.currentTarget.style.transform = 'translateY(0)'
                                                            }}
                                                        >
                                                            View
                                                        </Link>
                                                        <Link
                                                            to={`/groups/${group.id}`}
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px 12px',
                                                                background: '#f1f5f9',
                                                                color: '#475569',
                                                                borderRadius: 6,
                                                                textAlign: 'center',
                                                                textDecoration: 'none',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600,
                                                                border: '1px solid #cbd5e1',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#e2e8f0'
                                                                e.currentTarget.style.borderColor = '#94a3b8'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#f1f5f9'
                                                                e.currentTarget.style.borderColor = '#cbd5e1'
                                                            }}
                                                        >
                                                            Details
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
                    </div>


            {/* Participation Modal */}
            {participationModal && (
                <AuctionParticipationModal
                    groupId={participationModal.groupId}
                    groupName={participationModal.groupName}
                    groupAmount={participationModal.groupAmount}
                    auctionStartAt={participationModal.auctionStartAt}
                    auctionEndAt={participationModal.auctionEndAt}
                    onClose={() => setParticipationModal(null)}
                />
            )}

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


