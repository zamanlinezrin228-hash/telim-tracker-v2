-- Supabase → SQL Editor. Bir dəfə işə salın; təkrar işlətmək təhlükəsizdir.
--
-- PROBLEM (audit 2026-09-28): get_dashboard_trainings() SECURITY DEFINER-dir
-- və heç bir yoxlama olmadan BÜTÜN 470 təlim sətirini qaytarırdı — hər
-- daxil olmuş istifadəçiyə, adi əməkdaşa da (yoxlanılıb: işçi Amil Muradov
-- kimi çağırış 470 sətir qaytardı). Tətbiq də onu hər girişdə çağırırdı.
-- Kod tərəfi düzəldildi (yalnız L&D/HR/dashboard_full_access çağırır), bu
-- SQL isə API səviyyəsində də bağlayır: tam girişi olmayan istifadəçi yalnız
-- öz RLS əhatə dairəsindəki sətirləri alır (İzləmə Cədvəli ilə eyni qayda).

create or replace function public.get_dashboard_trainings()
returns setof public.trainings
language sql
stable
security definer
set search_path = public
as $$
  select t.* from public.trainings t
  where exists (
          select 1 from public.profiles me
          where me.id = auth.uid()
            and (me.role in ('ld', 'hr') or me.dashboard_full_access is true)
        )
     or t.employee_id in (select public.my_scope_profile_ids())
     or (t.employee_id is null and norm_txt(t.dept) in (select public.my_scope_depts()));
$$;

grant execute on function public.get_dashboard_trainings() to authenticated;
revoke execute on function public.get_dashboard_trainings() from anon;

-- Yoxlama: L&D kimi 470, adi əməkdaş kimi yalnız öz sətirləri.
