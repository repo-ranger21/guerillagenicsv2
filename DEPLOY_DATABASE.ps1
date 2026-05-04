# GuerillaGenics v2 — Supabase Database Deployment
# Run these commands in PowerShell from your repo root:
# C:\Users\TheOp\Downloads\guerillagenicsv2

# ============================================================
# STEP 1: Copy the supabase/ folder into your repo
# (The zip you downloaded contains this folder)
# Place it at: C:\Users\TheOp\Downloads\guerillagenicsv2\supabase\
# ============================================================

# ============================================================
# STEP 2: Install Supabase CLI (if not already installed)
# ============================================================
# Option A — Scoop (recommended for Windows)
# scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
# scoop install supabase

# Option B — download binary directly from:
# https://github.com/supabase/cli/releases/latest
# Place supabase.exe in a folder on your PATH

# ============================================================
# STEP 3: Authenticate
# ============================================================
supabase login
# Opens browser → sign in → token stored in OS keychain

# ============================================================
# STEP 4: Link to your project
# ============================================================
cd C:\Users\TheOp\Downloads\guerillagenicsv2
supabase link --project-ref vegrvcivankfreqkzwmr
# You will be prompted for your database password (set in Supabase dashboard)

# ============================================================
# STEP 5: Preview what will be applied (dry run — no changes)
# ============================================================
supabase db push --dry-run

# ============================================================
# STEP 6: Deploy all 8 migrations to production
# ============================================================
supabase db push
# Applies all migrations in supabase/migrations/ that haven't been run yet.
# Tracked in supabase_migrations.schema_migrations on the remote.

# ============================================================
# STEP 7: Verify
# ============================================================
supabase db remote commit
# Lists what was applied

# Or check in the Supabase dashboard:
# https://supabase.com/dashboard/project/vegrvcivankfreqkzwmr/database/migrations

# ============================================================
# STEP 8: Get your connection strings for backend/.env
# ============================================================
# From the Supabase dashboard:
# Settings → Database → Connection string
#
# SUPABASE_URL=https://vegrvcivankfreqkzwmr.supabase.co
# SUPABASE_SERVICE_KEY=<from Settings → API → service_role secret>
# SUPABASE_ANON_KEY=<from Settings → API → anon public>
