import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import LoadingBar from '../components/LoadingBar'
import Auction from '../components/Auction'

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

interface GroupDetail {
    group: {
        id: string
        name: string
        amount: number
        status: 'new' | 'inprogress' | 'closed'
        type: string
        first_auction_date: string | null
        auction_frequency: string | null
        number_of_members: number | null
        billing_charges: number
        auction_start_at: string | null
        auction_end_at: string | null
        created_by: string | null
        created_at: string
    }
    shares: Array<{
        id: string
        share_no: number
        share_percent: number
        contribution_amount: number
        status: 'pending' | 'accepted' | 'active' | 'declined'
        phone: string | null
        user: {
            id: string
            name: string | null
            phone: string
            referred_by: string | null
            avatarUrl?: string | null
            face_scan_url?: string | null
        } | null
        inviter: {
            id: string
            name: string | null
            phone: string
        } | null
        invited_by: string | null
        can_invite: boolean
        invite_link?: string | null
        created_at: string
    }>
    features: Array<{
        id: string
        feature_name: string
        charge_percent: number
        charge_amount: number
    }>
    availableShareNumbers: number[]
    completedShares: number
    totalShares: number
    stats: {
        totalUsers: number
        totalSharesAllocated: number
        completedShares: number
        pendingInvites: number
        acceptedShares: number
    }
}

export default function GroupDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { state } = useAuth()
    const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showInviteForm, setShowInviteForm] = useState(false)
    const [invitePhone, setInvitePhone] = useState('')
    const [inviteName, setInviteName] = useState('')
    const [inviteSharePercent, setInviteSharePercent] = useState('')
    const [inviteVia, setInviteVia] = useState<'sms' | 'whatsapp' | 'both'>('both')
    const [canInvite, setCanInvite] = useState(false) // Permission to invite others
    const [inviting, setInviting] = useState(false)
    const [showNewShare, setShowNewShare] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showEditAuction, setShowEditAuction] = useState(false)
    const [editingAuction, setEditingAuction] = useState(false)
    const [editAuctionError, setEditAuctionError] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            fetchGroupDetail()
        }
    }, [id])

    async function fetchGroupDetail() {
        setLoading(true)
        setError(null)
        try {
            const headers: Record<string, string> = {}
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/groups/${id}`, { headers })
            if (response.ok) {
                const data = await response.json()
                console.log('Group detail data received:', {
                    groupId: data.group?.id,
                    createdBy: data.group?.created_by,
                    sharesCount: data.shares?.length,
                    shares: data.shares
                })
                setGroupDetail(data)
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to load group' }))
                console.error('Error loading group:', errorData)
                setError(errorData.message || 'Failed to load group')
            }
        } catch (err) {
            console.error('Error fetching group details:', err)
            setError('Failed to load group details')
        } finally {
            setLoading(false)
        }
    }

    async function handleUpdateAuction(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!groupDetail || !state.token) return

        setEditingAuction(true)
        setEditAuctionError(null)

        const formData = new FormData(e.currentTarget)
        const firstAuctionDate = formData.get('first_auction_date') as string
        const auctionStartDate = formData.get('auction_start_date') as string
        const auctionStartTime = formData.get('auction_start_time') as string
        const auctionEndDate = formData.get('auction_end_date') as string
        const auctionEndTime = formData.get('auction_end_time') as string

        try {
            const updatePayload: any = {}
            
            if (firstAuctionDate) {
                updatePayload.first_auction_date = new Date(firstAuctionDate).toISOString()
            }
            
            // Handle auction start date and time
            if (auctionStartDate || auctionStartTime) {
                // Use provided date, or fallback to existing start date, or first_auction_date
                const dateToUse = auctionStartDate || 
                    (groupDetail.group.auction_start_at ? new Date(groupDetail.group.auction_start_at).toISOString().split('T')[0] : null) ||
                    (firstAuctionDate || (groupDetail.group.first_auction_date ? new Date(groupDetail.group.first_auction_date).toISOString().split('T')[0] : null))
                
                // Use provided time, or fallback to existing start time, or default to 00:00
                const timeToUse = auctionStartTime || 
                    (groupDetail.group.auction_start_at ? new Date(groupDetail.group.auction_start_at).toTimeString().slice(0, 5) : '00:00')
                
                if (dateToUse) {
                    const startDateTime = new Date(`${dateToUse}T${timeToUse}`)
                    updatePayload.auction_start_at = startDateTime.toISOString()
                }
            }
            
            // Handle auction end date and time
            if (auctionEndDate || auctionEndTime) {
                // Use provided date, or fallback to existing end date, or start date, or first_auction_date
                const dateToUse = auctionEndDate || 
                    (groupDetail.group.auction_end_at ? new Date(groupDetail.group.auction_end_at).toISOString().split('T')[0] : null) ||
                    (updatePayload.auction_start_at ? new Date(updatePayload.auction_start_at).toISOString().split('T')[0] : null) ||
                    (groupDetail.group.auction_start_at ? new Date(groupDetail.group.auction_start_at).toISOString().split('T')[0] : null) ||
                    (firstAuctionDate || (groupDetail.group.first_auction_date ? new Date(groupDetail.group.first_auction_date).toISOString().split('T')[0] : null))
                
                // Use provided time, or fallback to existing end time, or default to 23:59
                const timeToUse = auctionEndTime || 
                    (groupDetail.group.auction_end_at ? new Date(groupDetail.group.auction_end_at).toTimeString().slice(0, 5) : '23:59')
                
                if (dateToUse) {
                    const endDateTime = new Date(`${dateToUse}T${timeToUse}`)
                    updatePayload.auction_end_at = endDateTime.toISOString()
                }
            }

            const response = await fetch(`/groups/${id}/auction`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify(updatePayload)
            })

            if (response.ok) {
                const data = await response.json()
                // Update local state with new group data
                setGroupDetail({
                    ...groupDetail,
                    group: {
                        ...groupDetail.group,
                        ...data.group
                    }
                })
                setShowEditAuction(false)
                alert('Auction details updated successfully!')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update auction details' }))
                setEditAuctionError(errorData.message || 'Failed to update auction details')
            }
        } catch (err) {
            console.error('Error updating auction details:', err)
            setEditAuctionError('Failed to update auction details')
        } finally {
            setEditingAuction(false)
        }
    }

    async function handleDelete() {
        if (!groupDetail) return

        // Double confirmation
        const confirm1 = window.confirm(
            `Are you sure you want to delete the group "${groupDetail.group.name}"?\n\n` +
            `This will permanently delete:\n` +
            `- The group itself\n` +
            `- All user shares\n` +
            `- All features\n\n` +
            `This action cannot be undone.`
        )

        if (!confirm1) return

        const confirm2 = window.confirm('This is your final confirmation. Delete the group?')
        if (!confirm2) return

        setDeleting(true)
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/groups/${id}`, {
                method: 'DELETE',
                headers
            })

            if (response.ok) {
                alert('Group deleted successfully')
                navigate('/home')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete group' }))
                alert(errorData.message || 'Failed to delete group')
            }
        } catch (err) {
            console.error('Error deleting group:', err)
            alert('An error occurred while deleting the group')
        } finally {
            setDeleting(false)
        }
    }

    async function handleInvite() {
        if (!inviteName || !invitePhone || !inviteSharePercent) {
            alert('Please fill in name, phone number and share percentage')
            return
        }

        if (!groupDetail || groupDetail.availableShareNumbers.length === 0) {
            alert('No available share slots')
            return
        }

        const sharePercent = parseFloat(inviteSharePercent)
        if (isNaN(sharePercent) || sharePercent <= 0 || sharePercent > 100) {
            alert('Please enter a valid share percentage (0.01 to 100)')
            return
        }

        // Check if the entered percentage exceeds available space
        const maxAvailable = Math.max(...groupDetail.availableShareNumbers.map(no => {
            const shareGroup = groupDetail.shares.filter(s => s.share_no === no)
            const allocated = shareGroup.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0)
            return 100 - allocated
        }))

        if (sharePercent > maxAvailable) {
            alert(`The maximum available percentage is ${maxAvailable.toFixed(2)}%. Please enter ${maxAvailable.toFixed(2)}% or less.`)
            return
        }

        setInviting(true)
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/groups/${id}/invite`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: inviteName.trim(),
                    phone: invitePhone.trim(),
                    share_percent: sharePercent,
                    invite_via: inviteVia, // SMS, WhatsApp, or both
                    can_invite: canInvite, // Give permission to invite others
                    invited_by: null // Will be set from auth token on backend
                })
            })

            if (response.ok) {
                const data = await response.json()
                const methodLabel = inviteVia === 'sms' ? 'SMS' : inviteVia === 'whatsapp' ? 'WhatsApp' : 'SMS & WhatsApp'
                alert(`Invite sent successfully via ${methodLabel}!${data.otp ? `\nOTP: ${data.otp}` : ''}\n${data.invite_link ? `\nLink: ${data.invite_link}` : ''}`)
                setInvitePhone('')
                setInviteName('')
                setInviteSharePercent('')
                setInviteVia('both') // Reset to default
                setCanInvite(false)
                setShowInviteForm(false)
                setShowNewShare(false)
                fetchGroupDetail() // Refresh data
            } else {
                const errorData = await response.json()
                alert(errorData.message || 'Failed to send invite')
            }
        } catch (err) {
            console.error('Error sending invite:', err)
            alert('Failed to send invite')
        } finally {
            setInviting(false)
        }
    }

    if (loading) {
        return (
            <>
                <LoadingBar />
                <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px', textAlign: 'center' }}>
                    <p>Loading group details...</p>
                </div>
            </>
        )
    }

    if (error || !groupDetail) {
        return (
            <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px' }}>
                <Link
                    to="/home"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 16,
                        padding: '8px 12px',
                        background: '#f1f5f9',
                        color: '#1e293b',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem'
                    }}
                >
                    ← Back to Home
                </Link>
                <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
                    <p>{error || 'Group not found'}</p>
                </div>
            </div>
        )
    }

    const { group, shares, features, availableShareNumbers, completedShares, totalShares, stats } = groupDetail

    // Debug: Check if group status is 'new'
    const isNewGroup = group.status === 'new'
    console.log('Group status:', group.status, 'Is new:', isNewGroup)

    // Group shares by share_no for display
    const sharesByNumber = new Map<number, typeof shares>()
    shares.forEach(share => {
        const shareNo = share.share_no
        if (!sharesByNumber.has(shareNo)) {
            sharesByNumber.set(shareNo, [])
        }
        sharesByNumber.get(shareNo)!.push(share)
    })

    // Calculate available percentage for each share number
    const shareAvailability = new Map<number, number>()
    for (let i = 1; i <= totalShares; i++) {
        const shareGroup = sharesByNumber.get(i) || []
        const allocated = shareGroup.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0)
        const available = 100 - allocated
        shareAvailability.set(i, available)
    }

    // Get maximum available percentage from any share
    const maxAvailablePercent = Math.max(...Array.from(shareAvailability.values()))
    const amount = parseFloat(group.amount.toString())
    const billingCharges = parseFloat(group.billing_charges.toString())

    // Helper function to get user initials
    function getInitials(nameOrPhone: string): string {
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

    return (
        <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '24px 48px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header with Navigation */}
            <Link
                to="/home"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 16,
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem'
                }}
            >
                ← Back to Home
            </Link>
            <div style={{ marginBottom: 24 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{group.name}</h1>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                background: group.status === 'new' ? '#eff6ff' :
                                    group.status === 'inprogress' ? '#fef3c7' : '#f3f4f6',
                                color: group.status === 'new' ? '#2563eb' :
                                    group.status === 'inprogress' ? '#d97706' : '#6b7280'
                            }}>
                                {group.status === 'new' ? '🆕 New' :
                                    group.status === 'inprogress' ? '⏳ In Progress' : '✅ Closed'}
                            </span>
                            <Link
                                to={`/groups/${id}/features`}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '0.875rem',
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    borderRadius: 6,
                                    textDecoration: 'none',
                                    border: '1px solid #e2e8f0',
                                    fontWeight: 500
                                }}
                            >
                                ⚙️ Manage Features
                            </Link>
                            {isNewGroup && (
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: '0.875rem',
                                        background: deleting ? '#94a3b8' : '#dc2626',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: deleting ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        boxShadow: deleting ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!deleting) {
                                            e.currentTarget.style.background = '#b91c1c'
                                            e.currentTarget.style.transform = 'scale(1.02)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!deleting) {
                                            e.currentTarget.style.background = '#dc2626'
                                            e.currentTarget.style.transform = 'scale(1)'
                                        }
                                    }}
                                >
                                    {deleting ? 'Deleting...' : '🗑️ Delete Group'}
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Add New Share Button - Top Right */}
                    {isNewGroup && (
                        <button
                            onClick={() => setShowNewShare(true)}
                            style={{
                                padding: '12px 24px',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 700,
                                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#059669'
                                e.currentTarget.style.transform = 'scale(1.05)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#10b981'
                                e.currentTarget.style.transform = 'scale(1)'
                            }}
                        >
                            ➕ Add New Share
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard KPI Cards - Top Row - Horizontal Layout - Condensed */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                {/* Group Amount Card - Condensed */}
                <div style={{
                    flex: '1 1 0',
                    minWidth: '180px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 12,
                    padding: 16,
                    color: '#fff',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: 4 }}>Group Amount</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{amount.toLocaleString()}</div>
                </div>

                {/* Billing Charges Card - Condensed */}
                <div style={{
                    flex: '1 1 0',
                    minWidth: '180px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: 12,
                    padding: 16,
                    color: '#fff',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: 4 }}>Total Charges</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{billingCharges.toLocaleString()}</div>
                </div>

                {/* Total Members Card - Condensed */}
                {group.number_of_members && (
                    <div style={{
                        flex: '1 1 0',
                        minWidth: '180px',
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        borderRadius: 12,
                        padding: 16,
                        color: '#fff',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: 4 }}>Members</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{group.number_of_members}</div>
                    </div>
                )}

                {/* Shares Progress Card - Condensed */}
                <div style={{
                    flex: '1 1 0',
                    minWidth: '180px',
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    borderRadius: 12,
                    padding: 16,
                    color: '#fff',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: 4 }}>Progress</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {completedShares}/{totalShares}
                    </div>
                </div>
            </div>

            {/* Condensed Info Bar - Compressed Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {/* Group Details - Condensed */}
                <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Group Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span style={{ color: '#64748b' }}>Type:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{group.type}</span>
                        </div>
                        {group.number_of_members && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: '#64748b' }}>Members:</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{group.number_of_members}</span>
                            </div>
                        )}
                        {group.first_auction_date && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                <span style={{ color: '#64748b' }}>First Auction:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>
                                        {new Date(group.first_auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    {group.created_by === getUserIdFromToken(state.token) && (
                                        <button
                                            onClick={() => setShowEditAuction(true)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '0.75rem',
                                                background: '#eff6ff',
                                                color: '#2563eb',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: 4,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                            title="Edit auction date and timings"
                                        >
                                            ✏️ Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {(group.auction_start_at || group.auction_end_at) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem', marginTop: 4 }}>
                                {group.auction_start_at && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>Start Time:</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>
                                            {new Date(group.auction_start_at).toLocaleString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </div>
                                )}
                                {group.auction_end_at && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>End Time:</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>
                                            {new Date(group.auction_end_at).toLocaleString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Statistics - Condensed */}
                {stats && (
                    <div style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 16,
                        background: '#fff',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Quick Stats</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: '#64748b' }}>Users:</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{stats.totalUsers}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: '#64748b' }}>Completed:</span>
                                <span style={{ fontWeight: 600, color: '#16a34a' }}>{stats.completedShares}/{totalShares}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: '#64748b' }}>Pending:</span>
                                <span style={{ fontWeight: 600, color: '#d97706' }}>{stats.pendingInvites}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Features - Condensed */}
                <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Features</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {features.length} enabled
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                        Charges: ₹{billingCharges.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Auction Component */}
            {groupDetail && (
                <Auction
                    groupId={group.id}
                    userShares={groupDetail.shares.map(share => ({
                        id: share.id,
                        share_no: share.share_no,
                        share_percent: share.share_percent,
                        status: share.status,
                        user_id: share.user?.id || null
                    }))}
                />
            )}

            {/* For New Groups - Add New Users - PRIMARY FOCUS */}
            {group.status === 'new' && (
                <>
                    {/* Invite Form - Prominent Section */}
                    <div style={{
                        border: '2px solid #10b981',
                        borderRadius: 16,
                        padding: 32,
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
                        marginBottom: 32,
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                                    Add New Users
                                </h2>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                                    Invite users to join this group and allocate shares
                                </p>
                            </div>
                            {availableShareNumbers.length === 0 && (
                                <div style={{ padding: '12px 20px', background: '#fef3c7', borderRadius: 8, color: '#d97706', fontSize: '0.875rem', fontWeight: 600 }}>
                                    All shares allocated
                                </div>
                            )}
                        </div>

                        {(!showInviteForm && availableShareNumbers.length > 0) && (
                            <div style={{ textAlign: 'center', padding: '24px' }}>
                                <button
                                    onClick={() => setShowInviteForm(true)}
                                    style={{
                                        padding: '16px 32px',
                                        background: '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 12,
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#1d4ed8'
                                        e.currentTarget.style.transform = 'scale(1.05)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#2563eb'
                                        e.currentTarget.style.transform = 'scale(1)'
                                    }}
                                >
                                    ➕ Invite New Member
                                </button>
                            </div>
                        )}

                        {showInviteForm && availableShareNumbers.length > 0 && (
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, background: '#fff', marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Invite Member to Share</h3>
                                    <button
                                        onClick={() => setShowInviteForm(false)}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#f1f5f9',
                                            color: '#64748b',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                            Name <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={inviteName}
                                            onChange={e => setInviteName(e.target.value)}
                                            placeholder="e.g. John Doe"
                                            style={{
                                                width: '100%',
                                                padding: 12,
                                                border: '1px solid #cbd5e1',
                                                borderRadius: 8,
                                                fontSize: '1rem',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                            Phone Number <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={invitePhone}
                                            onChange={e => setInvitePhone(e.target.value)}
                                            placeholder="e.g. 9876543210"
                                            style={{
                                                width: '100%',
                                                padding: 12,
                                                border: '1px solid #cbd5e1',
                                                borderRadius: 8,
                                                fontSize: '1rem',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                            Share Percentage (%) <span style={{ color: '#dc2626' }}>*</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                                                (Two users together = 100%. e.g., 50% + 50% or 60% + 40%)
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            value={inviteSharePercent}
                                            onChange={e => {
                                                const value = e.target.value
                                                setInviteSharePercent(value)
                                                // Warn if exceeding available
                                                const numValue = parseFloat(value)
                                                if (numValue > maxAvailablePercent) {
                                                    // Show warning but don't prevent typing
                                                }
                                            }}
                                            placeholder={`e.g. 50 (max: ${maxAvailablePercent.toFixed(2)}% available)`}
                                            min="0.01"
                                            max={maxAvailablePercent}
                                            step="0.01"
                                            style={{
                                                width: '100%',
                                                padding: 12,
                                                border: parseFloat(inviteSharePercent) > maxAvailablePercent ? '2px solid #dc2626' : '1px solid #cbd5e1',
                                                borderRadius: 8,
                                                fontSize: '1rem',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        {inviteSharePercent && parseFloat(inviteSharePercent) > maxAvailablePercent && (
                                            <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#dc2626', fontWeight: 600 }}>
                                                ⚠️ Maximum available: {maxAvailablePercent.toFixed(2)}%. Please enter {maxAvailablePercent.toFixed(2)}% or less.
                                            </p>
                                        )}
                                        <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                                            Enter the percentage this user will take. Two users together must equal 100% for a complete share. The system will assign to the first available/incomplete share.
                                        </p>
                                        {/* Show available percentages for each share */}
                                        {availableShareNumbers.length > 0 && (
                                            <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Available Share Space:</div>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {availableShareNumbers.map(shareNo => {
                                                        const available = shareAvailability.get(shareNo) || 0
                                                        return (
                                                            <div key={shareNo} style={{
                                                                padding: '6px 12px',
                                                                borderRadius: 6,
                                                                background: available >= parseFloat(inviteSharePercent || '0') ? '#dcfce7' : '#fee2e2',
                                                                border: `1px solid ${available >= parseFloat(inviteSharePercent || '0') ? '#86efac' : '#fca5a5'}`,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600
                                                            }}>
                                                                Share #{shareNo}: {available.toFixed(1)}% available
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                            Send Invite Via <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                padding: '12px 16px',
                                                border: `2px solid ${inviteVia === 'sms' ? '#2563eb' : '#e2e8f0'}`,
                                                borderRadius: 8,
                                                background: inviteVia === 'sms' ? '#eff6ff' : '#fff',
                                                flex: 1,
                                                minWidth: '120px'
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="inviteVia"
                                                    value="sms"
                                                    checked={inviteVia === 'sms'}
                                                    onChange={e => setInviteVia(e.target.value as 'sms' | 'whatsapp' | 'both')}
                                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>📱 SMS</div>
                                                </div>
                                            </label>
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                padding: '12px 16px',
                                                border: `2px solid ${inviteVia === 'whatsapp' ? '#25d366' : '#e2e8f0'}`,
                                                borderRadius: 8,
                                                background: inviteVia === 'whatsapp' ? '#dcfce7' : '#fff',
                                                flex: 1,
                                                minWidth: '120px'
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="inviteVia"
                                                    value="whatsapp"
                                                    checked={inviteVia === 'whatsapp'}
                                                    onChange={e => setInviteVia(e.target.value as 'sms' | 'whatsapp' | 'both')}
                                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>💬 WhatsApp</div>
                                                </div>
                                            </label>
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                padding: '12px 16px',
                                                border: `2px solid ${inviteVia === 'both' ? '#10b981' : '#e2e8f0'}`,
                                                borderRadius: 8,
                                                background: inviteVia === 'both' ? '#ecfdf5' : '#fff',
                                                flex: 1,
                                                minWidth: '120px'
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="inviteVia"
                                                    value="both"
                                                    checked={inviteVia === 'both'}
                                                    onChange={e => setInviteVia(e.target.value as 'sms' | 'whatsapp' | 'both')}
                                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>📱💬 Both</div>
                                                </div>
                                            </label>
                                        </div>
                                        <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                                            Choose how to send the invite link. User 2 will receive the link via the selected method(s).
                                        </p>
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={canInvite}
                                                onChange={e => setCanInvite(e.target.checked)}
                                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                    Grant permission to invite others
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
                                                    This user can invite more users after verifying with OTP (exponential growth)
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                    <button
                                        onClick={handleInvite}
                                        disabled={inviting || !invitePhone || !inviteSharePercent}
                                        style={{
                                            padding: '12px 24px',
                                            background: (inviting || !inviteName || !invitePhone || !inviteSharePercent) ? '#94a3b8' : '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            cursor: (inviting || !invitePhone || !inviteSharePercent) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {inviting ? 'Sending...' : 'Send Invite'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {availableShareNumbers.length === 0 && (
                            <div style={{ padding: 16, background: '#fef3c7', borderRadius: 8, color: '#d97706' }}>
                                All shares have been allocated.
                            </div>
                        )}

                    </div>

                    {/* Shares List - Grouped by Share Number */}
                    <div style={{ marginTop: 32 }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>User's List</h3>
                        {shares.length === 0 ? (
                            <p style={{ color: '#64748b', fontStyle: 'italic' }}>No shares allocated yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: 16 }}>
                                {Array.from(sharesByNumber.entries())
                                    .sort(([a], [b]) => a - b)
                                    .map(([shareNo, shareGroup]) => {
                                        const totalPercent = shareGroup.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0)
                                        const isComplete = totalPercent >= 100

                                        return (
                                            <div key={shareNo} style={{
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 12,
                                                padding: 16,
                                                background: isComplete ? '#f0fdf4' : '#fff'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.125rem', marginBottom: 4 }}>
                                                            Share #{shareNo}
                                                        </div>
                                                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                                            {totalPercent.toFixed(2)}% allocated {isComplete ? '(Complete)' : `(${(100 - totalPercent).toFixed(2)}% available)`}
                                                        </div>
                                                    </div>
                                                    <span style={{
                                                        padding: '6px 12px',
                                                        borderRadius: 6,
                                                        fontSize: '0.875rem',
                                                        fontWeight: 600,
                                                        background: isComplete ? '#dcfce7' : '#fef3c7',
                                                        color: isComplete ? '#16a34a' : '#d97706'
                                                    }}>
                                                        {isComplete ? 'Complete' : 'Incomplete'}
                                                    </span>
                                                </div>

                                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'grid', gap: 8 }}>
                                                    {shareGroup.map(share => {
                                                        const sharePercent = parseFloat(share.share_percent.toString())
                                                        const shareContribution = parseFloat(share.contribution_amount.toString())
                                                        return (
                                                            <div key={share.id} style={{
                                                                padding: 12,
                                                                background: '#f8fafc',
                                                                borderRadius: 8
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                                                        {/* User Avatar/Initials */}
                                                                        <div style={{
                                                                            width: 48,
                                                                            height: 48,
                                                                            borderRadius: '50%',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            background: share.user?.avatarUrl || share.user?.face_scan_url
                                                                                ? 'transparent'
                                                                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                            border: share.user?.avatarUrl || share.user?.face_scan_url ? '2px solid #e2e8f0' : 'none',
                                                                            flexShrink: 0,
                                                                            overflow: 'hidden'
                                                                        }}>
                                                                            {share.user?.avatarUrl || share.user?.face_scan_url ? (
                                                                                <img
                                                                                    src={share.user.avatarUrl || share.user.face_scan_url || ''}
                                                                                    alt={share.user?.name || share.phone || 'User'}
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        height: '100%',
                                                                                        objectFit: 'cover'
                                                                                    }}
                                                                                    onError={(e) => {
                                                                                        // Fallback to initials if image fails to load
                                                                                        const target = e.target as HTMLImageElement
                                                                                        target.style.display = 'none'
                                                                                        const parent = target.parentElement
                                                                                        if (parent) {
                                                                                            const initialsEl = document.createElement('span')
                                                                                            initialsEl.textContent = getInitials(share.user?.name || share.phone || '?')
                                                                                            initialsEl.style.cssText = 'color: #fff; font-weight: 700; font-size: 1.125rem;'
                                                                                            parent.appendChild(initialsEl)
                                                                                            parent.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                                                            parent.style.display = 'flex'
                                                                                            parent.style.alignItems = 'center'
                                                                                            parent.style.justifyContent = 'center'
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <span style={{
                                                                                    color: '#fff',
                                                                                    fontWeight: 700,
                                                                                    fontSize: '1.125rem'
                                                                                }}>
                                                                                    {getInitials(share.user?.name || share.phone || '?')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4, fontSize: '1rem' }}>
                                                                                {/* Always show name if available from user table */}
                                                                                {share.user?.name ? (
                                                                                    <>
                                                                                        {share.user.name}
                                                                                        <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                                                                                            ({sharePercent}%)
                                                                                        </span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        {share.phone || share.user?.phone || 'N/A'}
                                                                                        <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                                                                                            ({sharePercent}%)
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            {/* Show phone number always, below the name */}
                                                                            {share.user?.name ? (
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                                                                                    📱 {share.user.phone || share.phone || 'N/A'}
                                                                                </div>
                                                                            ) : (
                                                                                // If no name, still show phone in a slightly different style
                                                                                share.phone || share.user?.phone ? (
                                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                                                                                        📱 {share.user?.phone || share.phone}
                                                                                    </div>
                                                                                ) : null
                                                                            )}
                                                                            {share.inviter && (
                                                                                <div style={{ fontSize: '0.75rem', color: '#2563eb', marginBottom: 4 }}>
                                                                                    Invited by: {share.inviter.name || share.inviter.phone}
                                                                                </div>
                                                                            )}
                                                                            {share.can_invite && (
                                                                                <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: 4, fontWeight: 600 }}>
                                                                                    ✨ Can invite others
                                                                                </div>
                                                                            )}
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                                                                                Contribution: ₹{shareContribution.toLocaleString()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                                        <span style={{
                                                                            padding: '4px 8px',
                                                                            borderRadius: 6,
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 500,
                                                                            background: share.status === 'pending' ? '#fef3c7' :
                                                                                share.status === 'accepted' ? '#dcfce7' : '#f3f4f6',
                                                                            color: share.status === 'pending' ? '#d97706' :
                                                                                share.status === 'accepted' ? '#16a34a' : '#6b7280',
                                                                            alignSelf: 'flex-start'
                                                                        }}>
                                                                            {share.status === 'pending' ? 'Pending' :
                                                                                share.status === 'accepted' ? 'Accepted' :
                                                                                    share.status === 'active' ? 'Active' : 'Declined'}
                                                                        </span>
                                                                        {/* Clone Button - Only for accepted/active shares */}
                                                                        {(share.status === 'accepted' || share.status === 'active') && group.status === 'new' && (
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (!window.confirm(`Clone this share for ${share.user?.name || share.phone}? This will create a duplicate share with the same percentage.`)) return
                                                                                    try {
                                                                                        const headers: Record<string, string> = {
                                                                                            'Content-Type': 'application/json'
                                                                                        }
                                                                                        if (state.token) {
                                                                                            headers['Authorization'] = `Bearer ${state.token}`
                                                                                        }
                                                                                        const response = await fetch(`/groups/${id}/shares/${share.id}/clone`, {
                                                                                            method: 'POST',
                                                                                            headers
                                                                                        })
                                                                                        if (response.ok) {
                                                                                            alert('Share cloned successfully!')
                                                                                            fetchGroupDetail()
                                                                                        } else {
                                                                                            const errorData = await response.json()
                                                                                            alert(errorData.message || 'Failed to clone share')
                                                                                        }
                                                                                    } catch (err) {
                                                                                        console.error('Error cloning share:', err)
                                                                                        alert('Failed to clone share')
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    padding: '4px 10px',
                                                                                    background: '#3b82f6',
                                                                                    color: '#fff',
                                                                                    border: 'none',
                                                                                    borderRadius: 6,
                                                                                    fontSize: '0.75rem',
                                                                                    fontWeight: 500,
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: 4
                                                                                }}
                                                                                title="Clone this share for the same user"
                                                                            >
                                                                                📋 Clone
                                                                            </button>
                                                                        )}
                                                                        {/* Delete Button - Only for pending shares or if user is creator */}
                                                                        {(share.status === 'pending' || group.created_by === (state.token ? getUserIdFromToken(state.token) : null)) && group.status === 'new' && (
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (!window.confirm(`Delete this share for ${share.user?.name || share.phone}? This action cannot be undone.`)) return
                                                                                    try {
                                                                                        const headers: Record<string, string> = {
                                                                                            'Content-Type': 'application/json'
                                                                                        }
                                                                                        if (state.token) {
                                                                                            headers['Authorization'] = `Bearer ${state.token}`
                                                                                        }
                                                                                        const response = await fetch(`/groups/${id}/shares/${share.id}`, {
                                                                                            method: 'DELETE',
                                                                                            headers
                                                                                        })
                                                                                        if (response.ok) {
                                                                                            alert('Share deleted successfully!')
                                                                                            fetchGroupDetail()
                                                                                        } else {
                                                                                            const errorData = await response.json()
                                                                                            alert(errorData.message || 'Failed to delete share')
                                                                                        }
                                                                                    } catch (err) {
                                                                                        console.error('Error deleting share:', err)
                                                                                        alert('Failed to delete share')
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    padding: '4px 10px',
                                                                                    background: '#ef4444',
                                                                                    color: '#fff',
                                                                                    border: 'none',
                                                                                    borderRadius: 6,
                                                                                    fontSize: '0.75rem',
                                                                                    fontWeight: 500,
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: 4
                                                                                }}
                                                                                title="Delete this share"
                                                                            >
                                                                                🗑️ Delete
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {share.status === 'pending' && (
                                                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 8 }}>
                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>
                                                                            Invite Link:
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                            <input
                                                                                type="text"
                                                                                value={share.invite_link || `${window.location.origin}/groups/${id}/invite?phone=${encodeURIComponent(share.phone || '')}`}
                                                                                readOnly
                                                                                style={{
                                                                                    flex: 1,
                                                                                    minWidth: '200px',
                                                                                    padding: '6px 10px',
                                                                                    border: '1px solid #cbd5e1',
                                                                                    borderRadius: 6,
                                                                                    fontSize: '0.75rem',
                                                                                    background: '#fff',
                                                                                    color: '#1e293b'
                                                                                }}
                                                                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                                                            />
                                                                            <button
                                                                                onClick={() => {
                                                                                    const link = share.invite_link || `${window.location.origin}/groups/${id}/invite?phone=${encodeURIComponent(share.phone || '')}`
                                                                                    navigator.clipboard.writeText(link)
                                                                                    alert('Invite link copied to clipboard!')
                                                                                }}
                                                                                style={{
                                                                                    padding: '6px 12px',
                                                                                    background: '#f1f5f9',
                                                                                    border: '1px solid #e2e8f0',
                                                                                    borderRadius: 6,
                                                                                    fontSize: '0.75rem',
                                                                                    fontWeight: 500,
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                📋 Copy
                                                                            </button>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (!window.confirm('Resend invite link via SMS/WhatsApp?')) return
                                                                                    try {
                                                                                        const headers: Record<string, string> = {
                                                                                            'Content-Type': 'application/json'
                                                                                        }
                                                                                        if (state.token) {
                                                                                            headers['Authorization'] = `Bearer ${state.token}`
                                                                                        }
                                                                                        const response = await fetch(`/groups/${id}/invite/${share.id}/resend`, {
                                                                                            method: 'POST',
                                                                                            headers,
                                                                                            body: JSON.stringify({ invite_via: 'both' }) // Default to both, can be enhanced later
                                                                                        })
                                                                                        if (response.ok) {
                                                                                            const data = await response.json()
                                                                                            alert(`Invite link resent successfully via ${data.invite_via || 'SMS/WhatsApp'}!`)
                                                                                            // Refresh to show updated invite_link
                                                                                            fetchGroupDetail()
                                                                                        } else {
                                                                                            const errorData = await response.json()
                                                                                            alert(errorData.message || 'Failed to resend invite')
                                                                                        }
                                                                                    } catch (err) {
                                                                                        console.error('Error resending invite:', err)
                                                                                        alert('Failed to resend invite')
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    padding: '6px 12px',
                                                                                    background: '#2563eb',
                                                                                    color: '#fff',
                                                                                    border: 'none',
                                                                                    borderRadius: 6,
                                                                                    fontSize: '0.75rem',
                                                                                    fontWeight: 500,
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                🔄 Resend
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {!isComplete && (
                                                    <div style={{ marginTop: 12, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: '0.875rem', color: '#d97706' }}>
                                                        ⚠️ Incomplete: Needs {(100 - totalPercent).toFixed(2)}% more to reach 100%. Two users must agree and together complete this share.
                                                    </div>
                                                )}
                                                {isComplete && shareGroup.length === 2 && (
                                                    <div style={{ marginTop: 12, padding: 12, background: '#dcfce7', borderRadius: 8, fontSize: '0.875rem', color: '#16a34a' }}>
                                                        ✅ Complete: Two users jointly make 100% of this share
                                                    </div>
                                                )}
                                                {isComplete && shareGroup.length > 2 && (
                                                    <div style={{ marginTop: 12, padding: 12, background: '#dcfce7', borderRadius: 8, fontSize: '0.875rem', color: '#16a34a' }}>
                                                        ✅ Complete: Multiple users jointly make 100% of this share
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </div>

                    {/* Add New Share Modal */}
                    {showNewShare && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                            <div style={{
                                background: '#fff',
                                borderRadius: 12,
                                padding: 24,
                                maxWidth: 500,
                                width: '90%',
                                maxHeight: '90vh',
                                overflow: 'auto'
                            }}>
                                <h3 style={{ marginTop: 0, marginBottom: 16 }}>Add New Share</h3>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 20 }}>
                                    Start a new share allocation. You can invite users to fill this share (they must total 100%).
                                </p>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteName}
                                        onChange={e => setInviteName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        style={{
                                            width: '100%',
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Phone Number <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={invitePhone}
                                        onChange={e => setInvitePhone(e.target.value)}
                                        placeholder="e.g. 9942393231"
                                        style={{
                                            width: '100%',
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Share Percentage (%) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={inviteSharePercent}
                                        onChange={e => {
                                            const value = e.target.value
                                            setInviteSharePercent(value)
                                        }}
                                        placeholder={`e.g. 50 (max: ${maxAvailablePercent.toFixed(2)}% available)`}
                                        min="0.01"
                                        max={maxAvailablePercent}
                                        step="0.01"
                                        style={{
                                            width: '100%',
                                            padding: 12,
                                            border: inviteSharePercent && parseFloat(inviteSharePercent) > maxAvailablePercent ? '2px solid #dc2626' : '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {inviteSharePercent && parseFloat(inviteSharePercent) > maxAvailablePercent && (
                                        <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#dc2626', fontWeight: 600 }}>
                                            ⚠️ Maximum available: {maxAvailablePercent.toFixed(2)}%. Please enter {maxAvailablePercent.toFixed(2)}% or less.
                                        </p>
                                    )}
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Send Invite Via <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            cursor: 'pointer',
                                            padding: '10px 14px',
                                            border: `2px solid ${inviteVia === 'sms' ? '#2563eb' : '#e2e8f0'}`,
                                            borderRadius: 8,
                                            background: inviteVia === 'sms' ? '#eff6ff' : '#fff',
                                            flex: 1,
                                            minWidth: '100px'
                                        }}>
                                            <input
                                                type="radio"
                                                name="inviteViaModal"
                                                value="sms"
                                                checked={inviteVia === 'sms'}
                                                onChange={e => setInviteVia(e.target.value as 'sms' | 'whatsapp' | 'both')}
                                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                                            />
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>📱 SMS</div>
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            cursor: 'pointer',
                                            padding: '10px 14px',
                                            border: `2px solid ${inviteVia === 'whatsapp' ? '#25d366' : '#e2e8f0'}`,
                                            borderRadius: 8,
                                            background: inviteVia === 'whatsapp' ? '#dcfce7' : '#fff',
                                            flex: 1,
                                            minWidth: '100px'
                                        }}>
                                            <input
                                                type="radio"
                                                name="inviteViaModal"
                                                value="whatsapp"
                                                checked={inviteVia === 'whatsapp'}
                                                onChange={e => setInviteVia(e.target.value as 'sms' | 'whatsapp' | 'both')}
                                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                                            />
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>💬 WhatsApp</div>
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            cursor: 'pointer',
                                            padding: '10px 14px',
                                            border: `2px solid ${inviteVia === 'both' ? '#10b981' : '#e2e8f0'}`,
                                            borderRadius: 8,
                                            background: inviteVia === 'both' ? '#ecfdf5' : '#fff',
                                            flex: 1,
                                            minWidth: '100px'
                                        }}>
                                            <input
                                                type="radio"
                                                name="inviteViaModal"
                                                value="both"
                                                checked={inviteVia === 'both'}
                                                onChange={e => setInviteVia(e.target.value as 'sms' | 'whatsapp' | 'both')}
                                                style={{ width: 18, height: 18, cursor: 'pointer' }}
                                            />
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>📱💬 Both</div>
                                        </label>
                                    </div>
                                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        Choose how to send the invite link
                                    </p>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={canInvite}
                                            onChange={e => setCanInvite(e.target.checked)}
                                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                Grant permission to invite others
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
                                                This user can invite more users (exponential growth)
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button
                                        onClick={handleInvite}
                                        disabled={inviting || !inviteName || !invitePhone || !inviteSharePercent}
                                        style={{
                                            flex: 1,
                                            padding: '12px 24px',
                                            background: (inviting || !inviteName || !invitePhone || !inviteSharePercent) ? '#94a3b8' : '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 8,
                                            cursor: (inviting || !inviteName || !invitePhone || !inviteSharePercent) ? 'not-allowed' : 'pointer',
                                            fontSize: '1rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        {inviting ? 'Sending...' : 'Send Invite'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewShare(false)
                                            setInvitePhone('')
                                            setInviteName('')
                                            setInviteSharePercent('')
                                            setCanInvite(false)
                                        }}
                                        style={{
                                            padding: '12px 24px',
                                            background: '#f1f5f9',
                                            color: '#1e293b',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit Auction Modal */}
            {showEditAuction && groupDetail && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={() => {
                            if (!editingAuction) {
                                setShowEditAuction(false)
                                setEditAuctionError(null)
                            }
                        }}
                    >
                        <div
                            style={{
                                background: '#fff',
                                borderRadius: 12,
                                padding: 24,
                                maxWidth: 500,
                                width: '90%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                                Edit Auction Date & Timings
                            </h2>

                            {editAuctionError && (
                                <div style={{
                                    padding: 12,
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    fontSize: '0.875rem'
                                }}>
                                    {editAuctionError}
                                </div>
                            )}

                            <form onSubmit={handleUpdateAuction}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                        First Auction Date
                                    </label>
                                    <input
                                        type="date"
                                        name="first_auction_date"
                                        defaultValue={groupDetail.group.first_auction_date ? new Date(groupDetail.group.first_auction_date).toISOString().split('T')[0] : ''}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                        Auction Start Date & Time
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="date"
                                            name="auction_start_date"
                                            defaultValue={groupDetail.group.auction_start_at ? new Date(groupDetail.group.auction_start_at).toISOString().split('T')[0] : ''}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 8,
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                        <input
                                            type="time"
                                            name="auction_start_time"
                                            defaultValue={groupDetail.group.auction_start_at ? new Date(groupDetail.group.auction_start_at).toTimeString().slice(0, 5) : ''}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 8,
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        Date and time when the auction starts
                                    </p>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                        Auction End Date & Time
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="date"
                                            name="auction_end_date"
                                            defaultValue={groupDetail.group.auction_end_at ? new Date(groupDetail.group.auction_end_at).toISOString().split('T')[0] : ''}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 8,
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                        <input
                                            type="time"
                                            name="auction_end_time"
                                            defaultValue={groupDetail.group.auction_end_at ? new Date(groupDetail.group.auction_end_at).toTimeString().slice(0, 5) : ''}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 8,
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        Date and time when the auction ends (must be after start date/time)
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button
                                        type="submit"
                                        disabled={editingAuction}
                                        style={{
                                            flex: 1,
                                            padding: '12px 24px',
                                            background: editingAuction ? '#94a3b8' : '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 8,
                                            cursor: editingAuction ? 'not-allowed' : 'pointer',
                                            fontSize: '1rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        {editingAuction ? 'Updating...' : 'Update Auction'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditAuction(false)
                                            setEditAuctionError(null)
                                        }}
                                        disabled={editingAuction}
                                        style={{
                                            padding: '12px 24px',
                                            background: '#f1f5f9',
                                            color: '#1e293b',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            cursor: editingAuction ? 'not-allowed' : 'pointer',
                                            fontSize: '1rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

