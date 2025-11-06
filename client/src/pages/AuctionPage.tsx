import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import Auction from '../components/Auction'
import LoadingBar from '../components/LoadingBar'

interface GroupDetail {
    group: {
        id: string
        name: string
        amount: number
        status: 'new' | 'inprogress' | 'closed'
    }
    shares: Array<{
        id: string
        share_no: number
        share_percent: number
        status: 'pending' | 'accepted' | 'active' | 'declined'
        user: {
            id: string
            name: string | null
            phone: string
        } | null
    }>
}

export default function AuctionPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { state } = useAuth()
    const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            fetchGroupDetail()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    async function fetchGroupDetail() {
        if (!id) return
        
        setLoading(true)
        setError(null)
        
        try {
            const token = state.token || localStorage.getItem('token')
            const headers: Record<string, string> = {}
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch(`/groups/${id}`, { headers })
            
            if (response.ok) {
                const data = await response.json()
                setGroupDetail(data)
            } else if (response.status === 401) {
                localStorage.removeItem('token')
                localStorage.removeItem('phone')
                localStorage.removeItem('role')
                navigate('/login')
            } else {
                setError('Failed to load group details')
            }
        } catch (err) {
            setError('Failed to load group details')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <LoadingBar />
    }

    if (error || !groupDetail) {
        return (
            <div style={{ 
                padding: 40, 
                textAlign: 'center',
                maxWidth: 600,
                margin: '0 auto'
            }}>
                <div style={{ 
                    fontSize: '3rem', 
                    marginBottom: 16 
                }}>
                    😕
                </div>
                <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '1.5rem', 
                    fontWeight: 600, 
                    color: '#1e293b' 
                }}>
                    {error || 'Group not found'}
                </h2>
                <p style={{ 
                    margin: '0 0 24px 0', 
                    fontSize: '0.875rem', 
                    color: '#64748b' 
                }}>
                    {error || 'The group you are looking for does not exist or you do not have access to it.'}
                </p>
                <Link
                    to="/home"
                    style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        background: '#2563eb',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: '0.875rem'
                    }}
                >
                    ← Back to Home
                </Link>
            </div>
        )
    }

    return (
        <div style={{ 
            maxWidth: '100%',
            width: '100%',
            margin: '0 auto', 
            padding: '24px clamp(16px, 4vw, 48px)',
            boxSizing: 'border-box',
            overflowX: 'hidden'
        }}>
            {/* Header with Group Info and Back Button */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <Link
                        to="/home"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#64748b',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            marginBottom: 8,
                            fontWeight: 500
                        }}
                    >
                        ← Back to Home
                    </Link>
                    <h1 style={{ 
                        margin: 0, 
                        fontSize: '1.875rem', 
                        fontWeight: 700, 
                        color: '#1e293b',
                        wordBreak: 'break-word'
                    }}>
                        🎯 Live Auction
                    </h1>
                    <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '1rem', 
                        color: '#64748b',
                        wordBreak: 'break-word'
                    }}>
                        {groupDetail.group.name}
                    </p>
                </div>
                
                <div style={{ 
                    padding: '12px 20px', 
                    background: '#f0fdf4', 
                    border: '2px solid #16a34a',
                    borderRadius: 12,
                    textAlign: 'center',
                    flexShrink: 0,
                    boxSizing: 'border-box'
                }}>
                    <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#15803d', 
                        fontWeight: 600,
                        marginBottom: 4
                    }}>
                        Group Amount
                    </div>
                    <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 700, 
                        color: '#16a34a',
                        wordBreak: 'break-word'
                    }}>
                        ₹{groupDetail.group.amount.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Auction Component */}
            {id && (
                <Auction
                    groupId={id}
                    userShares={groupDetail.shares.map(share => ({
                        id: share.id,
                        share_no: share.share_no,
                        share_percent: share.share_percent,
                        status: share.status,
                        user_id: share.user?.id || null
                    }))}
                />
            )}
        </div>
    )
}

