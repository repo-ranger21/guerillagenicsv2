// ============================================================
// GuerillaGenics v2 — Auth Context
// Wraps the entire app. Provides user, session, tier, loading state.
// Usage: const { user, tier, isOperative, signOut } = useAuth()
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { SubscriptionTier, Profile } from '../types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  tier: SubscriptionTier
  loading: boolean
  // Convenience booleans — use these in components
  isScout: boolean
  isOperative: boolean
  isCommand: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TIER_RANK: Record<SubscriptionTier, number> = {
  scout: 1,
  operative: 2,
  command: 3,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tier, setTier] = useState<SubscriptionTier>('scout')
  const [loading, setLoading] = useState(true)

  // Fetch profile + tier for a given user
  async function loadUserData(currentUser: User) {
    try {
      const [profileResult, subscriptionResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single(),
        supabase
          .from('subscriptions')
          .select('tier, status')
          .eq('user_id', currentUser.id)
          .in('status', ['active', 'trialing'])
          .single(),
      ])

      if (profileResult.data) setProfile(profileResult.data)

      // If no active subscription found, default to scout
      if (subscriptionResult.data) {
        setTier(subscriptionResult.data.tier)
      } else {
        setTier('scout')
      }
    } catch {
      // Non-fatal: user is authenticated but profile/subscription may not exist yet
      setTier('scout')
    }
  }

  async function refreshProfile() {
    if (user) await loadUserData(user)
  }

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        loadUserData(currentSession.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await loadUserData(currentSession.user)
        } else {
          setProfile(null)
          setTier('scout')
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUpWithEmail(email: string, password: string, displayName?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName ?? email.split('@')[0] },
      },
    })
    return { error }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setTier('scout')
  }

  const tierRank = TIER_RANK[tier]

  const value: AuthContextValue = {
    user,
    session,
    profile,
    tier,
    loading,
    isScout: tierRank >= 1,
    isOperative: tierRank >= 2,
    isCommand: tierRank >= 3,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
