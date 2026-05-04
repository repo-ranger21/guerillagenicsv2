// ============================================================
// GuerillaGenics v2 — useModelSnapshot
// Latest model output for a market. Operative+ only via RLS.
// Usage: const { snapshot, tieredOut } = useModelSnapshot({ marketId: 42 })
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ModelSnapshot } from '../types/database'

interface UseModelSnapshotOptions {
  marketId: number
}

interface UseModelSnapshotResult {
  snapshot: ModelSnapshot | null
  history: ModelSnapshot[]
  loading: boolean
  error: string | null
  tieredOut: boolean
}

export function useModelSnapshot({
  marketId,
}: UseModelSnapshotOptions): UseModelSnapshotResult {
  const [snapshot, setSnapshot] = useState<ModelSnapshot | null>(null)
  const [history, setHistory] = useState<ModelSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tieredOut, setTieredOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchSnapshot() {
      setLoading(true)
      setError(null)
      setTieredOut(false)

      const { data, error: fetchError } = await supabase
        .from('model_snapshots')
        .select('*')
        .eq('market_id', marketId)
        .order('computed_at', { ascending: false })
        .limit(10)

      if (cancelled) return

      if (fetchError) {
        if (fetchError.code === 'PGRST301' || fetchError.message.includes('permission')) {
          setTieredOut(true)
        } else {
          setError(fetchError.message)
        }
      } else {
        const rows = data ?? []
        setSnapshot(rows[0] ?? null)
        setHistory(rows)
        if (rows.length === 0) setTieredOut(true)
      }
      setLoading(false)
    }

    fetchSnapshot()
    return () => { cancelled = true }
  }, [marketId])

  return { snapshot, history, loading, error, tieredOut }
}
