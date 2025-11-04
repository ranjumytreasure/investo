import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket() {
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        // Connect to WebSocket server - use same origin for production, or explicit URL for dev
        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000'
        const socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        })

        socket.on('connect', () => {
            console.log('🔌 Connected to WebSocket server:', socket.id)
        })

        socket.on('disconnect', () => {
            console.log('🔌 Disconnected from WebSocket server')
        })

        socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error)
        })

        socketRef.current = socket

        return () => {
            socket.disconnect()
        }
    }, [])

    return socketRef.current
}

