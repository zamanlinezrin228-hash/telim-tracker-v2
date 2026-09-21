-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Needed for Task 1: AnnualTnaForm.jsx
-- now captures the same need-identification detail the reference TNA
-- workbook does (transformation area, learning method, activity duration,
-- learning goal) at submission time, not just after L&D approves.
--
-- Note: comp_cat, vendor, man_hours and budget already exist on
-- training_requests (confirmed against the live schema) — AnnualTnaForm.jsx
-- simply wasn't populating them before. need_reason is intentionally NOT
-- duplicated here either — training_requests.reason already serves that
-- exact purpose ("Ehtiyacın yaranma səbəbi"), same as it already does for
-- AddToPlanModal's needReason field (pre-filled from request.reason).
--
-- Left out on purpose (system-computed / post-execution, not something a
-- manager fills in while identifying a training need): used_budget,
-- weighted_gap, cgi, cgi_priority_full, and an execution-stage status.

alter table public.training_requests
  add column transformation_area text,
  add column learning_method text,
  add column activity_duration text,
  add column learning_goal text;
