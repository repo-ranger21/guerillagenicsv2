// ============================================================
// GuerillaGenics v2 — useOddsHistory
// Fetches odds for a market. Scout gets 24h-delayed data.
// Operative+ gets live data. RLS handles the gate automatically.
// Usage: const { odds, isDelayed } = useOddsHistory({ marketId: 42 })
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { OddsHistory } from '../types/database'

interface UseOddsHistoryOptions {
  marketId: number
  book?: string
  limit?: number
}

interface UseOddsHistoryResult {
  odds: OddsHistory[]
  loading: boolean
  error: string | null
  isDelayed: boolean      // true for Scout users — data is 24h old
  latestByBook: Record<string, OddsHistory>  // most recent per bookmaker
}

export function useOddsHistory({
  marketId,
  book,
  limit = 200,
}: UseOddsHistoryOptions): UseOddsHistoryResult {
  const { isOperative } = useAuth()
  const [odds, setOdds] = useState<OddsHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchOdds() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('odds_history')
        .select('*')
        .eq('market_id', marketId)
        .order('recorded_at', { ascending: false })
        .limit(limit)

      if (book) query = query.eq('book', book)

      const { data, error: fetchError } = await query

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setOdds(data ?? [])
      }
      setLoading(false)
    }

    fetchOdds()

    return () => { cancelled = true }
  }, [marketId, book, limit])

  // Compute latest price per bookmaker for the movement chart
  const latestByBook = odds.reduce<Record<string, OddsHistory>>((acc, row) => {
    if (!acc[row.book]) acc[row.book] = row
    return acc
  }, {})

  return {
    odds,
    loading,
    error,
    isDelayed: !isOperative,
    latestByBook,
  }
}
