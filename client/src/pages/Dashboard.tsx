import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import Confetti from 'react-confetti'
import { useAuth } from '../state/AuthContext'

interface ReceivableSummary {
    total_due: number
    total_paid: number
    total_pending: number
}

export default function Dashboard() {
    const [, setSocket] = useState<Socket | null>(null)
    const [celebrate, setCelebrate] = useState(false)
    const { state } = useAuth()
    const [summary, setSummary] = useState<ReceivableSummary | null>(null)
    const [loadingSummary, setLoadingSummary] = useState(true)
    const [summaryError, setSummaryError] = useState<string | null>(null)

    useEffect(() => {
        const s = io('/', { transports: ['websocket'] })
        setSocket(s)
        s.on('connect', () => {
            setCelebrate(true)
            setTimeout(() => setCelebrate(false), 3000)
        })
        return () => { s.disconnect() }
    }, [])

    useEffect(() => {
        async function fetchSummary() {
            if (!state.token) {
                setLoadingSummary(false)
                setSummary(null)
                return
            }

            try {
                setLoadingSummary(true)
                setSummaryError(null)
                const response = await fetch('/receivables/summary', {
                    headers: {
                        'Authorization': `Bearer ${state.token}`
                    }
                })

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    throw new Error(data.message || 'Failed to load payment summary')
                }

                const data = await response.json()
                setSummary(data)
            } catch (error: any) {
                setSummaryError(error.message || 'Failed to load payment summary')
            } finally {
                setLoadingSummary(false)
            }
        }

        fetchSummary()
    }, [state.token])

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
            <h2 style={{ marginBottom: 8 }}>Dashboard</h2>
            <p style={{ marginBottom: 24, color: '#475569' }}>Overview of your contributions and payments.</p>

            {celebrate && <Confetti />}

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <SummaryCard
                    title="Total Due"
                    value={summary?.total_due ?? 0}
                    color="#f97316"
                    loading={loadingSummary}
                />
                <SummaryCard
                    title="Total Paid"
                    value={summary?.total_paid ?? 0}
                    color="#16a34a"
                    loading={loadingSummary}
                />
                <SummaryCard
                    title="Pending Amount"
                    value={summary?.total_pending ?? 0}
                    color="#dc2626"
                    loading={loadingSummary}
                />
            </section>

            {summaryError && (
                <div style={{
                    marginTop: 24,
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #fecaca',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    maxWidth: 480
                }}>
                    {summaryError}
                </div>
            )}

            {!state.token && (
                <div style={{
                    marginTop: 24,
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    maxWidth: 480
                }}>
                    Please log in to view your payment summary.
                </div>
            )}
        </div>
    )
}

function SummaryCard({ title, value, color, loading }: { title: string; value: number; color: string; loading: boolean }) {
    return (
        <div style={{
            padding: 20,
            borderRadius: 16,
            background: '#ffffff',
            border: `1px solid ${color}33`,
            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
        }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{title}</span>
            <span style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: color,
                minHeight: '2rem',
                display: 'flex',
                alignItems: 'center'
            }}>
                {loading ? '…' : `₹${value.toLocaleString('en-IN')}`}
            </span>
        </div>
    )
}