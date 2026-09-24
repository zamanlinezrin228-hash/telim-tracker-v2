-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). One-time cleanup of test data
-- created while manually testing the notification/IDP-evaluation
-- features — NOT executed here, and each piece was verified against the
-- live data first (see chat) before writing this.

-- 1. training_requests currently has exactly 2 rows, both created today
--    (Həmidə Əsgərova, Nəzrin Zamanlı) while testing the approval-chain/
--    notification-badge features. Deletes everything currently in the
--    table — re-check row count first if you run this later and expect
--    real submissions to exist by then.
delete from public.training_requests;

-- 2. trainings has 463 real rows at plan_year=2026 and exactly 2 test rows
--    at plan_year=2027 (Fuad Cahangirov, Həmidə Əsgərova — added via
--    "Plana Əlavə Et" while testing). Only the 2027 ones are deleted;
--    İzləmə Cədvəli's real 2026 tracking data is untouched.
delete from public.trainings where plan_year = 2027;

-- 3. Exactly 2 trainings rows currently have Qiymətləndirmə data filled in
--    (Ata Səlimov, Sevinc Mahmudzadə — both real 2026 tracking rows, left
--    over from testing the evaluation feature). This clears only the 4
--    evaluation columns back to null — the trainings rows themselves are
--    NOT deleted, since they're real İzləmə Cədvəli records.
update public.trainings
set post_training_skill_level = null, evaluation_comment = null, evaluated_by = null, evaluated_at = null
where evaluated_at is not null;
