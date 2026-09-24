-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Fixes the reported broken-chain bug:
-- Həmidə Əsgərova submitted a request, her şöbə manager Ruslan Qəhrəmanov
-- approved it, but it vanished instead of landing in Samir Süleymanov's
-- (Maliyyə departamenti director) queue.
--
-- ROOT CAUSE (confirmed via read-only queries, no app-code bug involved):
-- profiles.manager_id for Ruslan Qəhrəmanov (e2c5d5a4-704c-440b-b0c8-d51dc39c6023)
-- is currently set to Qəhrəman Sadaylı — the CEO/Baş direktor
-- (e2d73352-8fe1-42d1-a03f-7783b37529aa) — instead of Samir Süleymanov, the
-- actual Maliyyə departamenti director (160f40cf-9a44-4597-b795-f7a2b3d9b7d0).
-- Because Qəhrəman Sadaylı is scope_level='dept' too, this "resolved" without
-- erroring, so the request silently routed to the CEO's queue instead of
-- Samir's — the CEO is deliberately excluded from this workflow (see the
-- prior needsUpwardForward fix), so nobody ever saw it waiting there.
--
-- This UPDATE only touches Ruslan's own manager_id. The already-stuck
-- training_requests row (id=2, Həmidə's submission) is NOT touched here —
-- its reviewing_manager_id was already set from Ruslan's (bad) manager_id
-- at approval time, so it needs a one-time correction too. Uncomment the
-- second statement below to also fix that specific row so it appears in
-- Samir's queue immediately; leave it commented if you'd rather have Samir
-- (or Ruslan, if you send it back) simply re-approve it through the UI.

update public.profiles
set manager_id = '160f40cf-9a44-4597-b795-f7a2b3d9b7d0' -- Samir Süleymanov
where id = 'e2c5d5a4-704c-440b-b0c8-d51dc39c6023';       -- Ruslan Qəhrəmanov

-- Optional: also fix the specific stuck request row (Həmidə Əsgərova's
-- submission, training_requests.id = 2) so it shows up in Samir's queue
-- right away instead of waiting for a future re-approval.
-- update public.training_requests
-- set reviewing_manager_id = '160f40cf-9a44-4597-b795-f7a2b3d9b7d0' -- Samir Süleymanov
-- where id = 2;
