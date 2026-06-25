'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account, then log in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/generate')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: '#141414' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#e8e6df', marginBottom: '1.5rem', textAlign: 'center' }}>
          {isSignup ? 'Create account' : 'Sign in'}
        </h1>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 13, color: '#9c9a92', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: '#1c1c1c', color: '#e8e6df', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, color: '#9c9a92', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: '#1c1c1c', color: '#e8e6df', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ fontSize: 13, color: '#f09595', marginBottom: 12 }}>{error}</p>}
        {message && <p style={{ fontSize: 13, color: '#1D9E75', marginBottom: 12 }}>{message}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#534AB7', color: '#fff', fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Loading...' : isSignup ? 'Create account' : 'Sign in'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#9c9a92', marginTop: '1rem' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); setMessage('') }}
            style={{ background: 'none', border: 'none', color: '#534AB7', cursor: 'pointer', fontSize: 13 }}
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </main>
  )
}
