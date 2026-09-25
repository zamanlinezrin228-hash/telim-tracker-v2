-- Supabase → SQL Editor-da BÜTÖV işə salın (bir dəfə). Təkrar işlətmək təhlükəsizdir.
--
-- 1) Rəhbər tabeçilik ağacı: rəhbər təkcə birbaşa tabeliyindəkiləri yox,
--    bütün zənciri görsün (şöbə rəhbərləri + onların əməkdaşları + ...).
--    Əvvəlki siyasət profiles cədvəlini rəhbərin öz RLS-i ilə oxuyurdu,
--    rəhbər isə profiles-da yalnız BİRBAŞA tabeliyindəkiləri görür — ona
--    görə departament rəhbəri İzləmə Cədvəlində yalnız birbaşa
--    tabeliyindəkilərin təlimlərini görürdü. İndi siyahı SECURITY DEFINER
--    funksiyası ilə hesablanır (RLS-dən asılı deyil).
--
-- 2) İllik TNA üçün ayrıca "görüldü" vaxtı — qırmızı bildiriş rəqəmi
--    Təlim Sorğuları və İllik TNA üçün ayrı-ayrı hesablansın.

-- ---------- 1. Rəhbərin əhatə dairəsindəki profillər ----------
create or replace function public.my_scope_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with recursive
  me as (
    select id, dept, sube, scope_level from profiles where id = auth.uid()
  ),
  tree as (
    select p.id from profiles p where p.manager_id = auth.uid()
    union
    select p.id from profiles p join tree t on p.manager_id = t.id
  )
  select auth.uid()
  union
  select id from tree
  union
  select p.id from profiles p, me
   where me.scope_level = 'dept'
     and lower(trim(p.dept)) = lower(trim(me.dept))
  union
  select p.id from profiles p, me
   where me.scope_level = 'sube'
     and lower(trim(p.dept)) = lower(trim(me.dept))
     and lower(trim(p.sube)) = lower(trim(me.sube));
$$;

grant execute on function public.my_scope_profile_ids() to authenticated;

-- Eyni siyahının adları (kiçik hərf, boşluqsuz) — təlim sətirləri
-- employee_name ilə uyğunlaşdırılır.
create or replace function public.my_scope_employee_names()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(p.full_name_az))
    from profiles p
   where p.id in (select public.my_scope_profile_ids())
     and p.full_name_az is not null;
$$;

grant execute on function public.my_scope_employee_names() to authenticated;

-- Frontend üçün (Səriştə Xəritəsi, bildirişlər): əhatə dairəsindəki profillər.
create or replace function public.get_my_scope_profiles()
returns table (
  id uuid, full_name_az text, dept text, sube text, "position" text,
  scope_level text, role text, manager_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name_az, p.dept, p.sube, p.position, p.scope_level, p.role, p.manager_id
    from profiles p
   where p.id in (select public.my_scope_profile_ids())
     and p.id <> auth.uid();
$$;

grant execute on function public.get_my_scope_profiles() to authenticated;

-- ---------- 2. İzləmə Cədvəli (trainings) — rəhbər siyasəti ----------
alter policy "Manager öz sahəsini görə bilər"
  on public.trainings
  using (
    my_role() = 'manager'
    and lower(trim(employee_name)) in (select public.my_scope_employee_names())
  );

-- ---------- 3. Sorğular (training_requests) — eyni qayda ----------
alter policy "Sahə üzrə qərarları görə bilər"
  on public.training_requests
  using (
    my_role() = 'manager'
    and lower(trim(employee_name)) in (select public.my_scope_employee_names())
  );

-- ---------- 4. İllik TNA bildirişləri üçün ayrıca "görüldü" vaxtı ----------
alter table public.profiles add column if not exists last_seen_tna_at timestamptz;

-- ---------- Yoxlama (istəyə bağlı) ----------
-- Departament rəhbəri kimi daxil olub İzləmə Cədvəlinə baxın — indi
-- bütün tabeçilik zəncirinin təlimləri görünməlidir.
