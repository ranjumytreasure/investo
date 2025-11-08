import { useState } from 'react'

interface ReceivablePaymentModalProps {
    receivable: {
        id: string
        user_name: string
        user_phone: string
        share_no: number | null
        due_amount: number
        paid_amount: number
        remaining_amount: number
    }
    token: string | null
    onClose: () => void
    onSuccess: () => void
}

const PAYMENT_OPTIONS = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' }
]

export default function ReceivablePaymentModal({ receivable, token, onClose, onSuccess }: ReceivablePaymentModalProps) {
    const [amount, setAmount] = useState<number>(receivable.remaining_amount)
    const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_OPTIONS[0].value)
    const [reference, setReference] = useState<string>('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!token) {
            setError('You must be logged in to pay.')
            return
        }

        if (amount <= 0) {
            setError('Amount must be greater than zero.')
            return
        }

        if (amount > receivable.remaining_amount) {
            setError(`Amount cannot exceed ₹${receivable.remaining_amount.toLocaleString('en-IN')}.`)
            return
        }

        setSubmitting(true)
        setError(null)

        try {
            const response = await fetch(`/receivables/${receivable.id}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    payment_method: paymentMethod,
                    reference: reference.trim() || undefined
                })
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.message || 'Failed to record payment')
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to record payment')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: 16
            }}
            onClick={() => !submitting && onClose()}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: '#ffffff',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={() => !submitting && onClose()}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '1.25rem',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        color: '#94a3b8'
                    }}
                    disabled={submitting}
                >
                    ×
                </button>

                <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', color: '#0f172a' }}>Pay Contribution</h2>
                <p style={{ margin: '0 0 16px', color: '#475569', fontSize: '0.95rem' }}>
                    {receivable.user_name} {receivable.share_no ? `(Share #${receivable.share_no})` : ''}
                </p>

                <div style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                    display: 'grid',
                    rowGap: 8
                }}>
                    <InfoRow label="Total Due" value={`₹${receivable.due_amount.toLocaleString('en-IN')}`} />
                    <InfoRow label="Paid So Far" value={`₹${receivable.paid_amount.toLocaleString('en-IN')}`} />
                    <InfoRow label="Remaining" value={`₹${receivable.remaining_amount.toLocaleString('en-IN')}`} highlight />
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 600 }}>Amount</label>
                        <input
                            type="number"
                            min={0}
                            max={receivable.remaining_amount}
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid #cbd5f5',
                                fontSize: '1rem'
                            }}
                            disabled={submitting}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Remaining payable amount is ₹{receivable.remaining_amount.toLocaleString('en-IN')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 600 }}>Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid #cbd5f5',
                                fontSize: '1rem'
                            }}
                            disabled={submitting}
                        >
                            {PAYMENT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 600 }}>Reference / Transaction ID (optional)</label>
                        <input
                            type="text"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            placeholder="Enter reference number"
                            style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid #cbd5f5',
                                fontSize: '1rem'
                            }}
                            disabled={submitting}
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            padding: '12px 16px',
                            background: submitting ? '#94a3b8' : '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            boxShadow: '0 10px 20px rgba(37, 99, 235, 0.25)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {submitting ? 'Processing...' : `Pay ₹${amount.toLocaleString('en-IN')}`}
                    </button>
                </form>
            </div>
        </div>
    )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>{label}</span>
            <span style={{ color: highlight ? '#dc2626' : '#0f172a', fontWeight: 700 }}>{value}</span>
        </div>
    )
}


