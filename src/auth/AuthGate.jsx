import React, { useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const AuthGate = ({ children }) => {
    const { session, loading, isSupabaseConfigured, signIn, signUp } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState('')

    if (loading) {
        return <div className="auth-shell">Loading...</div>
    }

    if (!isSupabaseConfigured) {
        return (
            <main className="auth-shell">
                <div className="auth-card">
                    <h1>Boden Accounting</h1>
                    <div className="alert alert-warning mb-0">
                        Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend .env file.
                    </div>
                </div>
            </main>
        )
    }

    if (session) {
        return children
    }

    async function handleSubmit(event, mode) {
        event.preventDefault()
        setSubmitting(true)
        setMessage('')

        const result = mode === 'signup'
            ? await signUp(email, password)
            : await signIn(email, password)

        setSubmitting(false)

        if (result.error) {
            setMessage(result.error.message)
            return
        }

        if (mode === 'signup' && !result.data.session) {
            setMessage('Check your email to confirm your account, then sign in.')
        }
    }

    return (
        <main className="auth-shell">
            <form className="auth-card">
                <h1>Boden Accounting</h1>
                <div className="mb-3">
                    <label className="form-label" htmlFor="email">Email</label>
                    <input
                        id="email"
                        className="form-control"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input
                        id="password"
                        className="form-control"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>
                {message && <div className="alert alert-info py-2">{message}</div>}
                <div className="d-grid gap-2">
                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={submitting}
                        onClick={(event) => handleSubmit(event, 'signin')}
                    >
                        Sign In
                    </button>
                    <button
                        className="btn btn-outline-secondary"
                        type="submit"
                        disabled={submitting}
                        onClick={(event) => handleSubmit(event, 'signup')}
                    >
                        Create Account
                    </button>
                </div>
            </form>
        </main>
    )
}

export default AuthGate
