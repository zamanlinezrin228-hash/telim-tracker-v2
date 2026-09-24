-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Needed for Task 3: restricting
-- Dashboard visibility/scope by role.
--
-- Defaults to false for everyone (including existing 'ld'/'hr' rows) —
-- the app code additionally always grants full access when role='ld',
-- so this column only needs to be flipped true for anyone else (e.g. HR,
-- or a specific manager) who should see the full company-wide Dashboard.

alter table public.profiles
  add column dashboard_full_access boolean not null default false;
