-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Needed for role-based scoping on the
-- Dashboard and Tracking views.

-- 1. TASK 1 — Dashboard must show company-wide KPI/chart data by default for
--    EVERY role, including 'manager' (who is deliberately restricted to
--    their own dept/sube on the raw `trainings` table by the existing
--    "Manager öz sahəsini görə bilər" policy, so that Tracking correctly
--    stays scoped — see Task 3). Since RLS applies per-table regardless of
--    which screen is asking, the only way to give the Dashboard broader
--    visibility without also loosening Tracking's enforcement is a separate
--    SECURITY DEFINER function that bypasses row-level security ITSELF,
--    while the base `trainings` policies (used by every other direct query,
--    including TrackingView's) are left completely untouched.
--
--    Frontend note: after this is applied, DashboardView.jsx calls
--    `sb.rpc('get_dashboard_trainings')` for its data instead of the
--    RLS-scoped `trainings` fetch. Until this function exists, the
--    Dashboard will show no data (the rpc call errors, the app treats it as
--    an empty result) — Tracking is unaffected either way.
--
--    Heads-up: this intentionally exposes every employee_name/training
--    record company-wide to any authenticated user who opens the
--    Dashboard's "Top İştirakçılar" ranking and department comparisons —
--    the same rows HR/LD can already see. If that's not desired, don't run
--    this part and use a stripped-down/aggregated return type instead.
create or replace function public.get_dashboard_trainings()
returns setof public.trainings
language sql
stable
security definer
set search_path = public
as $$
  select * from public.trainings;
$$;

grant execute on function public.get_dashboard_trainings() to authenticated;

-- 2. TASK 2 — Employees currently have NO select policy on `trainings` at
--    all, so an employee's Tracking view is silently empty today. Add a
--    policy scoped to their own name only, mirroring the exact style of
--    the existing "Manager öz sahəsini görə bilər" policy.
create policy "İşçi öz təlim qeydlərini görə bilər"
  on public.trainings
  for select
  using (
    my_role() = 'employee'
    and employee_name = (select full_name_az from public.profiles where id = auth.uid())
  );

-- 3. TASK 3 — No change needed. Confirmed the existing policy
--    "Manager öz sahəsini görə bilər" (dept/sube scoped via scope_level)
--    and TrackingView.jsx are unaffected by the above: the Dashboard now
--    reads through get_dashboard_trainings() instead of the plain
--    `trainings` fetch, so the manager-scoped SELECT policy that Tracking
--    relies on is untouched.
