import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { sb } from '../lib/supabase';
import { fmtMoney, statusMeta, priorityMeta } from '../lib/helpers';
import ColumnFilterHeader from './ColumnFilterHeader';
import { showToast } from '../lib/toast';

const STATUS_OPTIONS = [
  'Scheduled to Commence on Planned Date', 'In Progress', 'Postponed', 'Completed', 'Canceled',
];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];
const BUDGET_STATUS_OPTIONS = ['Büdcələnmiş', 'Büdcədən kənar'];

const FILTER_FIELDS = ['dept', 'position', 'skill', 'comp_cat', 'vendor', 'status', 'priority', 'budget_status'];
const FIELD_LABELS = {
  plan_year: 'İl', dept: 'Departament', position: 'Vəzifə', skill: 'İnkişaf istiqaməti',
  comp_cat: 'Kateqoriya', vendor: 'Vendor', status: 'Status', priority: 'Prioritet', budget_status: 'Büdcə Statusu',
};

function displayVal(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

export default function TrackingView({ trainings, profile, onDataChanged }) {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [filters, setFilters] = useState({});
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  function exportToExcel() {
    const rows = filtered.map((t) => ({
      'İl': t.plan_year, 'Departament': t.dept, 'Ad Soyad': t.employee_name, 'Vəzifə': t.position,
      'İnkişaf istiqaməti': t.skill, 'Kateqoriya': t.comp_cat, 'Vendor': t.vendor,
      'Status': statusMeta(t.status).label, 'Prioritet': priorityMeta(t.priority).label,
      'Başlama': t.start_date || t.start_raw, 'Bitmə': t.end_date || t.end_raw,
      'Man Hours': t.man_hours, 'Büdcə': t.budget, 'Büdcə Statusu': t.budget_status,
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
            <input type="text" placeholder="Ad, vəzifə, vendor axtar..." style={{ width: 260 }} value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ minWidth: 120 }}>
              <option value="all">Bütün illər</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              {filtered.length} / {trainings.length} nəticə
              {activeFilterCount > 0 && <span style={{ color: 'var(--blue)', fontWeight: 600 }}> ({activeFilterCount} sütun filtrlənib)</span>}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="btn btn-outline btn-sm">Filtrləri təmizlə</button>
            )}
            {canExport && (
              <button onClick={exportToExcel} className="btn btn-success btn-sm">Excel-ə ixrac et</button>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>İl</th>
                <ColumnFilterHeader label={FIELD_LABELS.dept} values={uniqueValsByField.dept} selected={filters.dept} onChange={(s) => setFieldFilter('dept', s)} />
                <th>Ad Soyad</th>
                <ColumnFilterHeader label={FIELD_LABELS.position} values={uniqueValsByField.position} selected={filters.position} onChange={(s) => setFieldFilter('position', s)} />
                <ColumnFilterHeader label={FIELD_LABELS.skill} values={uniqueValsByField.skill} selected={filters.skill} onChange={(s) => setFieldFilter('skill', s)} />
                <ColumnFilterHeader label={FIELD_LABELS.comp_cat} values={uniqueValsByField.comp_cat} selected={filters.comp_cat} onChange={(s) => setFieldFilter('comp_cat', s)} />
                <ColumnFilterHeader label={FIELD_LABELS.vendor} values={uniqueValsByField.vendor} selected={filters.vendor} onChange={(s) => setFieldFilter('vendor', s)} />
                <ColumnFilterHeader label={FIELD_LABELS.status} values={uniqueValsByField.status} selected={filters.status} onChange={(s) => setFieldFilter('status', s)} />
                <ColumnFilterHeader label={FIELD_LABELS.priority} values={uniqueValsByField.priority} selected={filters.priority} onChange={(s) => setFieldFilter('priority', s)} />
                <th>Başlama</th><th>Bitmə</th><th>Büdcə</th>
                <ColumnFilterHeader label={FIELD_LABELS.budget_status} values={uniqueValsByField.budget_status} selected={filters.budget_status} onChange={(s) => setFieldFilter('budget_status', s)} />
                {isAdmin && <th>Əməliyyat</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const sm = statusMeta(t.status), pm = priorityMeta(t.priority);
                return (
                  <tr key={t.id}>
                    <td>{t.plan_year || '—'}</td>
                    <td>{t.dept}</td><td>{t.employee_name}</td><td>{t.position}</td><td>{t.skill}</td>
                    <td>{t.comp_cat}</td><td>{t.vendor}</td>
                    <td><span className="badge" style={{ background: sm.color }}>{sm.label}</span></td>
                    <td><span className="badge" style={{ background: pm.color }}>{pm.label}</span></td>
                    <td>{t.start_date || t.start_raw}</td><td>{t.end_date || t.end_raw}</td>
                    <td>{fmtMoney(t.budget)}</td>
                    <td>{t.budget_status ? <span className="badge" style={{ background: t.budget_status === 'Büdcələnmiş' ? 'var(--green)' : 'var(--red)' }}>{t.budget_status}</span> : '—'}</td>
                    {isAdmin && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button onClick={() => openEdit(t)} className="btn btn-accent btn-sm" style={{ marginRight: 6 }}>Redaktə</button>
                        <button onClick={() => setDeleting(t)} className="btn btn-danger btn-sm">Sil</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
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
                  {saving ? 'Saxlanılır...' : 'Saxla'}
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
                  {saving ? 'Silinir...' : 'Bəli, sil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
