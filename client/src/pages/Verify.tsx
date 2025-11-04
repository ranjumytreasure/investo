import { Link } from 'react-router-dom'

export default function Verify() {
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
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff' }}>
                <h2 style={{ marginTop: 0 }}>Verification</h2>
                <p style={{ color: '#555' }}>Upload documents and complete KYC coming soon.</p>
            </div>
        </div>
    )
}



