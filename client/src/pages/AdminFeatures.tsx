import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

interface FeatureConfig {
    id: string
    name: string
    description: string | null
    charge_percent: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export default function AdminFeatures() {
    const { state } = useAuth()
    const [features, setFeatures] = useState<FeatureConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingFeature, setEditingFeature] = useState<FeatureConfig | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        charge_percent: ''
    })

    useEffect(() => {
        fetchFeatures()
    }, [])

    async function fetchFeatures() {
        try {
            const response = await fetch('/admin/features')
            if (response.ok) {
                const data = await response.json()
                setFeatures(data)
            }
        } catch (error) {
            console.error('Error fetching features:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch('/admin/features', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description || null,
                    charge_percent: parseFloat(formData.charge_percent)
                })
            })

            if (response.ok) {
                await fetchFeatures()
                setShowAddForm(false)
                setFormData({ name: '', description: '', charge_percent: '' })
                alert('Feature created successfully!')
            } else {
                const error = await response.json()
                alert(error.message || 'Failed to create feature')
            }
        } catch (error) {
            console.error('Error creating feature:', error)
            alert('An error occurred')
        }
    }

    async function handleUpdate() {
        if (!editingFeature) return

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/admin/features/${editingFeature.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description || null,
                    charge_percent: parseFloat(formData.charge_percent)
                })
            })

            if (response.ok) {
                await fetchFeatures()
                setEditingFeature(null)
                setFormData({ name: '', description: '', charge_percent: '' })
                alert('Feature updated successfully!')
            } else {
                const error = await response.json()
                alert(error.message || 'Failed to update feature')
            }
        } catch (error) {
            console.error('Error updating feature:', error)
            alert('An error occurred')
        }
    }

    async function handleDelete(id: string) {
        try {
            const headers: Record<string, string> = {}
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            const response = await fetch(`/admin/features/${id}`, {
                method: 'DELETE',
                headers
            })

            if (response.ok) {
                await fetchFeatures()
                setDeleteConfirm(null)
                alert('Feature deleted successfully!')
            } else {
                const error = await response.json()
                alert(error.message || 'Failed to delete feature')
            }
        } catch (error) {
            console.error('Error deleting feature:', error)
            alert('An error occurred')
        }
    }

    function startEdit(feature: FeatureConfig) {
        setEditingFeature(feature)
        setFormData({
            name: feature.name,
            description: feature.description || '',
            charge_percent: feature.charge_percent.toString()
        })
        setShowAddForm(false)
    }

    function cancelEdit() {
        setEditingFeature(null)
        setFormData({ name: '', description: '', charge_percent: '' })
    }

    return (
        <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Link to="/home" style={{ textDecoration: 'none', color: '#2563eb', marginBottom: 8, display: 'inline-block' }}>← Back to Home</Link>
                    <h1 style={{ margin: '8px 0', fontSize: '2rem' }}>Feature Management</h1>
                    <p style={{ color: '#64748b', margin: 0 }}>Configure available features and their charges for groups</p>
                </div>
                <button
                    onClick={() => {
                        setShowAddForm(true)
                        setEditingFeature(null)
                        setFormData({ name: '', description: '', charge_percent: '' })
                    }}
                    style={{
                        padding: '12px 24px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    + Add Feature
                </button>
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingFeature) && (
                <div style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 24
                }}>
                    <h2 style={{ marginTop: 0 }}>{editingFeature ? 'Edit Feature' : 'Add New Feature'}</h2>
                    <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                Feature Name <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Advanced Analytics"
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
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe what this feature provides..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontSize: '1rem',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                Charge Percent (%) <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.charge_percent}
                                onChange={e => setFormData({ ...formData, charge_percent: e.target.value })}
                                placeholder="e.g. 2.5"
                                min="0"
                                max="100"
                                step="0.1"
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontSize: '1rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                                Percentage charge applied to group amount per auction
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={editingFeature ? handleUpdate : handleCreate}
                                disabled={!formData.name || !formData.charge_percent}
                                style={{
                                    padding: '12px 24px',
                                    background: '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: (!formData.name || !formData.charge_percent) ? 'not-allowed' : 'pointer',
                                    opacity: (!formData.name || !formData.charge_percent) ? 0.5 : 1
                                }}
                            >
                                {editingFeature ? 'Update Feature' : 'Create Feature'}
                            </button>
                            <button
                                onClick={() => {
                                    if (editingFeature) cancelEdit()
                                    else setShowAddForm(false)
                                    setFormData({ name: '', description: '', charge_percent: '' })
                                }}
                                style={{
                                    padding: '12px 24px',
                                    background: '#fff',
                                    color: '#1e293b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Features List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading features...</div>
            ) : features.length === 0 ? (
                <div style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '60px 24px',
                    textAlign: 'center',
                    color: '#64748b'
                }}>
                    <p style={{ fontSize: '1.125rem', marginBottom: 8 }}>No features configured</p>
                    <p>Click "Add Feature" to create your first feature</p>
                </div>
            ) : (
                <div style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    overflowX: 'auto'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ textAlign: 'left', padding: '12px', color: '#1e293b', fontWeight: 600 }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '12px', color: '#1e293b', fontWeight: 600 }}>Description</th>
                                <th style={{ textAlign: 'center', padding: '12px', color: '#1e293b', fontWeight: 600 }}>Charge %</th>
                                <th style={{ textAlign: 'center', padding: '12px', color: '#1e293b', fontWeight: 600 }}>Status</th>
                                <th style={{ textAlign: 'right', padding: '12px', color: '#1e293b', fontWeight: 600 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {features.map(feature => (
                                <tr key={feature.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '16px 12px', color: '#1e293b', fontWeight: 500 }}>{feature.name}</td>
                                    <td style={{ padding: '16px 12px', color: '#64748b', fontSize: '0.875rem' }}>
                                        {feature.description || '—'}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>
                                        {parseFloat(feature.charge_percent.toString())}%
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: 12,
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            background: feature.is_active ? '#dcfce7' : '#fef2f2',
                                            color: feature.is_active ? '#16a34a' : '#dc2626'
                                        }}>
                                            {feature.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => startEdit(feature)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#eff6ff',
                                                    color: '#2563eb',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: 6,
                                                    fontSize: '0.875rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(feature.id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#fef2f2',
                                                    color: '#dc2626',
                                                    border: '1px solid #fecaca',
                                                    borderRadius: 6,
                                                    fontSize: '0.875rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div
                    style={{
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
                    }}
                    onClick={() => setDeleteConfirm(null)}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 12,
                            padding: 24,
                            maxWidth: 400,
                            width: '90%'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginTop: 0 }}>Delete Feature</h3>
                        <p style={{ color: '#64748b' }}>
                            Are you sure you want to delete this feature? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#dc2626',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

