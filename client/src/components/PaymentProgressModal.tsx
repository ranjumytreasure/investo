interface ReceivableSummary {
    id: string
    user_id: string
    user_name: string
    user_phone: string
    share_no: number | null
    share_percent: number | null
    due_amount: number
    paid_amount: number
    remaining_amount: number
    status: string
    referrer_id: string | null
    referrer_name: string | null
    referrer_phone: string | null
    due_date: string | null
    receipts: Array<{
        id: string
        amount: number
        payment_method: string
        trx_number: string | null
        status: string
    }>
}

interface PaymentProgressAccount {
    account_id: string
    auction_date: string
    auction_amount: number
    commission: number
    profit_per_person: number
    due: number
    due_total_outstanding: number
    cash_to_customer: number
    balance: number
    status: string
    winner_share_id: string | null
    paid_count: number
    not_paid_count: number
    receivables: ReceivableSummary[]
}

interface PaymentProgressModalProps {
    account: PaymentProgressAccount
    currentUserId: string | null
    onClose: () => void
    onPay: (receivable: ReceivableSummary) => void
}

export default function PaymentProgressModal({ account, currentUserId, onClose, onPay }: PaymentProgressModalProps) {
    const paidReceivables = account.receivables.filter(r => r.status === 'paid')
    const pendingReceivables = account.receivables.filter(r => r.status !== 'paid')

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                zIndex: 2100
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 16,
                    width: '100%',
                    maxWidth: 860,
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                <header style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Payment Progress</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                                Auction Date: {new Date(account.auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                border: 'none',
                                background: '#e2e8f0',
                                color: '#1e293b',
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                        <SummaryCard label="Total Due" value={account.receivables.reduce((sum, r) => sum + r.due_amount, 0)} accent="#0ea5e9" />
                        <SummaryCard label="Total Paid" value={account.receivables.reduce((sum, r) => sum + r.paid_amount, 0)} accent="#16a34a" />
                        <SummaryCard label="Pending Amount" value={account.receivables.reduce((sum, r) => sum + r.remaining_amount, 0)} accent="#f97316" />
                    </div>
                </header>

                <main style={{ padding: 24, overflowY: 'auto' }}>
                    <section style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#0f172a' }}>
                            Paid ({paidReceivables.length})
                        </h3>
                        {paidReceivables.length === 0 ? (
                            <EmptyState text="No payments received yet." />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {paidReceivables.map(receivable => (
                                    <ReceivableRow
                                        key={receivable.id}
                                        receivable={receivable}
                                        currentUserId={currentUserId}
                                        onPay={onPay}
                                        paid
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#0f172a' }}>
                            Pending ({pendingReceivables.length})
                        </h3>
                        {pendingReceivables.length === 0 ? (
                            <EmptyState text="All members have completed their payments." />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {pendingReceivables.map(receivable => (
                                    <ReceivableRow
                                        key={receivable.id}
                                        receivable={receivable}
                                        currentUserId={currentUserId}
                                        onPay={onPay}
                                        paid={false}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    )
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <div style={{
            padding: 16,
            borderRadius: 12,
            background: '#ffffff',
            border: `1px solid ${accent}33`,
            boxShadow: '0 6px 12px rgba(15, 23, 42, 0.05)'
        }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: accent }}>
                ₹{value.toLocaleString('en-IN')}
            </div>
        </div>
    )
}

function EmptyState({ text }: { text: string }) {
    return (
        <div style={{
            padding: 16,
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px dashed #cbd5f5',
            color: '#64748b',
            fontSize: '0.9rem'
        }}>
            {text}
        </div>
    )
}

function ReceivableRow({
    receivable,
    paid,
    currentUserId,
    onPay
}: {
    receivable: ReceivableSummary
    paid: boolean
    currentUserId: string | null
    onPay: (receivable: ReceivableSummary) => void
}) {
    const canPay = !paid && currentUserId === receivable.user_id && receivable.remaining_amount > 0

    return (
        <div style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: `1px solid ${paid ? '#bbf7d0' : '#fecaca'}`,
            background: paid ? '#f0fdf4' : '#fff7ed',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr auto',
            gap: 12,
            alignItems: 'center'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    {receivable.user_name} {receivable.share_no ? `(Share #${receivable.share_no})` : ''}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>{receivable.user_phone}</span>
                {receivable.referrer_name || receivable.referrer_phone ? (
                    <span style={{ fontSize: '0.75rem', color: '#0f172a', opacity: 0.7 }}>
                        Referred by {receivable.referrer_name || receivable.referrer_phone}
                    </span>
                ) : null}
                {receivable.due_date && (
                    <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                        Due: {new Date(receivable.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
                <AmountRow label="Total" value={receivable.due_amount} emphasis />
                <AmountRow label="Paid" value={receivable.paid_amount} color={paid ? '#16a34a' : '#475569'} />
                {!paid && <AmountRow label="Remaining" value={receivable.remaining_amount} color="#dc2626" />}
            </div>

            {canPay ? (
                <button
                    onClick={() => onPay(receivable)}
                    style={{
                        padding: '8px 14px',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 6px 12px rgba(220, 38, 38, 0.25)'
                    }}
                >
                    Pay ₹{receivable.remaining_amount.toLocaleString('en-IN')}
                </button>
            ) : (
                <div style={{ fontSize: '0.75rem', color: paid ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                    {paid ? 'Paid' : 'Awaiting Payment'}
                </div>
            )}
        </div>
    )
}

function AmountRow({ label, value, emphasis, color }: { label: string; value: number; emphasis?: boolean; color?: string }) {
    return (
        <span style={{
            fontSize: emphasis ? '0.9rem' : '0.8rem',
            fontWeight: emphasis ? 700 : 500,
            color: color || '#0f172a'
        }}>
            {label}: ₹{value.toLocaleString('en-IN')}
        </span>
    )
}


