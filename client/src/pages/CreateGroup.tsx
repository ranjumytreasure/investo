import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

interface FeatureConfig {
    id: string
    name: string
    description: string | null
    charge_percent: number
    is_active: boolean
}

type Step = 'details' | 'preview'

export default function CreateGroup() {
    const navigate = useNavigate()
    const { state } = useAuth()
    const [step, setStep] = useState<Step>('details')
    const [showTemplates, setShowTemplates] = useState(false)
    const [templateSearch, setTemplateSearch] = useState('')

    // Group Details (70% focus)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [amount, setAmount] = useState('')
    const [members, setMembers] = useState('')
    const [creatorSharePercent, setCreatorSharePercent] = useState('100') // Creator's share percentage

    // Templates with all details
    const templates = [
        {
            id: 'template1',
            name: 'Friend Group',
            amount: '50000',
            members: '10',
            label: '₹50,000',
            frequency: 'monthly' as const,
            description: 'Monthly savings pool with friends'
        },
        {
            id: 'template2',
            name: 'Friend Group',
            amount: '60000',
            members: '12',
            label: '₹60,000',
            frequency: 'monthly' as const,
            description: 'Monthly savings pool with friends'
        },
        {
            id: 'template3',
            name: 'Friend Group',
            amount: '100000',
            members: '15',
            label: '₹100,000',
            frequency: 'monthly' as const,
            description: 'Monthly savings pool with friends'
        },
        {
            id: 'template4',
            name: 'Family Group',
            amount: '75000',
            members: '8',
            label: '₹75,000',
            frequency: 'weekly' as const,
            description: 'Weekly family savings group'
        },
        {
            id: 'template5',
            name: 'Office Group',
            amount: '80000',
            members: '20',
            label: '₹80,000',
            frequency: 'biweekly' as const,
            description: 'Bi-weekly office colleagues pool'
        }
    ]

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        template.label.toLowerCase().includes(templateSearch.toLowerCase()) ||
        template.description.toLowerCase().includes(templateSearch.toLowerCase())
    )

    const applyTemplate = async (template: typeof templates[0]) => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        const startTime = new Date(tomorrow)
        startTime.setHours(14, 0, 0, 0)
        const startTimeStr = startTime.toISOString().slice(0, 16)

        const endTime = new Date(tomorrow)
        endTime.setHours(16, 0, 0, 0)
        const endTimeStr = endTime.toISOString().slice(0, 16)

        setName(template.name)
        setAmount(template.amount)
        setMembers(template.members)
        setDescription(template.description)
        setAuctionFrequency(template.frequency)
        setCreatorSharePercent('100') // Default to 100% when applying template
        setFirstAuctionDate(tomorrowStr)
        setAuctionStartTime(startTimeStr)
        setAuctionEndTime(endTimeStr)

        // Try to auto-select first feature if available (usually standard)
        if (availableFeatures.length > 0 && selectedFeatureIds.length === 0) {
            // Optionally auto-select first feature - commented out so user can choose
            // setSelectedFeatureIds([availableFeatures[0].id])
        }

        setShowTemplates(false)
        setTemplateSearch('')
    }

    // Group Type
    const [groupType, setGroupType] = useState<'deductive'>('deductive')

    // Auction Settings
    const [firstAuctionDate, setFirstAuctionDate] = useState('')
    const [auctionFrequency, setAuctionFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly')
    const [auctionStartTime, setAuctionStartTime] = useState('')
    const [auctionEndTime, setAuctionEndTime] = useState('')

    // Features (30% focus) - Loaded from API
    const [availableFeatures, setAvailableFeatures] = useState<FeatureConfig[]>([])
    const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])
    const [loadingFeatures, setLoadingFeatures] = useState(true)

    // Fetch available features from API
    useEffect(() => {
        async function fetchFeatures() {
            try {
                const response = await fetch('/admin/features')
                if (response.ok) {
                    const features = await response.json()
                    setAvailableFeatures(features.filter((f: FeatureConfig) => f.is_active))
                } else {
                    console.error('Failed to fetch features')
                    // Fallback to default features if API fails
                    setAvailableFeatures([])
                }
            } catch (error) {
                console.error('Error fetching features:', error)
                setAvailableFeatures([])
            } finally {
                setLoadingFeatures(false)
            }
        }
        fetchFeatures()
    }, [])

    const toggleFeature = (featureId: string) => {
        setSelectedFeatureIds(prev =>
            prev.includes(featureId)
                ? prev.filter(id => id !== featureId)
                : [...prev, featureId]
        )
    }

    // Calculate charges based on selected features
    const selectedFeatures = availableFeatures.filter(f => selectedFeatureIds.includes(f.id))
    const totalChargePercent = selectedFeatures.reduce((sum, f) => sum + parseFloat(f.charge_percent.toString()), 0)
    const totalChargeAmount = amount ? (parseFloat(amount) * totalChargePercent / 100).toFixed(2) : '0.00'
    const netAmount = amount ? (parseFloat(amount) - parseFloat(totalChargeAmount)).toFixed(2) : '0.00'

    function next() {
        if (step === 'details') {
            if (!name || !amount || !members || !firstAuctionDate || !auctionStartTime || !auctionEndTime || !creatorSharePercent) {
                alert('Please fill in all required fields')
                return
            }

            const sharePercent = parseFloat(creatorSharePercent)
            if (isNaN(sharePercent) || sharePercent < 0.01 || sharePercent > 100) {
                alert('Share percentage must be between 0.01% and 100%')
                return
            }
            setStep('preview')
        }
    }

    function prev() {
        if (step === 'preview') setStep('details')
    }

    async function handleSubmit() {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' }
            if (state.token) {
                headers['Authorization'] = `Bearer ${state.token}`
            }

            // Prepare the data to send
            const groupData: any = {
                name: name.trim(),
                amount: parseFloat(amount),
                type: groupType,
                first_auction_date: firstAuctionDate || null,
                auction_frequency: auctionFrequency,
                number_of_members: parseInt(members) || null,
                features: selectedFeatureIds, // Array of feature IDs
                creator_share_percent: parseFloat(creatorSharePercent) || 100 // Creator's share percentage
            };

            // Only include auction dates if they are provided
            if (auctionStartTime) {
                groupData.auction_start_at = new Date(auctionStartTime).toISOString();
            }

            if (auctionEndTime) {
                groupData.auction_end_at = new Date(auctionEndTime).toISOString();
            }

            const response = await fetch('/groups', {
                method: 'POST',
                headers,
                body: JSON.stringify(groupData)
            })

            if (response.ok) {
                const group = await response.json()
                navigate(`/home`)
                alert('Group created successfully!')
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to create group' }))
                const errorMessage = errorData.message || errorData.error || 'Failed to create group. Please try again.'
                console.error('Group creation error:', errorData)
                alert(`Error: ${errorMessage}`)
            }
        } catch (error: any) {
            console.error('Error creating group:', error)
            alert(`An error occurred: ${error.message || 'Please try again.'}`)
        }
    }

    return (
        <div style={{ maxWidth: '1800px', margin: '24px auto', padding: '24px 48px' }}>
            <div style={{
                display: 'grid',
                gap: 24,
                gridTemplateColumns: '280px 1fr',
                '@media (max-width: 768px)': { gridTemplateColumns: '1fr' }
            }}>
                {/* Progress Sidebar */}
                <aside style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    background: '#fff',
                    padding: 20,
                    height: 'fit-content',
                    position: 'sticky',
                    top: 24
                }}>
                    <Link to="/home" style={{
                        textDecoration: 'none',
                        color: '#2563eb',
                        display: 'inline-block',
                        marginBottom: 16,
                        fontSize: '0.875rem',
                        fontWeight: 500
                    }}>
                        ← Back to Home
                    </Link>
                    <h2 style={{ marginTop: 0, fontSize: '1.5rem', marginBottom: 8 }}>Create Group</h2>
                    <div style={{ marginTop: 20 }}>
                        <ProgressStep number={1} label="Details" active={step === 'details'} completed={step === 'preview'} />
                        <ProgressStep number={2} label="Preview" active={step === 'preview'} completed={false} />
                    </div>

                    {/* Features Summary (30% section) */}
                    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: 12, color: '#475569' }}>Features & Charges</h3>
                        {loadingFeatures ? (
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading features...</div>
                        ) : (
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 12 }}>
                                {selectedFeatures.length === 0 ? (
                                    <div style={{ color: '#64748b', fontStyle: 'italic' }}>No features selected</div>
                                ) : (
                                    <>
                                        {selectedFeatures.map(f => (
                                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span>{f.name}:</span>
                                                <strong style={{ color: '#2563eb' }}>{parseFloat(f.charge_percent.toString())}%</strong>
                                            </div>
                                        ))}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginTop: 12,
                                            paddingTop: 12,
                                            borderTop: '1px solid #e2e8f0',
                                            fontWeight: 600,
                                            color: '#1e293b'
                                        }}>
                                            <span>Total Charge:</span>
                                            <span style={{ color: '#dc2626' }}>{totalChargePercent.toFixed(1)}%</span>
                                        </div>
                                        {amount && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                                marginTop: 8,
                                                fontStyle: 'italic'
                                            }}>
                                                Per auction: ₹{totalChargeAmount}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Form (70% focus) */}
                <main style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    background: '#fff',
                    padding: 32
                }}>
                    {/* Step 1: Group Details */}
                    {step === 'details' && (
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Group Details</h2>
                                <button
                                    onClick={() => setShowTemplates(!showTemplates)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 8,
                                        background: '#fff',
                                        color: '#2563eb',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#eff6ff'
                                        e.currentTarget.style.borderColor = '#2563eb'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#fff'
                                        e.currentTarget.style.borderColor = '#cbd5e1'
                                    }}
                                >
                                    <span style={{ fontSize: '1.2rem' }}>📋</span>
                                    <span>Quick Templates</span>
                                </button>
                            </div>
                            <p style={{ color: '#64748b', marginBottom: 32 }}>Enter all the information for your money pool</p>


                            <div style={{ display: 'grid', gap: 24 }}>
                                {/* 1. Group Name */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Group Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Friends Monthly Pool"
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* 2. Amount */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Group Amount (₹) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="e.g. ₹5000"
                                        min="0"
                                        step="100"
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* 3. Number of Members */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Number of Members <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={members}
                                        onChange={e => setMembers(e.target.value)}
                                        placeholder="e.g. 10"
                                        min="2"
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* 3.5. Your Share Percentage */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Your Share Percentage (%) <span style={{ color: '#dc2626' }}>*</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                                            (How much of Share #1 do you want?)
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        value={creatorSharePercent}
                                        onChange={e => setCreatorSharePercent(e.target.value)}
                                        placeholder="e.g. 100 (for full share) or 50 (to split)"
                                        min="0.01"
                                        max="100"
                                        step="0.01"
                                        required
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                                        Enter 100% to take the full Share #1, or any percentage (e.g., 50%) if you want to split it with someone else later. Remaining {members ? (100 - parseFloat(creatorSharePercent || '100')).toFixed(2) : '—'}% can be allocated later.
                                    </p>
                                </div>

                                {/* 4. Type (Deductive) */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Group Type <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <div style={{
                                        border: '1px solid #2563eb',
                                        borderRadius: 8,
                                        padding: 16,
                                        background: '#eff6ff',
                                        maxWidth: 600
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <input
                                                type="radio"
                                                checked={true}
                                                readOnly
                                                style={{ marginTop: 0 }}
                                            />
                                            <div>
                                                <strong style={{ color: '#1e293b', fontSize: '1rem' }}>Deductive</strong>
                                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                                                    Rotating savings pool where members bid to win the collected amount
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. First Auction Date */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        First Auction Date <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={firstAuctionDate}
                                        onChange={e => setFirstAuctionDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* 6. Auction Frequency */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Auction Frequency <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <select
                                        value={auctionFrequency}
                                        onChange={e => setAuctionFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box',
                                            background: '#fff'
                                        }}
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Bi-weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                {/* 7. Auction Start Time */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Auction Start Time <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={auctionStartTime}
                                        onChange={e => setAuctionStartTime(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* 8. Auction End Time */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Auction End Time <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={auctionEndTime}
                                        onChange={e => setAuctionEndTime(e.target.value)}
                                        min={auctionStartTime || new Date().toISOString().slice(0, 16)}
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
                                            padding: 12,
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 8,
                                            fontSize: '1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* 9. Description (at the end) */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Describe your group..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            maxWidth: 600,
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
                            </div>
                        </section>
                    )}

                    {/* Step 4: Preview & Submit */}
                    {step === 'preview' && (
                        <section>
                            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: '1.75rem' }}>Preview & Submit</h2>
                            <p style={{ color: '#64748b', marginBottom: 32 }}>Review your group details before creating</p>

                            <div style={{
                                background: '#f8fafc',
                                borderRadius: 12,
                                padding: 24,
                                marginBottom: 24,
                                border: '1px solid #e2e8f0'
                            }}>
                                <h3 style={{ marginTop: 0, marginBottom: 20, color: '#1e293b' }}>Group Summary</h3>

                                <div style={{ display: 'grid', gap: 16 }}>
                                    <SummaryRow label="Group Name" value={name || '—'} />
                                    <SummaryRow label="Group Amount" value={amount ? `₹${parseFloat(amount).toLocaleString()}` : '—'} />
                                    <SummaryRow label="Number of Members" value={members || '—'} />
                                    <SummaryRow label="Your Share Percentage" value={`${creatorSharePercent}%`} />
                                    <SummaryRow label="Group Type" value="Deductive" />
                                    <SummaryRow label="First Auction Date" value={firstAuctionDate ? new Date(firstAuctionDate).toLocaleDateString() : '—'} />
                                    <SummaryRow label="Auction Frequency" value={auctionFrequency.charAt(0).toUpperCase() + auctionFrequency.slice(1)} />
                                    <SummaryRow label="Auction Start Time" value={auctionStartTime ? new Date(auctionStartTime).toLocaleString() : '—'} />
                                    <SummaryRow label="Auction End Time" value={auctionEndTime ? new Date(auctionEndTime).toLocaleString() : '—'} />
                                    <SummaryRow label="Selected Features" value={selectedFeatures.length > 0 ? selectedFeatures.map(f => f.name).join(', ') : 'None'} />
                                    <SummaryRow label="Total Billing Charges" value={amount ? `₹${totalChargeAmount} (${totalChargePercent.toFixed(1)}%)` : '₹0.00'} />
                                    <SummaryRow label="Net Amount to Pool" value={amount ? `₹${parseFloat(netAmount).toLocaleString()}` : '—'} />
                                    <SummaryRow label="Description" value={description || '—'} />
                                </div>
                            </div>

                            {/* Features Selection (30% section expanded) */}
                            <div style={{
                                background: '#f8fafc',
                                borderRadius: 12,
                                padding: 24,
                                marginBottom: 24,
                                border: '1px solid #e2e8f0'
                            }}>
                                <h3 style={{ marginTop: 0, marginBottom: 16, color: '#1e293b' }}>Features & Charges</h3>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 20 }}>
                                    Select features you want for this group. Charges will be applied per auction.
                                </p>

                                {loadingFeatures ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        Loading available features...
                                    </div>
                                ) : availableFeatures.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        No features available. Contact admin to configure features.
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            {availableFeatures.map(feature => (
                                                <FeatureCheckbox
                                                    key={feature.id}
                                                    feature={feature}
                                                    checked={selectedFeatureIds.includes(feature.id)}
                                                    onChange={() => toggleFeature(feature.id)}
                                                    disabled={false}
                                                />
                                            ))}
                                        </div>

                                        <div style={{
                                            marginTop: 20,
                                            paddingTop: 20,
                                            borderTop: '2px solid #e2e8f0',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 4 }}>Total Billing Charges</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>
                                                    ₹{totalChargeAmount}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
                                                    ({totalChargePercent.toFixed(1)}% of ₹{amount ? parseFloat(amount).toLocaleString() : '0'})
                                                </div>
                                            </div>
                                            {amount && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 4 }}>Net Amount to Pool</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                                                        ₹{parseFloat(netAmount).toLocaleString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Navigation */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 32,
                        paddingTop: 24,
                        borderTop: '1px solid #e2e8f0'
                    }}>
                        <button
                            onClick={prev}
                            disabled={step === 'details'}
                            style={{
                                padding: '12px 24px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                background: step === 'details' ? '#f1f5f9' : '#fff',
                                color: step === 'details' ? '#94a3b8' : '#1e293b',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: step === 'details' ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Back
                        </button>
                        {step === 'preview' ? (
                            <button
                                onClick={handleSubmit}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Create Group
                            </button>
                        ) : (
                            <button
                                onClick={next}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Next
                            </button>
                        )}
                    </div>
                </main>
            </div>

            {/* Templates Modal Popup */}
            {showTemplates && (
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
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowTemplates(false)
                            setTemplateSearch('')
                        }
                    }}
                >
                    <div style={{
                        background: '#fff',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 900,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b', fontWeight: 700 }}>Select a Template</h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                                    Choose a template to quickly fill all group details
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowTemplates(false)
                                    setTemplateSearch('')
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    width: 40,
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 8,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9'
                                    e.currentTarget.style.color = '#1e293b'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'none'
                                    e.currentTarget.style.color = '#64748b'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc'
                        }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search templates by name, amount, or description..."
                                    value={templateSearch}
                                    onChange={(e) => setTemplateSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px 12px 40px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 8,
                                        fontSize: '0.875rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '1.2rem'
                                }}>🔍</span>
                            </div>
                            {templateSearch && (
                                <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
                                </p>
                            )}
                        </div>

                        {/* Templates Grid */}
                        <div style={{
                            padding: '24px',
                            overflowY: 'auto',
                            flex: 1
                        }}>
                            {filteredTemplates.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: '#64748b'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>No templates found</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>Try a different search term</p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                    gap: 20
                                }}>
                                    {filteredTemplates.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => applyTemplate(template)}
                                            style={{
                                                padding: '24px',
                                                border: '2px solid #e2e8f0',
                                                borderRadius: 12,
                                                background: '#fff',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 12,
                                                textAlign: 'left',
                                                position: 'relative'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#2563eb'
                                                e.currentTarget.style.transform = 'translateY(-4px)'
                                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e2e8f0'
                                                e.currentTarget.style.transform = 'translateY(0)'
                                                e.currentTarget.style.boxShadow = 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontSize: '2.5rem' }}>📋</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>
                                                        {template.label}
                                                    </div>
                                                    <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                                                        {template.name}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{
                                                paddingTop: 12,
                                                borderTop: '1px solid #e2e8f0',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                    <span style={{ color: '#64748b' }}>Members:</span>
                                                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{template.members}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                    <span style={{ color: '#64748b' }}>Frequency:</span>
                                                    <span style={{ color: '#1e293b', fontWeight: 600 }}>
                                                        {template.frequency.charAt(0).toUpperCase() + template.frequency.slice(1)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                                                    {template.description}
                                                </div>
                                            </div>

                                            <div style={{
                                                marginTop: 8,
                                                padding: '8px 12px',
                                                background: '#eff6ff',
                                                borderRadius: 6,
                                                fontSize: '0.75rem',
                                                color: '#2563eb',
                                                fontWeight: 500,
                                                textAlign: 'center'
                                            }}>
                                                Click to apply →
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ProgressStep({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            opacity: active || completed ? 1 : 0.5
        }}>
            <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: completed ? '#16a34a' : active ? '#2563eb' : '#e2e8f0',
                color: completed || active ? '#fff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem'
            }}>
                {completed ? '✓' : number}
            </div>
            <span style={{
                fontWeight: active ? 600 : 400,
                color: active ? '#1e293b' : '#64748b'
            }}>
                {label}
            </span>
        </div>
    )
}

function TypeOption({ value, selected, onClick, title, description, features }: {
    value: string
    selected: boolean
    onClick: () => void
    title: string
    description: string
    features: string[]
}) {
    return (
        <div
            onClick={onClick}
            style={{
                border: `2px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
                borderRadius: 12,
                padding: 20,
                background: selected ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                if (!selected) {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                }
            }}
            onMouseLeave={(e) => {
                if (!selected) {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                }
            }}
        >
            <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                <input
                    type="radio"
                    checked={selected}
                    onChange={onClick}
                    style={{ marginTop: 4 }}
                />
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.125rem', color: '#1e293b' }}>{title}</h3>
                    <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '0.875rem' }}>{description}</p>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: '0.875rem' }}>
                        {features.map((f, i) => (
                            <li key={i}>{f}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>{label}:</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>{value}</span>
        </div>
    )
}

function FeatureCheckbox({ feature, checked, onChange, disabled }: {
    feature: FeatureConfig
    checked: boolean
    onChange: () => void
    disabled: boolean
}) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'start',
            gap: 12,
            padding: 16,
            background: checked ? '#eff6ff' : '#fff',
            border: `1px solid ${checked ? '#2563eb' : '#e2e8f0'}`,
            borderRadius: 8,
            cursor: disabled ? 'default' : 'pointer'
        }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                style={{ marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{feature.name}</span>
                    <span style={{
                        fontWeight: 600,
                        color: '#2563eb',
                        fontSize: '0.875rem'
                    }}>
                        {parseFloat(feature.charge_percent.toString())}%
                    </span>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>{feature.description || 'No description'}</p>
            </div>
        </label>
    )
}
