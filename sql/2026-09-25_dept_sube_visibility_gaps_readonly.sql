-- READ-ONLY diagnostic queries (Task 4 of the 2026-09-25 request). Nothing
-- here writes data — every statement is a SELECT. Run these yourself in the
-- Supabase SQL editor if you want to re-check the numbers below.
--
-- Finding: trainings.dept is free text typed independently of profiles.dept
-- (also free text). The app's scoping (DashboardView.jsx's matchesOwnScope,
-- and the matching "Manager öz sahəsini görə bilər" RLS policy on trainings)
-- normalizes CASE and whitespace only — it cannot bridge two genuinely
-- different strings for what is really the same department. Five of the
-- twelve distinct trainings.dept values used in the 2026 plan have NO
-- profiles.dept that matches even after normalization:
--
--   trainings.dept                                              trainings rows
--   'İnzibati Şöbə'                                              7
--   'İnsan resursları Departamenti'                              55
--   'SƏTƏM'                                                      7
--   'İnformasiya texnologiyaları şöbəsi'                         12
--   'Biznes Analitikası və Xidmət Keyfiyyətinə Nəzarət şöbəsi'   6
--
-- Concretely, this currently blocks two named managers from seeing their
-- own team's İzləmə Cədvəli / Dashboard data at all (unless someone grants
-- them dashboard_full_access):
--   - Asif İbrahimov (scope_level='dept', profiles.dept='İnzibati işlər
--     şöbəsi') — trainings for his 7-person team are filed under dept=
--     'İnzibati Şöbə', a different string, so he currently sees 0 rows.
--   - Leyla Ərəbova (scope_level='dept', profiles.dept='İnsan Resurslarının
--     İdarəedilməsi Departamenti') — her team's 55 trainings rows are filed
--     under 'İnsan resursları Departamenti'. She happens to ALSO have
--     dashboard_full_access=true (sql/2026-09-24_grant_leyla_dashboard_full_
--     access.sql), so in practice she still sees everything company-wide —
--     but if that flag is ever revoked, her scoped view drops to 0 rows.
--
-- I did NOT write an UPDATE to auto-correct trainings.dept for these groups.
-- I checked whether it was safe to just set trainings.dept to whatever the
-- affected employees' profiles.dept says, and it is NOT: several names used
-- in these trainings rows are ambiguous across multiple real profiles (e.g.
-- 'Aytac Əliyeva' exists as both an İnzibati işlər şöbəsi employee AND an
-- unrelated Logistika Departamenti employee; a raw name-join for 'Lalə
-- Abbaszadə' — the İnzibati Şöbə archivist — even matched a different
-- person entirely, in Risklərin İdarəedilməsi Departamenti). A blind
-- UPDATE ... FROM profiles JOIN ON employee_name would silently reassign
-- some rows to the wrong department. This needs a human (HR/L&D) decision
-- on the canonical department name per row, not an automated string-match.
--
-- Also note (separate from the dept mismatch above): trainings.sube is only
-- populated for 219 of 463 rows, and even where set, it is sometimes
-- inconsistent with the employee's real şöbə (e.g. SƏTƏM-dept trainings
-- rows for the same person appear with sube values like 'SƏTƏM şöbəsi',
-- 'Mühasibatlıq şöbəsi', 'Anbar şöbəsi' and NULL across different rows).
-- Every şöbə-level manager's scoped view depends entirely on this field
-- being correct, so this directly causes incomplete (not necessarily zero,
-- but under-counted) views for şöbə-scoped managers company-wide. This is
-- pre-existing — my 2026-09-25 import does not touch the sube column at
-- all (the source workbook has no Filial/Şöbə column), so it neither
-- caused nor fixed this.
--
-- Re-run this to see the current mismatch list:
select t.dept as training_dept, count(*) as rows,
  exists (
    select 1 from profiles p
    where lower(trim(p.dept)) = lower(trim(t.dept))
  ) as has_exact_profile_dept_match
from trainings t
where t.dept is not null
group by t.dept
order by has_exact_profile_dept_match, rows desc;

-- Re-run this to see şöbə-manager coverage (how many of a manager's real
-- team members' trainings rows they can currently see vs how many exist):
select p.full_name_az as manager, p.dept, p.sube,
  (select count(*) from trainings t2
     where lower(trim(t2.dept)) = lower(trim(p.dept))) as team_rows_by_dept,
  (select count(*) from trainings t3
     where lower(trim(t3.sube)) = lower(trim(p.sube))) as visible_rows_by_sube
from profiles p
where p.scope_level = 'sube' and p.role = 'manager'
order by (
  (select count(*) from trainings t2 where lower(trim(t2.dept)) = lower(trim(p.dept)))
  - (select count(*) from trainings t3 where lower(trim(t3.sube)) = lower(trim(p.sube)))
) desc;

-- Company-wide dashboard access as of 2026-09-25 (role='ld'/'hr' always get
-- it; everyone else needs dashboard_full_access=true). The task description
-- assumed three dashboard_full_access=true users — as of this check there
-- is only ONE such flag (Leyla Ərəbova), but the effective full-access
-- headcount is still three once the two 'ld' accounts are counted:
select full_name_az, role, dashboard_full_access
from profiles
where role in ('ld', 'hr') or dashboard_full_access = true
order by role, full_name_az;
