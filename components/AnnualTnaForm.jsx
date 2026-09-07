import { useState } from 'react';
import { sb } from '../lib/supabase';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_LABELS = { Low: 'Aşağı', Medium: 'Orta', High: 'Yüksək', Critical: 'Kritik' };
const IMPORTANCE_OPTIONS = [
  '1 – Aşağı', '2 – Orta', '3 – Yüksək', '4 – Kritik', '5 – Strateji',
];
const LEVEL_OPTIONS = ['1 – Fundamental', '2 – İnkişaf edən', '3 – Yetərli', '4 – İrəli', '5 – Ekspert'];

function emptyRow() {
  return {
    employeeId: '', manualName: '', position: '', skill: '', compCat: '', vendor: '',
    manHours: '', budget: '', priority: 'Medium', importance: '', currentLevel: '', requiredLevel: '',
    start: '', end: '',
  };
}

export default function AnnualTnaForm({ profile, team, planYear, onSubmitted }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function updateRow(idx, field, value) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'employeeId' && value) {
        const m = team.find((t) => t.id === value);
        if (m) next[idx].position = m.position || '';
      }
      return next;
    });
  }

  function addRow() { setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(idx) { setRows((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSubmit() {
    setError('');
    const validRows = rows.filter((r) => (r.employeeId || r.manualName.trim()) && r.skill.trim());
    if (validRows.length === 0) {
      setError('Ən azı bir sətirdə əməkdaş adı və inkişaf istiqaməti doldurun.');
      return;
    }

    const payloads = validRows.map((r) => {
      const member = r.employeeId ? team.find((t) => t.id === r.employeeId) : null;
      return {
        requested_by: profile.id,
        employee_name: member ? (member.full_name_az || member.id) : r.manualName.trim(),
        dept: member?.dept || profile.dept || '—',
        sube: member?.sube || profile.sube || null,
        position: r.position.trim() || null,
        training_title: r.skill.trim(),
        comp_cat: r.compCat || null,
        vendor: r.vendor.trim() || null,
        man_hours: r.manHours ? Number(r.manHours) : null,
        budget: r.budget ? Number(r.budget) : null,
        priority: r.priority,
        importance_level: r.importance || null,
        current_skill_level: r.currentLevel || null,
        required_skill_level: r.requiredLevel || null,
        preferred_start: r.start || null,
        preferred_end: r.end || null,
        source: 'Manager Survey',
        status: 'Pending',
        reviewing_manager_id: null,
      };
    });

    setSubmitting(true);
    const { error: err } = await sb.from('training_requests').insert(payloads);
    setSubmitting(false);
    if (err) { setError('Xəta: ' + err.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Göndərildi</div>
          <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 20 }}>
            {planYear}-ci il üçün komandanızın təlim ehtiyacları L&D-yə göndərildi.
          </div>
          <button onClick={() => { setDone(false); setRows([emptyRow()]); onSubmitted && onSubmitted(); }} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Bağla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>İllik TNA — {planYear}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Komandanızın {planYear}-ci il üçün təlim ehtiyaclarını cədvəldə doldurun. Əməkdaşı siyahıdan seçə, ya da əl ilə yaza bilərsiniz.
      </div>

      <div className="table-wrap" style={{ marginBottom: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Əməkdaş</th><th>Vəzifə</th><th>İnkişaf istiqaməti *</th><th>Kateqoriya</th>
              <th>Vendor</th><th>Man Hours</th><th>Büdcə</th><th>Prioritet</th>
              <th>Əhəmiyyət</th><th>Cari</th><th>Tələb olunan</th><th>Başlama</th><th>Bitmə</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={{ minWidth: 160 }}>
                  <select value={r.employeeId} onChange={(e) => updateRow(idx, 'employeeId', e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
                    <option value="">— Siyahıdan seç —</option>
                    {team.map((m) => <option key={m.id} value={m.id}>{m.full_name_az}</option>)}
                  </select>
                  {!r.employeeId && (
                    <input type="text" placeholder="və ya əl ilə yaz" value={r.manualName} onChange={(e) => updateRow(idx, 'manualName', e.target.value)} style={{ width: '100%', fontSize: 12.5, marginTop: 4 }} />
                  )}
                </td>
                <td style={{ minWidth: 120 }}><input type="text" value={r.position} onChange={(e) => updateRow(idx, 'position', e.target.value)} style={{ width: '100%', fontSize: 12.5 }} /></td>
                <td style={{ minWidth: 160 }}><input type="text" value={r.skill} onChange={(e) => updateRow(idx, 'skill', e.target.value)} style={{ width: '100%', fontSize: 12.5 }} /></td>
                <td style={{ minWidth: 110 }}>
                  <select value={r.compCat} onChange={(e) => updateRow(idx, 'compCat', e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
                    <option value="">—</option><option value="Hard Skills">Hard</option><option value="Soft Skills">Soft</option>
                  </select>
                </td>
                <td style={{ minWidth: 110 }}><input type="text" value={r.vendor} onChange={(e) => updateRow(idx, 'vendor', e.target.value)} style={{ width: '100%', fontSize: 12.5 }} /></td>
                <td style={{ minWidth: 80 }}><input type="number" value={r.manHours} onChange={(e) => updateRow(idx, 'manHours', e.target.value)} style={{ width: '100%', fontSize: 12.5 }} /></td>
                <td style={{ minWidth: 90 }}><input type="number" value={r.budget} onChange={(e) => updateRow(idx, 'budget', e.target.value)} style={{ width: '100%', fontSize: 12.5 }} /></td>
                <td style={{ minWidth: 100 }}>
                  <select value={r.priority} onChange={(e) => updateRow(idx, 'priority', e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
                    {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                </td>
                <td style={{ minWidth: 110 }}>
                  <select value={r.importance} onChange={(e) => updateRow(idx, 'importance', e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
                    <option value="">—</option>{IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td style={{ minWidth: 100 }}>
                  <select value={r.currentLevel} onChange={(e) => updateRow(idx, 'currentLevel', e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
                    <option value="">—</option>{LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td style={{ minWidth: 100 }}>
                  <select value={r.requiredLevel} onChange={(e) => updateRow(idx, 'requiredLevel', e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
                    <option value="">—</option>{LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td style={{ minWidth: 130 }}><input type="date" value={r.start} onChange={(e) => updateRow(idx, 'start', e.target.value)} style={{ width: '100%', fontSize: 12.5 }} /></td>
                <td style={{ minWidth: 130 }}><input type="date" value={r.end} onChange={(e) => updateRow(idx, 'end', e.target.value)} style={{ width: '100%', fontSize: 12.5 }} /></td>
                <td>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(idx)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }} title="Sətri sil">✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
        + Sətir əlavə et
      </button>

      {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}

      <div>
        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {submitting ? 'Göndərilir...' : 'Hamısını Göndər'}
        </button>
      </div>
    </div>
  );
}
