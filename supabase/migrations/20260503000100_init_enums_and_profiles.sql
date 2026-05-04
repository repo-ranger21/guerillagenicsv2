-- ============================================================
-- GuerillaGenics v2 — Migration 001
-- Enums, profiles table, auto-create trigger
-- ============================================================

-- Tier enum: single source of truth — never compare to magic strings
create type public.subscription_tier as enum ('scout', 'operative', 'command');

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused'
);

-- Needle alert severity levels
create type public.needle_severity as enum ('info', 'sharp', 'steam', 'reverse');

-- citext for case-insensitive unique handles (requires extension)
create extension if not exists citext;

-- Profiles extend auth.users — PK mirrors auth.users.id
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  handle        citext unique,
  avatar_url    text,
  timezone      text not null default 'America/New_York',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create profile row on signup
-- SECURITY DEFINER + empty search_path = hardened per Supabase recommendation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at auto-maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
