import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect } from 'react'

type AuthState = {
    token: string | null
    phone: string | null
    role: 'user' | 'admin' | 'productowner' | null
    name?: string | null
    avatarUrl?: string | null
}

type AuthAction =
    | { type: 'SET_PHONE'; phone: string | null }
    | { type: 'SET_TOKEN'; token: string | null }
    | { type: 'SET_ROLE'; role: 'user' | 'admin' | 'productowner' | null }
    | { type: 'SET_PROFILE'; name?: string | null; avatarUrl?: string | null }
    | { type: 'LOGOUT' }

const initialState: AuthState = { token: null, phone: null, role: null, name: null, avatarUrl: null }

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_PHONE':
            return { ...state, phone: action.phone }
        case 'SET_TOKEN':
            return { ...state, token: action.token }
        case 'SET_ROLE':
            return { ...state, role: action.role }
        case 'SET_PROFILE':
            return { ...state, name: action.name ?? state.name, avatarUrl: action.avatarUrl ?? state.avatarUrl }
        case 'LOGOUT':
            return { token: null, phone: null, role: null, name: null, avatarUrl: null }
        default:
            return state
    }
}

const AuthContext = createContext<{
    state: AuthState
    dispatch: React.Dispatch<AuthAction>
}>({ state: initialState, dispatch: () => { } })

export function AuthProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage if available
    const getInitialState = (): AuthState => {
        try {
            const token = localStorage.getItem('token')
            const phone = localStorage.getItem('phone')
            const role = localStorage.getItem('role') as 'user' | 'admin' | 'productowner' | null
            return {
                token,
                phone,
                role,
                name: null,
                avatarUrl: null
            }
        } catch (e) {
            return initialState
        }
    }

    const [state, dispatch] = useReducer(authReducer, getInitialState())

    // Debug: Log auth state on mount
    useEffect(() => {
        console.log('[AuthContext] Initialized with:', {
            hasToken: !!state.token,
            phone: state.phone,
            role: state.role,
            localStorageToken: localStorage.getItem('token') ? 'exists' : 'missing'
        })
    }, []) // Run only once on mount

    // Sync localStorage with auth state changes
    useEffect(() => {
        if (state.token) {
            localStorage.setItem('token', state.token)
        } else {
            localStorage.removeItem('token')
        }
        if (state.phone) {
            localStorage.setItem('phone', state.phone)
        } else {
            localStorage.removeItem('phone')
        }
        if (state.role) {
            localStorage.setItem('role', state.role)
        } else {
            localStorage.removeItem('role')
        }
    }, [state.token, state.phone, state.role])

    const value = useMemo(() => ({ state, dispatch }), [state])
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    return useContext(AuthContext)
}



