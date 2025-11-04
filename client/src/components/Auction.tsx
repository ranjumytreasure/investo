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
    const [selectedShareId, setSelectedShareId] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Get user's active shares for bidding
    const activeShares = userShares.filter(
        share => share.status === 'accepted' || share.status === 'active'
    )

    // Fetch auction status
    useEffect(() => {
        fetchAuctionStatus()
    }, [groupId])

    // Set up WebSocket listeners
    useEffect(() => {
        if (!socket) return

        // Join group room
        socket.emit('auction:join', { 
            group_id: groupId,
            user_id: state.token ? getUserIdFromToken(state.token) : undefined
        })

        // Listen for auction opened
        socket.on('auction:opened', (data: any) => {
            if (data.group_id === groupId) {
                console.log('🎯 Auction opened:', data)
                fetchAuctionStatus()
            }
        })

        // Listen for new bids
        socket.on('auction:bid', (data: any) => {
            if (data.group_id === groupId) {
                console.log('💰 New bid received:', data)
                fetchAuctionStatus()
            }
        })

        // Listen for auction closed
        socket.on('auction:closed', (data: any) => {
            if (data.group_id === groupId) {
                console.log('🔒 Auction closed:', data)
                fetchAuctionStatus()
            }
        })

        return () => {
            socket.emit('auction:leave', { group_id: groupId })
            socket.off('auction:opened')
            socket.off('auction:bid')
            socket.off('auction:closed')
        }
    }, [socket, groupId, state.token])

    async function fetchAuctionStatus() {
        try {
            setLoading(true)
            const response = await fetch(`/groups/${groupId}/auction`)
            if (response.ok) {
                const data = await response.json()
                setAuctionStatus(data)
            } else {
                setAuctionStatus(null)
            }
        } catch (err) {
            console.error('Error fetching auction status:', err)
            setAuctionStatus(null)
        } finally {
            setLoading(false)
        }
    }

    async function handlePlaceBid(e: React.FormEvent) {
        e.preventDefault()
        if (!state.token || !bidAmount || !selectedShareId) return

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
                    group_usershare_id: selectedShareId
                })
            })

            const data = await response.json()

            if (response.ok) {
                setBidAmount('')
                setSelectedShareId('')
                await fetchAuctionStatus()
            } else {
                setError(data.message || 'Failed to place bid')
            }
        } catch (err) {
            console.error('Error placing bid:', err)
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

    return (
        <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            background: '#fff',
            marginTop: 20,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                    🎯 Live Auction
                </h3>
                <span style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: isOpen ? '#dcfce7' : '#f3f4f6',
                    color: isOpen ? '#16a34a' : '#6b7280'
                }}>
                    {isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                </span>
            </div>

            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Minimum Bid</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                            ₹{auctionStatus.minimum_bid.toLocaleString()}
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Current Winning Bid</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: auctionStatus.current_winning_bid ? '#16a34a' : '#64748b' }}>
                            {auctionStatus.current_winning_bid 
                                ? `₹${Number(auctionStatus.current_winning_bid.amount).toLocaleString()}`
                                : 'No bids yet'
                            }
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Commission</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
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

            {isOpen && activeShares.length > 0 && (
                <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 16,
                    background: '#f8fafc',
                    marginTop: 16
                }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                        Place Your Bid
                    </h4>
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
                    <form onSubmit={handlePlaceBid}>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                Select Your Share
                            </label>
                            <select
                                value={selectedShareId}
                                onChange={(e) => setSelectedShareId(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 8,
                                    fontSize: '0.875rem',
                                    background: '#fff'
                                }}
                            >
                                <option value="">Choose a share...</option>
                                {activeShares.map(share => (
                                    <option key={share.id} value={share.id}>
                                        Share #{share.share_no} ({share.share_percent}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                Bid Amount (₹)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min={auctionStatus.minimum_bid}
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder={`Minimum: ₹${auctionStatus.minimum_bid.toLocaleString()}`}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 8,
                                    fontSize: '0.875rem'
                                }}
                            />
                            {auctionStatus.current_winning_bid && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Current winning bid: ₹{Number(auctionStatus.current_winning_bid.amount).toLocaleString()}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={bidding || !bidAmount || !selectedShareId}
                            style={{
                                width: '100%',
                                padding: '12px 24px',
                                background: bidding ? '#94a3b8' : '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                cursor: bidding ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                                fontWeight: 600
                            }}
                        >
                            {bidding ? 'Placing Bid...' : 'Place Bid'}
                        </button>
                    </form>
                </div>
            )}

            {isOpen && activeShares.length === 0 && (
                <div style={{
                    padding: 12,
                    background: '#fef3c7',
                    borderRadius: 8,
                    border: '1px solid #fde68a',
                    marginTop: 16
                }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                        ⚠️ You need an active share to participate in this auction.
                    </p>
                </div>
            )}

            {auctionStatus.all_bids.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: 12 
                    }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                            Bidding History ({auctionStatus.all_bids.length} bids)
                        </h4>
                        {isOpen && (
                            <span style={{ 
                                fontSize: '0.75rem', 
                                color: '#dc2626', 
                                fontWeight: 600,
                                animation: 'pulse 2s infinite'
                            }}>
                                🔴 LIVE
                            </span>
                        )}
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {/* Sort bids: newest first, but winning bid always at top */}
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
                                
                                return (
                                    <div
                                        key={bid.id}
                                        style={{
                                            padding: 12,
                                            background: bid.is_winning_bid 
                                                ? '#f0fdf4' 
                                                : isRecent && isOpen
                                                    ? '#fef3c7'
                                                    : '#fff',
                                            border: bid.is_winning_bid 
                                                ? '2px solid #16a34a' 
                                                : isRecent && isOpen
                                                    ? '2px solid #f59e0b'
                                                    : '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            marginBottom: 8,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.3s',
                                            animation: isRecent && isOpen ? 'slideIn 0.3s ease-out' : 'none'
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 8,
                                                fontSize: '0.875rem', 
                                                fontWeight: 600, 
                                                color: '#1e293b' 
                                            }}>
                                                {bid.is_winning_bid && <span>🏆</span>}
                                                {isRecent && isOpen && !bid.is_winning_bid && (
                                                    <span style={{ 
                                                        fontSize: '0.625rem',
                                                        background: '#f59e0b',
                                                        color: '#fff',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontWeight: 700
                                                    }}>
                                                        NEW
                                                    </span>
                                                )}
                                                <span>₹{Number(bid.amount).toLocaleString()}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                                                {bid.user?.name || bid.user?.phone || 'Unknown'} - Share #{bid.share?.share_no || 'N/A'}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: '#64748b',
                                            textAlign: 'right',
                                            minWidth: 80
                                        }}>
                                            <div>{new Date(bid.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                            <div>{new Date(bid.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                    {isOpen && auctionStatus.all_bids.length > 0 && (
                        <p style={{ 
                            margin: '12px 0 0 0', 
                            fontSize: '0.75rem', 
                            color: '#64748b',
                            fontStyle: 'italic',
                            textAlign: 'center'
                        }}>
                            💡 Bids are updated in real-time. Refresh automatically when new bids are placed.
                        </p>
                    )}
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
        console.error('Error decoding token:', e)
        return null
    }
}

