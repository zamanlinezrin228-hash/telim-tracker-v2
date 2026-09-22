import { useState } from 'react';
import {
  Compass, Lightbulb, Send, UserCheck, Folder, Search, GitBranch, ListPlus, ClipboardList,
  UserSquare2, ArrowRight, ArrowDown, ChevronDown, CheckCircle2, RotateCcw, XCircle, HelpCircle,
} from 'lucide-react';
import { ReqStatusBadge, TrainingStatusBadge } from './Badges';

const ROLE_TABS = [
  { key: 'employee', label: 'Əməkdaş' },
  { key: 'sube', label: 'Şöbə Rəhbəri' },
  { key: 'dept', label: 'Departament Rəhbəri' },
  { key: 'ld', label: 'L&D / HR' },
];

const ROLE_PATHS = {
  employee: {
    steps: [
      '"Sorğu yarat" bölməsində öz adınıza bir sətir doldurub göndərirsiniz — və ya istənilən vaxt "Təlim Sorğuları" bölməsindən "Yeni Sorğu" ilə ad-hoc bir ehtiyac göndərirsiniz.',
      'Rəhbəriniz varsa → sorğunuz "Manager Baxışında" statusuna düşür (onun öz cədvəlinə "Əməkdaş təqdim edib" işarəsi ilə əlavə olunur). Rəhbəriniz yoxdursa → birbaşa L&D-yə gedir.',
      'Nəticəni "Təlim Sorğuları → Mənim Göndərdiklərim" bölməsindən izləyirsiniz.',
      '"Düzəliş tələb olunur" statusu görsəniz — "Redaktə et" düyməsi ilə qeydi oxuyub düzəldib yenidən göndərin.',
    ],
  },
  sube: {
    steps: [
      '"İllik TNA → Sorğu yarat" cədvəlində öz sətrinizi VƏ komandanızın sətirlərini eyni cədvəldə doldurub topluca göndərirsiniz.',
      'Komandanızdan kimsə özü sorğu göndərsə, onun sətri həmin cədvələ "Əməkdaş təqdim edib" işarəsi ilə düşür — Redaktə/Təsdiqlə/Rədd edə bilərsiniz, batch-ı gözləmədən.',
      '"Hamısını Göndər" edəndə: departament rəhbəriniz varsa → batch ona gedir. Zəncirin başındasınızsa → birbaşa L&D-yə gedir.',
      'Departament rəhbəri "Geri göndər" etsə, o sətir yenidən sizin cədvəlinizə "Düzəliş tələb olunur" qeydi ilə düşür — düzəldib yenidən göndərirsiniz.',
    ],
  },
  dept: {
    steps: [
      '"İllik TNA"da 4 bölmə görürsünüz: Sorğu yarat (öz sorğunuz üçün), Statuslar, Departament üzrə baxış, Qərarlar tarixçəsi.',
      '"Departament üzrə baxış"da şöbə rəhbərlərinizin göndərdiyi bütün batch-lar — YALNIZ öz departamentiniz — göndərən şöbə rəhbərinə görə qruplaşdırılmış görünür.',
      'Hər sətri Redaktə edə, Təsdiqləyə (L&D-yə göndərilir), Geri göndərə (şöbə rəhbərinə "Düzəliş tələb olunur" ilə qayıdır) və ya Rədd edə bilərsiniz.',
      '"Statuslar" bölməsində YALNIZ öz şöbə rəhbərlərinizin İllik TNA-nı doldurub-doldurmadığını görürsünüz — başqa departamentlər görünmür.',
    ],
  },
  ld: {
    steps: [
      '"İllik TNA"da bütün şirkətin məlumatları görünür — hər departament üzrə.',
      '"Departament üzrə baxış"da L&D-yə çatan bütün sorğuları "Analizə götür"ürsünüz, sonra Təsdiqləyir, Geri göndərir və ya Rədd edirsiniz.',
      'Təsdiqlənən sorğuları "Qərarlar tarixçəsi"ndə "Plana Əlavə Et" ilə İzləmə Cədvəlinə (illik plana) köçürürsünüz — burada vendor, büdcə, tarix kimi icra detallarını əlavə edirsiniz.',
      'İzləmə Cədvəlini idarə edir, Excel-ə ixrac edir, istənilən əməkdaş üçün IDP sənədi yaradıb PDF-ə çap edə bilərsiniz.',
    ],
  },
};

const STAGES = [
  {
    n: 1, title: 'Ehtiyacın yaranması', icon: Lightbulb, color: 'blue',
    body: 'İki giriş nöqtəsi var: illik dövr üçün "İllik TNA → Sorğu yarat" toplu cədvəli, və ya istənilən vaxt "Təlim Sorğuları → Yeni Sorğu" ilə tək bir ad-hoc ehtiyac.',
    note: 'İllik TNA yalnız L&D-nin açdığı pəncərə aktiv olanda görünür — L&D/HR və departament rəhbərləri isə pəncərədən asılı olmayaraq həmişə görür.',
  },
  {
    n: 2, title: 'Göndərmə', icon: Send, color: 'blue',
    body: 'Komandası olmayan əməkdaş öz adına bir sətir doldurur. Rəhbər (komandası olan hər kəs) öz sətri ilə YANAŞI komandasının sətirlərini eyni cədvəldə doldurub topluca göndərir.',
    statusChip: { from: 'Pending Manager Review', to: 'Pending' },
    note: 'Rəhbəriniz varsa → "Manager Baxışında" (onun cədvəlinə düşür). Rəhbəriniz yoxdursa (zəncirin başındasınızsa) → birbaşa "Gözləyir" (L&D-yə).',
  },
  {
    n: 3, title: 'Şöbə rəhbərinin baxışı', icon: UserCheck, color: 'purple',
    body: 'Komandası olmayan əməkdaşın göndərdiyi sətir, rəhbərinin öz "Sorğu yarat" cədvəlinə əlavə olunur — batch gözlənilmədən dərhal Redaktə/Təsdiqlə/Rədd edilə bilər.',
    note: 'Rəhbər öz batch-ını göndərəndə: onun da rəhbəri (departament rəhbəri) varsa → yenə "Manager Baxışında" bir pillə yuxarı, yoxdursa → "Gözləyir" (L&D-yə).',
  },
  {
    n: 4, title: 'Departament rəhbərinin baxışı', icon: Folder, color: 'purple',
    body: 'Şöbə rəhbərinin göndərdiyi bütün batch-lar, departament rəhbərinin "İllik TNA → Departament üzrə baxış" bölməsində — göndərən şöbə rəhbərinə görə qruplaşdırılmış — görünür. Öz "Sorğu yarat" cədvəlinə qarışmır.',
    statusChip: { from: 'Pending Manager Review', to: 'Pending' },
    note: 'Redaktə et / Təsdiqlə (L&D-yə göndərilir) / Geri göndər (şöbə rəhbərinə "Düzəliş tələb olunur" ilə qayıdır) / Rədd et.',
  },
  {
    n: 5, title: 'L&D analizi', icon: Search, color: 'amber',
    body: 'Bütün yollar — birbaşa göndərilən, şöbə/departament zəncirindən keçən — sonda buraya çatır. L&D sorğunu "Analizə götür", status "Baxılır (L&D)" olur.',
    statusChip: { from: 'Pending', to: 'In Review' },
  },
  {
    n: 6, title: 'Qərar', icon: GitBranch, color: 'amber',
    body: 'L&D üç yoldan birini seçir:',
    branches: [
      { label: 'Təsdiqlə', Icon: CheckCircle2, color: 'var(--green)', detail: '"Təsdiqləndi" — sorğu "Qərarlar tarixçəsi"nə düşür.' },
      { label: 'Geri göndər', Icon: RotateCcw, color: 'var(--amber)', detail: '"Düzəliş tələb olunur" — göndərənin öz cədvəlinə qeydlə qayıdır.' },
      { label: 'Rədd et', Icon: XCircle, color: 'var(--red)', detail: '"Rədd edildi" — prosesin sonu, tarixçədə qalır.' },
    ],
  },
  {
    n: 7, title: 'Plana əlavə etmə', icon: ListPlus, color: 'green',
    body: '"Təsdiqləndi" statusundakı sorğular "Qərarlar tarixçəsi"ndə "Plana Əlavə Et" düyməsi ilə İzləmə Cədvəlinə (illik plana) köçürülür — bu, ƏL İLƏ edilir, avtomatik deyil.',
    note: 'Bu addımda vendor, planlanmış büdcə, başlama/bitmə tarixi kimi icra detalları əlavə olunur.',
  },
  {
    n: 8, title: 'İcra və İzləmə', icon: ClipboardList, color: 'green',
    body: 'İzləmə Cədvəlindəki hər təlimin öz icra statusu var — sorğu statusundan tamamilə fərqli bir sistemdir:',
    trainingStatuses: ['Scheduled to Commence on Planned Date', 'In Progress', 'Postponed', 'Completed', 'Canceled'],
  },
  {
    n: 9, title: 'IDP sənədi', icon: UserSquare2, color: 'teal',
    body: 'İstənilən vaxt (L&D/HR), bir əməkdaşın bütün sorğu tarixçəsi VƏ təlim planı bir sənəddə birləşdirilib PDF kimi çap edilə bilər — səriştə uyğunluğu, səviyyələr və prioritet daxil olmaqla.',
  },
];

const COLOR_MAP = {
  blue: { bg: 'var(--blue-light)', text: 'var(--blue)', border: 'var(--blue-border)' },
  purple: { bg: 'var(--purple-light)', text: 'var(--purple)', border: 'var(--purple-light)' },
  amber: { bg: 'var(--amber-light)', text: 'var(--amber)', border: 'var(--amber-border)' },
  green: { bg: 'var(--green-light)', text: 'var(--green)', border: 'var(--green-border)' },
  teal: { bg: 'var(--blue-light)', text: 'var(--teal)', border: 'var(--blue-border)' },
};

const FAQ = [
  {
    q: 'Niyə mənim İllik TNA üçün "Sorğu yarat" yerim yoxdur?',
    a: 'İki səbəb ola bilər: (1) İllik TNA pəncərəsi hazırda bağlıdır və siz L&D/HR və ya departament rəhbəri deyilsiniz — pəncərə açılana qədər gözləməlisiniz. (2) L&D/HR və ya departament rəhbərisinizsə və heç bir birbaşa tabeliyinizdə əməkdaş yoxdursa, "Sorğu yarat" tabı sizə də görünməlidir (öz adınıza sətir doldurmaq üçün) — əgər görünmürsə, administratordan yoxlamasını xahiş edin.',
  },
  {
    q: '"Sorğu yarat" (İllik TNA) ilə "Yeni Sorğu" (ad-hoc) arasında fərq nədir?',
    a: 'İllik TNA illik planlaşdırma dövrü üçün toplu cədvəldir — bütün il üçün ehtiyacları bir dəfəyə planlaşdırırsınız. "Yeni Sorğu" isə istənilən vaxt yarana biləcək tək bir ehtiyac üçündür (planlaşdırılmamış, təxirəsalınmaz).',
  },
  {
    q: 'Komandam yoxdursa İllik TNA-nı necə göndərim?',
    a: '"Sorğu yarat" cədvəlində "Əməkdaş" sütununda "Mən" seçib öz sətrinizi doldurub göndərirsiniz — heç kimin komandasında olmağınız tələb olunmur.',
  },
  {
    q: 'Sorğum niyə hələ "Gözləyir" statusunda qalıb?',
    a: 'Zəncirdəki növbəti rəhbər (və ya L&D) hələ ona baxmayıb. Sıra ilə keçir: birbaşa rəhbər → (varsa) departament rəhbəri → L&D.',
  },
  {
    q: '"Düzəliş tələb olunur" statusu nə deməkdir?',
    a: 'Kimsə (rəhbəriniz, departament rəhbəri və ya L&D) sizin sorğunuzu geri göndərib, adətən bir qeydlə. Qeydi oxuyub, "Redaktə et" ilə düzəldib yenidən göndərməlisiniz — yenidən eyni zəncirdən keçəcək.',
  },
  {
    q: 'Rədd edilmiş sorğuma nə olur?',
    a: 'Proses bitir — sorğu "Qərarlar tarixçəsi" bölməsində "Rədd edildi" statusu ilə qalır, qərar qeydi ilə birlikdə. Yenidən göndərmək üçün yeni sorğu yaratmaq lazımdır.',
  },
  {
    q: 'Təsdiqlənmiş sorğu avtomatik olaraq illik plana düşürmü?',
    a: 'Xeyr. L&D "Qərarlar tarixçəsi"ndə "Plana Əlavə Et" düyməsini əl ilə basmalıdır — bu addımda vendor, büdcə, tarix kimi icra detalları da əlavə olunur.',
  },
  {
    q: 'İzləmə Cədvəlindəki statuslar (Planlaşdırılıb, Davam edir və s.) sorğu statusu ilə eynidirmi?',
    a: 'Xeyr, tamamilə ayrı sistemdir. Sorğu statusu (Gözləyir → Baxılır → Təsdiqləndi/Rədd edildi) təsdiq prosesini göstərir; İzləmə Cədvəlinin statusu isə artıq planlaşdırılmış təlimin İCRA mərhələsini göstərir.',
  },
  {
    q: 'IDP sənədini kim yarada bilər?',
    a: 'Yalnız L&D/HR rolundakı istifadəçilər — istənilən əməkdaş üçün, onun bütün sorğu tarixçəsi və təlim planı əsasında.',
  },
  {
    q: 'Excel-ə ixrac hardan edilir?',
    a: 'Həm İzləmə Cədvəlində, həm də İllik TNA-nın "Sorğu yarat" cədvəlində "Excel-ə ixrac et" düyməsi var — hər ikisi ekrandakı eyni rəngli sütun qruplarını və çərçivələri saxlayır.',
  },
];

function StatusArrow({ from, to }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      {from ? <ReqStatusBadge status={from} /> : <span style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>—</span>}
      <ArrowRight size={14} strokeWidth={2.2} color="var(--ink-300)" />
      {to ? <ReqStatusBadge status={to} /> : <span style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>—</span>}
    </div>
  );
}

function StageCard({ stage, isLast }) {
  const c = COLOR_MAP[stage.color];
  const Icon = stage.icon;
  return (
    <div>
      <div className="card stagger-item" style={{ '--i': stage.n, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: c.bg, color: c.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 14,
        }}>
          <Icon size={19} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: c.text, letterSpacing: 0.3 }}>ADDIM {stage.n}</span>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{stage.title}</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.55 }}>{stage.body}</div>

          {stage.statusChip && <StatusArrow from={stage.statusChip.from} to={stage.statusChip.to} />}

          {stage.branches && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
              {stage.branches.map((b) => (
                <div key={b.label} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: b.color, marginBottom: 4 }}>
                    <b.Icon size={14} strokeWidth={2.2} /> {b.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.45 }}>{b.detail}</div>
                </div>
              ))}
            </div>
          )}

          {stage.trainingStatuses && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {stage.trainingStatuses.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrainingStatusBadge status={s} />
                  {i < stage.trainingStatuses.length - 1 && <ArrowRight size={12} strokeWidth={2.2} color="var(--ink-300)" />}
                </div>
              ))}
            </div>
          )}

          {stage.note && (
            <div className="notice" style={{ marginTop: 10, fontSize: 12, background: 'var(--ink-50)', borderColor: 'var(--ink-200)', color: 'var(--ink-500)' }}>
              {stage.note}
            </div>
          )}
        </div>
      </div>
      {!isLast && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          <ArrowDown size={18} strokeWidth={2.2} color="var(--ink-300)" />
        </div>
      )}
    </div>
  );
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="card" style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-900)' }}>{item.q}</span>
        <ChevronDown size={16} strokeWidth={2.2} style={{ flexShrink: 0, color: 'var(--ink-400)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }} />
      </button>
      {open && (
        <div style={{ padding: '0 18px 16px', fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.6 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function ProcessGuideView() {
  const [role, setRole] = useState('employee');
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><Compass size={20} strokeWidth={2.2} style={{ verticalAlign: -3, marginRight: 8, color: 'var(--blue)' }} />Bələdçi — TNA Prosesi Necə İşləyir?</h1>
            <p>Ehtiyacın yaranmasından IDP sənədinə qədər bütün yol — rolunuzu seçin, öz addımlarınızı görün, aşağıda tam road map-ə baxın.</p>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="section-title" style={{ marginBottom: 10 }}>Mən kiməm?</div>
        <div className="subtab-nav" style={{ marginBottom: 14 }}>
          {ROLE_TABS.map((t) => (
            <button key={t.key} className={'subtab-pill' + (role === t.key ? ' active' : '')} onClick={() => setRole(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 32, borderLeft: '3px solid var(--blue)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: 'var(--blue)' }}>
            {ROLE_TABS.find((t) => t.key === role).label} olaraq sizin addımlarınız:
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLE_PATHS[role].steps.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.55 }}>{s}</li>
            ))}
          </ol>
        </div>

        <div className="section-title" style={{ marginBottom: 4 }}>Tam Road Map</div>
        <div className="section-sub" style={{ marginBottom: 18 }}>Bir ehtiyacın doğulmasından IDP sənədinə qədər keçdiyi bütün addımlar, hər addımda status necə dəyişdiyi ilə birlikdə.</div>
        <div style={{ maxWidth: 720, margin: '0 auto 40px' }}>
          {STAGES.map((stage, i) => (
            <StageCard key={stage.n} stage={stage} isLast={i === STAGES.length - 1} />
          ))}
        </div>

        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <HelpCircle size={17} strokeWidth={2.2} /> Tez-tez verilən suallar
        </div>
        <div className="section-sub" style={{ marginBottom: 18 }}>Ağlınıza gələ biləcək ən çox rast gəlinən suallar.</div>
        <div style={{ maxWidth: 780 }}>
          {FAQ.map((item, i) => (
            <FaqItem key={i} item={item} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </div>
  );
}
