-- Pre-launch audit 2026-09-28 — rəhbər zənciri üzrə QƏRAR tələb edən məqamlar.
-- 1-ci hissə yalnız oxumadır. 2-ci hissədəki UPDATE-lər ŞƏRHDƏDİR —
-- yalnız HR ilə təsdiqlədikdən sonra lazım olanı açıb işlədin.

-- ---------------------------------------------------------------------------
-- 1. YOXLAMA (yalnız oxuma)
-- ---------------------------------------------------------------------------

-- 1a. manager_id = NULL olanlar (gözlənilən 10: Baş direktor, Araz Cəlilov,
--     Orxan Həsrətov, Tədarük departamentindən 7 nəfər). Auditdə əlavə 3 nəfər
--     tapıldı: Firudin Mustafayev, Elşən Salamov, Həmid Bağırov.
select p.full_name_az, p.role, p.scope_level, p.dept, p.position,
       (select count(*) from profiles c where c.manager_id = p.id) as reports
from profiles p where p.manager_id is null order by p.dept, p.full_name_az;

-- 1b. Təsdiq sorğuları Baş direktora (Qəhrəman Sadaylı) çatanlar: şöbə
--     səviyyəli rəhbər və ya əməkdaş olub birbaşa Baş direktora tabe olanlar.
--     Onların (və komandalarının) sorğuları L&D-dən əvvəl Baş direktorun
--     təsdiqini gözləyəcək.
select p.full_name_az, p.role, p.scope_level, p.dept, p.sube, p.position,
       (select count(*) from profiles c where c.manager_id = p.id) as reports
from profiles p
where p.manager_id = (select id from profiles where full_name_az = 'Qəhrəman Sadaylı')
  and coalesce(p.scope_level, '') <> 'dept'
order by p.full_name_az;

-- 1c. Hər kəsin təsdiq marşrutu (tətbiqdəki computeForward qaydası ilə eyni):
--     departament səviyyəli rəhbərə və ya manager_id-si olmayan birinə çatana
--     qədər manager_id zənciri ilə yuxarı, sonra L&D.
with recursive chain as (
  select p.id as submitter, p.id as cur, 0 as hop, array[p.full_name_az] as names from profiles p
  union all
  select c.submitter, m.id, c.hop + 1, c.names || m.full_name_az
  from chain c join profiles cp on cp.id = c.cur join profiles m on m.id = cp.manager_id
  where coalesce(cp.scope_level, '') <> 'dept' and c.hop < 10
)
select distinct on (submitter) array_to_string(names, ' → ') || ' → L&D' as route, hop as manager_hops
from chain order by submitter, hop desc;

-- ---------------------------------------------------------------------------
-- 2. DÜZƏLİŞLƏR (ŞƏRHDƏ — HR ilə təsdiqlədikdən sonra açın)
-- ---------------------------------------------------------------------------

-- 2a. Ruslan Qəhrəmanov (ERP şöbəsi, Maliyyə departamenti) HR faylına görə
--     Baş direktora tabedir, ona görə komandasının sorğuları
--     Ruslan → Qəhrəman Sadaylı → L&D gedir (Samir Süleymanov yox).
--     Samir üzərindən getməlidirsə:
-- update profiles set manager_id = (select id from profiles where full_name_az = 'Samir Süleymanov')
--  where full_name_az = 'Ruslan Qəhrəmanov';
--
--     Artıq yolda olan sorğu: #5 (Həmidə Əsgərova, İllik TNA) Ruslan təsdiqlədi
--     və hazırda Baş direktorda gözləyir. 2a-nı işlətsəniz, onu da Samirə
--     yönləndirin (yalnız hələ də Baş direktorda gözləyirsə dəyişir):
-- update training_requests
--    set reviewing_manager_id = (select id from profiles where full_name_az = 'Samir Süleymanov')
--  where status = 'Pending Manager Review'
--    and reviewing_manager_id = (select id from profiles where full_name_az = 'Qəhrəman Sadaylı')
--    and manager_reviewed_by = (select id from profiles where full_name_az = 'Ruslan Qəhrəmanov');

-- 2b. Tədarük departamentindən manager_id-si olmayan 7 nəfər hazırda birbaşa
--     L&D-yə gedir. Departament direktoru Yalçın Abdullayev sistemdədir —
--     onun təsdiqindən keçməlidirlərsə:
-- update profiles set manager_id = (select id from profiles where full_name_az = 'Yalçın Abdullayev')
--  where manager_id is null and dept = 'Tədarük Zəncirinin İdarəedilməsi Departamenti' and role = 'employee';

-- 2c. Həmid Bağırov (Satış, Supervayzer, 1 tabeli) — manager_id yoxdur, yəni
--     onun təsdiqindən sonra sorğu birbaşa L&D-yə gedir, satış şöbə/departament
--     rəhbəri görmür. Onun rəhbəri kimdirsə:
-- update profiles set manager_id = (select id from profiles where full_name_az = '<RƏHBƏRİN ADI>')
--  where full_name_az = 'Həmid Bağırov';

-- 2d. Firudin Mustafayev və Elşən Salamov — manager_id yoxdur (gözlənilən
--     siyahıda deyildilər). Qəsdəndirsə heç nə etməyin; deyilsə 2c kimi.

-- Qeyd: manager_id dəyişdikdən sonra role/scope_level yenidən hesablanmır —
-- yeni rəhbər əvvəl 'employee' idisə, role='manager' və scope_level-i əl ilə
-- verin. manager_id dəyişikliyi artıq yolda olan sorğuların reviewing_manager_id-sini
-- DƏYİŞMİR — dəyişiklikdən əvvəl bunu yoxlayın:
-- select id, employee_name, status, reviewing_manager_id from training_requests
--  where status = 'Pending Manager Review';
