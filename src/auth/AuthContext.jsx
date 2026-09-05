/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(isSupabaseConfigured)

    useEffect(() => {
        if (!isSupabaseConfigured) {
            return
        }

        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            setLoading(false)
        })

        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession)
            setLoading(false)
        })

        return () => {
            listener.subscription.unsubscribe()
        }
    }, [])

    const value = useMemo(() => ({
        session,
        user: session?.user ?? null,
        loading,
        isSupabaseConfigured,
        signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
        signUp: (email, password) => supabase.auth.signUp({ email, password }),
        signOut: () => supabase.auth.signOut()
    }), [session, loading])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
