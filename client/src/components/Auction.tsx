import { useState, useEffect } from 'react'
import { useAuth } from '../state/AuthContext'
import { useSocket } from '../hooks/useSocket'

interface AuctionBid {
    id: string
    amount: number
    user: {
        id: string
        name: string | null
        phone: string
    } | null
    share: {
        id: string
        share_no: number
        share_percent: number
    } | null
    is_winning_bid: boolean
    created_at: string
}

interface AuctionStatus {
    status: 'no_auction' | 'open' | 'closed' | 'completed'
    group_account_id: string | null
    minimum_bid: number
    commission: number
    current_winning_bid: AuctionBid | null
    all_bids: AuctionBid[]
    auction_amount: number
    winner_share_id: string | null
    auction_start_at: string | null
    auction_end_at: string | null
    created_at: string | null
    updated_at: string | null
    message?: string
}

interface AuctionProps {
    groupId: string
    userShares: Array<{
        id: string
        share_no: number
        share_percent: number
        status: string
        user_id: string | null
    }>
}

export default function Auction({ groupId, userShares }: AuctionProps) {
    const { state } = useAuth()
    const socket = useSocket()
    const [auctionStatus, setAuctionStatus] = useState<AuctionStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [bidding, setBidding] = useState(false)
    const [bidAmount, setBidAmount] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [hasFetchedOnClose, setHasFetchedOnClose] = useState(false)

    // Get user's active shares for bidding
    const activeShares = userShares.filter(
        share => share.status === 'accepted' || share.status === 'active'
    )
    
    // Debug: Log shares to help troubleshoot
    console.log('[Auction Status] User shares:', userShares.length, 'Active shares:', activeShares.length)

    // Fetch auction status
    useEffect(() => {
        fetchAuctionStatus()
    }, [groupId])

    // Note: No need for scroll behavior here since this is now a dedicated page

    // Set up WebSocket listeners
    useEffect(() => {
        if (!socket) return

        // Join group room and user room for notifications
        const currentUserId = state.token ? getUserIdFromToken(state.token) : undefined
        socket.emit('auction:join', { 
            group_id: groupId,
            user_id: currentUserId
        })
        console.log('[Auction Status] Joined auction room for group:', groupId, 'user:', currentUserId)

        // Listen for auction opened
        socket.on('auction:opened', (data: any) => {
            if (data.group_id === groupId) {
                console.log('[Auction Status] Auction opened for group:', groupId)
                setHasFetchedOnClose(false)
                fetchAuctionStatus(true) // Silent fetch to prevent flickering
            }
        })

        // Listen for new bids
        socket.on('auction:bid', (data: any) => {
            if (data.group_id === groupId) {
                console.log('[Auction Status] New bid received:', data.amount, 'by', data.user_name)
                // Refresh auction status silently to prevent flickering
                fetchAuctionStatus(true)
            }
        })

        // Listen for auction closed
        socket.on('auction:closed', (data: any) => {
            if (data.group_id === groupId) {
                console.log('[Auction Status] Auction closed for group:', groupId)
                setHasFetchedOnClose(true)
                fetchAuctionStatus(true) // Silent fetch to prevent flickering
            }
        })

        return () => {
            socket.emit('auction:leave', { group_id: groupId })
            socket.off('auction:opened')
            socket.off('auction:bid')
            socket.off('auction:closed')
        }
    }, [socket, groupId, state.token])

    // Update countdown timer - optimized to reduce flickering
    useEffect(() => {
        const endAt = auctionStatus?.auction_end_at
        const status = auctionStatus?.status
        
        if (!endAt || status !== 'open') {
            setTimeLeft(null)
            if (status !== 'open') {
                setHasFetchedOnClose(false)
            }
            return
        }

        // Reset fetch flag when auction becomes open
        setHasFetchedOnClose(false)

        const updateTimer = () => {
            const now = new Date().getTime()
            const endTime = new Date(endAt).getTime()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000 / 60)) // minutes
            
            // Only update state if value changed (prevents unnecessary re-renders)
            setTimeLeft(prev => prev !== remaining ? remaining : prev)
            
            // If time is up, fetch once silently
            if (remaining === 0 && now >= endTime) {
                setHasFetchedOnClose(prev => {
                    if (prev) return prev // Already fetched
                    
                    // Fetch silently without loading state
                    const token = state.token || localStorage.getItem('token')
                    fetch(`/groups/${groupId}/auction`, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            ...(token && { 'Authorization': `Bearer ${token}` })
                        }
                    })
                        .then(res => res.ok ? res.json() : null)
                        .then(data => {
                            if (data && data.status) {
                                setAuctionStatus(data)
                            }
                        })
                        .catch(() => {}) // Silent error handling
                    
                    return true
                })
            }
        }

        // Initial update
        updateTimer()
        
        // Update every 60 seconds to reduce flickering (since we're showing minutes anyway)
        const interval = setInterval(updateTimer, 60000)

        return () => clearInterval(interval)
    }, [auctionStatus?.auction_end_at, auctionStatus?.status, groupId, state.token])

    async function fetchAuctionStatus(silent = false) {
        try {
            if (!silent) {
                setLoading(true)
            }
            const token = state.token || localStorage.getItem('token')
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }
            
            const response = await fetch(`/groups/${groupId}/auction`, { headers })
            if (response.ok) {
                const data = await response.json()
                console.log('[Auction Status] Fetched auction data:', data)
                setAuctionStatus(data)
                // Reset fetch flag if auction is closed
                if (data.status === 'closed') {
                    setHasFetchedOnClose(true)
                }
            } else {
                console.log('[Auction Status] Failed to fetch auction status:', response.status)
                if (!silent) {
                    setAuctionStatus(null)
                }
            }
        } catch (err) {
            console.error('[Auction Status] Error fetching auction status:', err)
            if (!silent) {
                setAuctionStatus(null)
            }
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }

    async function handlePlaceBid(e: React.FormEvent) {
        e.preventDefault()
        if (!state.token || !bidAmount || activeShares.length === 0) return

        // Automatically use the first active share
        const shareToUse = activeShares[0]

        setBidding(true)
        setError(null)

        try {
            const response = await fetch(`/groups/${groupId}/auction/bid`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(bidAmount),
                    group_usershare_id: shareToUse.id
                })
            })

            const data = await response.json()

            if (response.ok) {
                console.log('[Auction Status] Bid placed successfully:', data.bid)
                setBidAmount('')
                setError(null)
                // Refresh auction status to show new bid
                await fetchAuctionStatus()
            } else {
                setError(data.message || 'Failed to place bid')
            }
        } catch (err) {
            // Silent error handling
            setError('Failed to place bid')
        } finally {
            setBidding(false)
        }
    }

    if (loading) {
        return (
            <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading auction status...</div>
            </div>
        )
    }

    if (!auctionStatus || auctionStatus.status === 'no_auction') {
        return (
            <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 20,
                background: '#f8fafc',
                marginTop: 20
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
                    🎯 Auction
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                    No auction scheduled or active for this group.
                </p>
            </div>
        )
    }

    const isOpen = auctionStatus.status === 'open'
    const isClosed = auctionStatus.status === 'closed' || auctionStatus.status === 'completed'

    return (
        <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 24,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.25rem', 
                    fontWeight: 700, 
                    color: '#1e293b',
                    wordBreak: 'break-word'
                }}>
                    🎯 Live Auction
                </h3>
                <span style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: isOpen ? '#dcfce7' : auctionStatus.status === 'closed' ? '#fee2e2' : '#f3f4f6',
                    color: isOpen ? '#16a34a' : auctionStatus.status === 'closed' ? '#dc2626' : '#6b7280',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                }}>
                    {isOpen ? '🟢 OPEN' : auctionStatus.status === 'closed' ? '🔴 AUCTION CLOSED' : '🔴 CLOSED'}
                </span>
            </div>

            <div style={{ marginBottom: 20 }}>
                {/* Auction Start/End Times and Countdown */}
                {(auctionStatus.auction_start_at || auctionStatus.auction_end_at) && (
                    <div style={{ 
                        display: 'flex', 
                        gap: 16, 
                        flexWrap: 'wrap', 
                        marginBottom: 16,
                        padding: 12,
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        {auctionStatus.auction_start_at && (
                            <div style={{ flex: '1 1 200px', minWidth: '150px', maxWidth: '100%' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Auction Started At</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>
                                    {new Date(auctionStatus.auction_start_at).toLocaleString()}
                                </div>
                            </div>
                        )}
                        {auctionStatus.auction_end_at && (
                            <div style={{ flex: '1 1 200px', minWidth: '150px', maxWidth: '100%' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Auction Ends At</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>
                                    {new Date(auctionStatus.auction_end_at).toLocaleString()}
                                </div>
                            </div>
                        )}
                        {isOpen && timeLeft !== null && timeLeft > 0 && (
                            <div style={{ flex: '1 1 200px', minWidth: '150px', maxWidth: '100%' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Time Remaining</div>
                                <div style={{ 
                                    fontSize: '1.125rem', 
                                    fontWeight: 700, 
                                    color: timeLeft <= 5 ? '#dc2626' : timeLeft <= 15 ? '#f59e0b' : '#16a34a',
                                    wordBreak: 'break-word'
                                }}>
                                    {timeLeft} {timeLeft === 1 ? 'minute' : 'minutes'} left
                                </div>
                            </div>
                        )}
                        {isClosed && (
                            <div style={{ flex: '1 1 200px', minWidth: '150px', maxWidth: '100%' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Auction Status</div>
                                <div style={{ 
                                    fontSize: '1.125rem', 
                                    fontWeight: 700, 
                                    color: '#dc2626',
                                    wordBreak: 'break-word'
                                }}>
                                    🔴 Auction Closed
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ flex: '1 1 200px', minWidth: '150px', maxWidth: '100%' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Minimum Bid</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', wordBreak: 'break-word' }}>
                            ₹{auctionStatus.minimum_bid.toLocaleString()}
                        </div>
                    </div>
                    <div style={{ flex: '1 1 200px', minWidth: '150px', maxWidth: '100%' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Current Winning Bid</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: auctionStatus.current_winning_bid ? '#16a34a' : '#64748b', wordBreak: 'break-word' }}>
                            {auctionStatus.current_winning_bid 
                                ? `₹${Number(auctionStatus.current_winning_bid.amount).toLocaleString()}`
                                : 'No bids yet'
                            }
                        </div>
                    </div>
                    <div style={{ flex: '1 1 200px', minWidth: '150px', maxWidth: '100%' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Commission</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', wordBreak: 'break-word' }}>
                            ₹{auctionStatus.commission.toLocaleString()}
                        </div>
                    </div>
                </div>

                {auctionStatus.current_winning_bid && (
                    <div style={{
                        padding: 12,
                        background: '#f0fdf4',
                        borderRadius: 8,
                        border: '1px solid #bbf7d0',
                        marginTop: 12
                    }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                            🏆 Current Winner
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
                            {auctionStatus.current_winning_bid.user?.name || auctionStatus.current_winning_bid.user?.phone || 'Unknown'} - 
                            Share #{auctionStatus.current_winning_bid.share?.share_no} - 
                            ₹{Number(auctionStatus.current_winning_bid.amount).toLocaleString()}
                        </div>
                    </div>
                )}
            </div>

            {/* Show settled/closed view when auction is closed */}
            {isClosed && (
                <div style={{
                    padding: 24,
                    background: '#fef2f2',
                    borderRadius: 12,
                    marginTop: 20,
                    border: '2px solid #fca5a5',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔴</div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>
                        Auction Closed
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#7f1d1d' }}>
                        This auction has ended. Bidding is no longer available.
                    </p>
                    {auctionStatus.auction_amount > 0 && (
                        <div style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 4 }}>Winning Bid</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                                ₹{auctionStatus.auction_amount.toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Two Column Layout: Bid Form (Left) and All Bids (Right) - Only show if auction is open */}
            {isOpen && (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: 24,
                marginTop: 24,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* SECTION 1: Bid Form Section (Left) */}
                <div style={{
                    border: '3px solid #2563eb',
                    borderRadius: 12,
                    padding: 24,
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
                    position: 'relative',
                    alignSelf: 'start',
                    boxSizing: 'border-box',
                    width: '100%',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ 
                            fontSize: '2rem',
                            lineHeight: 1
                        }}>
                            💰
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                                {activeShares.length > 0 ? 'Place Your Bid' : 'Bid Form'}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                                {activeShares.length > 0 
                                    ? 'Enter your bid amount and select your share' 
                                    : 'You need an active share to place a bid'}
                            </p>
                        </div>
                    </div>
                    {error && (
                        <div style={{
                            padding: 10,
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: 6,
                            marginBottom: 12,
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}
                    {activeShares.length > 0 && (
                        <div style={{ 
                            marginBottom: 16, 
                            padding: 12, 
                            background: '#f0fdf4', 
                            borderRadius: 8, 
                            border: '1px solid #bbf7d0' 
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                                Your Share
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
                                Share #{activeShares[0].share_no} ({activeShares[0].share_percent}%)
                                {activeShares.length > 1 && ` (and ${activeShares.length - 1} more)`}
                            </div>
                        </div>
                    )}
                    <form onSubmit={handlePlaceBid}>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                💵 Bid Amount (₹)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min={auctionStatus.minimum_bid}
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder={`Enter amount (Minimum: ₹${auctionStatus.minimum_bid.toLocaleString()})`}
                                required
                                disabled={activeShares.length === 0}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    border: activeShares.length === 0 ? '2px solid #cbd5e1' : '2px solid #2563eb',
                                    borderRadius: 10,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    background: activeShares.length === 0 ? '#f3f4f6' : '#fff',
                                    cursor: activeShares.length === 0 ? 'not-allowed' : 'text',
                                    opacity: activeShares.length === 0 ? 0.6 : 1,
                                    boxShadow: activeShares.length === 0 ? 'none' : '0 2px 4px rgba(37, 99, 235, 0.1)',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    if (activeShares.length > 0) {
                                        e.currentTarget.style.borderColor = '#1e40af'
                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 99, 235, 0.2)'
                                    }
                                }}
                                onBlur={(e) => {
                                    if (activeShares.length > 0) {
                                        e.currentTarget.style.borderColor = '#2563eb'
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.1)'
                                    }
                                }}
                            />
                            {auctionStatus.current_winning_bid && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Current winning bid: ₹{Number(auctionStatus.current_winning_bid.amount).toLocaleString()}
                                </p>
                            )}
                        </div>
                        {activeShares.length === 0 && (
                            <div style={{
                                padding: 10,
                                background: '#fef3c7',
                                borderRadius: 6,
                                marginBottom: 12,
                                fontSize: '0.875rem',
                                color: '#92400e'
                            }}>
                                ⚠️ You need an active share to place a bid. Please contact the group administrator.
                            </div>
                        )}
                        {!isOpen && (
                            <div style={{
                                padding: 12,
                                background: '#fee2e2',
                                borderRadius: 8,
                                marginBottom: 12,
                                fontSize: '0.875rem',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                fontWeight: 600
                            }}>
                                {auctionStatus.status === 'closed' ? '🔴 Auction Closed' : `⚠️ Auction is currently ${auctionStatus.status}. Bidding is disabled.`}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={!isOpen || bidding || !bidAmount || activeShares.length === 0}
                            style={{
                                width: '100%',
                                padding: '16px 24px',
                                background: (!isOpen || bidding || activeShares.length === 0) ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 10,
                                cursor: (!isOpen || bidding || activeShares.length === 0) ? 'not-allowed' : 'pointer',
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                boxShadow: (!isOpen || bidding || activeShares.length === 0) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.4)',
                                transition: 'all 0.2s',
                                transform: (!isOpen || bidding || activeShares.length === 0) ? 'none' : 'translateY(0)'
                            }}
                            onMouseEnter={(e) => {
                                if (isOpen && !bidding && activeShares.length > 0 && bidAmount) {
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (isOpen && !bidding && activeShares.length > 0) {
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)'
                                }
                            }}
                        >
                            {bidding ? '⏳ Placing Bid...' : !isOpen ? `❌ Auction ${auctionStatus.status.toUpperCase()}` : activeShares.length === 0 ? '❌ Cannot Bid (No Active Shares)' : '🚀 Place Bid'}
                        </button>
                    </form>
                </div>

                {/* SECTION 2: All Bids Display Section (Right) */}
                <div style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    alignSelf: 'start',
                    boxSizing: 'border-box',
                    width: '100%',
                    overflow: 'hidden'
                }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 12,
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '1.25rem', 
                        fontWeight: 700, 
                        color: '#1e293b',
                        wordBreak: 'break-word'
                    }}>
                        All Bids ({auctionStatus.all_bids.length})
                    </h3>
                    {isOpen && (
                        <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#dc2626', 
                            fontWeight: 600,
                            animation: 'pulse 2s infinite',
                            padding: '4px 12px',
                            background: '#fee2e2',
                            borderRadius: 12,
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                        }}>
                            🔴 LIVE
                        </span>
                    )}
                </div>

                {auctionStatus.all_bids.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#64748b',
                        fontSize: '0.875rem'
                    }}>
                        No bids placed yet. Be the first to bid!
                    </div>
                ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {/* Sort bids: winning bid first, then newest first */}
                        {[...auctionStatus.all_bids]
                            .sort((a, b) => {
                                // Winning bid always first
                                if (a.is_winning_bid && !b.is_winning_bid) return -1
                                if (!a.is_winning_bid && b.is_winning_bid) return 1
                                // Then sort by created_at (newest first)
                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            })
                            .map((bid) => {
                                const bidTime = new Date(bid.created_at).getTime()
                                const now = Date.now()
                                const isRecent = (now - bidTime) < 60000 // Less than 1 minute old
                                const userName = bid.user?.name || bid.user?.phone || 'Unknown'
                                const userInitials = getUserInitials(userName)
                                
                                return (
                                    <div
                                        key={bid.id}
                                        style={{
                                            padding: 16,
                                            background: bid.is_winning_bid 
                                                ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                                                : isRecent && isOpen
                                                    ? '#fef3c7'
                                                    : '#f8fafc',
                                            border: bid.is_winning_bid 
                                                ? '2px solid #16a34a' 
                                                : isRecent && isOpen
                                                    ? '2px solid #f59e0b'
                                                    : '1px solid #e2e8f0',
                                            borderRadius: 12,
                                            marginBottom: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 16,
                                            transition: 'all 0.3s',
                                            animation: isRecent && isOpen ? 'slideIn 0.3s ease-out' : 'none',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* User Avatar */}
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            background: bid.is_winning_bid 
                                                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '1.125rem',
                                            fontWeight: 700,
                                            flexShrink: 0,
                                            boxShadow: bid.is_winning_bid ? '0 2px 8px rgba(22, 163, 74, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                                        }}>
                                            {userInitials}
                                        </div>

                                        {/* User Name and Bid Info */}
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 8,
                                                marginBottom: 4,
                                                flexWrap: 'wrap'
                                            }}>
                                                <span style={{ 
                                                    fontSize: '1rem', 
                                                    fontWeight: 700, 
                                                    color: '#1e293b',
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {userName}
                                                </span>
                                                {bid.is_winning_bid && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        background: '#16a34a',
                                                        color: '#fff',
                                                        padding: '2px 8px',
                                                        borderRadius: 12,
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        🏆 WINNING
                                                    </span>
                                                )}
                                                {isRecent && isOpen && !bid.is_winning_bid && (
                                                    <span style={{ 
                                                        fontSize: '0.625rem',
                                                        background: '#f59e0b',
                                                        color: '#fff',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        NEW
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ 
                                                fontSize: '0.875rem', 
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8
                                            }}>
                                                {bid.share && (
                                                    <span>Share #{bid.share.share_no}</span>
                                                )}
                                                <span>•</span>
                                                <span>{new Date(bid.created_at).toLocaleString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</span>
                                            </div>
                                        </div>

                                        {/* Bid Amount */}
                                        <div style={{
                                            textAlign: 'right',
                                            flexShrink: 0
                                        }}>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: bid.is_winning_bid ? '#16a34a' : '#1e293b',
                                                lineHeight: 1.2
                                            }}>
                                                ₹{Number(bid.amount).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                )}

                {isOpen && auctionStatus.all_bids.length > 0 && (
                    <p style={{ 
                        margin: '16px 0 0 0', 
                        fontSize: '0.75rem', 
                        color: '#64748b',
                        fontStyle: 'italic',
                        textAlign: 'center'
                    }}>
                        💡 Bids are updated in real-time. Refresh automatically when new bids are placed.
                    </p>
                )}
                </div>
            </div>
            )}
            
            {/* Show All Bids section even when closed */}
            {isClosed && auctionStatus.all_bids.length > 0 && (
                <div style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    marginTop: 24
                }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                        All Bids ({auctionStatus.all_bids.length})
                    </h3>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {[...auctionStatus.all_bids]
                            .sort((a, b) => {
                                if (a.is_winning_bid && !b.is_winning_bid) return -1
                                if (!a.is_winning_bid && b.is_winning_bid) return 1
                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            })
                            .map((bid) => {
                                const userName = bid.user?.name || bid.user?.phone || 'Unknown'
                                const userInitials = getUserInitials(userName)
                                
                                return (
                                    <div
                                        key={bid.id}
                                        style={{
                                            padding: 16,
                                            background: bid.is_winning_bid 
                                                ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                                                : '#f8fafc',
                                            border: bid.is_winning_bid 
                                                ? '2px solid #16a34a' 
                                                : '1px solid #e2e8f0',
                                            borderRadius: 12,
                                            marginBottom: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 16
                                        }}
                                    >
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            background: bid.is_winning_bid 
                                                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '1.125rem',
                                            fontWeight: 700,
                                            flexShrink: 0
                                        }}>
                                            {userInitials}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 8,
                                                marginBottom: 4
                                            }}>
                                                <span style={{ 
                                                    fontSize: '1rem', 
                                                    fontWeight: 700, 
                                                    color: '#1e293b'
                                                }}>
                                                    {userName}
                                                </span>
                                                {bid.is_winning_bid && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        background: '#16a34a',
                                                        color: '#fff',
                                                        padding: '2px 8px',
                                                        borderRadius: 12,
                                                        fontWeight: 700
                                                    }}>
                                                        🏆 WINNER
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ 
                                                fontSize: '0.875rem', 
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8
                                            }}>
                                                {bid.share && (
                                                    <span>Share #{bid.share.share_no}</span>
                                                )}
                                                <span>•</span>
                                                <span>{new Date(bid.created_at).toLocaleString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</span>
                                            </div>
                                        </div>
                                        <div style={{ 
                                            textAlign: 'right',
                                            flexShrink: 0
                                        }}>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: bid.is_winning_bid ? '#16a34a' : '#1e293b',
                                                lineHeight: 1.2
                                            }}>
                                                ₹{Number(bid.amount).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            )}
        </div>
    )
}

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
        // Silent error handling
        return null
    }
}

function getUserInitials(nameOrPhone: string): string {
    if (!nameOrPhone) return '?'
    // If it looks like a phone number (all digits), use first 2 digits
    if (/^\d+$/.test(nameOrPhone)) {
        return nameOrPhone.slice(0, 2).toUpperCase()
    }
    // Otherwise, use first letters of words
    const words = nameOrPhone.trim().split(/\s+/)
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
    }
    return nameOrPhone.slice(0, 2).toUpperCase()
}

