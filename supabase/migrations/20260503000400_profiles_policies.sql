-- ============================================================
-- GuerillaGenics v2 — Migration 004
-- Profiles RLS policies
-- ============================================================

-- SELECT: users see only their own profile
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- INSERT: only own row (trigger handles signup, this covers edge cases)
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- UPDATE: users can update their own profile
-- WITH CHECK prevents ownership flips
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No DELETE policy — profile deletion cascades from auth.users deletion
-- (handled at the auth layer, not by the user directly)
