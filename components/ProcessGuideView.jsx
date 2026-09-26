import { useState } from 'react';
import {
  Compass, Lightbulb, Send, UserCheck, Search, CheckCircle2, XCircle, RotateCcw, ListPlus,
  PlayCircle, PauseCircle, Flag, ClipboardCheck, ArrowRight, ArrowDown, ArrowLeft, RefreshCcw,
  GitBranch, Map as MapIcon, BookOpen, Users, HelpCircle, Ban, Building2,
} from 'lucide-react';
import { ReqStatusBadge, TrainingStatusBadge } from './Badges';

// ---------------------------------------------------------------------------
// Bələdçi — mətn əvəzinə qərar ağacı:
//  1) Simulyasiya: istifadəçi hər addımda "nə baş verir?" seçimini klikləyir,
//     növbəti addıma keçir, status və məsul şəxs dərhal göstərilir.
//  2) Axın xəritəsi: bütün yol bir baxışda, budaqlarla; hər qutuya klikləyəndə
//     simulyasiya həmin addımdan açılır.
//  3) Statuslar: hər status nə deməkdir, kim hərəkət edir, sonra nə ola bilər.
//  4) Rolum üzrə: əməkdaş / şöbə / departament / L&D üçün qısa addımlar.
// ---------------------------------------------------------------------------

const PHASES = [
  { key: 'need', label: 'Ehtiyac', color: 'var(--blue)' },
  { key: 'chain', label: 'Rəhbər təsdiqi', color: 'var(--purple)' },
  { key: 'ld', label: 'L&D qərarı', color: 'var(--amber)' },
  { key: 'plan', label: 'Plan və icra', color: 'var(--green)' },
];

// Qərar ağacının düyünləri
const NODES = {
  start: {
    phase: 'need', icon: Lightbulb, title: 'Təlim ehtiyacı yarandı', who: 'Əməkdaş və ya rəhbər',
    text: 'Əməkdaşın inkişafı üçün bir təlim, bacarıq və ya səriştə ehtiyacı müəyyən edildi.',
    question: 'Hazırda hansı dövrdəyik?',
    options: [
      { label: 'İllik TNA pəncərəsi açıqdır', to: 'annual' },
      { label: 'İl ortası — tək ehtiyac', to: 'adhoc' },
    ],
  },
  annual: {
    phase: 'need', icon: ListPlus, title: 'İllik TNA → Sorğu yarat', who: 'Göndərən', where: 'İllik TNA',
    text: 'Cədvəldə sətir doldurulur. Rəhbər öz sətri ilə yanaşı komandasının sətirlərini də eyni cədvəldə doldurur. Səriştə siyahıdan seçilir (əməkdaşın şöbəsinə görə avtomatik), yoxdursa özünüz yazırsınız. Vendor yalnız tövsiyədir.',
    question: '"Hamısını Göndər" basıldı — göndərənin birbaşa rəhbəri var?',
    options: [
      { label: 'Bəli, rəhbəri var', to: 'mgr' },
      { label: 'Xeyr, zəncirin başındadır', to: 'ldPending' },
    ],
  },
  adhoc: {
    phase: 'need', icon: Send, title: 'Təlim Sorğuları → Yeni Sorğu', who: 'Göndərən', where: 'Təlim Sorğuları',
    text: 'Bir ehtiyac üçün tək sorğu. Bu imkanı L&D açıb-bağlayır; illik TNA dövründə adətən bağlı olur.',
    question: 'Ad-hoc sorğular hazırda açıqdır?',
    options: [
      { label: 'Bəli, açıqdır', to: 'adhocSend' },
      { label: 'Xeyr, bağlıdır', to: 'adhocClosed' },
    ],
  },
  adhocClosed: {
    phase: 'need', icon: Ban, title: 'Sorğu qəbul olunmur', who: 'Göndərən', tone: 'end',
    text: '"Yeni Sorğu" basanda "Hazırda aktiv deyil" mesajı çıxır. Ehtiyacı İllik TNA bölməsində qeyd edin.',
    options: [{ label: 'İllik TNA-ya keç', to: 'annual' }],
  },
  adhocSend: {
    phase: 'need', icon: Send, title: 'Sorğu göndərildi', who: 'Göndərən',
    text: 'Forma doldurulur (vendor tövsiyədir) və göndərilir.',
    question: 'Göndərənin birbaşa rəhbəri var?',
    options: [
      { label: 'Bəli', to: 'mgr' },
      { label: 'Xeyr', to: 'ldPending' },
    ],
  },
  mgr: {
    phase: 'chain', icon: UserCheck, title: 'Birbaşa rəhbərin baxışı', who: 'Birbaşa rəhbər (məs. şöbə rəhbəri)',
    where: 'İllik TNA / Təlim Sorğuları', reqStatus: 'Pending Manager Review',
    text: 'Sorğu rəhbərin cədvəlinə "Əməkdaş təqdim edib" işarəsi ilə düşür. Rəhbər sətri redaktə edə bilər. Göndərən də statusu canlı izləyir.',
    question: 'Rəhbər nə qərar verir?',
    options: [
      { label: 'Təsdiqləyir', to: 'upChain', kind: 'ok' },
      { label: 'Geri göndərir', to: 'revision', kind: 'warn' },
      { label: 'Rədd edir', to: 'rejected', kind: 'bad' },
    ],
  },
  upChain: {
    phase: 'chain', icon: GitBranch, title: 'Zəncir yoxlanır', who: 'Sistem (avtomatik)', decision: true,
    text: 'Sistem təsdiq edən rəhbərin öz rəhbərinin olub-olmadığını yoxlayır. Sorğu heç bir səviyyəni keçmədən, bir-bir yuxarı qalxır.',
    question: 'Təsdiq edən rəhbərin də rəhbəri var?',
    options: [
      { label: 'Bəli — növbəti səviyyəyə', to: 'mgr2' },
      { label: 'Xeyr — L&D-yə', to: 'ldPending' },
    ],
  },
  mgr2: {
    phase: 'chain', icon: Building2, title: 'Növbəti rəhbərin baxışı', who: 'Departament rəhbəri',
    where: 'İllik TNA → Departament üzrə baxış', reqStatus: 'Pending Manager Review',
    text: 'Əvvəlki rəhbərin təsdiqi qeyd olunub. İndi departament rəhbəri baxır. Əməkdaş, şöbə rəhbəri və L&D sorğunun burada olduğunu görür.',
    question: 'Departament rəhbəri nə qərar verir?',
    options: [
      { label: 'Təsdiqləyir', to: 'upChain', kind: 'ok' },
      { label: 'Geri göndərir', to: 'revision', kind: 'warn' },
      { label: 'Rədd edir', to: 'rejected', kind: 'bad' },
    ],
  },
  revision: {
    phase: 'chain', icon: RotateCcw, title: 'Düzəliş tələb olunur', who: 'Göndərən', reqStatus: 'Needs Revision', tone: 'warn',
    text: 'Qərar verənin qeydi göndərənə görünür. Sətir "Redaktə et" ilə düzəldilib yenidən göndərilir — yeni sorğu yaratmağa ehtiyac yoxdur.',
    options: [{ label: 'Düzəldib yenidən göndər', to: 'resubmit' }],
  },
  resubmit: {
    phase: 'chain', icon: RefreshCcw, title: 'Yenidən göndərildi', who: 'Göndərən', decision: true,
    text: 'Düzəldilmiş sorğu zəncirə yenidən daxil olur.',
    question: 'Göndərənin birbaşa rəhbəri var?',
    options: [
      { label: 'Bəli', to: 'mgr' },
      { label: 'Xeyr', to: 'ldPending' },
    ],
  },
  rejected: {
    phase: 'chain', icon: XCircle, title: 'Rədd edildi', who: 'Proses bitdi', reqStatus: 'Rejected', tone: 'end',
    text: 'Kim rədd edibsə, onun adı və səbəbi göndərənə və zəncirdəki hər kəsə görünür. Bu sorğu üzrə proses bitir.',
    options: [{ label: 'Başdan başla', to: 'start' }],
  },
  ldPending: {
    phase: 'ld', icon: Send, title: 'L&D-yə çatdı', who: 'L&D (Nəzrin, Tural)', where: 'İllik TNA / Təlim Sorğuları', reqStatus: 'Pending',
    text: 'Bütün rəhbər təsdiqləri tamamlanıb. Sorğu L&D-nin siyahısında görünür.',
    options: [{ label: 'Analizə götürülür', to: 'ldReview' }],
  },
  ldReview: {
    phase: 'ld', icon: Search, title: 'L&D analiz edir', who: 'L&D', reqStatus: 'In Review',
    text: 'Vəzifə uyğunluğu, büdcə, prioritet və səriştə boşluğu (WG / CGI) qiymətləndirilir.',
    question: 'L&D nə qərar verir?',
    options: [
      { label: 'Təsdiqləyir', to: 'approved', kind: 'ok' },
      { label: 'Geri göndərir', to: 'revision', kind: 'warn' },
      { label: 'Rədd edir', to: 'rejected', kind: 'bad' },
    ],
  },
  approved: {
    phase: 'ld', icon: CheckCircle2, title: 'Təsdiqləndi', who: 'L&D', reqStatus: 'Approved', tone: 'ok',
    text: 'Sorğu təsdiqlənib. Plana yalnız L&D əlavə edə bilər — rəhbərlərdə bu düymə yoxdur.',
    options: [{ label: 'Plana Əlavə Et', to: 'planned' }],
  },
  planned: {
    phase: 'plan', icon: ListPlus, title: 'İzləmə Cədvəlinə düşdü', who: 'L&D', where: 'İzləmə Cədvəli', trStatus: 'Scheduled to Commence on Planned Date',
    text: 'Vendor, planlanmış büdcə və tarixlər əlavə olunur; sətir müvafiq ilin planına düşür. WG, CGI və prioritet avtomatik hesablanır. Okt–Yan aylarında "Büdcələnmiş", qalan aylarda "Büdcədən kənar" kimi qeyd olunur.',
    question: 'Təlim necə davam edir?',
    options: [
      { label: 'Başladı', to: 'inProgress', kind: 'ok' },
      { label: 'Təxirə salındı', to: 'postponed', kind: 'warn' },
      { label: 'Ləğv edildi', to: 'canceled', kind: 'bad' },
    ],
  },
  inProgress: {
    phase: 'plan', icon: PlayCircle, title: 'Davam edir', who: 'Əməkdaş, vendor', trStatus: 'In Progress',
    text: 'Təlim gedir.',
    options: [{ label: 'Tamamlandı', to: 'completed', kind: 'ok' }],
  },
  postponed: {
    phase: 'plan', icon: PauseCircle, title: 'Təxirə salındı', who: 'L&D', trStatus: 'Postponed', tone: 'warn',
    text: 'Tarix dəyişdirilir. Büdcə hələ planda qalır.',
    options: [
      { label: 'Yeni tarixdə başladı', to: 'inProgress', kind: 'ok' },
      { label: 'Ləğv edildi', to: 'canceled', kind: 'bad' },
    ],
  },
  canceled: {
    phase: 'plan', icon: XCircle, title: 'Ləğv edildi', who: 'Proses bitdi', trStatus: 'Canceled', tone: 'end',
    text: 'Bu təlimin büdcəsi Dashboard-da "Real Büdcə"dən çıxarılır.',
    options: [{ label: 'Başdan başla', to: 'start' }],
  },
  completed: {
    phase: 'plan', icon: Flag, title: 'Tamamlandı', who: 'L&D', trStatus: 'Completed', tone: 'ok',
    text: 'Faktiki xərc "İstifadə olunmuş büdcə" kimi qeyd olunur, planlanmışla fərqi "Qənaət" kimi hesablanır.',
    options: [{ label: 'Rəhbər qiymətləndirir', to: 'evaluation' }],
  },
  evaluation: {
    phase: 'plan', icon: ClipboardCheck, title: 'IDP qiymətləndirməsi', who: 'Birbaşa rəhbər', where: 'IDP', tone: 'end',
    text: 'Rəhbər IDP-də yenilənmiş cari səviyyəni və şərhini yazır. Tələb olunan səviyyəyə çatılıb-çatılmadığı avtomatik göstərilir. İlkin plan məlumatı dəyişmir.',
    options: [{ label: 'Başdan başla', to: 'start' }],
  },
};

const REQ_STATUSES = [
  { s: 'Pending Manager Review', mean: 'Sorğu rəhbərin (və ya növbəti rəhbərin) təsdiqini gözləyir.', who: 'Birbaşa rəhbər / departament rəhbəri', next: ['Pending Manager Review', 'Pending', 'Needs Revision', 'Rejected'] },
  { s: 'Pending', mean: 'Bütün rəhbər təsdiqləri tamamlanıb, sorğu L&D-yə çatıb.', who: 'L&D', next: ['In Review'] },
  { s: 'In Review', mean: 'L&D sorğunu analiz edir.', who: 'L&D', next: ['Approved', 'Needs Revision', 'Rejected'] },
  { s: 'Needs Revision', mean: 'Qərar verən düzəliş istəyib; qeydi göndərənə görünür.', who: 'Göndərən', next: ['Pending Manager Review', 'Pending'] },
  { s: 'Approved', mean: 'L&D təsdiqləyib; plana əlavə olunmağı gözləyir.', who: 'L&D', next: [] , nextNote: 'Plana Əlavə Et → İzləmə Cədvəli' },
  { s: 'Rejected', mean: 'Rədd edilib; səbəb və qərar verən görünür. Proses bitir.', who: '—', next: [] },
];
const TR_STATUSES = [
  { s: 'Scheduled to Commence on Planned Date', mean: 'Planda var, başlama tarixini gözləyir.', who: 'L&D', next: ['In Progress', 'Postponed', 'Canceled'] },
  { s: 'In Progress', mean: 'Təlim gedir.', who: 'Əməkdaş, vendor', next: ['Completed'] },
  { s: 'Postponed', mean: 'Tarix dəyişib; büdcə planda qalır.', who: 'L&D', next: ['In Progress', 'Canceled'] },
  { s: 'Completed', mean: 'Bitib; faktiki xərc və qənaət hesablanır, rəhbər IDP-də qiymətləndirir.', who: 'Rəhbər (qiymətləndirmə)', next: [] },
  { s: 'Canceled', mean: 'Ləğv edilib; Real Büdcədən çıxarılır.', who: '—', next: [] },
];

const ROLE_PATHS = {
  employee: { label: 'Əməkdaş', steps: [
    ['İllik TNA → Sorğu yarat', 'Öz adınıza sətir doldurub göndərin (dövr açıq deyilsə, ad-hoc imkan varsa Təlim Sorğuları).'],
    ['Rəhbərinizə gedir', 'Status "Manager Baxışında" olur; onun cədvəlində görünür.'],
    ['Canlı izləyin', 'Sorğunuzun hər mərhələsini (kimdədir, nə vaxt) status xəttində görürsünüz. Qırmızı rəqəm yenilik olduğunu göstərir.'],
    ['Düzəliş istənərsə', '"Redaktə et" ilə qeydi oxuyub düzəldin və yenidən göndərin.'],
  ] },
  sube: { label: 'Şöbə rəhbəri', steps: [
    ['Komandanızla birlikdə doldurun', 'Öz sətrinizi və komandanızın sətirlərini eyni cədvəldə doldurub topluca göndərin.'],
    ['Əməkdaş sorğuları', 'Əməkdaşın özü göndərdiyi sətirlər cədvəlinizə düşür — Redaktə / Təsdiqlə / Rədd edin.'],
    ['Yuxarı gedir', 'Təsdiqlədiyiniz sətir departament rəhbərinizə gedir (varsa), sonra L&D-yə. Hamısını izləyirsiniz.'],
    ['Şöbənizin məlumatları', 'Dashboard və Səriştə Xəritəsində yalnız öz şöbənizi görürsünüz.'],
  ] },
  dept: { label: 'Departament rəhbəri', steps: [
    ['Departament üzrə baxış', 'Şöbə rəhbərlərinizdən gələn sətirlər göndərənə görə qruplaşdırılmış görünür.'],
    ['Qərar verin', 'Redaktə edin, Təsdiqləyin (L&D-yə gedir), Geri göndərin və ya Rədd edin.'],
    ['Statuslar', 'Şöbə rəhbərlərinizdən kimin doldurub-doldurmadığını görürsünüz.'],
    ['Bütün departament', 'İzləmə Cədvəli, Dashboard və Səriştə Xəritəsində bütün tabeçilik zəncirinizi görürsünüz.'],
  ] },
  ld: { label: 'L&D (Nəzrin, Tural)', steps: [
    ['Bütün şirkət', 'Bütün sorğuları hər mərhələdə — hələ rəhbərdə olanları da — görürsünüz.'],
    ['Analiz və qərar', 'Analizə götürün, Təsdiqləyin, Geri göndərin və ya Rədd edin.'],
    ['Plana Əlavə Et', 'Təsdiqlənəni vendor, büdcə, tarixlə İzləmə Cədvəlinə köçürün (yalnız L&D).'],
    ['İdarəetmə', 'İllik TNA pəncərəsini və ad-hoc sorğuları açıb-bağlayın, IDP yaradın, Excel/PDF ixrac edin.'],
  ] },
};

function phaseOf(key) { return PHASES.find((p) => p.key === key) || PHASES[0]; }

function StatusOf({ node }) {
  if (node.reqStatus) return <ReqStatusBadge status={node.reqStatus} />;
  if (node.trStatus) return <TrainingStatusBadge status={node.trStatus} />;
  return null;
}

// ---------------------------- Simulyasiya ----------------------------------
function Simulator({ path, setPath }) {
  const current = path[path.length - 1];
  const node = NODES[current];
  const phase = phaseOf(node.phase);
  const phaseIdx = PHASES.findIndex((p) => p.key === node.phase);
  const Icon = node.icon;

  function go(to) { setPath([...path, to]); }
  function back() { if (path.length > 1) setPath(path.slice(0, -1)); }

  return (
    <div>
      <div className="guide-phases">
        {PHASES.map((p, i) => (
          <div key={p.key} className={'guide-phase' + (i < phaseIdx ? ' done' : '') + (i === phaseIdx ? ' current' : '')} style={{ '--c': p.color }}>
            <span className="guide-phase-dot">{i < phaseIdx ? <CheckCircle2 size={14} strokeWidth={2.6} /> : i + 1}</span>
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      <div className={'guide-card guide-tone-' + (node.tone || 'none')} style={{ '--c': phase.color }}>
        <div className="guide-card-head">
          <div className="guide-card-icon"><Icon size={26} strokeWidth={2} /></div>
          <div style={{ flex: 1 }}>
            <div className="guide-card-title">{node.title}</div>
            <div className="guide-chips">
              <span className="guide-chip"><Users size={12} strokeWidth={2.4} /> {node.who}</span>
              {node.where && <span className="guide-chip"><Compass size={12} strokeWidth={2.4} /> {node.where}</span>}
              <StatusOf node={node} />
            </div>
          </div>
        </div>
        <p className="guide-card-text">{node.text}</p>

        {node.question && (
          <div className="guide-question"><HelpCircle size={16} strokeWidth={2.4} /> {node.question}</div>
        )}
        <div className="guide-options">
          {node.options.map((o) => (
            <button key={o.label} className={'guide-option guide-option-' + (o.kind || 'default')} onClick={() => go(o.to)}>
              <span>{o.label}</span>
              <span className="guide-option-next">
                {NODES[o.to].title}
                <ArrowRight size={15} strokeWidth={2.4} />
              </span>
            </button>
          ))}
        </div>

        <div className="guide-nav">
          <button className="btn btn-outline btn-sm" onClick={back} disabled={path.length <= 1}>
            <ArrowLeft size={14} strokeWidth={2.2} /> Geri
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setPath(['start'])} disabled={path.length <= 1}>
            <RefreshCcw size={14} strokeWidth={2.2} /> Başdan başla
          </button>
        </div>
      </div>

      {path.length > 1 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="filter-label" style={{ marginBottom: 10 }}>Keçdiyiniz yol</div>
          <div className="guide-trail">
            {path.map((k, i) => {
              const n = NODES[k];
              return (
                <span key={i} className="guide-trail-item">
                  {i > 0 && <ArrowRight size={13} strokeWidth={2.4} className="guide-trail-arrow" />}
                  <button className={'guide-trail-chip' + (i === path.length - 1 ? ' current' : '')}
                    style={{ '--c': phaseOf(n.phase).color }} onClick={() => setPath(path.slice(0, i + 1))}>
                    {n.title}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------- Axın xəritəsi --------------------------------
function MapBox({ id, onOpen, small }) {
  const n = NODES[id];
  const Icon = n.icon;
  return (
    <button className={'map-box' + (n.decision ? ' map-decision' : '') + (small ? ' map-small' : '') + ' guide-tone-' + (n.tone || 'none')}
      style={{ '--c': phaseOf(n.phase).color }} onClick={() => onOpen(id)} title="Simulyasiyanı bu addımdan aç">
      <Icon size={16} strokeWidth={2.2} />
      <span className="map-box-title">{n.title}</span>
      <StatusOf node={n} />
    </button>
  );
}
function Down({ label }) {
  return (
    <div className="map-down">
      <ArrowDown size={16} strokeWidth={2.4} />
      {label && <span className="map-down-label">{label}</span>}
    </div>
  );
}
function Branches({ items }) {
  return (
    <div className="map-branches" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((b) => (
        <div key={b.label} className={'map-branch map-branch-' + (b.kind || 'default')}>
          <div className="map-branch-label">{b.label}</div>
          {b.children}
        </div>
      ))}
    </div>
  );
}

function FlowMap({ onOpen }) {
  const phaseHead = (key, text) => (
    <div className="map-phase-head" style={{ '--c': phaseOf(key).color }}>{text}</div>
  );
  return (
    <div className="card guide-map">
      <div className="section-sub" style={{ marginBottom: 14 }}>Hər qutuya klikləyin — simulyasiya həmin addımdan açılır.</div>

      {phaseHead('need', '1 · Ehtiyac')}
      <MapBox id="start" onOpen={onOpen} />
      <Down />
      <Branches items={[
        { label: 'İllik TNA dövrü', children: <MapBox id="annual" onOpen={onOpen} small /> },
        { label: 'İl ortası', children: <>
          <MapBox id="adhoc" onOpen={onOpen} small />
          <Down label="bağlıdırsa" />
          <MapBox id="adhocClosed" onOpen={onOpen} small />
        </> },
      ]} />
      <Down label="Göndərilir — rəhbəri var?" />
      <Branches items={[
        { label: 'Bəli', children: <>
          {phaseHead('chain', '2 · Rəhbər təsdiqi')}
          <MapBox id="mgr" onOpen={onOpen} small />
          <Down label="təsdiq" />
          <MapBox id="upChain" onOpen={onOpen} small />
          <Down label="rəhbərin də rəhbəri var" />
          <MapBox id="mgr2" onOpen={onOpen} small />
          <div className="map-loop"><RefreshCcw size={12} /> zəncirin başına qədər təkrarlanır</div>
        </> },
        { label: 'Xeyr — birbaşa L&D', kind: 'muted', children: <div className="map-skip">Rəhbər mərhələsi keçilir</div> },
      ]} />
      <Down />
      <Branches items={[
        { label: 'Geri göndər', kind: 'warn', children: <>
          <MapBox id="revision" onOpen={onOpen} small />
          <div className="map-loop"><RotateCcw size={12} /> düzəldilib yenidən göndərilir</div>
        </> },
        { label: 'Rədd et', kind: 'bad', children: <MapBox id="rejected" onOpen={onOpen} small /> },
      ]} />
      <div className="map-note">Rəhbər və ya L&D istənilən mərhələdə "Geri göndər" və ya "Rədd et" seçə bilər.</div>
      <Down label="bütün təsdiqlər tamamdır" />

      {phaseHead('ld', '3 · L&D qərarı')}
      <MapBox id="ldPending" onOpen={onOpen} />
      <Down />
      <MapBox id="ldReview" onOpen={onOpen} />
      <Down label="təsdiq" />
      <MapBox id="approved" onOpen={onOpen} />
      <Down label="Plana Əlavə Et (yalnız L&D)" />

      {phaseHead('plan', '4 · Plan və icra')}
      <MapBox id="planned" onOpen={onOpen} />
      <Down />
      <Branches items={[
        { label: 'Başladı', kind: 'ok', children: <>
          <MapBox id="inProgress" onOpen={onOpen} small />
          <Down />
          <MapBox id="completed" onOpen={onOpen} small />
          <Down />
          <MapBox id="evaluation" onOpen={onOpen} small />
        </> },
        { label: 'Təxirə salındı', kind: 'warn', children: <>
          <MapBox id="postponed" onOpen={onOpen} small />
          <div className="map-loop"><RefreshCcw size={12} /> yeni tarixdə başlaya bilər</div>
        </> },
        { label: 'Ləğv edildi', kind: 'bad', children: <MapBox id="canceled" onOpen={onOpen} small /> },
      ]} />
    </div>
  );
}

// ---------------------------- Statuslar ------------------------------------
function StatusTable({ title, rows, Badge }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>{title}</div>
      <div className="status-dict">
        {rows.map((r) => (
          <div key={r.s} className="status-dict-row">
            <div className="status-dict-badge"><Badge status={r.s} /></div>
            <div className="status-dict-mean">{r.mean}</div>
            <div className="status-dict-who"><Users size={12} strokeWidth={2.4} /> {r.who}</div>
            <div className="status-dict-next">
              {r.next.length === 0 && !r.nextNote && <span className="status-dict-end">Son mərhələ</span>}
              {r.nextNote && <span className="status-dict-end">{r.nextNote}</span>}
              {r.next.map((n) => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ArrowRight size={12} strokeWidth={2.4} color="var(--ink-400)" /><Badge status={n} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------- Rol üzrə -------------------------------------
function RoleSteps() {
  const [role, setRole] = useState('employee');
  const r = ROLE_PATHS[role];
  return (
    <div className="card">
      <div className="subtab-nav" style={{ marginBottom: 18 }}>
        {Object.entries(ROLE_PATHS).map(([k, v]) => (
          <button key={k} className={'subtab-pill' + (role === k ? ' active' : '')} onClick={() => setRole(k)}>{v.label}</button>
        ))}
      </div>
      <div className="role-steps">
        {r.steps.map(([title, text], i) => (
          <div key={title} className="role-step">
            <div className="role-step-num">{i + 1}</div>
            <div>
              <div className="role-step-title">{title}</div>
              <div className="role-step-text">{text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'sim', label: 'Addım-addım simulyasiya', Icon: GitBranch },
  { key: 'map', label: 'Tam axın xəritəsi', Icon: MapIcon },
  { key: 'status', label: 'Statuslar', Icon: BookOpen },
  { key: 'role', label: 'Rolum üzrə', Icon: Users },
];

export default function ProcessGuideView() {
  const [tab, setTab] = useState('sim');
  const [path, setPath] = useState(['start']);

  function openAt(id) {
    setPath(id === 'start' ? ['start'] : ['start', id]);
    setTab('sim');
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1><Compass size={20} strokeWidth={2.2} style={{ verticalAlign: -3, marginRight: 8, color: 'var(--blue)' }} />Bələdçi — Proses necə işləyir?</h1>
            <p>Ehtiyacın yaranmasından qiymətləndirməyə qədər — hər addımda nə baş verdiyini seçərək izləyin.</p>
          </div>
        </div>
      </div>
      <div className="page">
        <div className="subtab-nav" style={{ marginBottom: 18 }}>
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} className={'subtab-pill' + (tab === key ? ' active' : '')} onClick={() => setTab(key)}>
              <Icon size={14} strokeWidth={2.2} /> {label}
            </button>
          ))}
        </div>

        {tab === 'sim' && <Simulator path={path} setPath={setPath} />}
        {tab === 'map' && <FlowMap onOpen={openAt} />}
        {tab === 'status' && (
          <>
            <StatusTable title="Sorğu statusları (təsdiq zənciri)" rows={REQ_STATUSES} Badge={ReqStatusBadge} />
            <StatusTable title="Təlim statusları (İzləmə Cədvəli)" rows={TR_STATUSES} Badge={TrainingStatusBadge} />
          </>
        )}
        {tab === 'role' && <RoleSteps />}
      </div>
    </div>
  );
}
