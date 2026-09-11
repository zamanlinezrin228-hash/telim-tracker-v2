import { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Search, Download, FilterX, Pencil, Trash2, Save, Columns3, Layers, ArrowUp, ArrowDown, Folder } from 'lucide-react';
import { sb } from '../lib/supabase';
import { fmtMoney, statusMeta, priorityMeta } from '../lib/helpers';
import { TrainingStatusBadge, PriorityBadge, BudgetStatusBadge } from './Badges';
import ColumnFilterHeader from './ColumnFilterHeader';
import { showToast } from '../lib/toast';

const STATUS_OPTIONS = [
  'Scheduled to Commence on Planned Date', 'In Progress', 'Postponed', 'Completed', 'Canceled',
];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];
const BUDGET_STATUS_OPTIONS = ['Büdcələnmiş', 'Büdcədən kənar'];

const FILTER_FIELDS = ['dept', 'sube', 'position', 'category', 'skill', 'comp_cat', 'vendor', 'status', 'priority', 'budget_status'];
const FIELD_LABELS = {
  plan_year: 'İl', dept: 'Departament', sube: 'Filial', position: 'Vəzifə', category: 'Vəzifə Kateqoriyası',
  skill: 'Təlimin Adı', comp_cat: 'Təlim Kateqoriyası', vendor: 'Provayder', status: 'Status',
  priority: 'Prioritet', start_date: 'Başlama', end_date: 'Bitmə', budget: 'Büdcə', budget_status: 'Büdcə Statusu',
};

const ALL_COLUMNS = [
  { key: 'plan_year', label: FIELD_LABELS.plan_year, sticky: true },
  { key: 'dept', label: FIELD_LABELS.dept },
  { key: 'sube', label: FIELD_LABELS.sube },
  { key: 'employee_name', label: 'Ad Soyad' },
  { key: 'position', label: FIELD_LABELS.position },
  { key: 'category', label: FIELD_LABELS.category },
  { key: 'skill', label: FIELD_LABELS.skill },
  { key: 'comp_cat', label: FIELD_LABELS.comp_cat },
  { key: 'vendor', label: FIELD_LABELS.vendor },
  { key: 'status', label: FIELD_LABELS.status },
  { key: 'priority', label: FIELD_LABELS.priority },
  { key: 'start_date', label: FIELD_LABELS.start_date },
  { key: 'end_date', label: FIELD_LABELS.end_date },
  { key: 'man_hours', label: 'Saat' },
  { key: 'budget', label: FIELD_LABELS.budget },
  { key: 'budget_status', label: FIELD_LABELS.budget_status },
];
const DEFAULT_HIDDEN = new Set(['sube', 'category', 'man_hours']);

function displayVal(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

function sortValue(t, key) {
  if (key === 'budget' || key === 'man_hours' || key === 'plan_year') return Number(t[key]) || 0;
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
    case 'budget': return fmtMoney(t.budget);
    case 'budget_status': return t.budget_status ? <BudgetStatusBadge status={t.budget_status} /> : '—';
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

  function exportToExcel() {
    const rows = sorted.map((t) => ({
      'İl': t.plan_year, 'Departament': t.dept, 'Filial': t.sube, 'Ad Soyad': t.employee_name, 'Vəzifə': t.position,
      'Vəzifə Kateqoriyası': t.category, 'Təlimin Adı': t.skill, 'Kateqoriya': t.comp_cat, 'Provayder': t.vendor,
      'Status': statusMeta(t.status).label, 'Prioritet': priorityMeta(t.priority).label,
      'Başlama': t.start_date || t.start_raw, 'Bitmə': t.end_date || t.end_raw,
      'Saat': t.man_hours, 'Büdcə': t.budget, 'Büdcə Statusu': t.budget_status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Təlimlər');
    const tarix = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `telim-izleme-${tarix}.xlsx`);
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

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  FILTER_FIELDS.includes(col.key) ? (
                    <ColumnFilterHeader
                      key={col.key} label={col.label} values={uniqueValsByField[col.key]} selected={filters[col.key]}
                      onChange={(s) => setFieldFilter(col.key, s)}
                      onSort={(e) => toggleSort(col.key, e.shiftKey)} sortIndicator={sortIndicator(col.key)} sticky={col.sticky}
                    />
                  ) : (
                    <th key={col.key} className={col.sticky ? 'sticky-col' : undefined} onClick={(e) => toggleSort(col.key, e.shiftKey)} style={{ cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{col.label} {sortIndicator(col.key)}</span>
                    </th>
                  )
                ))}
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
            <div className="modal-card" style={{ width: 520 }}>
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
              <div style={{ marginBottom: 10 }}>
                <label>Təlim / İnkişaf istiqaməti</label>
                <input type="text" value={editing.skill || ''} onChange={(e) => upd('skill', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>Səriştə Kateqoriyası</label>
                  <select value={editing.comp_cat || ''} onChange={(e) => upd('comp_cat', e.target.value)}>
                    <option value="">—</option>
                    {COMP_CAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Vendor</label>
                  <input type="text" value={editing.vendor || ''} onChange={(e) => upd('vendor', e.target.value)} />
                </div>
              </div>
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
                  <label>Başlama tarixi</label>
                  <input type="date" value={editing.start_date || ''} onChange={(e) => upd('start_date', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Bitmə tarixi</label>
                  <input type="date" value={editing.end_date || ''} onChange={(e) => upd('end_date', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>Man Hours</label>
                  <input type="number" value={editing.man_hours || 0} onChange={(e) => upd('man_hours', Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Büdcə (₼)</label>
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
