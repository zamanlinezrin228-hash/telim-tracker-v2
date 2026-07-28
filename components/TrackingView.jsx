import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fmtMoney, statusMeta, priorityMeta } from '../lib/helpers';

export default function TrackingView({ trainings, profile }) {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompCat, setFilterCompCat] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const canExport = profile && (profile.role === 'hr' || profile.role === 'ld');

  function uniqueVals(field) {
    return [...new Set(trainings.map(t => t[field]).filter(Boolean))].sort();
  }

  const filtered = useMemo(() => {
    return trainings.filter(t => {
      if (filterDept !== 'all' && t.dept !== filterDept) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterCompCat !== 'all' && t.comp_cat !== filterCompCat) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.employee_name || '').toLowerCase().includes(q) &&
            !(t.position || '').toLowerCase().includes(q) &&
            !(t.vendor || '').toLowerCase().includes(q) &&
            !(t.skill || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [trainings, search, filterDept, filterStatus, filterCompCat, filterPriority]);

  function exportToExcel() {
    const rows = filtered.map(t => ({
      'Departament': t.dept, 'Ad Soyad': t.employee_name, 'Vəzifə': t.position,
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

  return (
    <div className="page">
      <div className="filter-panel">
        <div className="filter-grid">
          <div>
            <div className="filter-label">Axtar</div>
            <input type="text" placeholder="Ad, vəzifə, vendor..." style={{ width: '100%' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <div className="filter-label">Departament</div>
            <select style={{ width: '100%' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="all">Hamısı</option>
              {uniqueVals('dept').map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <div className="filter-label">Status</div>
            <select style={{ width: '100%' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Hamısı</option>
              {uniqueVals('status').map(s => <option key={s} value={s}>{statusMeta(s).label}</option>)}
            </select>
          </div>
          <div>
            <div className="filter-label">Səriştə Kateqoriyası</div>
            <select style={{ width: '100%' }} value={filterCompCat} onChange={e => setFilterCompCat(e.target.value)}>
              <option value="all">Hamısı</option>
              {uniqueVals('comp_cat').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div className="filter-label">Prioritet</div>
            <select style={{ width: '100%' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">Hamısı</option>
              {uniqueVals('priority').map(p => <option key={p} value={p}>{priorityMeta(p).label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>{filtered.length} / {trainings.length} nəticə</div>
          {canExport && (
            <button onClick={exportToExcel} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              Excel-ə ixrac et
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Departament</th><th>Ad Soyad</th><th>Vəzifə</th><th>İnkişaf istiqaməti</th>
              <th>Kateqoriya</th><th>Vendor</th><th>Status</th><th>Prioritet</th>
              <th>Başlama</th><th>Bitmə</th><th>Büdcə</th><th>Büdcə Statusu</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const sm = statusMeta(t.status), pm = priorityMeta(t.priority);
              return (
                <tr key={t.id}>
                  <td>{t.dept}</td><td>{t.employee_name}</td><td>{t.position}</td><td>{t.skill}</td>
                  <td>{t.comp_cat}</td><td>{t.vendor}</td>
                  <td><span className="badge" style={{ background: sm.color }}>{sm.label}</span></td>
                  <td><span className="badge" style={{ background: pm.color }}>{pm.label}</span></td>
                  <td>{t.start_date || t.start_raw}</td><td>{t.end_date || t.end_raw}</td>
                  <td>{fmtMoney(t.budget)}</td>
                  <td>{t.budget_status ? <span className="badge" style={{ background: t.budget_status === 'Büdcələnmiş' ? '#059669' : '#dc2626' }}>{t.budget_status}</span> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
