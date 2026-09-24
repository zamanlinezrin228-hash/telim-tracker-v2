-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Needed for Task 2: gating the
-- ad-hoc "+ Yeni Sorğu" button behind an L&D-controlled toggle.
--
-- Mirrors the existing tna_window_open column on the same single-row
-- app_settings table (id=1). Defaults to false so ad-hoc requests stay
-- L&D-only until an L&D user explicitly opens the window company-wide.

alter table public.app_settings
  add column adhoc_requests_open boolean not null default false;
