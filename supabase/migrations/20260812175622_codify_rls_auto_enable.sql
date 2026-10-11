-- ============================================================
-- GuerillaGenics v2 — Migration 010 (codification)
-- Captures public.rls_auto_enable() + the ensure_rls event trigger.
--
-- EXTERNAL ORIGIN: not authored in this repo. Found live in the
-- database, owned by postgres, with no corresponding migration —
-- almost certainly Supabase-side tooling rather than anything
-- written for this project. Captured here verbatim, as-is, so the
-- repo matches reality. No behavior change.
--
-- What it does: on CREATE TABLE in the public schema, automatically
-- runs ENABLE ROW LEVEL SECURITY on the new table. Nothing else —
-- it does not add policies or touch grants, and fails safe (logs
-- and continues) if the ALTER fails. A safety net against forgetting
-- to turn RLS on for a new table.
-- ============================================================

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();
