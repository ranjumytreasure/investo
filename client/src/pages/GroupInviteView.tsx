import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

interface GroupInviteViewData {
    group: {
        id: string
        name: string
        amount: number
        status: string
        type: string
        next_auction_date: string | null
        auction_frequency: string | null
        number_of_members: number | null
        billing_charges: number
    }
    shares: any[]
    features: any[]
    completedShares: number
    totalShares: number
    isPublic: boolean
}

export default function GroupInviteView() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { dispatch } = useAuth()
    const [data, setData] = useState<GroupInviteViewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [phone, setPhone] = useState('')
    const [otp, setOtp] = useState('')
    const [pin, setPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [requestingOtp, setRequestingOtp] = useState(false)
    const [verifyingOtp, setVerifyingOtp] = useState(false)
    const [showOtpForm, setShowOtpForm] = useState(false)
    const [otpVerified, setOtpVerified] = useState(false) // Track if OTP is verified, then show PIN form

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const phoneParam = urlParams.get('phone')
        if (phoneParam) {
            setPhone(phoneParam.trim())
            // If phone is in URL, user should verify their identity via OTP
            // The phone number in the URL is the one that was invited
        }
        fetchGroupData()
    }, [id])

    async function fetchGroupData() {
        if (!id) return
        setLoading(true)
        try {
            const response = await fetch(`/groups/${id}/public`)
            if (response.ok) {
                const data = await response.json()
                setData(data)
            } else {
                const errorData = await response.json()
                setError(errorData.message || 'Failed to load group details')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load group details')
        } finally {
            setLoading(false)
        }
    }

    async function handleRequestOtp() {
        if (!phone || !id) {
            alert('Please enter your phone number')
            return
        }

        setRequestingOtp(true)
        try {
            const response = await fetch(`/groups/${id}/invite/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            })
            const data = await response.json()
            if (response.ok) {
                // Show OTP in development (it's returned in response)
                const message = data.otp
                    ? `OTP sent! Your OTP is: ${data.otp} (This is shown for development only)`
                    : 'OTP sent! Please check your phone.'
                alert(message)
                // Auto-fill OTP in development mode if available
                if (data.otp) {
                    setOtp(data.otp)
                }
                setShowOtpForm(true)
            } else {
                alert(data.message || 'Failed to request OTP')
            }
        } catch (err: any) {
            alert(err.message || 'Failed to request OTP')
        } finally {
            setRequestingOtp(false)
        }
    }

    async function handleVerifyOtp() {
        if (!phone || !otp || !id) {
            alert('Please enter phone number and OTP')
            return
        }

        setVerifyingOtp(true)
        try {
            const response = await fetch(`/groups/${id}/invite/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp })
            })
            const data = await response.json()
            if (response.ok && data.verified) {
                // OTP verified, now show PIN form
                setOtpVerified(true)
                setVerifyingOtp(false)
            } else {
                alert(data.message || 'Invalid OTP')
                setVerifyingOtp(false)
            }
        } catch (err: any) {
            alert(err.message || 'Failed to verify OTP')
            setVerifyingOtp(false)
        }
    }

    async function handleSetPinAndActivate() {
        if (!pin || !confirmPin) {
            alert('Please enter and confirm your PIN')
            return
        }

        if (pin.length !== 4) {
            alert('PIN must be exactly 4 digits')
            return
        }

        if (pin !== confirmPin) {
            alert('PINs do not match. Please try again.')
            return
        }

        setVerifyingOtp(true)
        try {
            const response = await fetch(`/groups/${id}/invite/set-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, pin })
            })
            const data = await response.json()
            if (response.ok && data.token) {
                // Save to localStorage
                localStorage.setItem('token', data.token)
                localStorage.setItem('phone', phone)
                if (data.role) {
                    localStorage.setItem('role', data.role)
                }

                // Update auth context
                dispatch({ type: 'SET_TOKEN', token: data.token })
                dispatch({ type: 'SET_PHONE', phone })
                if (data.role) {
                    dispatch({ type: 'SET_ROLE', role: data.role })
                }

                alert('PIN set successfully! You have been activated and logged in.')
                // Navigate to home page
                navigate('/home')
            } else {
                alert(data.message || 'Failed to set PIN')
            }
        } catch (err: any) {
            alert(err.message || 'Failed to set PIN')
        } finally {
            setVerifyingOtp(false)
        }
    }

    if (loading) {
        return (
            <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px', textAlign: 'center' }}>
                <p>Loading group details...</p>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px' }}>
                <div style={{ padding: 16, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c' }}>
                    {error || 'Group not found'}
                </div>
            </div>
        )
    }

    const { group } = data

    return (
        <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>
                    {group.name}
                </h1>
                <p style={{ margin: 0, fontSize: '1rem', color: '#64748b' }}>
                    You've been invited to join this group
                </p>
            </div>

            {/* Group Details */}
            <div style={{ display: 'grid', gap: 24, marginBottom: 32 }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, background: '#fff' }}>
                    <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 600 }}>Group Details</h2>
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Group Amount:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{parseFloat(group.amount.toString()).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Type:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{group.type}</span>
                        </div>
                        {group.number_of_members && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Number of Members:</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{group.number_of_members}</span>
                            </div>
                        )}
                        {group.next_auction_date && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Next Auction Date:</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                    {new Date(group.next_auction_date).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {group.auction_frequency && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Auction Frequency:</span>
                                <span style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{group.auction_frequency}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Total Charges:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{parseFloat(group.billing_charges.toString()).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* OTP Verification Section */}
                <div style={{ border: '2px solid #10b981', borderRadius: 12, padding: 24, background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
                        Accept Invite
                    </h2>
                    <div style={{
                        marginBottom: 20,
                        padding: 12,
                        background: '#eff6ff',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe'
                    }}>
                        <p style={{ margin: '0 0 8px 0', color: '#1e40af', fontWeight: 600, fontSize: '0.875rem' }}>
                            📱 Verification Required
                        </p>
                        <p style={{ margin: 0, color: '#1e40af', fontSize: '0.875rem' }}>
                            {phone
                                ? `You've been invited with phone number: ${phone}. We'll send an OTP to this number to verify your identity.`
                                : 'Enter the phone number you were invited with to verify your identity via OTP.'
                            }
                        </p>
                    </div>

                    {!showOtpForm ? (
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                    Phone Number <span style={{ color: '#dc2626' }}>*</span>
                                    {phone && (
                                        <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#10b981', marginLeft: 8 }}>
                                            (Pre-filled from invite)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="e.g. 9876543210"
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 8,
                                        fontSize: '1rem',
                                        boxSizing: 'border-box',
                                        background: phone ? '#f8fafc' : '#fff'
                                    }}
                                    readOnly={!!phone} // Make read-only if phone came from URL
                                />
                                {phone && (
                                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        This phone number is locked. Only this number can accept this invite.
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleRequestOtp}
                                disabled={requestingOtp || !phone}
                                style={{
                                    padding: '12px 24px',
                                    background: (requestingOtp || !phone) ? '#94a3b8' : '#10b981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: (requestingOtp || !phone) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {requestingOtp ? 'Requesting...' : '📲 Request OTP'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{
                                padding: 12,
                                background: '#fef3c7',
                                borderRadius: 8,
                                marginBottom: 12,
                                border: '1px solid #fde68a'
                            }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: 600, color: '#92400e' }}>
                                    ✓ OTP Sent
                                </p>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                                    An OTP has been sent to <strong>{phone}</strong>. Please check your phone and enter the 6-digit code below.
                                </p>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                    Phone Number (Verified)
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 8,
                                        fontSize: '1rem',
                                        boxSizing: 'border-box',
                                        background: '#f1f5f9',
                                        color: '#64748b'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                    Enter OTP <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow digits
                                    placeholder="Enter 6-digit OTP"
                                    maxLength={6}
                                    inputMode="numeric"
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 8,
                                        fontSize: '1.5rem',
                                        textAlign: 'center',
                                        letterSpacing: '0.5rem',
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                    autoFocus
                                />
                                <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Enter the 6-digit code sent to {phone}
                                </p>
                            </div>
                            {!otpVerified ? (
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={verifyingOtp || !phone || !otp || otp.length !== 6}
                                        style={{
                                            flex: 1,
                                            padding: '12px 24px',
                                            background: (verifyingOtp || !phone || !otp || otp.length !== 6) ? '#94a3b8' : '#10b981',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            cursor: (verifyingOtp || !phone || !otp || otp.length !== 6) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowOtpForm(false)
                                            setOtp('')
                                            setOtpVerified(false)
                                        }}
                                        style={{
                                            padding: '12px 24px',
                                            background: '#f1f5f9',
                                            color: '#1e293b',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div style={{
                                        padding: 12,
                                        background: '#dcfce7',
                                        borderRadius: 8,
                                        marginBottom: 12,
                                        border: '1px solid #86efac'
                                    }}>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>
                                            ✓ OTP Verified Successfully
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}>
                                            Now set your PIN for future logins. This is mandatory.
                                        </p>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                            Set PIN <span style={{ color: '#dc2626' }}>*</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                                                (4 digits, for future logins)
                                            </span>
                                        </label>
                                        <input
                                            type="password"
                                            value={pin}
                                            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} // Only digits, max 4
                                            placeholder="Enter 4-digit PIN"
                                            maxLength={4}
                                            inputMode="numeric"
                                            style={{
                                                width: '100%',
                                                padding: 12,
                                                border: pin.length === 4 ? '2px solid #10b981' : '1px solid #cbd5e1',
                                                borderRadius: 8,
                                                fontSize: '1.5rem',
                                                textAlign: 'center',
                                                letterSpacing: '0.5rem',
                                                fontWeight: 600,
                                                boxSizing: 'border-box'
                                            }}
                                            autoFocus
                                        />
                                        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                            Enter a 4-digit PIN that you'll remember. You'll use this to login in the future.
                                        </p>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                            Confirm PIN <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPin}
                                            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} // Only digits, max 4
                                            placeholder="Re-enter 4-digit PIN"
                                            maxLength={4}
                                            inputMode="numeric"
                                            style={{
                                                width: '100%',
                                                padding: 12,
                                                border: (confirmPin.length === 4 && pin === confirmPin) ? '2px solid #10b981' :
                                                    (confirmPin.length > 0 && pin !== confirmPin) ? '2px solid #dc2626' : '1px solid #cbd5e1',
                                                borderRadius: 8,
                                                fontSize: '1.5rem',
                                                textAlign: 'center',
                                                letterSpacing: '0.5rem',
                                                fontWeight: 600,
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        {confirmPin.length > 0 && pin !== confirmPin && (
                                            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                                                PINs do not match
                                            </p>
                                        )}
                                        {confirmPin.length === 4 && pin === confirmPin && (
                                            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                                                ✓ PINs match
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            onClick={handleSetPinAndActivate}
                                            disabled={verifyingOtp || !pin || !confirmPin || pin.length !== 4 || pin !== confirmPin}
                                            style={{
                                                flex: 1,
                                                padding: '12px 24px',
                                                background: (verifyingOtp || !pin || !confirmPin || pin.length !== 4 || pin !== confirmPin) ? '#94a3b8' : '#10b981',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                cursor: (verifyingOtp || !pin || !confirmPin || pin.length !== 4 || pin !== confirmPin) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {verifyingOtp ? 'Setting PIN...' : 'Set PIN & Activate Account'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setOtpVerified(false)
                                                setPin('')
                                                setConfirmPin('')
                                            }}
                                            style={{
                                                padding: '12px 24px',
                                                background: '#f1f5f9',
                                                color: '#1e293b',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 8,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

