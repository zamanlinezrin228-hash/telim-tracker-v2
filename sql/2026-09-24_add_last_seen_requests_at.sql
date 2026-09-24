-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Needed for the new red notification
-- badge on the "Təlim Sorğuları" nav button/Home card: implemented as a
-- "last seen" timestamp comparison against training_requests.created_at/
-- updated_at, rather than a full notification-log table.
--
-- DEFAULT now() (not null) is deliberate: it applies to every existing row
-- at migration time too, so nobody's entire historical backlog of requests
-- suddenly shows up as "unread" the moment this column appears — only
-- activity from this point forward counts, same as a fresh install would
-- behave for a brand-new profile going forward.

alter table public.profiles
  add column last_seen_requests_at timestamptz not null default now();
