-- Already applied directly to Supabase (project: Mars People Development /
-- ydsivgesyolajbaksljn) at the user's request. Recorded here for the audit
-- trail, matching this repo's existing sql/*.sql convention. This is the
-- FINAL state after three iterations below — only the last `alter policy`
-- pair reflects what's actually live; the earlier attempts are kept as
-- comments to explain why the design changed twice.
--
-- Trigger: a şöbə-scoped manager (Ruslan Qəhrəmanov, scope_level='sube')
-- was seeing Logistika/Marketinq training records in İzləmə Cədvəli.
--
-- Attempt #1 — cross-department leak: the scope_level='sube' branch of
-- both policies matched on `sube` alone, with no `dept` check. Şöbə names
-- aren't unique across departments — "Biznes tətbiqləri və avtomatlaşdırma
-- şöbəsi" exists verbatim under 6 different departments in `trainings`
-- (Hüquq, İT, İnsan resursları, Logistika, Marketinq, Risklərin
-- İdarəedilməsi) — so a sube-scoped manager saw every department's rows
-- sharing their şöbə's name. Fixed by requiring dept AND sube to match.
--
-- Attempt #2 — casing: that alone made Ruslan's view go empty, because
-- profiles.dept and trainings.dept disagree only in letter casing for
-- several departments (Maliyyə, Satış, Hüquq, Logistika — ~70% of rows).
-- Made both comparisons case/whitespace-insensitive.
--
-- Attempt #3 (final) — wrong join entirely: even case-insensitive, Ruslan's
-- team still didn't show up. Checked the data directly: `trainings.dept`/
-- `sube` on a given row do NOT reliably reflect the employee's actual
-- profile dept/sube — e.g. Ruslan's own direct report Aqşin İsmayılzadə has
-- profile.dept = 'Maliyyə departamenti' but his trainings rows are tagged
-- dept = 'İnformasiya texnologiyaları şöbəsi'. Matching on the training
-- row's own dept/sube can therefore never reliably find "my team's
-- trainings", however the string comparison is normalized.
--
-- Correct approach: decide which EMPLOYEES are in scope using `profiles`
-- (reliable, first-party data about that person), then match trainings by
-- employee_name against that set — never against the training row's own
-- dept/sube. A manager sees their own rows plus: for scope_level='dept',
-- everyone whose profile.dept matches (covers multi-level hierarchies
-- under a department head); for scope_level='sube', everyone whose profile
-- dept AND sube match (one şöbə's team). Mirrored on training_requests.

alter policy "Manager öz sahəsini görə bilər"
  on public.trainings
  using (
    (my_role() = 'manager') and (
      employee_name = (select profiles.full_name_az from profiles where profiles.id = auth.uid())
      or employee_name in (
        select p.full_name_az from profiles p
        where
          (
            (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'dept'
            and lower(trim(p.dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
          )
          or
          (
            (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'sube'
            and lower(trim(p.dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
            and lower(trim(p.sube)) = lower(trim((select profiles.sube from profiles where profiles.id = auth.uid())))
          )
      )
    )
  );

alter policy "Sahə üzrə qərarları görə bilər"
  on public.training_requests
  using (
    (my_role() = 'manager') and (
      employee_name = (select profiles.full_name_az from profiles where profiles.id = auth.uid())
      or employee_name in (
        select p.full_name_az from profiles p
        where
          (
            (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'dept'
            and lower(trim(p.dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
          )
          or
          (
            (select profiles.scope_level from profiles where profiles.id = auth.uid()) = 'sube'
            and lower(trim(p.dept)) = lower(trim((select profiles.dept from profiles where profiles.id = auth.uid())))
            and lower(trim(p.sube)) = lower(trim((select profiles.sube from profiles where profiles.id = auth.uid())))
          )
      )
    )
  );
