-- ============================================================
-- GuerillaGenics v2 — Migration 009
-- Fix: open_futures_with_edge and latest_needle_alerts were owned
-- by postgres (bypassrls=true) with security_invoker=false, so the
-- views executed with owner privileges and bypassed RLS on
-- player_futures and needle_alerts entirely — for anon AND for
-- authenticated users of every tier. Tier-gating on these two
-- tables was never actually enforced through the views.
--
-- No new anon policy added: the absence of one is the intended
-- boundary (matches picks_daily / needle_alerts / player_futures,
-- all authenticated-only, tier-gated).
-- ============================================================

alter view public.open_futures_with_edge set (security_invoker = true);
alter view public.latest_needle_alerts   set (security_invoker = true);
