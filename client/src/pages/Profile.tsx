import { useState, useEffect } from 'react'
import { useAuth } from '../state/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { useLanguage } from '../state/LanguageContext'
import LoadingBar from '../components/LoadingBar'

interface UserProfile {
    id: string
    name: string | null
    phone: string
    email: string | null
    status: string
    kyc_verified: boolean
    face_scan_url: string | null
    aadhar_masked: string | null
    passport_masked: string | null
    created_at: string
    updated_at: string
}

interface Address {
    id: string
    user_id: string
    address_type: string
    address_line1: string | null
    address_line2: string | null
    landmark: string | null
    city: string | null
    state: string | null
    country: string
    pincode: string | null
    latitude: number | null
    longitude: number | null
    proof_type: string | null
    proof_document_url: string | null
    verified: boolean
    verified_date: string | null
    created_at: string
    updated_at: string
}

export default function Profile() {
    const { state, dispatch } = useAuth()
    const { t: _t } = useLanguage()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [addresses, setAddresses] = useState<Address[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    
    // Form states
    const [editMode, setEditMode] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    
    // Address form states
    const [showAddressForm, setShowAddressForm] = useState(false)
    const [editingAddress, setEditingAddress] = useState<Address | null>(null)
    const [addressForm, setAddressForm] = useState({
        address_type: 'home',
        address_line1: '',
        address_line2: '',
        landmark: '',
        city: '',
        state: '',
        country: 'India',
        pincode: ''
    })

    useEffect(() => {
        // Check both state.token and localStorage for token (similar to Home.tsx and Header.tsx)
        const tokenFromStorage = localStorage.getItem('token')
        const currentToken = state.token || tokenFromStorage
        
        if (!currentToken) {
            console.log('[Profile] No token found, redirecting to login')
            navigate('/login')
            return
        }
        
        // If token exists in localStorage but not in state, update state
        if (tokenFromStorage && !state.token) {
            dispatch({ type: 'SET_TOKEN', token: tokenFromStorage })
        }
        
        fetchProfile()
    }, [state.token, navigate, dispatch])

    async function fetchProfile() {
        // Check both state.token and localStorage for token
        const tokenFromStorage = localStorage.getItem('token')
        const currentToken = state.token || tokenFromStorage
        
        if (!currentToken) {
            console.log('[Profile] No token available for profile fetch')
            return
        }
        
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/profile', {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setProfile(data.user)
                setAddresses(data.addresses || [])
                setName(data.user.name || '')
                setEmail(data.user.email || '')
            } else if (response.status === 401) {
                localStorage.removeItem('token')
                localStorage.removeItem('phone')
                localStorage.removeItem('role')
                dispatch({ type: 'LOGOUT' })
                navigate('/login')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to load profile' }))
                setError(errorData.message || 'Failed to load profile')
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
            setError('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveProfile() {
        const tokenFromStorage = localStorage.getItem('token')
        const currentToken = state.token || tokenFromStorage
        if (!currentToken) return
        
        setSaving(true)
        setError(null)
        try {
            const response = await fetch('/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email })
            })
            if (response.ok) {
                const data = await response.json()
                setProfile(data.user)
                setEditMode(false)
                // Update auth context if name changed
                if (data.user.name) {
                    dispatch({ type: 'SET_PROFILE', name: data.user.name })
                }
                alert('Profile updated successfully')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }))
                setError(errorData.message || 'Failed to update profile')
            }
        } catch (err) {
            console.error('Error updating profile:', err)
            setError('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    async function handleSaveAddress() {
        const tokenFromStorage = localStorage.getItem('token')
        const currentToken = state.token || tokenFromStorage
        if (!currentToken) return
        
        setSaving(true)
        setError(null)
        try {
            const url = editingAddress 
                ? `/profile/addresses/${editingAddress.id}`
                : '/profile/addresses'
            const method = editingAddress ? 'PUT' : 'POST'
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addressForm)
            })
            if (response.ok) {
                await fetchProfile() // Refresh profile
                setShowAddressForm(false)
                setEditingAddress(null)
                setAddressForm({
                    address_type: 'home',
                    address_line1: '',
                    address_line2: '',
                    landmark: '',
                    city: '',
                    state: '',
                    country: 'India',
                    pincode: ''
                })
                alert(editingAddress ? 'Address updated successfully' : 'Address created successfully')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to save address' }))
                setError(errorData.message || 'Failed to save address')
            }
        } catch (err) {
            console.error('Error saving address:', err)
            setError('Failed to save address')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteAddress(addressId: string) {
        const tokenFromStorage = localStorage.getItem('token')
        const currentToken = state.token || tokenFromStorage
        if (!currentToken) return
        
        if (!confirm('Are you sure you want to delete this address?')) return
        
        try {
            const response = await fetch(`/profile/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            })
            if (response.ok) {
                await fetchProfile() // Refresh profile
                alert('Address deleted successfully')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete address' }))
                alert(errorData.message || 'Failed to delete address')
            }
        } catch (err) {
            console.error('Error deleting address:', err)
            alert('Failed to delete address')
        }
    }

    async function handleDeleteAccount() {
        const tokenFromStorage = localStorage.getItem('token')
        const currentToken = state.token || tokenFromStorage
        if (!currentToken) return
        
        const confirm1 = window.confirm(
            'Are you sure you want to delete your account?\n\n' +
            'This will permanently delete:\n' +
            '- Your account\n' +
            '- All your addresses\n\n' +
            'This action cannot be undone.'
        )
        if (!confirm1) return
        
        const confirm2 = window.confirm('This is your final confirmation. Delete your account?')
        if (!confirm2) return

        setDeleting(true)
        try {
            const response = await fetch('/profile', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            })
            if (response.ok) {
                localStorage.removeItem('token')
                localStorage.removeItem('phone')
                localStorage.removeItem('role')
                dispatch({ type: 'LOGOUT' })
                alert('Account deleted successfully')
                navigate('/login')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete account' }))
                alert(errorData.message || 'Failed to delete account')
            }
        } catch (err) {
            console.error('Error deleting account:', err)
            alert('Failed to delete account')
        } finally {
            setDeleting(false)
        }
    }

    function startEditAddress(address?: Address) {
        if (address) {
            setEditingAddress(address)
            setAddressForm({
                address_type: address.address_type || 'home',
                address_line1: address.address_line1 || '',
                address_line2: address.address_line2 || '',
                landmark: address.landmark || '',
                city: address.city || '',
                state: address.state || '',
                country: address.country || 'India',
                pincode: address.pincode || ''
            })
        } else {
            setEditingAddress(null)
            setAddressForm({
                address_type: 'home',
                address_line1: '',
                address_line2: '',
                landmark: '',
                city: '',
                state: '',
                country: 'India',
                pincode: ''
            })
        }
        setShowAddressForm(true)
    }

    if (loading) {
        return (
            <>
                <LoadingBar />
                <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading profile...</div>
                </div>
            </>
        )
    }

    if (error && !profile) {
        return (
            <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
                <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>{error}</div>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 720, margin: '24px auto', padding: '24px 48px' }}>
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
            <h1 style={{ marginTop: 0, marginBottom: 24 }}>Profile</h1>

            {error && (
                <div style={{ 
                    marginBottom: 16, 
                    padding: 12, 
                    background: '#fee2e2', 
                    border: '1px solid #fecaca', 
                    borderRadius: 8, 
                    color: '#dc2626' 
                }}>
                    {error}
                </div>
            )}

            {/* Profile Information */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>Personal Information</h2>
                    {!editMode ? (
                        <button
                            onClick={() => setEditMode(true)}
                            style={{
                                padding: '8px 16px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Edit
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => {
                                    setEditMode(false)
                                    setName(profile?.name || '')
                                    setEmail(profile?.email || '')
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                style={{
                                    padding: '8px 16px',
                                    background: saving ? '#94a3b8' : '#16a34a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>

                {editMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: '0.875rem'
                                }}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: '0.875rem'
                                }}
                                placeholder="Enter your email"
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 4 }}>Name</div>
                            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{profile?.name || 'Not set'}</div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 4 }}>Phone</div>
                            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{profile?.phone || 'N/A'}</div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 4 }}>Email</div>
                            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{profile?.email || 'Not set'}</div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 4 }}>KYC Status</div>
                            <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    background: profile?.kyc_verified ? '#dcfce7' : '#fef3c7',
                                    color: profile?.kyc_verified ? '#166534' : '#d97706'
                                }}>
                                    {profile?.kyc_verified ? 'Verified' : 'Not Verified'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Addresses */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>Addresses</h2>
                    <button
                        onClick={() => startEditAddress()}
                        style={{
                            padding: '8px 16px',
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        + Add Address
                    </button>
                </div>

                {addresses.length === 0 && !showAddressForm ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No addresses added yet. Click "Add Address" to create one.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {addresses.map((address) => (
                            <div
                                key={address.id}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    padding: 16,
                                    background: '#f8fafc'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, textTransform: 'capitalize' }}>
                                            {address.address_type}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                                            {address.address_line1 && <div>{address.address_line1}</div>}
                                            {address.address_line2 && <div>{address.address_line2}</div>}
                                            {address.landmark && <div>{address.landmark}</div>}
                                            <div>
                                                {address.city && `${address.city}, `}
                                                {address.state && `${address.state} `}
                                                {address.pincode && `- ${address.pincode}`}
                                            </div>
                                            {address.country && <div>{address.country}</div>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => startEditAddress(address)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '0.875rem',
                                                background: '#f1f5f9',
                                                color: '#1e293b',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 6,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAddress(address.id)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '0.875rem',
                                                background: '#dc2626',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 6,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Address Form */}
                {showAddressForm && (
                    <div style={{
                        marginTop: 20,
                        padding: 20,
                        border: '2px solid #2563eb',
                        borderRadius: 8,
                        background: '#eff6ff'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Address Type</label>
                                <select
                                    value={addressForm.address_type}
                                    onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    <option value="home">Home</option>
                                    <option value="work">Work</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Address Line 1</label>
                                <input
                                    type="text"
                                    value={addressForm.address_line1}
                                    onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: '0.875rem'
                                    }}
                                    placeholder="Street address, P.O. box"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Address Line 2</label>
                                <input
                                    type="text"
                                    value={addressForm.address_line2}
                                    onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: '0.875rem'
                                    }}
                                    placeholder="Apartment, suite, unit, building, floor"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Landmark</label>
                                <input
                                    type="text"
                                    value={addressForm.landmark}
                                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: '0.875rem'
                                    }}
                                    placeholder="Nearby landmark"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>City</label>
                                    <input
                                        type="text"
                                        value={addressForm.city}
                                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: 8,
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>State</label>
                                    <input
                                        type="text"
                                        value={addressForm.state}
                                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: 8,
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="State"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Pincode</label>
                                    <input
                                        type="text"
                                        value={addressForm.pincode}
                                        onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: 8,
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="Pincode"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Country</label>
                                    <input
                                        type="text"
                                        value={addressForm.country}
                                        onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: 8,
                                            fontSize: '0.875rem'
                                        }}
                                        placeholder="Country"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button
                                    onClick={() => {
                                        setShowAddressForm(false)
                                        setEditingAddress(null)
                                        setAddressForm({
                                            address_type: 'home',
                                            address_line1: '',
                                            address_line2: '',
                                            landmark: '',
                                            city: '',
                                            state: '',
                                            country: 'India',
                                            pincode: ''
                                        })
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#f1f5f9',
                                        color: '#1e293b',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAddress}
                                    disabled={saving}
                                    style={{
                                        padding: '10px 20px',
                                        background: saving ? '#94a3b8' : '#16a34a',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    {saving ? 'Saving...' : editingAddress ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Account */}
            <div style={{ border: '1px solid #dc2626', borderRadius: 12, padding: 24, background: '#fef2f2', marginBottom: 24 }}>
                <h2 style={{ marginTop: 0, marginBottom: 12, color: '#dc2626' }}>Danger Zone</h2>
                <p style={{ color: '#991b1b', marginBottom: 16 }}>
                    Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    style={{
                        padding: '10px 20px',
                        background: deleting ? '#94a3b8' : '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: deleting ? 'not-allowed' : 'pointer',
                        fontWeight: 500
                    }}
                >
                    {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
            </div>
        </div>
    )
}
