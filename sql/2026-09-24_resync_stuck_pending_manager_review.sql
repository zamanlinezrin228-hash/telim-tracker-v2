-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn), AFTER fixing any bad profiles.
-- manager_id data (see 2026-09-24_fix_ruslan_manager_id.sql and
-- 2026-09-24_review_broken_manager_chains.sql). This does NOT fix
-- profiles — it re-syncs training_requests.reviewing_manager_id for
-- whatever is currently stuck, based on whatever profiles.manager_id
-- says right now, so it's a no-op for anything already correct and only
-- ever touches a row that's genuinely out of sync. Safe to re-run any time
-- (e.g. after correcting more profiles) — general-purpose, not a one-off
-- fix for a single named person or row id.
--
-- WHAT "stuck" MEANS: for every training_requests row currently sitting
-- at status='Pending Manager Review', the correct reviewing_manager_id is
-- the manager_id of whoever most recently forwarded it — manager_reviewed_by
-- if someone has already approved it at least once, otherwise
-- requested_by (the original submitter), since that's who set the first
-- hop. If the row's actual reviewing_manager_id doesn't match that
-- person's CURRENT profiles.manager_id, the row is stuck: it's sitting
-- with a reviewer who either isn't the real next approver, or (if that
-- manager_id happens to not resolve, e.g. after a fix that sets it to
-- null) needs to fall through to L&D instead.
--
-- SCOPE CHECKED (run 2026-09-24, before any of these fixes were applied):
-- only 1 of 4 rows currently in 'Pending Manager Review' across the whole
-- dataset was actually broken — id=2 (Həmidə Əsgərova's request, the
-- reported case) — the other 3 already correctly matched their forwarding
-- actor's current manager_id. This is NOT evidence of a wider systemic
-- break across the org chart; it's one bad profiles.manager_id value
-- (Ruslan Qəhrəmanov's) surfacing on the one row that happened to pass
-- through him. Re-run the read-only diagnostic below any time to re-check.

-- Read-only diagnostic — run this first to see what would change:
--
-- select tr.id, tr.employee_name, tr.reviewing_manager_id as current_value,
--        actor.manager_id as correct_value, actor.full_name_az as forwarding_actor
-- from training_requests tr
-- join profiles actor on actor.id = coalesce(tr.manager_reviewed_by, tr.requested_by)
-- where tr.status = 'Pending Manager Review'
--   and tr.reviewing_manager_id is distinct from actor.manager_id;

-- The actual fix: re-sync every currently-stuck row in one statement.
-- If the recomputed manager_id is null (forwarding actor is now top-of-
-- chain), this also flips the row to status='Pending' so it lands with
-- L&D instead of sitting on a null reviewing_manager_id forever.
update public.training_requests tr
set
  reviewing_manager_id = actor.manager_id,
  status = case when actor.manager_id is null then 'Pending' else 'Pending Manager Review' end,
  updated_at = now()
from public.profiles actor
where tr.status = 'Pending Manager Review'
  and actor.id = coalesce(tr.manager_reviewed_by, tr.requested_by)
  and tr.reviewing_manager_id is distinct from actor.manager_id;
