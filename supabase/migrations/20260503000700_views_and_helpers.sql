-- ============================================================
-- GuerillaGenics v2 — Migration 007
-- Useful views + Stripe upsert helper function
-- ============================================================

-- ===== View: user_tier_status =====
-- Convenience view for the backend API and admin tooling.
-- NOT exposed to authenticated users directly (no RLS needed — not in API schema).
-- Backend reads this with service_role.

create view private.user_tier_status as
  select
    p.id as user_id,
    p.display_name,
    p.handle,
    coalesce(s.tier, 'scout'::public.subscription_tier) as effective_tier,
    coalesce(s.status, 'active'::public.subscription_status) as subscription_status,
    s.current_period_end,
    s.stripe_customer_id,
    s.cancel_at_period_end
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id;

-- ===== View: open_futures_with_edge =====
-- Joins player_futures with markets and players for the Command dashboard.
-- Exposed to authenticated users via RLS on underlying tables.

create view public.open_futures_with_edge as
  select
    m.id           as market_id,
    m.label        as market_label,
    m.market_type,
    m.season,
    s.code         as sport,
    pl.full_name   as player_name,
    pl.team,
    pl.position,
    pf.consensus_price,
    pf.best_book,
    pf.best_price,
    pf.fair_price,
    pf.edge_bps,
    pf.elo_rating,
    pf.updated_at
  from public.player_futures pf
  join public.markets  m  on m.id = pf.market_id
  join public.sports   s  on s.id = m.sport_id
  left join public.players pl on pl.id = pf.player_id
  where m.status = 'open'
  order by pf.edge_bps desc nulls last;

-- RLS on underlying tables handles access control — no separate view policy needed.

-- ===== View: latest_needle_alerts =====
-- Most recent 200 non-expired alerts for the feed widget.

create view public.latest_needle_alerts as
  select
    na.id,
    na.severity,
    na.title,
    na.body,
    na.edge_bps,
    na.fired_at,
    na.expires_at,
    na.min_tier,
    na.payload,
    m.label  as market_label,
    m.market_type,
    s.code   as sport
  from public.needle_alerts na
  join public.markets m on m.id = na.market_id
  join public.sports  s on s.id = m.sport_id
  where (na.expires_at is null or na.expires_at > now())
  order by na.fired_at desc
  limit 200;

-- ===== Stripe subscription upsert helper =====
-- Called by the Stripe webhook Edge Function with service_role.
-- Encapsulates the upsert logic so the Edge Function stays thin.

create or replace function public.upsert_subscription(
  p_user_id                uuid,
  p_tier                   public.subscription_tier,
  p_status                 public.subscription_status,
  p_stripe_customer_id     text default null,
  p_stripe_subscription_id text default null,
  p_stripe_price_id        text default null,
  p_current_period_start   timestamptz default null,
  p_current_period_end     timestamptz default null,
  p_cancel_at_period_end   boolean default false,
  p_trial_end              timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (
    user_id,
    tier,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    trial_end
  )
  values (
    p_user_id,
    p_tier,
    p_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_price_id,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_trial_end
  )
  on conflict (user_id) do update set
    tier                    = excluded.tier,
    status                  = excluded.status,
    stripe_customer_id      = coalesce(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
    stripe_subscription_id  = coalesce(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id),
    stripe_price_id         = coalesce(excluded.stripe_price_id, subscriptions.stripe_price_id),
    current_period_start    = coalesce(excluded.current_period_start, subscriptions.current_period_start),
    current_period_end      = coalesce(excluded.current_period_end, subscriptions.current_period_end),
    cancel_at_period_end    = excluded.cancel_at_period_end,
    trial_end               = coalesce(excluded.trial_end, subscriptions.trial_end),
    updated_at              = now();
end;
$$;

-- Only service_role should call this function
revoke all on function public.upsert_subscription from public, anon, authenticated;
grant execute on function public.upsert_subscription to service_role;
