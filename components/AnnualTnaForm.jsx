import { useState } from 'react';
import { sb } from '../lib/supabase';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_LABELS = { Low: 'Aşağı', Medium: 'Orta', High: 'Yüksək', Critical: 'Kritik' };
const PRIORITY_COLORS = { Low: '#64748b', Medium: '#d97706', High: '#ea580c', Critical: '#dc2626' };
const IMPORTANCE_OPTIONS = [
  '1 – Aşağı', '2 – Orta', '3 – Yüksək', '4 – Kritik', '5 – Strateji',
];
const LEVEL_OPTIONS = ['1 – Fundamental', '2 – İnkişaf edən', '3 – Yetərli', '4 – İrəli', '5 – Ekspert'];

const inputStyle = {
  width: '100%', fontSize: 13, border: '1px solid transparent', background: 'transparent',
  padding: '6px 8px', borderRadius: 6, transition: 'border-color 0.15s, background 0.15s',
};
function focusIn(e) { e.target.style.border = '1px solid var(--blue)'; e.target.style.background = '#fff'; }
function focusOut(e) { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }

function emptyRow() {
  return {
    employeeId: '', manualName: '', position: '', skill: '', needReason: '',
    priority: 'Medium', importance: '', currentLevel: '', requiredLevel: '',
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
    const filled = rows.filter((r) => (r.employeeId || r.manualName.trim()) && r.skill.trim());
    if (filled.length === 0) {
      setError('Ən azı bir sətirdə əməkdaş adı və inkişaf istiqaməti doldurun.');
      return;
    }
    const missingReason = filled.some((r) => !r.needReason.trim());
    if (missingReason) {
      setError('Doldurulan hər sətirdə "Ehtiyacın yaranma səbəbi" mütləqdir.');
      return;
    }

    const payloads = filled.map((r) => {
      const member = r.employeeId ? team.find((t) => t.id === r.employeeId) : null;
      return {
        requested_by: profile.id,
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
          <div style={{ fontSize: 13.5, color: 'var(--ink-500)', marginBottom: 20 }}>
            {planYear}-ci il üçün komandanızın təlim ehtiyacları L&D-yə göndərildi.
          </div>
          <button onClick={() => { setDone(false); setRows([emptyRow()]); onSubmitted && onSubmitted(); }} className="btn btn-primary">
            Bağla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>İllik TNA — {planYear}</div>
      <div className="section-sub" style={{ marginBottom: 18 }}>
        Komandanızın {planYear}-ci il üçün təlim ehtiyaclarını cədvəldə doldurun. Əməkdaşı siyahıdan seçə, ya da əl ilə yaza bilərsiniz.
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-xs)', marginBottom: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 1200 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                {['Əməkdaş', 'Vəzifə', 'İnkişaf istiqaməti *', 'Ehtiyacın yaranma səbəbi *', 'Prioritet', 'Əhəmiyyət', 'Cari', 'Tələb olunan', 'Başlama', 'Bitmə', ''].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : 'var(--ink-50)' }}>
                  <td style={{ textAlign: 'center', color: 'var(--ink-300)', fontSize: 12, fontWeight: 600, borderTop: '1px solid var(--ink-100)' }}>{idx + 1}</td>
                  <td style={{ minWidth: 170, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <select value={r.employeeId} onChange={(e) => updateRow(idx, 'employeeId', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">— Siyahıdan seç —</option>
                      {team.map((m) => <option key={m.id} value={m.id}>{m.full_name_az}</option>)}
                    </select>
                    {!r.employeeId && (
                      <input type="text" placeholder="və ya əl ilə yaz" value={r.manualName} onChange={(e) => updateRow(idx, 'manualName', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={{ ...inputStyle, marginTop: 2 }} />
                    )}
                  </td>
                  <td style={{ minWidth: 130, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <input type="text" value={r.position} onChange={(e) => updateRow(idx, 'position', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 170, borderTop: '1px solid var(--ink-100)', padding: '4px 8px', background: 'rgba(37,99,235,0.03)' }}>
                    <input type="text" value={r.skill} onChange={(e) => updateRow(idx, 'skill', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 220, borderTop: '1px solid var(--ink-100)', padding: '4px 8px', background: 'rgba(37,99,235,0.03)' }}>
                    <input type="text" value={r.needReason} onChange={(e) => updateRow(idx, 'needReason', e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder="Niyə bu təlimə ehtiyac var?" style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 110, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <select value={r.priority} onChange={(e) => updateRow(idx, 'priority', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={{ ...inputStyle, color: PRIORITY_COLORS[r.priority], fontWeight: 600 }}>
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 120, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <select value={r.importance} onChange={(e) => updateRow(idx, 'importance', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>{IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 110, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <select value={r.currentLevel} onChange={(e) => updateRow(idx, 'currentLevel', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>{LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 110, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <select value={r.requiredLevel} onChange={(e) => updateRow(idx, 'requiredLevel', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">—</option>{LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ minWidth: 140, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <input type="date" value={r.start} onChange={(e) => updateRow(idx, 'start', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 140, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <input type="date" value={r.end} onChange={(e) => updateRow(idx, 'end', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ borderTop: '1px solid var(--ink-100)', textAlign: 'center' }}>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(idx)} style={{ border: 'none', background: 'none', color: 'var(--ink-300)', cursor: 'pointer', fontSize: 16 }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--red)'} onMouseLeave={(e) => e.target.style.color = 'var(--ink-300)'} title="Sətri sil">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addRow}
          style={{ width: '100%', padding: '12px', border: 'none', borderTop: '1px solid var(--border)', background: 'var(--ink-50)', color: 'var(--blue)', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', paddingLeft: 20 }}
        >
          + Sətir əlavə et
        </button>
      </div>

      {error && <div className="notice notice-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div>
        <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
          {submitting ? 'Göndərilir...' : 'Hamısını Göndər'}
        </button>
      </div>
    </div>
  );
}
