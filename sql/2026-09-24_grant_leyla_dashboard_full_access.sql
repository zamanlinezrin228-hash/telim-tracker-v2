-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Fixes the reported bug: "Leyla
-- Ərəbova's Dashboard shows zero data despite full access."
--
-- ROOT CAUSE (confirmed via read-only queries — no app-code bug found):
-- Leyla Ərəbova's profiles.dashboard_full_access is actually FALSE right
-- now, not true as reported — it was apparently never actually set.
-- Every gating path that reads it (pages/index.js's hasDashboardFullAccess/
-- canSeeDashboard, HomeScreen.jsx's Dashboard card, Sidebar.jsx's nav item,
-- and DashboardView.jsx's restrictToOwnScope→scoped filtering) is a single
-- consistent chain, all correctly reading the CURRENT logged-in user's own
-- freshly-fetched profile row — verified no divergent/duplicate check, no
-- stale-profile issue, no wrong-user lookup.
--
-- Because her role is 'manager' (not 'ld'/'hr', which would auto-qualify
-- via isReviewer), dashboard_full_access=false meant she fell through to
-- the manager-only path: canSeeDashboard was still true (she's a dept
-- manager with direct reports), but restrictToOwnScope was true, so
-- DashboardView.jsx correctly scoped her down to just her own department
-- (İnsan Resurslarının İdarəedilməsi Departamenti) — which currently has
-- ZERO rows in `trainings` at all (checked directly), so even that
-- correctly-scoped fallback view rendered as all zeros. Both facts
-- together are exactly what she saw — no code was misbehaving.

update public.profiles
set dashboard_full_access = true
where id = '9bb862af-aeb4-43a4-8346-92efb01b5a35'; -- Leyla Ərəbova
