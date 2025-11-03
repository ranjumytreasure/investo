import { useEffect, useState } from 'react'
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
        <div style={{ padding: 20 }}>
            <h2>Dashboard</h2>
            <p>Welcome to your dashboard.</p>
            {celebrate && <Confetti />}
        </div>
    )
}




