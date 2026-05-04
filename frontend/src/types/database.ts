// ============================================================
// GuerillaGenics v2 — Supabase Database Types
// Auto-sync with: supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
// ============================================================

export type SubscriptionTier = 'scout' | 'operative' | 'command'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'paused'
export type NeedleSeverity = 'info' | 'sharp' | 'steam' | 'reverse'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          handle: string | null
          avatar_url: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          handle?: string | null
          avatar_url?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          handle?: string | null
          avatar_url?: string | null
          timezone?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          user_id: string
          tier: SubscriptionTier
          status: SubscriptionStatus
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: never  // service_role only
        Update: never  // service_role only
      }
      sports: {
        Row: {
          id: number
          code: string
          name: string
        }
        Insert: never
        Update: never
      }
      players: {
        Row: {
          id: number
          sport_id: number
          external_id: string
          full_name: string
          team: string | null
          position: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
      }
      markets: {
        Row: {
          id: number
          sport_id: number
          market_type: string
          player_id: number | null
          team: string | null
          season: number
          external_id: string
          label: string
          status: string
          settled_at: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: never
        Update: never
      }
      odds_history: {
        Row: {
          id: number
          market_id: number
          book: string
          selection: string
          american_price: number
          decimal_price: number
          recorded_at: string
        }
        Insert: never
        Update: never
      }
      needle_alerts: {
        Row: {
          id: number
          market_id: number
          severity: NeedleSeverity
          title: string
          body: string | null
          edge_bps: number | null
          fired_at: string
          expires_at: string | null
          min_tier: SubscriptionTier
          payload: Record<string, unknown>
        }
        Insert: never
        Update: never
      }
      model_snapshots: {
        Row: {
          id: number
          market_id: number
          model_version: string
          fair_price: number
          edge_bps: number | null
          confidence: number | null
          kelly_fraction: number | null
          features: Record<string, unknown>
          output: Record<string, unknown>
          min_tier: SubscriptionTier
          computed_at: string
        }
        Insert: never
        Update: never
      }
      player_futures: {
        Row: {
          market_id: number
          player_id: number
          consensus_price: number | null
          best_book: string | null
          best_price: number | null
          fair_price: number | null
          edge_bps: number | null
          elo_rating: number | null
          updated_at: string
        }
        Insert: never
        Update: never
      }
      watchlist: {
        Row: {
          user_id: string
          market_id: number
          note: string | null
          added_at: string
        }
        Insert: {
          user_id: string
          market_id: number
          note?: string | null
          added_at?: string
        }
        Update: {
          note?: string | null
        }
      }
    }
    Views: {
      open_futures_with_edge: {
        Row: {
          market_id: number
          market_label: string
          market_type: string
          season: number
          sport: string
          player_name: string | null
          team: string | null
          position: string | null
          consensus_price: number | null
          best_book: string | null
          best_price: number | null
          fair_price: number | null
          edge_bps: number | null
          elo_rating: number | null
          updated_at: string
        }
      }
      latest_needle_alerts: {
        Row: {
          id: number
          severity: NeedleSeverity
          title: string
          body: string | null
          edge_bps: number | null
          fired_at: string
          expires_at: string | null
          min_tier: SubscriptionTier
          payload: Record<string, unknown>
          market_label: string
          market_type: string
          sport: string
        }
      }
    }
    Functions: {
      get_user_tier: {
        Args: { uid: string }
        Returns: SubscriptionTier
      }
      has_tier: {
        Args: { required: SubscriptionTier }
        Returns: boolean
      }
    }
  }
}

// ============================================================
// Convenience types for component use
// ============================================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Market = Database['public']['Tables']['markets']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type OddsHistory = Database['public']['Tables']['odds_history']['Row']
export type NeedleAlert = Database['public']['Tables']['needle_alerts']['Row']
export type ModelSnapshot = Database['public']['Tables']['model_snapshots']['Row']
export type PlayerFuture = Database['public']['Tables']['player_futures']['Row']
export type WatchlistItem = Database['public']['Tables']['watchlist']['Row']
export type OpenFutureWithEdge = Database['public']['Views']['open_futures_with_edge']['Row']
export type LatestNeedleAlert = Database['public']['Views']['latest_needle_alerts']['Row']
