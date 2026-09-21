import { useState, useMemo, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Search, Download, FilterX, Pencil, Trash2, Save, Columns3, Layers, ArrowUp, ArrowDown, Folder } from 'lucide-react';
import { sb } from '../lib/supabase';
import { fmtMoney, statusMeta, priorityMeta } from '../lib/helpers';
import { styleGroupedTable, downloadWorkbook } from '../lib/excelExport';
import { GROUP_BG, GROUP_TEXT } from '../lib/tableGroups';
import { TrainingStatusBadge, PriorityBadge, BudgetStatusBadge } from './Badges';
import ColumnFilterHeader from './ColumnFilterHeader';
import { showToast } from '../lib/toast';

const STATUS_OPTIONS = [
  'Scheduled to Commence on Planned Date', 'In Progress', 'Postponed', 'Completed', 'Canceled',
];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];
const BUDGET_STATUS_OPTIONS = ['Büdcələnmiş', 'Büdcədən kənar'];
// Same canonical option sets RequestFormModal.jsx already established for
// these fields (its fuller descriptive labels match the reference TNA
// workbook's own clean values exactly) — reused here rather than redefined,
// so the same "3 – Yetərli (müstəqil icra)" string is valid everywhere.
const IMPORTANCE_OPTIONS = [
  '1 – Aşağı (minimal təsir)', '2 – Orta (əsas işə təsir edir)',
  '3 – Yüksək (vacib nəticələrə təsir edir)', '4 – Kritik (ciddi risk yaradır)',
  '5 – Strateji (gələcək uğur üçün həlledici)',
];
const LEVEL_OPTIONS = [
  '1 – Fundamental (əsas biliklər)', '2 – İnkişaf etməkdə olan (məhdud tətbiq)',
  '3 – Yetərli (müstəqil icra)', '4 – İrəli səviyyə (mürəkkəb problemləri həll edir)',
  '5 – Ekspert (standart yaradır)',
];

const FILTER_FIELDS = ['dept', 'sube', 'position', 'category', 'skill', 'comp_cat', 'vendor', 'status', 'priority', 'budget_status'];
const FIELD_LABELS = {
  plan_year: 'İl', dept: 'Departament', sube: 'Filial', position: 'Vəzifə', category: 'Vəzifə Kateqoriyası',
  comp_cat: 'Səriştə kateqoriyası (bacarıq/bilik/səriştə)', learning_goal: 'Öyrənmə Məqsədi',
  skill: 'Spesifik təlim ehtiyacı', vendor: 'Vendor', man_hours: 'Müddət (Man Hours)',
  used_budget: 'İstifadə olunmuş Büdcə', budget: 'Planlanmış Büdcə', status: 'Status',
  start_date: 'Planlaşdırılan Başlama Tarixi', end_date: 'Planlaşdırılan Bitmə Tarixi',
  transformation_area: 'Transformation Capability Area', importance_level: 'Müvafiq Səriştənin Əhəmiyyətlilik dərəcəsi',
  current_skill_level: 'Mövcud Bacarıq Səviyyəsi', required_skill_level: 'Tələb Olunan Bacarıq Səviyyəsi',
  learning_method: 'Öyrənmə metodu', activity_duration: 'Təlim/İnkişaf Aktivliyinin Müddəti',
  need_reason: 'Təlim və inkişaf ehtiyacının yaranma səbəbi', weighted_gap: 'WG (Weighted Gap)',
  cgi: 'CGI (Competency Gap Index)', cgi_priority_full: 'Competency GAP Index (Priority)',
  priority: 'Prioritet', budget_status: 'Büdcə Statusu',
};

// Order matches the exact sequence requested for the Tracking table, its
// Excel export and the admin edit modal: base identity columns first, then
// the full competency/training-need field set in one consistent order
// everywhere it appears.
// group matches the same five semantic bands the İllik TNA table uses (see
// lib/tableGroups.js) so both tables — and both their Excel exports — read
// as the same color-coded column system.
const ALL_COLUMNS = [
  { key: 'plan_year', label: FIELD_LABELS.plan_year, sticky: true, group: 'identity' },
  { key: 'dept', label: FIELD_LABELS.dept, group: 'identity' },
  { key: 'sube', label: FIELD_LABELS.sube, group: 'identity' },
  { key: 'employee_name', label: 'Ad Soyad', group: 'identity' },
  { key: 'position', label: FIELD_LABELS.position, group: 'identity' },
  { key: 'category', label: FIELD_LABELS.category, group: 'competency' },
  { key: 'comp_cat', label: FIELD_LABELS.comp_cat, group: 'competency' },
  { key: 'learning_goal', label: FIELD_LABELS.learning_goal, group: 'plan' },
  { key: 'skill', label: FIELD_LABELS.skill, group: 'competency' },
  { key: 'vendor', label: FIELD_LABELS.vendor, group: 'resource' },
  { key: 'man_hours', label: FIELD_LABELS.man_hours, group: 'resource' },
  { key: 'used_budget', label: FIELD_LABELS.used_budget, group: 'resource' },
  { key: 'budget', label: FIELD_LABELS.budget, group: 'resource' },
  { key: 'status', label: FIELD_LABELS.status, group: 'meta' },
  { key: 'start_date', label: FIELD_LABELS.start_date, group: 'meta' },
  { key: 'end_date', label: FIELD_LABELS.end_date, group: 'meta' },
  { key: 'transformation_area', label: FIELD_LABELS.transformation_area, group: 'competency' },
  { key: 'importance_level', label: FIELD_LABELS.importance_level, group: 'gap' },
  { key: 'current_skill_level', label: FIELD_LABELS.current_skill_level, group: 'gap' },
  { key: 'required_skill_level', label: FIELD_LABELS.required_skill_level, group: 'gap' },
  { key: 'learning_method', label: FIELD_LABELS.learning_method, group: 'plan' },
  { key: 'activity_duration', label: FIELD_LABELS.activity_duration, group: 'plan' },
  { key: 'need_reason', label: FIELD_LABELS.need_reason, group: 'competency' },
  { key: 'weighted_gap', label: FIELD_LABELS.weighted_gap, group: 'gap' },
  { key: 'cgi', label: FIELD_LABELS.cgi, group: 'gap' },
  { key: 'cgi_priority_full', label: FIELD_LABELS.cgi_priority_full, group: 'gap' },
  { key: 'priority', label: FIELD_LABELS.priority, group: 'meta' },
  { key: 'budget_status', label: FIELD_LABELS.budget_status, group: 'resource' },
];
// The detailed competency/gap-analysis fields are exposed (filterable via
// "Sütunlar") but hidden by default so the table stays usable at a glance —
// judgment call, since showing all 28 columns simultaneously by default
// would be unreadable.
const DEFAULT_HIDDEN = new Set([
  'sube', 'category', 'learning_goal', 'used_budget', 'transformation_area',
  'importance_level', 'current_skill_level', 'required_skill_level',
  'learning_method', 'activity_duration', 'need_reason',
  'weighted_gap', 'cgi', 'cgi_priority_full',
]);

function displayVal(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

const NUMERIC_KEYS = new Set(['budget', 'used_budget', 'man_hours', 'plan_year', 'weighted_gap', 'cgi']);
function sortValue(t, key) {
  if (NUMERIC_KEYS.has(key)) return Number(t[key]) || 0;
  if (key === 'start_date' || key === 'end_date') return t[key] || '';
  return displayVal(t[key]).toLowerCase();
}

function ColumnPicker({ columns, visible, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);
  return (
    <div className="slicer" ref={ref}>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((o) => !o)}>
        <Columns3 size={13} strokeWidth={2.2} /> Sütunlar
      </button>
      {open && (
        <div className="slicer-panel" style={{ width: 220 }}>
          <div className="slicer-options">
            {columns.map((c) => (
              <label key={c.key} className="slicer-option">
                <input type="checkbox" checked={visible.has(c.key)} onChange={() => onToggle(c.key)} disabled={c.sticky} />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderCell(t, key) {
  switch (key) {
    case 'plan_year': return t.plan_year || '—';
    case 'sube': return t.sube || '—';
    case 'category': return t.category || '—';
    case 'status': return <TrainingStatusBadge status={t.status} />;
    case 'priority': return t.priority ? <PriorityBadge priority={t.priority} /> : '—';
    case 'start_date': return t.start_date || t.start_raw || '—';
    case 'end_date': return t.end_date || t.end_raw || '—';
    case 'man_hours': return t.man_hours ?? '—';
    case 'used_budget': return fmtMoney(t.used_budget);
    case 'budget': return fmtMoney(t.budget);
    case 'budget_status': return t.budget_status ? <BudgetStatusBadge status={t.budget_status} /> : '—';
    case 'weighted_gap': return t.weighted_gap ?? '—';
    case 'cgi': return t.cgi ?? '—';
    case 'learning_goal': case 'need_reason': case 'cgi_priority_full': {
      const v = t[key];
      if (!v) return '—';
      return <span title={v}>{v.length > 60 ? v.slice(0, 60) + '…' : v}</span>;
    }
    default: return displayVal(t[key]);
  }
}

function TrackingRow({ t, visibleColumns, isAdmin, onEdit, onDelete }) {
  return (
    <tr>
      {visibleColumns.map((col) => (
        <td key={col.key} className={col.sticky ? 'sticky-col' : undefined}>{renderCell(t, col.key)}</td>
      ))}
      {isAdmin && (
        <td style={{ whiteSpace: 'nowrap' }}>
          <button onClick={() => onEdit(t)} className="btn btn-accent btn-sm" style={{ marginRight: 6 }}><Pencil size={12} strokeWidth={2.2} /> Redaktə</button>
          <button onClick={() => onDelete(t)} className="btn btn-danger btn-sm"><Trash2 size={12} strokeWidth={2.2} /> Sil</button>
        </td>
      )}
    </tr>
  );
}

export default function TrackingView({ trainings, profile, onDataChanged }) {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [filters, setFilters] = useState({});
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hiddenCols, setHiddenCols] = useState(DEFAULT_HIDDEN);
  const [sortCriteria, setSortCriteria] = useState([]);
  const [groupByDept, setGroupByDept] = useState(false);

  const canExport = profile && (profile.role === 'hr' || profile.role === 'ld');
  const isAdmin = profile && profile.role === 'ld';

  const years = useMemo(() => {
    const set = new Set(trainings.map((t) => t.plan_year).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [trainings]);

  const uniqueValsByField = useMemo(() => {
    const map = {};
    FILTER_FIELDS.forEach((f) => {
      map[f] = [...new Set(trainings.map((t) => displayVal(t[f])))].sort();
    });
    return map;
  }, [trainings]);

  useEffect(() => {
    const initial = {};
    FILTER_FIELDS.forEach((f) => { initial[f] = new Set(uniqueValsByField[f]); });
    setFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainings.length]);

  function setFieldFilter(field, selectedSet) {
    setFilters((prev) => ({ ...prev, [field]: selectedSet }));
  }

  const filtered = useMemo(() => {
    return trainings.filter((t) => {
      if (selectedYear !== 'all' && t.plan_year !== Number(selectedYear)) return false;
      for (const f of FILTER_FIELDS) {
        const sel = filters[f];
        if (sel && !sel.has(displayVal(t[f]))) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!(t.employee_name || '').toLowerCase().includes(q) &&
            !(t.position || '').toLowerCase().includes(q) &&
            !(t.vendor || '').toLowerCase().includes(q) &&
            !(t.skill || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [trainings, search, filters, selectedYear]);

  const activeFilterCount = FILTER_FIELDS.filter((f) => filters[f] && filters[f].size < uniqueValsByField[f].length).length;

  function clearAllFilters() {
    const reset = {};
    FILTER_FIELDS.forEach((f) => { reset[f] = new Set(uniqueValsByField[f]); });
    setFilters(reset);
    setSearch('');
  }

  const sorted = useMemo(() => {
    if (!sortCriteria.length) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      for (const { key, dir } of sortCriteria) {
        const av = sortValue(a, key), bv = sortValue(b, key);
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return copy;
  }, [filtered, sortCriteria]);

  function toggleSort(key, shiftKey) {
    setSortCriteria((prev) => {
      const existing = prev.find((c) => c.key === key);
      const rest = prev.filter((c) => c.key !== key);
      if (!existing) return shiftKey ? [...rest, { key, dir: 'asc' }] : [{ key, dir: 'asc' }];
      if (existing.dir === 'asc') return shiftKey ? [...rest, { key, dir: 'desc' }] : [{ key, dir: 'desc' }];
      return shiftKey ? rest : [];
    });
  }

  function sortIndicator(key) {
    const c = sortCriteria.find((c) => c.key === key);
    if (!c) return null;
    return c.dir === 'asc' ? <ArrowUp size={11} strokeWidth={2.6} /> : <ArrowDown size={11} strokeWidth={2.6} />;
  }

  function toggleColumn(key) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const visibleColumns = ALL_COLUMNS.filter((c) => !hiddenCols.has(c.key));

  const groupedRows = useMemo(() => {
    if (!groupByDept) return null;
    const map = {};
    sorted.forEach((t) => { (map[t.dept || '—'] = map[t.dept || '—'] || []).push(t); });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [sorted, groupByDept]);

  async function exportToExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Təlimlər');
    ws.columns = [
      { header: 'İl', key: 'il', width: 8 },
      { header: 'Departament', key: 'dept', width: 30 },
      { header: 'Filial', key: 'sube', width: 18 },
      { header: 'Ad Soyad', key: 'name', width: 22 },
      { header: 'Vəzifə', key: 'position', width: 22 },
      { header: 'Vəzifə Kateqoriyası', key: 'category', width: 20 },
      { header: FIELD_LABELS.comp_cat, key: 'comp_cat', width: 20 },
      { header: FIELD_LABELS.learning_goal, key: 'learning_goal', width: 32 },
      { header: FIELD_LABELS.skill, key: 'skill', width: 28 },
      { header: FIELD_LABELS.vendor, key: 'vendor', width: 18 },
      { header: FIELD_LABELS.man_hours, key: 'man_hours', width: 12 },
      { header: FIELD_LABELS.used_budget, key: 'used_budget', width: 16 },
      { header: FIELD_LABELS.budget, key: 'budget', width: 16 },
      { header: FIELD_LABELS.status, key: 'status', width: 22 },
      { header: FIELD_LABELS.start_date, key: 'start_date', width: 14 },
      { header: FIELD_LABELS.end_date, key: 'end_date', width: 14 },
      { header: FIELD_LABELS.transformation_area, key: 'transformation_area', width: 24 },
      { header: FIELD_LABELS.importance_level, key: 'importance_level', width: 24 },
      { header: FIELD_LABELS.current_skill_level, key: 'current_skill_level', width: 24 },
      { header: FIELD_LABELS.required_skill_level, key: 'required_skill_level', width: 24 },
      { header: FIELD_LABELS.learning_method, key: 'learning_method', width: 20 },
      { header: FIELD_LABELS.activity_duration, key: 'activity_duration', width: 20 },
      { header: FIELD_LABELS.need_reason, key: 'need_reason', width: 28 },
      { header: FIELD_LABELS.weighted_gap, key: 'weighted_gap', width: 12 },
      { header: FIELD_LABELS.cgi, key: 'cgi', width: 12 },
      { header: FIELD_LABELS.cgi_priority_full, key: 'cgi_priority_full', width: 30 },
      { header: FIELD_LABELS.priority, key: 'priority', width: 12 },
      { header: FIELD_LABELS.budget_status, key: 'budget_status', width: 16 },
    ];
    sorted.forEach((t) => {
      ws.addRow({
        il: t.plan_year, dept: t.dept, sube: t.sube, name: t.employee_name, position: t.position,
        category: t.category, comp_cat: t.comp_cat, learning_goal: t.learning_goal, skill: t.skill,
        vendor: t.vendor, man_hours: Number(t.man_hours) || 0, used_budget: Number(t.used_budget) || 0,
        budget: Number(t.budget) || 0, status: statusMeta(t.status).label,
        start_date: t.start_date || t.start_raw, end_date: t.end_date || t.end_raw,
        transformation_area: t.transformation_area, importance_level: t.importance_level,
        current_skill_level: t.current_skill_level, required_skill_level: t.required_skill_level,
        learning_method: t.learning_method, activity_duration: t.activity_duration, need_reason: t.need_reason,
        weighted_gap: t.weighted_gap, cgi: t.cgi, cgi_priority_full: t.cgi_priority_full,
        priority: priorityMeta(t.priority).label, budget_status: t.budget_status,
      });
    });
    ws.getColumn('used_budget').numFmt = '#,##0 "₼"';
    ws.getColumn('budget').numFmt = '#,##0 "₼"';
    styleGroupedTable(ws, ALL_COLUMNS.map((c) => c.group));
    const tarix = new Date().toISOString().slice(0, 10);
    await downloadWorkbook(wb, `telim-izleme-${tarix}.xlsx`);
  }

  function openEdit(row) { setError(''); setEditing({ ...row }); }
  function upd(field, value) { setEditing((e) => ({ ...e, [field]: value })); }

  async function saveEdit() {
    setSaving(true); setError('');
    const { id, ...rest } = editing;
    const { error: err } = await sb.from('trainings').update(rest).eq('id', id);
    setSaving(false);
    if (err) { setError('Xəta: ' + err.message); return; }
    setEditing(null);
    if (onDataChanged) await onDataChanged();
  }

  async function confirmDelete() {
    setSaving(true);
    const { error: err } = await sb.from('trainings').delete().eq('id', deleting.id);
    setSaving(false);
    if (err) { showToast('Xəta: ' + err.message, 'error'); return; }
    setDeleting(null);
    if (onDataChanged) await onDataChanged();
  }

  if (!filters.dept) return null;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>İzləmə Cədvəli</h1>
            <p>Bütün təlimlərin təfərrüatlı siyahısı — filtrlə, axtar, Excel-ə ixrac et.</p>
          </div>
        </div>
      </div>

      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="input-icon-wrap">
              <Search size={15} strokeWidth={2} className="input-icon" />
              <input type="text" placeholder="Ad, vəzifə, vendor axtar..." style={{ width: 260 }} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ minWidth: 120 }}>
              <option value="all">Bütün illər</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              {sorted.length} / {trainings.length} nəticə
              {activeFilterCount > 0 && <span style={{ color: 'var(--blue)', fontWeight: 600 }}> ({activeFilterCount} sütun filtrlənib)</span>}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="btn btn-outline btn-sm"><FilterX size={13} strokeWidth={2.2} /> Filtrləri təmizlə</button>
            )}
            <button onClick={() => setGroupByDept((g) => !g)} className={'btn btn-sm ' + (groupByDept ? 'btn-accent' : 'btn-outline')}>
              <Layers size={13} strokeWidth={2.2} /> Departamentə görə qrupla
            </button>
            <ColumnPicker columns={ALL_COLUMNS} visible={new Set(ALL_COLUMNS.map((c) => c.key).filter((k) => !hiddenCols.has(k)))} onToggle={toggleColumn} />
            {canExport && (
              <button onClick={exportToExcel} className="btn btn-success btn-sm"><Download size={13} strokeWidth={2.2} /> Excel-ə ixrac et</button>
            )}
          </div>
        </div>

        <div className="table-wrap tracking-table">
          <style jsx global>{`
            .tracking-table table { font-size: 13.8px; }
            .tracking-table th { font-size: 11.5px; }
            .tracking-table th, .tracking-table td { border-right: 1.5px solid var(--ink-200); }
            .tracking-table th:last-child, .tracking-table td:last-child { border-right: none; }
            .tracking-table td { border-top-width: 1.5px; border-top-color: var(--ink-200); }
          `}</style>
          <table>
            <thead>
              <tr>
                {visibleColumns.map((col) => {
                  const headerStyle = { background: GROUP_BG[col.group], color: GROUP_TEXT[col.group], borderBottom: `3px solid ${GROUP_TEXT[col.group]}` };
                  return FILTER_FIELDS.includes(col.key) ? (
                    <ColumnFilterHeader
                      key={col.key} label={col.label} values={uniqueValsByField[col.key]} selected={filters[col.key]}
                      onChange={(s) => setFieldFilter(col.key, s)}
                      onSort={(e) => toggleSort(col.key, e.shiftKey)} sortIndicator={sortIndicator(col.key)} sticky={col.sticky}
                      headerStyle={headerStyle}
                    />
                  ) : (
                    <th key={col.key} className={col.sticky ? 'sticky-col' : undefined} onClick={(e) => toggleSort(col.key, e.shiftKey)} style={{ cursor: 'pointer', ...headerStyle }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{col.label} {sortIndicator(col.key)}</span>
                    </th>
                  );
                })}
                {isAdmin && <th>Əməliyyat</th>}
              </tr>
            </thead>
            {groupedRows ? groupedRows.map(([dept, rows]) => (
              <tbody key={dept}>
                <tr className="table-group-row">
                  <td colSpan={visibleColumns.length + (isAdmin ? 1 : 0)}>
                    <Folder size={13} strokeWidth={2} /> {dept} <span className="req-dept-count">{rows.length}</span>
                  </td>
                </tr>
                {rows.map((t) => <TrackingRow key={t.id} t={t} visibleColumns={visibleColumns} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleting} />)}
              </tbody>
            )) : (
              <tbody>
                {sorted.map((t) => <TrackingRow key={t.id} t={t} visibleColumns={visibleColumns} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleting} />)}
              </tbody>
            )}
          </table>
        </div>

        {editing && (
          <div className="modal-overlay">
            <div className="modal-card" style={{ width: 640, maxHeight: '90vh', overflow: 'auto' }}>
              <div className="modal-title">Qeydi Redaktə Et</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>İl</label>
                  <input type="number" value={editing.plan_year || ''} onChange={(e) => upd('plan_year', Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Departament</label>
                  <input type="text" value={editing.dept || ''} onChange={(e) => upd('dept', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Şöbə</label>
                  <input type="text" value={editing.sube || ''} onChange={(e) => upd('sube', e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Ad Soyad</label>
                <input type="text" value={editing.employee_name || ''} onChange={(e) => upd('employee_name', e.target.value)} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Vəzifə</label>
                <input type="text" value={editing.position || ''} onChange={(e) => upd('position', e.target.value)} />
              </div>

              <div className="filter-label" style={{ margin: '4px 0 10px' }}>Səriştə və təlim ehtiyacı</div>
              <div style={{ marginBottom: 10 }}>
                <label>{FIELD_LABELS.comp_cat}</label>
                <select value={editing.comp_cat || ''} onChange={(e) => upd('comp_cat', e.target.value)}>
                  <option value="">—</option>
                  {COMP_CAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>{FIELD_LABELS.learning_goal}</label>
                <textarea rows={2} value={editing.learning_goal || ''} onChange={(e) => upd('learning_goal', e.target.value)} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>{FIELD_LABELS.skill}</label>
                <input type="text" value={editing.skill || ''} onChange={(e) => upd('skill', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.transformation_area}</label>
                  <input type="text" value={editing.transformation_area || ''} onChange={(e) => upd('transformation_area', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.vendor}</label>
                  <input type="text" value={editing.vendor || ''} onChange={(e) => upd('vendor', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.importance_level}</label>
                  <select value={editing.importance_level || ''} onChange={(e) => upd('importance_level', e.target.value)}>
                    <option value="">—</option>
                    {IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.current_skill_level}</label>
                  <select value={editing.current_skill_level || ''} onChange={(e) => upd('current_skill_level', e.target.value)}>
                    <option value="">—</option>
                    {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.required_skill_level}</label>
                  <select value={editing.required_skill_level || ''} onChange={(e) => upd('required_skill_level', e.target.value)}>
                    <option value="">—</option>
                    {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.learning_method}</label>
                  <input type="text" value={editing.learning_method || ''} onChange={(e) => upd('learning_method', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.activity_duration}</label>
                  <input type="text" value={editing.activity_duration || ''} onChange={(e) => upd('activity_duration', e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>{FIELD_LABELS.need_reason}</label>
                <textarea rows={2} value={editing.need_reason || ''} onChange={(e) => upd('need_reason', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.weighted_gap}</label>
                  <input type="number" value={editing.weighted_gap ?? ''} onChange={(e) => upd('weighted_gap', Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.cgi}</label>
                  <input type="number" step="0.01" value={editing.cgi ?? ''} onChange={(e) => upd('cgi', Number(e.target.value))} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label>{FIELD_LABELS.cgi_priority_full}</label>
                <textarea rows={2} value={editing.cgi_priority_full || ''} onChange={(e) => upd('cgi_priority_full', e.target.value)} />
              </div>

              <div className="filter-label" style={{ margin: '4px 0 10px' }}>Status, tarixlər və büdcə</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>Status</label>
                  <select value={editing.status || ''} onChange={(e) => upd('status', e.target.value)}>
                    {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{statusMeta(o).label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Prioritet</label>
                  <select value={editing.priority || ''} onChange={(e) => upd('priority', e.target.value)}>
                    {PRIORITY_OPTIONS.map((o) => <option key={o} value={o}>{priorityMeta(o).label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.start_date}</label>
                  <input type="date" value={editing.start_date || ''} onChange={(e) => upd('start_date', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.end_date}</label>
                  <input type="date" value={editing.end_date || ''} onChange={(e) => upd('end_date', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.man_hours}</label>
                  <input type="number" value={editing.man_hours || 0} onChange={(e) => upd('man_hours', Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.used_budget} (₼)</label>
                  <input type="number" value={editing.used_budget || 0} onChange={(e) => upd('used_budget', Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>{FIELD_LABELS.budget} (₼)</label>
                  <input type="number" value={editing.budget || 0} onChange={(e) => upd('budget', Number(e.target.value))} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label>Büdcə Statusu</label>
                <select value={editing.budget_status || ''} onChange={(e) => upd('budget_status', e.target.value)}>
                  <option value="">—</option>
                  {BUDGET_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {error && <div className="notice notice-error" style={{ marginBottom: 10 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditing(null)} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
                <button onClick={saveEdit} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  <Save size={14} strokeWidth={2.2} /> {saving ? 'Saxlanılır...' : 'Saxla'}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleting && (
          <div className="modal-overlay">
            <div className="modal-card" style={{ width: 380 }}>
              <div className="modal-title">Silinsin?</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-500)', marginBottom: 20 }}>
                <b>{deleting.employee_name}</b> — {deleting.skill} qeydi həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleting(null)} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
                <button onClick={confirmDelete} disabled={saving} className="btn btn-danger" style={{ flex: 1 }}>
                  <Trash2 size={14} strokeWidth={2.2} /> {saving ? 'Silinir...' : 'Bəli, sil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
