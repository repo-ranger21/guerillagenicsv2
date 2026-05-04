-- ============================================================
-- GuerillaGenics v2 — Migration 002
-- Subscriptions table — written ONLY by service_role (Stripe webhook)
-- Authenticated users can only READ their own row
-- ============================================================

create table public.subscriptions (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  tier                    public.subscription_tier not null default 'scout',
  status                  public.subscription_status not null default 'active',
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  trial_end               timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can read their own subscription row
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- NO insert/update/delete policies for authenticated role.
-- Only service_role (Stripe webhook Edge Function) can mutate.
-- service_role bypasses RLS by design.

-- Indexes
create index subscriptions_tier_idx    on public.subscriptions (tier);
create index subscriptions_stripe_cust on public.subscriptions (stripe_customer_id);
create index subscriptions_status_idx  on public.subscriptions (status)
  where status in ('active', 'trialing', 'past_due');

-- Updated_at trigger
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();
