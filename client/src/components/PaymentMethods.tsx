import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../state/AuthContext';

interface PaymentMethod {
    id: string;
    name: string;
    details: {
        upi_id?: string;
        account_number?: string;
        ifsc_code?: string;
        account_holder_name?: string;
        bank_name?: string;
        card_number?: string;
        card_holder_name?: string;
        expiry_date?: string;
    } | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

interface PaymentMethodsProps {
    openAddModalSignal?: number;
    mode?: 'full' | 'modalOnly';
    onMethodsChange?: (methods: PaymentMethod[]) => void;
}

const gradientCardStyle: React.CSSProperties = {
    borderRadius: 20,
    padding: '20px 24px',
    background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%)',
    color: '#fff',
    boxShadow: '0 20px 45px rgba(79, 70, 229, 0.28)'
};

const statsNumberStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.1
};

const statsLabelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    opacity: 0.8,
    marginTop: 4
};

const cardBaseStyle: React.CSSProperties = {
    borderRadius: 18,
    border: '1px solid #e2e8f0',
    background: '#fff',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
    padding: 22,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    backdropFilter: 'blur(6px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
};

const modalContentStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    background: '#fff',
    boxShadow: '0 30px 55px rgba(15, 23, 42, 0.25)',
    padding: 28,
    position: 'relative'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: 6
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 12,
    border: '1px solid #d0d7e2',
    padding: '10px 14px',
    fontSize: '0.9rem',
    transition: 'border 0.2s ease, box-shadow 0.2s ease'
};

const helperStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: '#64748b'
};

export default function PaymentMethods({ openAddModalSignal, mode = 'full', onMethodsChange }: PaymentMethodsProps) {
    const { state } = useAuth();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const [formData, setFormData] = useState({
        name: 'UPI',
        details: {} as Record<string, any>
    });
    const [lastSignal, setLastSignal] = useState<number | undefined>(undefined);

    const token = useMemo(() => state.token || localStorage.getItem('token'), [state.token]);

    const handleOpenAddModal = () => {
        setEditingMethod(null);
        setFormData({ name: 'UPI', details: {} });
        setShowAddModal(true);
    };

    useEffect(() => {
        if (openAddModalSignal !== undefined && openAddModalSignal !== lastSignal) {
            setLastSignal(openAddModalSignal);
            setEditingMethod(null);
            setFormData({ name: 'UPI', details: {} });
            setShowAddModal(true);
        }
    }, [openAddModalSignal, lastSignal]);

    useEffect(() => {
        void fetchPaymentMethods();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPaymentMethods = async () => {
        try {
            setLoading(true);
            const response = await fetch('/payment-methods', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment methods');
            }

            const data = await response.json();
            const methods: PaymentMethod[] = data.paymentMethods || [];
            setPaymentMethods(methods);
            if (onMethodsChange) {
                onMethodsChange(methods);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const url = editingMethod
                ? `/payment-methods/${editingMethod.id}`
                : '/payment-methods';
            const method = editingMethod ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    details: formData.details
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save payment method');
            }

            await fetchPaymentMethods();
            setShowAddModal(false);
            setEditingMethod(null);
            setFormData({ name: 'UPI', details: {} });
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this payment method? Pending payouts will require another method.')) {
            return;
        }

        try {
            const response = await fetch(`/payment-methods/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete payment method');
            }

            await fetchPaymentMethods();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleToggleActive = async (method: PaymentMethod) => {
        try {
            const response = await fetch(`/payment-methods/${method.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    active: !method.active
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update payment method');
            }

            await fetchPaymentMethods();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const openEditModal = (method: PaymentMethod) => {
        setEditingMethod(method);
        setFormData({
            name: method.name,
            details: method.details || {}
        });
        setShowAddModal(true);
    };

    const maskValue = (value: string, type: 'upi' | 'account' | 'card' = 'account') => {
        if (!value) return '';
        if (type === 'upi') return value;
        if (type === 'card') {
            const last4 = value.slice(-4);
            return `•••• •••• •••• ${last4}`;
        }
        const last4 = value.slice(-4);
        return `••••${last4}`;
    };

    const activeCount = paymentMethods.filter(pm => pm.active).length;

    const modal = !showAddModal ? null : (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                            {editingMethod ? 'Update Payment Method' : 'Add Payment Method'}
                        </h3>
                        <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            {editingMethod ? 'Refine details for this payout destination.' : 'Capture secure details to receive auction disbursements automatically.'}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setShowAddModal(false);
                            setEditingMethod(null);
                            setFormData({ name: 'UPI', details: {} });
                        }}
                        style={{
                            background: 'rgba(15, 23, 42, 0.06)',
                            border: 'none',
                            borderRadius: 999,
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            color: '#475569',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={labelStyle}>Payment Method Type</label>
                        <select
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({
                                    name: e.target.value,
                                    details: {}
                                });
                            }}
                            style={{
                                ...inputStyle,
                                appearance: 'none',
                                backgroundImage: 'linear-gradient(45deg, transparent 50%, #334155 50%), linear-gradient(135deg, #334155 50%, transparent 50%)',
                                backgroundPosition: 'calc(100% - 20px) calc(50% + 1px), calc(100% - 15px) calc(50% + 1px)',
                                backgroundSize: '5px 5px, 5px 5px',
                                backgroundRepeat: 'no-repeat'
                            }}
                            required
                        >
                            <option value="UPI">UPI</option>
                            <option value="BankTransfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                        </select>
                    </div>

                    {formData.name === 'UPI' && (
                        <div>
                            <label style={labelStyle}>UPI ID</label>
                            <input
                                type="text"
                                value={formData.details.upi_id || ''}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        details: { ...formData.details, upi_id: e.target.value }
                                    })
                                }
                                style={inputStyle}
                                placeholder="yourname@upi"
                                required
                            />
                            <p style={helperStyle}>Supports BHIM, Google Pay, PhonePe, Paytm, and other UPI handles.</p>
                        </div>
                    )}

                    {formData.name === 'BankTransfer' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Account Holder Name</label>
                                <input
                                    type="text"
                                    value={formData.details.account_holder_name || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            details: { ...formData.details, account_holder_name: e.target.value }
                                        })
                                    }
                                    style={inputStyle}
                                    placeholder="Full legal name"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.details.bank_name || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            details: { ...formData.details, bank_name: e.target.value }
                                        })
                                    }
                                    style={inputStyle}
                                    placeholder="Bank"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Account Number</label>
                                <input
                                    type="text"
                                    value={formData.details.account_number || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            details: { ...formData.details, account_number: e.target.value }
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>IFSC Code</label>
                                <input
                                    type="text"
                                    value={formData.details.ifsc_code || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            details: { ...formData.details, ifsc_code: e.target.value.toUpperCase() }
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {formData.name === 'Card' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Card Holder Name</label>
                                <input
                                    type="text"
                                    value={formData.details.card_holder_name || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            details: { ...formData.details, card_holder_name: e.target.value }
                                        })
                                    }
                                    style={inputStyle}
                                    placeholder="Name on card"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Card Number</label>
                                <input
                                    type="text"
                                    value={formData.details.card_number || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            details: { ...formData.details, card_number: e.target.value }
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Expiry Date</label>
                                <input
                                    type="text"
                                    value={formData.details.expiry_date || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            details: { ...formData.details, expiry_date: e.target.value }
                                        })
                                    }
                                    style={inputStyle}
                                    placeholder="MM/YY"
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddModal(false);
                                setEditingMethod(null);
                                setFormData({ name: 'UPI', details: {} });
                            }}
                            style={{
                                padding: '10px 18px',
                                borderRadius: 12,
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '10px 20px',
                                borderRadius: 12,
                                border: 'none',
                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 15px 30px rgba(59, 130, 246, 0.35)'
                            }}
                        >
                            {editingMethod ? 'Save Changes' : 'Add Method'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    if (mode === 'modalOnly') {
        return modal ? <>{modal}</> : null;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={gradientCardStyle}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
                    <div style={{ maxWidth: 460 }}>
                        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Payment Methods</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '0.9rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.92)' }}>
                            Link trusted channels so payouts arrive instantly once auctions close. You can add UPI IDs, bank transfers, or cards.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={statsNumberStyle}>{paymentMethods.length}</div>
                            <div style={statsLabelStyle}>Total Methods</div>
                        </div>
                        <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.35)' }} />
                        <div style={{ textAlign: 'right' }}>
                            <div style={statsNumberStyle}>{activeCount}</div>
                            <div style={statsLabelStyle}>Active</div>
                        </div>
                        {mode === 'full' && (
                            <button
                                type="button"
                                onClick={handleOpenAddModal}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    border: 'none',
                                    background: 'rgba(255,255,255,0.18)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.28)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                                }}
                            >
                                + Add Method
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748b', fontSize: '0.92rem' }}>Loading payment methods…</div>
            ) : paymentMethods.length === 0 ? (
                <div style={{
                    ...cardBaseStyle,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.92), #f8fafc)'
                }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>No payment methods yet</h4>
                    <p style={{ marginTop: 12, fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                        Add your first payment method to automate disbursements the moment you win an auction payout.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                    {paymentMethods.map(method => (
                        <div
                            key={method.id}
                            style={{
                                ...cardBaseStyle,
                                transform: method.active ? 'translateY(-2px)' : undefined,
                                border: method.active ? '1px solid #bae6fd' : '1px solid #e2e8f0'
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 18px 35px rgba(15,23,42,0.12)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLDivElement).style.transform = method.active ? 'translateY(-2px)' : 'none';
                                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 30px rgba(15,23,42,0.08)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '6px 12px',
                                            borderRadius: 999,
                                            background: 'rgba(14, 165, 233, 0.18)',
                                            color: '#0369a1',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            letterSpacing: 0.6,
                                            textTransform: 'uppercase'
                                        }}>
                                            {method.name}
                                        </span>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 999,
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            color: method.active ? '#047857' : '#475569',
                                            background: method.active ? 'rgba(16, 185, 129, 0.16)' : '#e2e8f0'
                                        }}>
                                            {method.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: 16, color: '#334155', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                        {method.name === 'UPI' && method.details?.upi_id && (
                                            <div>UPI ID · <span style={{ fontWeight: 600 }}>{maskValue(method.details.upi_id, 'upi')}</span></div>
                                        )}
                                        {method.name === 'BankTransfer' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {method.details?.account_holder_name && (
                                                    <span>Account Holder · <strong>{method.details.account_holder_name}</strong></span>
                                                )}
                                                {method.details?.bank_name && (
                                                    <span>Bank · <strong>{method.details.bank_name}</strong></span>
                                                )}
                                                {method.details?.account_number && (
                                                    <span>Account · <strong>{maskValue(method.details.account_number)}</strong></span>
                                                )}
                                                {method.details?.ifsc_code && (
                                                    <span>IFSC · <strong>{method.details.ifsc_code}</strong></span>
                                                )}
                                            </div>
                                        )}
                                        {method.name === 'Card' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {method.details?.card_holder_name && (
                                                    <span>Card Holder · <strong>{method.details.card_holder_name}</strong></span>
                                                )}
                                                {method.details?.card_number && (
                                                    <span>Card · <strong>{maskValue(method.details.card_number, 'card')}</strong></span>
                                                )}
                                                {method.details?.expiry_date && (
                                                    <span>Expiry · <strong>{method.details.expiry_date}</strong></span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                                    <button
                                        onClick={() => handleToggleActive(method)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#475569',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {method.active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(method)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#475569',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(method.id)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#dc2626',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
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

            {modal}
        </div>
    );
}

