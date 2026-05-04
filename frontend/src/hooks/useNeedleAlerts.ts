// ============================================================
// GuerillaGenics v2 — useNeedleAlerts
// Real-time alert feed. RLS gates by tier automatically.
// Usage: const { alerts, loading, error } = useNeedleAlerts({ limit: 50 })
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { LatestNeedleAlert } from '../types/database'

interface UseNeedleAlertsOptions {
  limit?: number
  sport?: string          // 'NFL' | 'NBA' | 'MLB'
  severity?: string[]     // ['sharp', 'steam']
}

interface UseNeedleAlertsResult {
  alerts: LatestNeedleAlert[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useNeedleAlerts({
  limit = 50,
  sport,
  severity,
}: UseNeedleAlertsOptions = {}): UseNeedleAlertsResult {
  const [alerts, setAlerts] = useState<LatestNeedleAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  function refetch() {
    setTick(t => t + 1)
  }

  useEffect(() => {
    let cancelled = false

    async function fetchAlerts() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('latest_needle_alerts')
        .select('*')
        .limit(limit)

      if (sport) query = query.eq('sport', sport)
      if (severity?.length) query = query.in('severity', severity)

      const { data, error: fetchError } = await query

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setAlerts(data ?? [])
      }
      setLoading(false)
    }

    fetchAlerts()

    // Real-time subscription — Supabase pushes new alerts instantly
    // RLS ensures user only receives rows their tier allows
    const channel = supabase
      .channel('needle_alerts_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'needle_alerts',
        },
        () => {
          // Re-fetch the view so we get the joined market/sport data
          if (!cancelled) fetchAlerts()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [limit, sport, severity?.join(','), tick])

  return { alerts, loading, error, refetch }
}
