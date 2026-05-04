// ============================================================
// GuerillaGenics v2 — TierGate
// Wraps any UI that requires a minimum subscription tier.
// Shows an upgrade prompt instead of the locked content.
//
// Usage:
//   <TierGate required="operative">
//     <EdgeLeaderboard />
//   </TierGate>
// ============================================================

import { ReactNode } from 'react'
import { useAuth } from '../../lib/AuthContext'
import type { SubscriptionTier } from '../../types/database'

const TIER_RANK: Record<SubscriptionTier, number> = {
  scout: 1,
  operative: 2,
  command: 3,
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  scout: 'Scout',
  operative: 'Operative',
  command: 'Command',
}

const TIER_PRICES: Record<SubscriptionTier, string> = {
  scout: '$29/mo',
  operative: '$79/mo',
  command: '$199/mo',
}

const TIER_SUBTITLES: Record<SubscriptionTier, string> = {
  scout: 'Know what the market doesn\'t yet.',
  operative: 'Act on what the market doesn\'t yet.',
  command: 'Move before the market moves.',
}

interface TierGateProps {
  required: SubscriptionTier
  children: ReactNode
  // Optional: custom message instead of the default upgrade prompt
  fallback?: ReactNode
}

// Design tokens from App.jsx C object
const C = {
  ink: '#0a0a0a',
  paper: '#111111',
  cream: '#f5f0e8',
  green: '#00ff88',
  amber: '#ffb800',
  red: '#ff3b3b',
  blue: '#4488ff',
  mono: "'IBM Plex Mono', monospace",
  serif: "'DM Serif Display', serif",
}

export function TierGate({ required, children, fallback }: TierGateProps) {
  const { tier, loading } = useAuth()

  if (loading) return null

  const userRank = TIER_RANK[tier]
  const requiredRank = TIER_RANK[required]

  // User has access — render children normally
  if (userRank >= requiredRank) return <>{children}</>

  // User does not have access — show upgrade prompt
  if (fallback) return <>{fallback}</>

  return (
    <div style={{
      background: C.paper,
      border: `1px solid rgba(255,255,255,.08)`,
      borderRadius: 4,
      padding: '40px 32px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle green glow accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${C.green}, transparent)`,
      }} />

      <div style={{
        fontFamily: C.mono,
        fontSize: 9,
        letterSpacing: 3,
        color: C.green,
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        {TIER_LABELS[required]} Feature
      </div>

      <div style={{
        fontFamily: C.serif,
        fontSize: 22,
        color: C.cream,
        marginBottom: 8,
      }}>
        {TIER_SUBTITLES[required]}
      </div>

      <div style={{
        fontFamily: C.mono,
        fontSize: 11,
        color: 'rgba(245,240,232,.5)',
        marginBottom: 28,
        maxWidth: 360,
        margin: '0 auto 28px',
        lineHeight: 1.6,
      }}>
        This feature requires the{' '}
        <span style={{ color: C.cream }}>{TIER_LABELS[required]}</span> plan.
        You're currently on{' '}
        <span style={{ color: C.amber }}>{TIER_LABELS[tier]}</span>.
      </div>

      <button
        onClick={() => window.location.href = '/pricing'}
        style={{
          fontFamily: C.mono,
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: C.ink,
          background: C.green,
          border: 'none',
          padding: '12px 28px',
          cursor: 'pointer',
          borderRadius: 2,
        }}
      >
        Upgrade to {TIER_LABELS[required]} — {TIER_PRICES[required]}
      </button>
    </div>
  )
}

// Simpler hook version for conditional rendering without a wrapper
export function useTierAccess(required: SubscriptionTier): boolean {
  const { tier } = useAuth()
  return TIER_RANK[tier] >= TIER_RANK[required]
}
