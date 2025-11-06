import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'

interface AuctionParticipationModalProps {
    groupId: string
    groupName: string
    groupAmount: number
    auctionStartAt: string
    auctionEndAt: string
    onClose: () => void
}

export default function AuctionParticipationModal({
    groupId,
    groupName,
    groupAmount,
    auctionStartAt,
    auctionEndAt,
    onClose
}: AuctionParticipationModalProps) {
    const navigate = useNavigate()
    const socket = useSocket()

    useEffect(() => {
        if (socket) {
            socket.emit('auction:join', { group_id: groupId })
        }
    }, [socket, groupId])

    function handleParticipate() {
        navigate(`/groups/${groupId}/auction`)
        onClose()
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                animation: 'fadeIn 0.3s ease-in'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 20,
                    padding: 32,
                    maxWidth: 500,
                    width: '90%',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    animation: 'slideUp 0.4s ease-out',
                    border: '3px solid #fff'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        cursor: 'pointer',
                        color: '#fff',
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}
                >
                    ×
                </button>

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: 16,
                        animation: 'pulse 2s infinite'
                    }}>
                        🎯
                    </div>
                    <h2 style={{
                        margin: '0 0 8px 0',
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#fff'
                    }}>
                        Auction Started!
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: '1rem',
                        color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                        {groupName}
                    </p>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12
                    }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem', fontWeight: 500 }}>Group Amount:</span>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.125rem' }}>
                            ₹{groupAmount.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem', fontWeight: 500 }}>Auction Date:</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>
                            {new Date(auctionStartAt).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem', fontWeight: 500 }}>Start Time:</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>
                            {new Date(auctionStartAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            })}
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem', fontWeight: 500 }}>End Time:</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>
                            {new Date(auctionEndAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            })}
                        </span>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    textAlign: 'center'
                }}>
                    <p style={{
                        margin: 0,
                        color: '#fff',
                        fontSize: '0.875rem',
                        lineHeight: 1.6
                    }}>
                        🎉 The auction is now <strong>LIVE</strong>! Participate now to place your bids and compete for the best deal.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={handleParticipate}
                        style={{
                            flex: 1,
                            padding: '16px 24px',
                            background: '#fff',
                            color: '#667eea',
                            border: 'none',
                            borderRadius: 12,
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)'
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}
                    >
                        🚀 Participate Now
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '16px 24px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        Later
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }
            `}</style>
        </div>
    )
}

