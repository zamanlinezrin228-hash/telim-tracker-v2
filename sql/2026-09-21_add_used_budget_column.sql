-- Run this manually in the Supabase SQL editor (project: Mars People
-- Development / ydsivgesyolajbaksljn). Needed for Task 5's full Tracking
-- column set.
--
-- "İstifadə olunmuş Büdcə" (actual spend) is distinct from "Planlanmış
-- Büdcə" (planned budget, the existing `budget` column) — confirmed
-- against the reference TRAINING MATRIX workbook, whose own column headers
-- list both as separate fields. Added as a new column, same shape as the
-- existing `budget` column.
--
-- Note: "Səriştə kateqoriyası (bacarıq/bilik/səriştə)" is NOT a new column
-- — the same reference workbook's own header for that exact column reads
-- "Səriştə kateqoriyası" with values 'Hard Skills'/'Soft Skills', which is
-- exactly the existing `comp_cat` column (same values, same CHECK
-- constraint already in place). Reused as-is, no migration needed for it.

alter table public.trainings
  add column used_budget numeric default 0;
