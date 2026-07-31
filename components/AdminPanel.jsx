import { useState } from 'react';
import { sb } from '../lib/supabase';
import { statusMeta, priorityMeta } from '../lib/helpers';

const STATUS_OPTIONS = [
  'Scheduled to Commence on Planned Date', 'In Progress', 'Postponed', 'Completed', 'Canceled',
];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];
const BUDGET_STATUS_OPTIONS = ['Büdcələnmiş', 'Büdcədən kənar'];

export default function AdminPanel({ trainings, onDataChanged }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = trainings.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.employee_name || '').toLowerCase().includes(q)
      || (t.dept || '').toLowerCase().includes(q)
      || (t.skill || '').toLowerCase().includes(q);
  });

  function openEdit(row) {
    setError('');
    setEditing({ ...row });
  }

  async function saveEdit() {
    setSaving(true);
    setError('');
    const { id, ...rest } = editing;
    const { error: err } = await sb.from('trainings').update(rest).eq('id', id);
    setSaving(false);
    if (err) { setError('Xəta: ' + err.message); return; }
    setEditing(null);
    await onDataChanged();
  }

  async function confirmDelete() {
    setSaving(true);
    const { error: err } = await sb.from('trainings').delete().eq('id', deleting.id);
    setSaving(false);
    if (err) { alert('Xəta: ' + err.message); return; }
    setDeleting(null);
    await onDataChanged();
  }

  function upd(field, value) {
    setEditing((e) => ({ ...e, [field]: value }));
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Admin Panel</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>İzləmə Cədvəlindəki qeydləri redaktə et və ya sil</div>
        </div>
        <input
          type="text" placeholder="Ad, departament, təlim..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Departament</th><th>Ad Soyad</th><th>Təlim</th><th>Status</th>
              <th>Prioritet</th><th>Büdcə</th><th>Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const sm = statusMeta(t.status), pm = priorityMeta(t.priority);
              return (
                <tr key={t.id}>
                  <td>{t.dept}</td>
                  <td>{t.employee_name}</td>
                  <td>{t.skill}</td>
                  <td><span className="badge" style={{ background: sm.color }}>{sm.label}</span></td>
                  <td><span className="badge" style={{ background: pm.color }}>{pm.label}</span></td>
                  <td>{Math.round(t.budget || 0).toLocaleString('az-AZ')} ₼</td>
                  <td>
                    <button onClick={() => openEdit(t)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12.5, cursor: 'pointer', marginRight: 6 }}>Redaktə et</button>
                    <button onClick={() => setDeleting(t)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>Sil</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 520 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Qeydi Redaktə Et</div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Departament</label>
                <input type="text" value={editing.dept || ''} onChange={(e) => upd('dept', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Şöbə</label>
                <input type="text" value={editing.sube || ''} onChange={(e) => upd('sube', e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12.5, color: '#64748b' }}>Ad Soyad</label>
              <input type="text" value={editing.employee_name || ''} onChange={(e) => upd('employee_name', e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12.5, color: '#64748b' }}>Vəzifə</label>
              <input type="text" value={editing.position || ''} onChange={(e) => upd('position', e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12.5, color: '#64748b' }}>Təlim / İnkişaf istiqaməti</label>
              <input type="text" value={editing.skill || ''} onChange={(e) => upd('skill', e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Səriştə Kateqoriyası</label>
                <select value={editing.comp_cat || ''} onChange={(e) => upd('comp_cat', e.target.value)} style={{ width: '100%' }}>
                  <option value="">—</option>
                  {COMP_CAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Vendor</label>
                <input type="text" value={editing.vendor || ''} onChange={(e) => upd('vendor', e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Status</label>
                <select value={editing.status || ''} onChange={(e) => upd('status', e.target.value)} style={{ width: '100%' }}>
                  {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{statusMeta(o).label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Prioritet</label>
                <select value={editing.priority || ''} onChange={(e) => upd('priority', e.target.value)} style={{ width: '100%' }}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o} value={o}>{priorityMeta(o).label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Başlama tarixi</label>
                <input type="date" value={editing.start_date || ''} onChange={(e) => upd('start_date', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Bitmə tarixi</label>
                <input type="date" value={editing.end_date || ''} onChange={(e) => upd('end_date', e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Man Hours</label>
                <input type="number" value={editing.man_hours || 0} onChange={(e) => upd('man_hours', Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b' }}>Büdcə (₼)</label>
                <input type="number" value={editing.budget || 0} onChange={(e) => upd('budget', Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12.5, color: '#64748b' }}>Büdcə Statusu</label>
              <select value={editing.budget_status || ''} onChange={(e) => upd('budget_status', e.target.value)} style={{ width: '100%' }}>
                <option value="">—</option>
                {BUDGET_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Ləğv et</button>
              <button onClick={saveEdit} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Saxlanılır...' : 'Saxla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 380 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>Silinsin?</div>
            <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20 }}>
              <b>{deleting.employee_name}</b> — {deleting.skill} qeydi həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleting(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Ləğv et</button>
              <button onClick={confirmDelete} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Silinir...' : 'Bəli, sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
