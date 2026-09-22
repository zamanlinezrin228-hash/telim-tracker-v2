-- Fixes a pre-existing RLS bug on training_requests that blocks every
-- manager-level approval/forward/resubmit action with "new row violates
-- row-level security policy" (reported live via a "Təsdiqlə" click that
-- forwards a şöbə-manager's row up to the dept manager, but it equally
-- breaks RequestsView.jsx's existing manager approve/reject and the
-- Needs-Revision resubmit flow — this was already broken before today's
-- changes, just never exercised by a real manager-level approval before).
--
-- Root cause: when a Postgres RLS UPDATE policy omits WITH CHECK, Postgres
-- reuses the USING clause as the WITH CHECK too, meaning the row must still
-- match the *same* condition AFTER the update. Both of these policies were
-- written only for USING (deciding which rows you may touch) but the
-- implicit WITH CHECK breaks their own core use case:
--
--   "Reviewer öz üzərinə düşən sorğuları yeniləyə bilər"
--   USING (reviewing_manager_id = auth.uid())
--   -> forwarding the row (reassigning reviewing_manager_id to someone
--      else, e.g. the dept manager, or to null when there's no one left
--      above) makes the NEW row fail that same check.
--
--   "Öz sorğusunu düzəlişdən sonra yeniləyə bilər"
--   USING (requested_by = auth.uid() AND status = 'Needs Revision')
--   -> resubmitting necessarily changes status away from 'Needs Revision',
--      which is the entire point of the action, so the NEW row always
--      fails that same check.
--
-- Fix: give each an explicit WITH CHECK that validates who is allowed to
-- make the change, not that the row still matches its own trigger
-- condition afterward — the same effectively-unrestricted-by-row-content
-- shape the existing HR/LD update policy already has (my_role() doesn't
-- change based on what the update writes, so it was never affected).

alter policy "Reviewer öz üzərinə düşən sorğuları yeniləyə bilər"
  on public.training_requests
  with check (true);

alter policy "Öz sorğusunu düzəlişdən sonra yeniləyə bilər"
  on public.training_requests
  with check (requested_by = auth.uid());
