// ============================================================
// GuerillaGenics v2 — useWatchlist
// Per-user watchlist with real-time sync and tier-based cap.
// Usage: const { items, add, remove, isWatched } = useWatchlist()
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { WatchlistItem } from '../types/database'

interface WatchlistWithMarket extends WatchlistItem {
  markets: {
    label: string
    market_type: string
    sport_id: number
    season: number
  } | null
}

interface UseWatchlistResult {
  items: WatchlistWithMarket[]
  loading: boolean
  error: string | null
  capReached: boolean       // true when user hits their tier limit
  add: (marketId: number, note?: string) => Promise<{ error: string | null }>
  remove: (marketId: number) => Promise<void>
  updateNote: (marketId: number, note: string) => Promise<void>
  isWatched: (marketId: number) => boolean
}

export function useWatchlist(): UseWatchlistResult {
  const { user, tier } = useAuth()
  const [items, setItems] = useState<WatchlistWithMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cap = tier === 'command' ? Infinity : tier === 'operative' ? 100 : 10
  const capReached = items.length >= cap

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchWatchlist() {
      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('watchlist')
        .select(`
          *,
          markets (
            label,
            market_type,
            sport_id,
            season
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setItems((data as WatchlistWithMarket[]) ?? [])
      }
      setLoading(false)
    }

    fetchWatchlist()

    // Real-time: sync across tabs and devices
    const channel = supabase
      .channel(`watchlist_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist',
          filter: `user_id=eq.${user.id}`,
        },
        () => { if (!cancelled) fetchWatchlist() }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const add = useCallback(
    async (marketId: number, note?: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not authenticated' }
      if (capReached) {
        return {
          error: `Your ${tier} plan supports up to ${cap} watchlist items. Upgrade to add more.`,
        }
      }

      const { error: insertError } = await supabase
        .from('watchlist')
        .insert({ user_id: user.id, market_id: marketId, note: note ?? null })

      if (insertError) {
        // RLS tier cap triggers a check violation
        if (insertError.message.includes('check')) {
          return { error: `Watchlist limit reached for ${tier} tier.` }
        }
        return { error: insertError.message }
      }
      return { error: null }
    },
    [user, capReached, tier, cap]
  )

  const remove = useCallback(
    async (marketId: number) => {
      if (!user) return
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('market_id', marketId)
    },
    [user]
  )

  const updateNote = useCallback(
    async (marketId: number, note: string) => {
      if (!user) return
      await supabase
        .from('watchlist')
        .update({ note })
        .eq('user_id', user.id)
        .eq('market_id', marketId)
    },
    [user]
  )

  const isWatched = useCallback(
    (marketId: number) => items.some(i => i.market_id === marketId),
    [items]
  )

  return { items, loading, error, capReached, add, remove, updateNote, isWatched }
}
