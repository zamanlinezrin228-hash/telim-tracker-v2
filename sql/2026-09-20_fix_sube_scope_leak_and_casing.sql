-- Already applied directly to Supabase (project: Mars People Development /
-- ydsivgesyolajbaksljn) at the user's request. Recorded here for the audit
-- trail, matching this repo's existing sql/*.sql convention.
--
-- Trigger: a şöbə-scoped manager (Ruslan Qəhrəmanov, scope_level='sube')
-- was seeing Logistika/Marketinq training records in İzləmə Cədvəli.
--
-- Root cause #1 — cross-department leak: the scope_level='sube' branch of
-- both policies below matched on `sube` alone, with no `dept` check. Şöbə
-- names aren't unique across departments — "Biznes tətbiqləri və
-- avtomatlaşdırma şöbəsi" exists verbatim under 6 different departments in
-- `trainings` (Hüquq, İT, İnsan resursları, Logistika, Marketinq, Risklərin
-- İdarəedilməsi) — so a sube-scoped manager saw every department's rows
-- that happened to share their şöbə's name.
--
-- Root cause #2 — casing: profiles.dept and trainings.dept/
-- training_requests.dept disagree only in letter casing for at least 4
-- departments (Maliyyə, Satış, Hüquq, Logistika — ~70% of trainings rows).
-- Postgres `=` is case-sensitive, so simply adding an exact dept check to
-- fix #1 would have made dept-scoped (and now sube-scoped) managers in
-- those departments see an empty view instead of a leaky one. Both
-- comparisons are now case/whitespace-insensitive.

alter policy "Manager öz sahəsini görə bilər"
  on public.trainings
  using (
    (my_role() = 'manager') and (
      (
        (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'dept'
        and lower(trim(dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
      )
      or
      (
        (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'sube'
        and lower(trim(dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
        and lower(trim(sube)) = lower(trim((select profiles.sube from profiles where profiles.id = auth.uid())))
      )
    )
  );

alter policy "Sahə üzrə qərarları görə bilər"
  on public.training_requests
  using (
    (my_role() = 'manager') and (
      (
        (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'dept'
        and lower(trim(dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
      )
      or
      (
        (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'sube'
        and lower(trim(dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
        and lower(trim(sube)) = lower(trim((select profiles.sube from profiles where profiles.id = auth.uid())))
      )
    )
  );

-- Not fixed here, flagged for awareness: even with case-insensitive
-- matching, Ruslan's own dept+sube combination currently has ZERO rows in
-- `trainings` — his team's şöbə just hasn't had any training logged yet.
-- That's expected/correct, not a bug; his İzləmə Cədvəli will legitimately
-- show empty until trainings are recorded for his exact dept/sube.
