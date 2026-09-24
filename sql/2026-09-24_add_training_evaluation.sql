-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). New "Qiymətləndirmə" (post-training
-- evaluation) feature on the IDP document: the employee's direct manager
-- records an updated skill level + comment after a training is Completed.
--
-- One evaluation per trainings row (not a many-to-one log), so this adds
-- columns directly to `trainings` rather than a separate table — simpler,
-- no join needed anywhere this is read (IdpView.jsx already reads
-- trainings rows directly).
--
-- The ORIGINAL planning fields (skill, current_skill_level,
-- required_skill_level, importance_level, priority, etc.) are completely
-- untouched by this migration and must stay that way at the app level —
-- the evaluation is additive, never an overwrite of the original record.

alter table public.trainings
  add column post_training_skill_level text,
  add column evaluation_comment text,
  add column evaluated_by uuid references public.profiles(id),
  add column evaluated_at timestamptz;

-- READ access needs no new policy: the four existing SELECT policies on
-- trainings (HR/LD full access, a manager within their own dept/şöbə
-- scope, and an employee on their own rows) already cover every column on
-- a row they can already see, including these four new ones.
--
-- WRITE access is new: today only HR/LD can UPDATE trainings at all (see
-- "HR və LD təlimi yeniləyə bilər"). This adds the employee's DIRECT
-- manager specifically — profiles.manager_id = auth.uid(), not the wider
-- dept/şöbə "own scope" used for reads — matching the task's own manager_id
-- relationship, not a broader team.
--
-- CAVEAT (documented, not silently worked around): Postgres RLS is
-- row-level, not column-level, so this technically permits a direct
-- manager to update the whole trainings row via a raw API call, not just
-- the four evaluation columns — same trust model already used everywhere
-- else in this schema (e.g. training_requests manager policies aren't
-- column-scoped either). The app itself only ever sends the four
-- evaluation columns in this update. If stricter column-level enforcement
-- is ever needed, that requires a trigger — out of scope here.
create policy "Rəhbər öz komandasının təlimini qiymətləndirə bilər"
on public.trainings
for update
using (
  employee_name in (select p.full_name_az from public.profiles p where p.manager_id = auth.uid())
)
with check (
  employee_name in (select p.full_name_az from public.profiles p where p.manager_id = auth.uid())
);
