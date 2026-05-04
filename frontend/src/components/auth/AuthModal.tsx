// ============================================================
// GuerillaGenics v2 — AuthModal
// Sign in / Sign up modal using Supabase Auth.
// Usage: <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
// ============================================================

import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'

const C = {
  ink: '#0a0a0a',
  paper: '#111111',
  card: '#161616',
  cream: '#f5f0e8',
  green: '#00ff88',
  amber: '#ffb800',
  red: '#ff3b3b',
  mono: "'IBM Plex Mono', monospace",
  serif: "'DM Serif Display', serif",
}

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
}

export function AuthModal({ open, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (mode === 'signin') {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        setErrorMsg(error.message)
      } else {
        onClose()
      }
    } else {
      const { error } = await signUpWithEmail(email, password, displayName)
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Check your email to confirm your account.')
      }
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) setErrorMsg(error.message)
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 2,
    padding: '10px 12px',
    color: C.cream,
    fontFamily: C.mono,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.75)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        background: C.card,
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 4,
        padding: '36px 32px',
        width: 400,
        maxWidth: 'calc(100vw - 32px)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: C.mono, fontSize: 9, letterSpacing: 3,
            color: C.green, textTransform: 'uppercase', marginBottom: 8,
          }}>
            GuerillaGenics
          </div>
          <div style={{ fontFamily: C.serif, fontSize: 22, color: C.cream }}>
            {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
          </div>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 2,
            padding: '10px 16px',
            color: C.cream,
            fontFamily: C.mono,
            fontSize: 11,
            letterSpacing: 1,
            cursor: 'pointer',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Continue with Google
        </button>

        <div style={{
          fontFamily: C.mono, fontSize: 9, color: 'rgba(245,240,232,.3)',
          textAlign: 'center', marginBottom: 20, letterSpacing: 2,
        }}>
          OR
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />

          {errorMsg && (
            <div style={{
              fontFamily: C.mono, fontSize: 10, color: C.red,
              background: 'rgba(255,59,59,.08)', padding: '8px 12px', borderRadius: 2,
            }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{
              fontFamily: C.mono, fontSize: 10, color: C.green,
              background: 'rgba(0,255,136,.08)', padding: '8px 12px', borderRadius: 2,
            }}>
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: C.green,
              color: C.ink,
              fontFamily: C.mono,
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              border: 'none',
              borderRadius: 2,
              padding: '12px 16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{
          fontFamily: C.mono, fontSize: 10, color: 'rgba(245,240,232,.4)',
          textAlign: 'center', marginTop: 20,
        }}>
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <span
                onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null) }}
                style={{ color: C.green, cursor: 'pointer' }}
              >
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have one?{' '}
              <span
                onClick={() => { setMode('signin'); setErrorMsg(null); setSuccessMsg(null) }}
                style={{ color: C.green, cursor: 'pointer' }}
              >
                Sign in
              </span>
            </>
          )}
        </div>
      </div>
    </>
  )
}
