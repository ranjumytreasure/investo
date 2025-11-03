import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

interface FeatureConfig {
    id: string
    name: string
    description: string | null
    charge_percent: number
    is_active: boolean
}

interface GroupFeature {
    id: string
    group_id: string
    feature_id: string
    feature_name: string
    charge_percent: number
    charge_amount: number
    enabled: boolean
}

export default function GroupFeatures() {
    const { id } = useParams<{ id: string }>()
    const { state } = useAuth()
    const [groupFeatures, setGroupFeatures] = useState<GroupFeature[]>([])
    const [availableFeatures, setAvailableFeatures] = useState<FeatureConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [groupInfo, setGroupInfo] = useState<any>(null)
    const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])

    useEffect(() => {
        if (id) {
            fetchGroupFeatures()
            fetchAvailableFeatures()
        }
    }, [id])

    useEffect(() => {
        const currentFeatureIds = groupFeatures.map(f => f.feature_id).filter(Boolean)
        setSelectedFeatureIds([...currentFeatureIds])
    }, [groupFeatures])

    async function fetchGroupFeatures() {
        if (!id) return
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/groups/${id}/features`, { headers })
            if (response.ok) {
                const data = await response.json()
                setGroupFeatures(data.features || [])
                setGroupInfo(data.group || null)
            }
        } catch (error) {
            console.error('Error fetching group features:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchAvailableFeatures() {
        try {
            const response = await fetch('/admin/features')
            if (response.ok) {
                const features = await response.json()
                setAvailableFeatures(features.filter((f: FeatureConfig) => f.is_active))
            }
        } catch (error) {
            console.error('Error fetching available features:', error)
        }
    }

    async function handleUpdateFeatures() {
        if (!id) return

        setUpdating(true)
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/groups/${id}/features`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    feature_ids: selectedFeatureIds
                })
            })

            if (response.ok) {
                const data = await response.json()
                setGroupFeatures(data.features || [])
                setGroupInfo(data.group || null)
                alert('Features updated successfully!')
            } else {
                const error = await response.json()
                alert(error.message || 'Failed to update features')
            }
        } catch (error) {
            console.error('Error updating features:', error)
            alert('An error occurred')
        } finally {
            setUpdating(false)
        }
    }

    function toggleFeature(featureId: string) {
        setSelectedFeatureIds(prev => {
            const index = prev.indexOf(featureId)
            if (index > -1) {
                return prev.filter(id => id !== featureId)
            } else {
                return [...prev, featureId]
            }
        })
    }

    if (loading) {
        return (
            <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px', textAlign: 'center' }}>
                <p>Loading group features...</p>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px' }}>
            <div style={{ marginBottom: 24 }}>
                <Link to="/home" style={{ textDecoration: 'none', color: '#2563eb', marginBottom: 8, display: 'inline-block' }}>
                    ← Back to Home
                </Link>
                <h1 style={{ margin: '8px 0', fontSize: '2rem' }}>Manage Group Features</h1>
                <p style={{ color: '#64748b', margin: 0 }}>
                    Add or remove features for this group. Billing charges will be recalculated automatically.
                </p>
            </div>

            {groupInfo && (
                <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: 12 }}>Group Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 4 }}>Group Name</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{groupInfo.name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 4 }}>Group Amount</div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>₹{parseFloat(groupInfo.amount).toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 4 }}>Current Billing Charges</div>
                            <div style={{ fontWeight: 600, color: '#dc2626' }}>₹{parseFloat(groupInfo.billing_charges || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Features */}
            <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24
            }}>
                <h2 style={{ marginTop: 0, marginBottom: 20 }}>Current Features</h2>
                {groupFeatures.length === 0 ? (
                    <p style={{ color: '#64748b', fontStyle: 'italic' }}>No features currently enabled for this group.</p>
                ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {groupFeatures.map(feature => (
                            <div key={feature.id} style={{
                                padding: 16,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{feature.feature_name}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                        {parseFloat(feature.charge_percent.toString())}% - ₹{parseFloat(feature.charge_amount.toString()).toLocaleString()} per auction
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Available Features Selection */}
            <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 24
            }}>
                <h2 style={{ marginTop: 0, marginBottom: 20 }}>Available Features</h2>
                <p style={{ color: '#64748b', marginBottom: 24 }}>
                    Select features to add to this group. Changes will update billing charges immediately.
                </p>

                {availableFeatures.length === 0 ? (
                    <p style={{ color: '#64748b', fontStyle: 'italic' }}>No features available. Contact admin.</p>
                ) : (
                    <>
                        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                            {availableFeatures.map(feature => {
                                const isSelected = selectedFeatureIds.includes(feature.id)
                                return (
                                    <label
                                        key={feature.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'start',
                                            gap: 12,
                                            padding: 16,
                                            background: isSelected ? '#eff6ff' : '#fff',
                                            border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                                            borderRadius: 8,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleFeature(feature.id)}
                                            style={{ marginTop: 2 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{feature.name}</span>
                                                <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.875rem' }}>
                                                    {parseFloat(feature.charge_percent.toString())}%
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                                                {feature.description || 'No description'}
                                            </p>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>

                        <button
                            onClick={handleUpdateFeatures}
                            disabled={updating}
                            style={{
                                padding: '12px 24px',
                                background: updating ? '#94a3b8' : '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: updating ? 'not-allowed' : 'pointer',
                                width: '100%'
                            }}
                        >
                            {updating ? 'Updating...' : 'Update Features'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

