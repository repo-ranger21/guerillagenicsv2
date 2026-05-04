// ============================================================
// GuerillaGenics v2 — useFuturesEdge
// Edge leaderboard from open_futures_with_edge view.
// Operative+ only — RLS blocks Scout users at the database level.
// Usage: const { futures, loading, tier } = useFuturesEdge({ sport: 'NFL' })
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { OpenFutureWithEdge } from '../types/database'

interface UseFuturesEdgeOptions {
  sport?: string       // 'NFL' | 'NBA' | 'MLB'
  minEdgeBps?: number  // minimum edge in basis points (e.g. 50 = 0.5%)
  limit?: number
}

interface UseFuturesEdgeResult {
  futures: OpenFutureWithEdge[]
  loading: boolean
  error: string | null
  tieredOut: boolean   // true if user got 0 results due to tier restriction
  refetch: () => void
}

export function useFuturesEdge({
  sport,
  minEdgeBps,
  limit = 100,
}: UseFuturesEdgeOptions = {}): UseFuturesEdgeResult {
  const [futures, setFutures] = useState<OpenFutureWithEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tieredOut, setTieredOut] = useState(false)
  const [tick, setTick] = useState(0)

  function refetch() {
    setTick(t => t + 1)
  }

  useEffect(() => {
    let cancelled = false

    async function fetchFutures() {
      setLoading(true)
      setError(null)
      setTieredOut(false)

      let query = supabase
        .from('open_futures_with_edge')
        .select('*')
        .limit(limit)
        .order('edge_bps', { ascending: false, nullsFirst: false })

      if (sport) query = query.eq('sport', sport)
      if (minEdgeBps != null) query = query.gte('edge_bps', minEdgeBps)

      const { data, error: fetchError } = await query

      if (cancelled) return

      if (fetchError) {
        // RLS violation returns a generic error — surface as tier restriction
        if (fetchError.code === 'PGRST301' || fetchError.message.includes('permission')) {
          setTieredOut(true)
          setFutures([])
        } else {
          setError(fetchError.message)
        }
      } else {
        setFutures(data ?? [])
        // If we got 0 results and no filter, likely a tier restriction
        if ((data ?? []).length === 0 && !sport && !minEdgeBps) {
          setTieredOut(true)
        }
      }
      setLoading(false)
    }

    fetchFutures()

    // Real-time: re-fetch when player_futures table updates
    const channel = supabase
      .channel('player_futures_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'player_futures' },
        () => { if (!cancelled) fetchFutures() }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [sport, minEdgeBps, limit, tick])

  return { futures, loading, error, tieredOut, refetch }
}
