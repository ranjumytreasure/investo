import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function SetPin() {
    const [pin, setPin] = useState('')
    const navigate = useNavigate()
    const { state } = useAuth()

    async function submit() {
        if (!state.phone) return
        const res = await fetch('/auth/set-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: state.phone, pin })
        })
        const data = await res.json()
        if (data.ok) navigate('/dashboard')
    }

    return (
        <div style={{ maxWidth: 360, margin: '40px auto' }}>
            <h2>Set PIN</h2>
            <input type="password" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} style={{ width: '100%', padding: 8 }} />
            <button onClick={submit} style={{ marginTop: 12 }}>Save</button>
        </div>
    )
}




