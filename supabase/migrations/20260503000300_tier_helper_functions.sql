-- ============================================================
-- GuerillaGenics v2 — Migration 003
-- Tier resolution helper functions
-- These live in private schema so PostgREST cannot expose them
-- ============================================================

-- Private schema: not exposed via PostgREST API
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

-- Numeric rank for tier comparison: scout=1, operative=2, command=3
-- IMMUTABLE is correct here — the mapping never changes at runtime
create or replace function private.tier_rank(t public.subscription_tier)
returns int
language sql
immutable
as $$
  select case t
    when 'scout'     then 1
    when 'operative' then 2
    when 'command'   then 3
  end;
$$;

-- Resolves the caller's current effective tier.
-- SECURITY DEFINER bypasses RLS on subscriptions → no infinite recursion.
-- STABLE allows Postgres to cache the result within a statement (initPlan).
-- Wrap calls in (select ...) to trigger the initPlan optimization.
-- Always set search_path = '' to prevent search_path attacks.
create or replace function public.get_user_tier(uid uuid)
returns public.subscription_tier
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.tier
        from public.subscriptions s
       where s.user_id = uid
         and s.status in ('active', 'trialing')
       limit 1
    ),
    'scout'::public.subscription_tier
  );
$$;

-- Convenience boolean: "does the calling user have at least <required> tier?"
-- This is what RLS policies call — one chokepoint for all tier logic.
create or replace function public.has_tier(required public.subscription_tier)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.tier_rank(public.get_user_tier((select auth.uid())))
      >= private.tier_rank(required);
$$;

-- Revoke from anonymous; grant to authenticated and service_role only
revoke all on function public.get_user_tier(uuid) from public, anon;
revoke all on function public.has_tier(public.subscription_tier) from public, anon;
grant execute on function public.get_user_tier(uuid)
  to authenticated, service_role;
grant execute on function public.has_tier(public.subscription_tier)
  to authenticated, service_role;
