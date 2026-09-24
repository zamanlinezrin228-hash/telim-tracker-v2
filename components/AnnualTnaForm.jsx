import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import { CheckCircle2, Plus, X, Send, Lightbulb, Download, RotateCcw } from 'lucide-react';
import { sb } from '../lib/supabase';
import { needsUpwardForward } from '../lib/helpers';
import { styleGroupedTable, downloadWorkbook } from '../lib/excelExport';
import { GROUP_BG, GROUP_TEXT } from '../lib/tableGroups';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_LABELS = { Low: 'Aşağı', Medium: 'Orta', High: 'Yüksək', Critical: 'Kritik' };
const PRIORITY_COLORS = { Low: '#64748b', Medium: '#d97706', High: '#ea580c', Critical: '#dc2626' };
const IMPORTANCE_OPTIONS = [
  '1 – Aşağı', '2 – Orta', '3 – Yüksək', '4 – Kritik', '5 – Strateji',
];
const LEVEL_OPTIONS = ['1 – Fundamental', '2 – İnkişaf edən', '3 – Yetərli', '4 – İrəli', '5 – Ekspert'];
const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];
// Extracted from the reference TRAINING MATRIX workbook by frequency
// analysis (the raw data has some inconsistent number-prefixes for the
// same label — e.g. "Seminar/Workshop" turns up at 5/7/9 — so each option
// below is the most-supported numbered variant per distinct label, not a
// literal copy of every row). need_reason's 8 values had zero ambiguity —
// every number mapped to exactly one label already.
const LEARNING_METHOD_OPTIONS = [
  '1 – Təlim', '3 – İş Yerində Öyrənmə', '6 – E-learning', '8 – Qarışıq Model', '9 – Seminar/Workshop',
];
const ACTIVITY_DURATION_OPTIONS = [
  '1 – Qısa (1–3 gün)', '2 – Orta (1–4 həftə)', '3 – Uzun (1–3 ay)', '4 – İrəli (3–6 ay)', '5 – Strateji (6+ ay)',
];
const NEED_REASON_OPTIONS = [
  '1 – Yeni rol', '2 – Performans boşluğu', '3 – Yeni texnologiya', '4 – Hüquqi tələblər',
  '5 – Strateji bacarıq', '6 – Karyera/varislik', '7 – Rəy/sorğu əsasında', '8 – Layihə/dəyişiklik',
];
// The workbook's Transformation Capability Area column turned out to hold
// only 'yes'/'Yes' in practice (a flag, not a real category) — a dropdown
// fixes the casing inconsistency too.
const TRANSFORMATION_AREA_OPTIONS = ['Yes', 'No'];

// Column headers are grouped semantically so the header row reads as
// colored bands (who / need & competency / resourcing / gap analysis /
// learning-plan detail / scheduling) — makes the wide table scannable
// without having to read every label.
const HEADER_GROUPS = [
  { label: 'Əməkdaş *', group: 'identity' },
  { label: 'İnkişaf istiqaməti *', group: 'competency' },
  { label: 'Vəzifə *', group: 'identity' },
  { label: 'Ehtiyacın yaranma səbəbi *', group: 'competency' },
  { label: 'Səriştə kateqoriyası', group: 'competency' },
  { label: 'Vendor', group: 'resource' },
  { label: 'Man Hours', group: 'resource' },
  { label: 'Planlanmış Büdcə', group: 'resource' },
  { label: 'Transformation Capability Area', group: 'competency' },
  { label: 'Əhəmiyyət *', group: 'gap' },
  { label: 'Cari *', group: 'gap' },
  { label: 'Tələb olunan *', group: 'gap' },
  { label: 'Öyrənmə metodu', group: 'plan' },
  { label: 'Təlim/İnkişaf Aktivliyinin Müddəti', group: 'plan' },
  { label: 'Öyrənmə Məqsədi', group: 'plan' },
  { label: 'Prioritet', group: 'meta' },
  { label: 'Başlama', group: 'meta' },
  { label: 'Bitmə', group: 'meta' },
  { label: '', group: 'meta' },
];
const inputStyle = {
  width: '100%', fontSize: 13.5, border: '1px solid var(--ink-200)', background: 'var(--surface)',
  color: 'var(--ink-900)', padding: '7px 9px', borderRadius: 7, transition: 'border-color 0.15s, box-shadow 0.15s',
};
const miniInputStyle = { ...inputStyle, fontSize: 12.5, padding: '5px 7px' };
function focusIn(e) { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-border)'; }
function focusOut(e) { e.target.style.borderColor = 'var(--ink-200)'; e.target.style.boxShadow = 'none'; }

function emptyRow(defaultEmployeeId = '') {
  return {
    sourceRequestId: null,
    employeeId: defaultEmployeeId, manualName: '', position: '', category: '', competency: '', skill: '', needReason: '',
    priority: 'Medium', importance: '', currentLevel: '', requiredLevel: '',
    compCat: '', vendor: '', manHours: '', budget: '',
    transformationArea: '', learningMethod: '', activityDuration: '', learningGoal: '',
    start: '', end: '',
  };
}

// The competency_library rows carry real dept/position names, entered inconsistently
// (mixed Az/En, "Departamenti" vs "Department" vs bare names, occasional typos).
// normalize() handles case (Azerbaijani-aware, so İ -> i correctly) and punctuation;
// textMatch() is exact-or-substring in either direction, which is strict enough not
// to conflate unrelated positions/departments. deptMatch() additionally strips a
// handful of common noise words (departamenti/department/şöbəsi/idarəedilməsi/...)
// so e.g. "İnzibati Şöbə" (profiles) still matches "İnzibati İşlər Departamenti"
// (library) even though neither is a literal substring of the other.
function normalize(s) {
  return (s || '')
    .toLocaleLowerCase('az')
    .replace(/[().,/&\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEPT_NOISE_WORDS = ['departamenti', 'department', 'şöbəsi', 'regional', 'idarəedilməsi', 'zəncirinin', 'işlər', 'ltd', 'mmc'];
function coreDept(s) {
  let n = ' ' + normalize(s) + ' ';
  DEPT_NOISE_WORDS.forEach((w) => { n = n.split(' ' + w + ' ').join(' '); });
  return n.replace(/\s+/g, ' ').trim();
}

function textMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// A handful of departments are named in different languages between the two
// tables (e.g. profiles has "İnformasiya texnologiyaları şöbəsi", the library
// has "ERP / IT & Digital") with no shared substring at all — bridged here.
const DEPT_SYNONYM_PAIRS = [['informasiya', 'erp'], ['informasiya', 'digital'], ['texnologiya', 'erp'], ['texnologiya', 'digital']];

function deptMatch(a, b) {
  if (textMatch(a, b)) return true;
  const ca = coreDept(a), cb = coreDept(b);
  if (ca && cb && (ca === cb || ca.includes(cb) || cb.includes(ca))) return true;
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  return DEPT_SYNONYM_PAIRS.some(([x, y]) => (na.includes(x) && nb.includes(y)) || (na.includes(y) && nb.includes(x)));
}

// Shows the full breadth of the employee's department — not narrowed to
// their specific position — so managers can browse every competency
// recorded for that department, not just the ones tagged to a matching
// position string in the library.
function matchesForRow(library, dept) {
  if (!dept) return [];
  return library.filter((row) => deptMatch(row.dept, dept));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export default function AnnualTnaForm({ profile, team, planYear, onSubmitted }) {
  const hasTeam = team && team.length > 0;
  const self = { id: profile.id, full_name_az: profile.full_name_az || '', dept: profile.dept, sube: profile.sube, position: profile.position };
  const selectableEmployees = [self, ...team];

  const [rows, setRows] = useState([{ ...emptyRow(profile.id), position: profile.position || '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [library, setLibrary] = useState([]);
  const mergedPendingRef = useRef(false);

  useEffect(() => {
    sb.from('competency_library').select('dept, position, category, competency, sub_competency, criticality, required_level').then(({ data }) => {
      setLibrary(data || []);
    });
  }, []);

  function mapIncomingRow(r) {
    const submitter = selectableEmployees.find((e) => e.full_name_az === r.employee_name);
    return {
      sourceRequestId: r.id,
      revisionNote: r.manager_note || r.reviewer_note || '',
      employeeId: submitter ? submitter.id : '',
      manualName: submitter ? '' : (r.employee_name || ''),
      position: r.position || '',
      category: '', competency: '',
      skill: r.training_title || '',
      needReason: r.reason || '',
      priority: r.priority || 'Medium',
      importance: r.importance_level || '',
      currentLevel: r.current_skill_level || '',
      requiredLevel: r.required_skill_level || '',
      compCat: r.comp_cat || '', vendor: r.vendor || '',
      manHours: r.man_hours != null ? String(r.man_hours) : '', budget: r.budget != null ? String(r.budget) : '',
      transformationArea: r.transformation_area || '', learningMethod: r.learning_method || '',
      activityDuration: r.activity_duration || '', learningGoal: r.learning_goal || '',
      start: r.preferred_start || '', end: r.preferred_end || '',
    };
  }

  // Rows I submitted myself that came back 'Needs Revision' merge into this
  // form as ordinary editable rows, so resubmitting is just editing + hitting
  // the normal submit button again. (Reviewing a direct report's — or a
  // reporting manager's — own incoming submission is no longer done here:
  // that's now uniformly AnnualTnaManagerReview's job for every manager
  // level, şöbə or dept, via the "Departament üzrə baxış" tab, so nothing
  // is reviewed twice in two different places.) Fetched once per mount,
  // since Kateqoriya/Səriştə (the two upper cascade levels) were never
  // persisted and can't be reconstructed, only the final Alt səriştə.
  useEffect(() => {
    if (mergedPendingRef.current) return;
    mergedPendingRef.current = true;

    sb.from('training_requests').select('*')
      .eq('requested_by', profile.id).eq('status', 'Needs Revision').eq('source', 'Manager Survey')
      .then(({ data }) => {
        const mapped = (data || []).map(mapIncomingRow);
        if (mapped.length) setRows((prev) => [...mapped, ...prev]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  function deptForRow(r) {
    if (r.employeeId) {
      const m = selectableEmployees.find((t) => t.id === r.employeeId);
      if (m?.dept) return m.dept;
    }
    return profile.dept;
  }

  function fieldsFor(r) {
    const member = r.employeeId ? selectableEmployees.find((t) => t.id === r.employeeId) : null;
    return {
      employee_name: member ? (member.full_name_az || member.id) : r.manualName.trim(),
      dept: member?.dept || profile.dept || '—',
      sube: member?.sube || profile.sube || null,
      position: r.position.trim() || null,
      training_title: r.skill.trim(),
      reason: r.needReason.trim(),
      priority: r.priority,
      importance_level: r.importance || null,
      current_skill_level: r.currentLevel || null,
      required_skill_level: r.requiredLevel || null,
      comp_cat: r.compCat || null,
      vendor: r.vendor.trim() || null,
      man_hours: r.manHours !== '' ? Number(r.manHours) : null,
      budget: r.budget !== '' ? Number(r.budget) : null,
      transformation_area: r.transformationArea.trim() || null,
      learning_method: r.learningMethod.trim() || null,
      activity_duration: r.activityDuration.trim() || null,
      learning_goal: r.learningGoal.trim() || null,
      preferred_start: r.start || null,
      preferred_end: r.end || null,
    };
  }

  // Mirrors RequestFormModal's exact two-rule routing: a lone self-
  // submission (no team) always needs its own manager's sign-off if one
  // exists, unless that submitter is themselves a dept-level manager (see
  // needsUpwardForward). A manager submitting a batch (for their team, or
  // themselves as part of it) IS that review step, EXCEPT when the manager
  // is şöbə-level with their own manager — their batch still has to climb
  // one more hop to the dept-level manager before reaching L&D (Employee →
  // şöbə manager → dept manager → L&D). A dept-level manager is ALWAYS the
  // top of that chain and goes straight to 'Pending', regardless of their
  // own profiles.manager_id (that's the real HR reporting line, which can
  // continue up through VPs/the CEO — never an approval gate here). Shared
  // by the full batch submit below and by the "Təsdiqlə" immediate action
  // on a single employee-submitted row (Task 2), since both forward a row
  // the same way.
  function computeForwardStatus() {
    const needsUpwardReview = hasTeam && needsUpwardForward(profile);
    return {
      status: hasTeam
        ? (needsUpwardReview ? 'Pending Manager Review' : 'Pending')
        : (needsUpwardForward(profile) ? 'Pending Manager Review' : 'Pending'),
      reviewingManagerId: hasTeam
        ? (needsUpwardReview ? profile.manager_id : null)
        : (needsUpwardForward(profile) ? profile.manager_id : null),
    };
  }

  function updateRow(idx, field, value) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'employeeId' && value) {
        const m = selectableEmployees.find((t) => t.id === value);
        if (m) next[idx].position = m.position || '';
      }
      // Changing employee/position/category resets the levels below it, since
      // the previously-picked values may no longer be valid for the new scope.
      if (field === 'employeeId' || field === 'position') {
        next[idx].category = ''; next[idx].competency = ''; next[idx].skill = '';
      }
      if (field === 'category') { next[idx].competency = ''; next[idx].skill = ''; }
      if (field === 'competency') { next[idx].skill = ''; }
      return next;
    });
  }

  function addRow() { setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(idx) { setRows((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit() {
    setError('');
    const filled = rows.filter((r) => (r.employeeId || r.manualName.trim()) && r.skill.trim());
    if (filled.length === 0) {
      setError('Ən azı bir sətirdə əməkdaş adı və inkişaf istiqaməti doldurun.');
      return;
    }
    // Every filled-in row must be complete before submission — only the
    // date fields (start/end) stay optional. Kateqoriya/Səriştə are exempt
    // for rows an employee already submitted (sourceRequestId set): that
    // data was only ever UI scaffolding to narrow down Alt səriştə and was
    // never persisted, so there's nothing to re-validate on the merged row.
    if (filled.some((r) => !r.position.trim())) {
      setError('Doldurulan hər sətirdə "Vəzifə" mütləqdir.');
      return;
    }
    if (filled.some((r) => !r.sourceRequestId && !r.category.trim())) {
      setError('Doldurulan hər sətirdə "Kateqoriya" mütləqdir.');
      return;
    }
    if (filled.some((r) => !r.sourceRequestId && !r.competency.trim())) {
      setError('Doldurulan hər sətirdə "Səriştə" mütləqdir.');
      return;
    }
    const missingReason = filled.some((r) => !r.needReason.trim());
    if (missingReason) {
      setError('Doldurulan hər sətirdə "Ehtiyacın yaranma səbəbi" mütləqdir.');
      return;
    }
    if (filled.some((r) => !r.importance)) {
      setError('Doldurulan hər sətirdə "Əhəmiyyət" mütləqdir.');
      return;
    }
    if (filled.some((r) => !r.currentLevel)) {
      setError('Doldurulan hər sətirdə "Cari" səviyyə mütləqdir.');
      return;
    }
    if (filled.some((r) => !r.requiredLevel)) {
      setError('Doldurulan hər sətirdə "Tələb olunan" səviyyə mütləqdir.');
      return;
    }

    const { status: newRowStatus, reviewingManagerId: newRowReviewingManager } = computeForwardStatus();

    const newRows = filled.filter((r) => !r.sourceRequestId);
    const mergedRows = filled.filter((r) => r.sourceRequestId);

    const insertPayloads = newRows.map((r) => ({
      ...fieldsFor(r),
      requested_by: profile.id,
      source: 'Manager Survey',
      status: newRowStatus,
      reviewing_manager_id: newRowReviewingManager,
    }));

    setSubmitting(true);
    const tasks = [];
    if (insertPayloads.length) {
      tasks.push(sb.from('training_requests').insert(insertPayloads));
    }
    // Employee-submitted rows are UPDATEd in place (never re-inserted) so
    // requested_by keeps pointing at the original submitter. Forwarding
    // follows the exact same newRowStatus/newRowReviewingManager rule as
    // this manager's own new rows above — a şöbə-level manager forwards it
    // one more hop up to their own dept-level manager rather than straight
    // to L&D, continuing the employee → şöbə manager → dept manager → L&D
    // chain; recorded the same way ad-hoc manager approvals already are
    // (manager_reviewed_by set, manager_note for any comment).
    mergedRows.forEach((r) => {
      tasks.push(
        sb.from('training_requests').update({
          ...fieldsFor(r),
          status: newRowStatus,
          reviewing_manager_id: newRowReviewingManager,
          manager_reviewed_by: profile.id,
          updated_at: new Date().toISOString(),
        }).eq('id', r.sourceRequestId)
      );
    });

    const results = await Promise.all(tasks);
    setSubmitting(false);
    const failed = results.find((res) => res.error);
    if (failed) { setError('Xəta: ' + failed.error.message); return; }
    setDone(true);
  }

  // Mirrors the on-screen table's own column order and group colors (see
  // HEADER_GROUPS/styleGroupedTable) so the downloaded file looks like the
  // same table, not a plain flat sheet.
  const EXCEL_COLUMN_GROUPS = [
    'identity', 'identity', 'competency', 'competency', 'competency', 'competency', 'competency',
    'resource', 'resource', 'resource', 'competency', 'gap', 'gap', 'gap', 'plan', 'plan', 'plan',
    'meta', 'meta', 'meta',
  ];

  async function exportToExcel() {
    const filledRows = rows.filter((r) => r.employeeId || r.manualName.trim() || r.skill.trim());
    if (filledRows.length === 0) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('İllik TNA');
    ws.columns = [
      { header: 'Əməkdaş', key: 'employee', width: 22 },
      { header: 'Vəzifə', key: 'position', width: 20 },
      { header: 'Kateqoriya', key: 'category', width: 20 },
      { header: 'Səriştə', key: 'competency', width: 24 },
      { header: 'Alt səriştə (İnkişaf istiqaməti)', key: 'skill', width: 28 },
      { header: 'Ehtiyacın yaranma səbəbi', key: 'needReason', width: 26 },
      { header: 'Səriştə kateqoriyası', key: 'compCat', width: 16 },
      { header: 'Vendor', key: 'vendor', width: 16 },
      { header: 'Man Hours', key: 'manHours', width: 12 },
      { header: 'Planlanmış Büdcə', key: 'budget', width: 16 },
      { header: 'Transformation Capability Area', key: 'transformationArea', width: 20 },
      { header: 'Əhəmiyyət', key: 'importance', width: 20 },
      { header: 'Cari', key: 'currentLevel', width: 20 },
      { header: 'Tələb olunan', key: 'requiredLevel', width: 20 },
      { header: 'Öyrənmə metodu', key: 'learningMethod', width: 18 },
      { header: 'Təlim/İnkişaf Aktivliyinin Müddəti', key: 'activityDuration', width: 22 },
      { header: 'Öyrənmə Məqsədi', key: 'learningGoal', width: 26 },
      { header: 'Prioritet', key: 'priority', width: 12 },
      { header: 'Başlama', key: 'start', width: 14 },
      { header: 'Bitmə', key: 'end', width: 14 },
    ];
    filledRows.forEach((r) => {
      const member = r.employeeId ? selectableEmployees.find((t) => t.id === r.employeeId) : null;
      ws.addRow({
        employee: member ? (member.full_name_az || member.id) : r.manualName.trim(),
        position: r.position, category: r.category, competency: r.competency, skill: r.skill,
        needReason: r.needReason, compCat: r.compCat, vendor: r.vendor,
        manHours: r.manHours !== '' ? Number(r.manHours) : null, budget: r.budget !== '' ? Number(r.budget) : null,
        transformationArea: r.transformationArea, importance: r.importance,
        currentLevel: r.currentLevel, requiredLevel: r.requiredLevel,
        learningMethod: r.learningMethod, activityDuration: r.activityDuration, learningGoal: r.learningGoal,
        priority: PRIORITY_LABELS[r.priority] || r.priority, start: r.start, end: r.end,
      });
    });
    ws.getColumn('budget').numFmt = '#,##0 "₼"';
    styleGroupedTable(ws, EXCEL_COLUMN_GROUPS);
    const tarix = new Date().toISOString().slice(0, 10);
    await downloadWorkbook(wb, `illik-tna-${planYear}-${tarix}.xlsx`);
  }

  if (done) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--green)' }}><CheckCircle2 size={38} strokeWidth={1.7} /></div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Göndərildi</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-500)', marginBottom: 20 }}>
            {planYear}-ci il üçün təlim ehtiyaclarınız L&D-yə göndərildi.
          </div>
          <button onClick={() => { setDone(false); setRows([{ ...emptyRow(profile.id), position: profile.position || '' }]); onSubmitted && onSubmitted(); }} className="btn btn-primary">
            Bağla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>İllik TNA — {planYear}</div>
        <button onClick={exportToExcel} className="btn btn-outline btn-sm">
          <Download size={13} strokeWidth={2.2} /> Excel-ə ixrac et
        </button>
      </div>
      <div className="section-sub" style={{ marginBottom: 10 }}>
        {hasTeam
          ? `${planYear}-ci il üçün öz təlim ehtiyacınızı və ya komandanızın ehtiyaclarını cədvəldə doldurun. Əməkdaşı siyahıdan seçə, ya da əl ilə yaza bilərsiniz.`
          : `${planYear}-ci il üçün öz təlim ehtiyacınızı cədvəldə doldurun.`}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12.5, color: 'var(--blue)', marginBottom: profile.role === 'ld' ? 18 : 8 }}>
        <Lightbulb size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Əməkdaş seçdikdən sonra Kateqoriya → Səriştə → Alt səriştə sahələrində onun departamentinə aid bütün səriştə
          siyahısı görünəcək (istəyə bağlı — özünüz də tamamilə fərqli bir şey yaza bilərsiniz).
        </span>
      </div>
      <div className="tna-table" style={{ border: '2px solid var(--ink-200)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-xs)', marginBottom: 16 }}>
        <style jsx>{`
          .tna-table th, .tna-table td { border-right: 1.5px solid var(--ink-200); font-size: 13px; }
          .tna-table th:last-child, .tna-table td:last-child { border-right: none; }
          .tna-table td { border-top-width: 1.5px !important; border-top-color: var(--ink-200) !important; }
        `}</style>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 2200 }}>
            <thead>
              <tr>
                <th className="sticky-col" style={{ width: 42, background: 'var(--ink-50)', borderBottom: '3px solid var(--ink-300)' }}></th>
                {HEADER_GROUPS.map((h, i) => (
                  <th key={i} style={{ background: GROUP_BG[h.group], color: GROUP_TEXT[h.group], fontSize: 11.5, borderBottom: `3px solid ${GROUP_TEXT[h.group]}` }}>
                    {h.label}
                    {h.label === 'Vendor' && profile.role !== 'ld' && (
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--red)', textTransform: 'none', letterSpacing: 0, marginTop: 3, lineHeight: 1.3 }}>
                        Bu, sadəcə tövsiyədir. Yekun vendor L&D-nin qiymətləndirməsindən sonra bildiriləcək.
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const matched = matchesForRow(library, deptForRow(r));
                const categoryOptions = uniqueSorted(matched.map((m) => m.category));
                const scopedByCategory = r.category ? matched.filter((m) => normalize(m.category) === normalize(r.category)) : matched;
                const competencyOptions = uniqueSorted(scopedByCategory.map((m) => m.competency));
                const scopedByCompetency = r.competency ? scopedByCategory.filter((m) => normalize(m.competency) === normalize(r.competency)) : scopedByCategory;
                const subOptions = uniqueSorted(scopedByCompetency.map((m) => m.sub_competency));
                const matchedSub = matched.find((m) => normalize(m.sub_competency) === normalize(r.skill) && m.sub_competency);

                return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--ink-50)' }}>
                  <td className="sticky-col" style={{ width: 42, textAlign: 'center', color: 'var(--ink-300)', fontSize: 12, fontWeight: 600, borderTop: '1px solid var(--ink-100)' }}>{idx + 1}</td>
                  <td style={{ minWidth: 170, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    {r.sourceRequestId && r.revisionNote && (
                      <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--amber)', marginBottom: 3, lineHeight: 1.35 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                          <RotateCcw size={11} strokeWidth={2.4} /> Düzəliş tələb olunur
                        </div>
                        {r.revisionNote}
                      </div>
                    )}
                    <select value={r.employeeId} onChange={(e) => updateRow(idx, 'employeeId', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">— Siyahıdan seç —</option>
                      <option value={self.id}>{self.full_name_az} (Mən)</option>
                      {team.map((m) => <option key={m.id} value={m.id}>{m.full_name_az}</option>)}
                    </select>
                    {!r.employeeId && (
                      <input type="text" placeholder="və ya əl ilə yaz" value={r.manualName} onChange={(e) => updateRow(idx, 'manualName', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={{ ...inputStyle, marginTop: 2 }} />
                    )}
                  </td>
                  <td style={{ minWidth: 230, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <input
                        type="text" value={r.category} onChange={(e) => updateRow(idx, 'category', e.target.value)}
                        onFocus={focusIn} onBlur={focusOut} style={miniInputStyle}
                        list={`cat-${idx}`} autoComplete="off" placeholder="Kateqoriya *"
                      />
                      <datalist id={`cat-${idx}`}>{categoryOptions.map((o) => <option key={o} value={o} />)}</datalist>

                      <input
                        type="text" value={r.competency} onChange={(e) => updateRow(idx, 'competency', e.target.value)}
                        onFocus={focusIn} onBlur={focusOut} style={miniInputStyle}
                        list={`comp-${idx}`} autoComplete="off" placeholder="Səriştə *"
                      />
                      <datalist id={`comp-${idx}`}>{competencyOptions.map((o) => <option key={o} value={o} />)}</datalist>

                      <input
                        type="text" value={r.skill} onChange={(e) => updateRow(idx, 'skill', e.target.value)}
                        onFocus={focusIn} onBlur={focusOut} style={miniInputStyle}
                        list={`sub-${idx}`} autoComplete="off" placeholder="Alt səriştə *"
                      />
                      <datalist id={`sub-${idx}`}>{subOptions.map((o) => <option key={o} value={o} />)}</datalist>

                      <div style={{ fontSize: 10, color: 'var(--ink-400)', lineHeight: 1.3 }}>
                        Aşağıdakı siyahıdan uyğun səriştəni seçə bilərsiniz. Əgər axtardığınız burada yoxdursa, sərbəst şəkildə özünüz yaza bilərsiniz.
                      </div>

                      {matchedSub && (matchedSub.required_level || matchedSub.criticality) && (
                        <div style={{ fontSize: 10.5, color: 'var(--ink-400)', lineHeight: 1.35 }}>
                          {matchedSub.required_level && <div>Tələb olunan səviyyə: {matchedSub.required_level}</div>}
                          {matchedSub.criticality && <div>Kritiklik: {matchedSub.criticality}</div>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ minWidth: 130, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <input type="text" value={r.position} onChange={(e) => updateRow(idx, 'position', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 220, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.needReason} onChange={(e) => updateRow(idx, 'needReason', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">— Seçin —</option>
                      {NEED_REASON_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 130, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.compCat} onChange={(e) => updateRow(idx, 'compCat', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>
                      {COMP_CAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 130, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <input type="text" value={r.vendor} onChange={(e) => updateRow(idx, 'vendor', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 100, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <input type="number" value={r.manHours} onChange={(e) => updateRow(idx, 'manHours', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 130, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <input type="number" value={r.budget} onChange={(e) => updateRow(idx, 'budget', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 160, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.transformationArea} onChange={(e) => updateRow(idx, 'transformationArea', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>
                      {TRANSFORMATION_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 120, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.importance} onChange={(e) => updateRow(idx, 'importance', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>{IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 110, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.currentLevel} onChange={(e) => updateRow(idx, 'currentLevel', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>{LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 110, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.requiredLevel} onChange={(e) => updateRow(idx, 'requiredLevel', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>{LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 190, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.learningMethod} onChange={(e) => updateRow(idx, 'learningMethod', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>
                      {LEARNING_METHOD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 180, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.activityDuration} onChange={(e) => updateRow(idx, 'activityDuration', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>
                      {ACTIVITY_DURATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 200, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <input type="text" value={r.learningGoal} onChange={(e) => updateRow(idx, 'learningGoal', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 110, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <select value={r.priority} onChange={(e) => updateRow(idx, 'priority', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={{ ...inputStyle, color: PRIORITY_COLORS[r.priority], fontWeight: 600 }}>
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 140, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <input type="date" value={r.start} onChange={(e) => updateRow(idx, 'start', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 140, borderTop: '1px solid var(--ink-100)', padding: '6px 8px' }}>
                    <input type="date" value={r.end} onChange={(e) => updateRow(idx, 'end', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ borderTop: '1px solid var(--ink-100)', textAlign: 'center' }}>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="row-remove-btn" title="Sətri sil">
                        <X size={15} strokeWidth={2.2} />
                      </button>
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        <button
          onClick={addRow}
          style={{ width: '100%', padding: '12px', border: 'none', borderTop: '1px solid var(--border)', background: 'var(--ink-50)', color: 'var(--blue)', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', paddingLeft: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} strokeWidth={2.4} /> Sətir əlavə et
        </button>
      </div>

      {error && <div className="notice notice-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div>
        <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
          <Send size={14} strokeWidth={2.2} /> {submitting ? 'Göndərilir...' : 'Hamısını Göndər'}
        </button>
      </div>

    </div>
  );
}
