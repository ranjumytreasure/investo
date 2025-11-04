import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import Confetti from 'react-confetti'

export default function Dashboard() {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [celebrate, setCelebrate] = useState(false)

    useEffect(() => {
        const s = io('/', { transports: ['websocket'] })
        setSocket(s)
        s.on('connect', () => {
            // example celebration on connect
            setCelebrate(true)
            setTimeout(() => setCelebrate(false), 3000)
        })
        return () => { s.disconnect() }
    }, [])

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
            <h2>Dashboard</h2>
            <p>Welcome to your dashboard.</p>
            {celebrate && <Confetti />}
        </div>
    )
}




