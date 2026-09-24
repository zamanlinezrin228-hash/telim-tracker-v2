-- REVIEW ONLY — none of this runs unless you uncomment it. Companion to
-- 2026-09-24_fix_ruslan_manager_id.sql, from the same broken-chain audit
-- (project: Mars People Development / ydsivgesyolajbaksljn).
--
-- These were found by querying profiles for: (a) manager_id pointing to a
-- row that doesn't exist — none found, every manager_id resolves to a real
-- profile; (b) şöbə-level managers (scope_level='sube') with manager_id
-- null; (c) a manager_id that doesn't match what the person's title/peers
-- in the same şöbə imply. Every case below is corroborated by comparing
-- against peers with the same/adjacent position in the same şöbə — I did
-- not invent any reporting line that isn't already implied by existing data.
--
-- Grouped by confidence. Well-corroborated cases first (multiple peers
-- confirm the correct value); cases needing your judgment call last.


-- ============================================================
-- A) SELF-REFERENCING manager_id (infinite loop — their own approval
--    would route back into their own "awaiting me" queue forever).
--    Both are standalone şöbə (dept == sube, no dept-level head found
--    above them anywhere in the data) — same shape as Elşən Salamov /
--    Firudin Mustafayev below, who correctly use manager_id = null for
--    the same situation. Recommended fix: null, matching that pattern.
-- ============================================================

-- Araz Cəlilov — SƏTƏM şöbəsinin müdiri
-- update public.profiles set manager_id = null where id = '96adf129-d995-4f46-b146-3abea88ee2a0';

-- Orxan Həsrətov — Ticari marketinq şöbəsinin rəhbəri
-- update public.profiles set manager_id = null where id = 'd7e963ea-2cf1-4878-8979-f13589665de8';


-- ============================================================
-- B) WELL-CORROBORATED wrong manager_id (peers with the identical or
--    adjacent title in the same şöbə all point somewhere specific;
--    this person is the one outlier).
-- ============================================================

-- Həmid Bağırov — Supervayzer, Regionlar üzrə satış şöbəsi. His three
-- peers with the exact same "Supervayzer" title in the same şöbə (Ceyhun
-- Səfərov, Rəcəb Süleymanov, Röyyal Əskərov) all report to Amil Babayev
-- (Regionlar üzrə satış şöbəsinin rəhbəri). Həmid's manager_id is
-- currently null, so his approvals currently skip straight to L&D instead
-- of going through Amil first — a silent missing hop, not a visible
-- "stuck" bug like Ruslan's, but the same root cause.
-- update public.profiles set manager_id = '7fcdf6de-043a-42ad-8b61-dcea5831cec2' -- Amil Babayev
-- where id = 'd9857bb0-776f-48b2-839f-fd828ff8fc59';

-- Rauf Orucov — İstehsalat və satışın planlaşdırılması üzrə menecer,
-- Tədarük zəncirinin planlanması şöbəsi. He is not the top of this şöbə —
-- Abbas Ağasiyev (şöbəsinin müdiri) is, and one employee (Rasim Mehtiyev)
-- already reports directly to Abbas while Rauf has his own reports
-- (İsmayıl Kamallı, Şahin Yunusov). Currently Rauf's manager_id points
-- straight at the CEO, skipping Abbas entirely.
-- update public.profiles set manager_id = '8605643a-d751-4300-927a-99dc968251cd' -- Abbas Ağasiyev
-- where id = '3c5cd2a4-6cdc-4124-8cde-664a4f4a2cef';

-- Əvəz Şıxaliyev — Soyuducuların təmiri və hərəkətinə nəzarət bölməsinin
-- qrup rəhbəri, İnzibati işlər şöbəsi. Every other person in this şöbə
-- (9 employees plus the peer manager Əsəd Musayev) reports to Asif
-- İbrahimov (İnzibati işlər şöbəsi rəhbəri). Əvəz is the only one instead
-- pointing to Nəsib Eminov, who heads an unrelated department (Daxili
-- nəzarət şöbəsi, under Risklərin İdarəedilməsi Departamenti) — looks
-- like a copy/paste or lookup mistake.
-- update public.profiles set manager_id = 'ea1542c1-801e-4ea5-8e38-6a706be5245e' -- Asif İbrahimov
-- where id = '6bbe2a3d-262f-417f-be15-42ae6103aaab';


-- ============================================================
-- C) manager_id = CEO (Qəhrəman Sadaylı) on a scope_level='sube' profile.
--    NOTE: unlike a scope_level='dept' manager (always capped regardless
--    of manager_id — see needsUpwardForward in lib/helpers.js), a
--    scope_level='sube' manager with a non-null manager_id DOES forward
--    to it. So these two currently WOULD route their own approvals to
--    the CEO — the one person this workflow is designed to keep out of
--    the process. Two ways to fix, your call:
--      (i)  set manager_id = null, same as Elşən Salamov / Firudin
--           Mustafayev (group D below) — cheapest, no schema meaning change.
--      (ii) change scope_level to 'dept' instead — matches how every
--           other genuine top-of-unit head in this data is modeled
--           (Samir Süleymanov, Elmar Ağayev, Yalçın Abdullayev, Tural
--           Əhmədov, Zaur Həsənov, Leyla Ərəbova, Asif İbrahimov, Məsim
--           Məmmədov all use scope_level='dept'), so it'd be consistent
--           with the rest of the org chart even though their dept field
--           happens to equal their şöbə name. I'd lean toward (ii) for
--           consistency, but either is functionally correct.
-- ============================================================

-- Abbas Ağasiyev — Tədarük zəncirinin planlanması şöbəsinin müdiri
-- update public.profiles set manager_id = null where id = '8605643a-d751-4300-927a-99dc968251cd';
-- -- OR:
-- update public.profiles set scope_level = 'dept' where id = '8605643a-d751-4300-927a-99dc968251cd';

-- Nəbi Babaxanov — Avtoparkın idarəedilməsi şöbəsinin müdiri
-- update public.profiles set manager_id = null where id = '6e448463-5aa7-41d6-8eb5-5d22caa0ca9e';
-- -- OR:
-- update public.profiles set scope_level = 'dept' where id = '6e448463-5aa7-41d6-8eb5-5d22caa0ca9e';


-- ============================================================
-- D) FLAGGED FOR YOUR CONFIRMATION ONLY — functionally fine right now,
--    no fix proposed. Listed so you can sanity-check the org chart.
-- ============================================================

-- Elşən Salamov (Baş Direktorun Hüquq məsələləri üzrə müşaviri, Hüquq
-- Şöbəsi) and Firudin Mustafayev (Qrup üzrə daxili təhlükəsizliyə nəzarət
-- şöbəsinin rəhbəri) both have manager_id = null. Their titles imply
-- reporting straight to the CEO, which this workflow deliberately keeps
-- out of the loop — null correctly caps them at top-of-chain (same
-- outcome as if they were scope_level='dept'). No action needed unless
-- you want the data model made more consistent (see group C above).

-- Logistika Departamenti's three şöbə heads (Şahin Məmmədov, Abdulla
-- Allahverdiyev, Elməddin Alışov) all report to Zaur Həsənov
-- (Əməliyyatlar direktoru, dept='İdarəetmə') rather than to a dedicated
-- "Logistika Departamenti" dept-level head — there isn't one in the data.
-- All three agree with each other, which is a strong signal this is
-- intentional (an Operations Director overseeing Logistics directly), not
-- a data-entry mistake. Flagged only because it's a cross-department
-- reporting link, not because anything looks broken.
