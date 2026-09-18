-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Needed for the "Geri göndər"
-- (return-for-revision) feature on training_requests.

-- 1. Allow the new 'Needs Revision' status value.
alter table public.training_requests
  drop constraint training_requests_status_check;

alter table public.training_requests
  add constraint training_requests_status_check
  check (status = any (array[
    'Pending Manager Review',
    'Pending',
    'In Review',
    'Needs Revision',
    'Approved',
    'Rejected'
  ]));

-- 2. The original submitter currently has no UPDATE policy on their own
--    rows (only INSERT), so they can't edit + resubmit a request that was
--    sent back for revision. Scope this narrowly to rows still in
--    'Needs Revision', not a general self-edit policy.
create policy "Öz sorğusunu düzəlişdən sonra yeniləyə bilər"
  on public.training_requests
  for update
  using (requested_by = auth.uid() and status = 'Needs Revision');
