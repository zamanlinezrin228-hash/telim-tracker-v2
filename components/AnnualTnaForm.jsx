import { useState, useEffect } from 'react';
import { CheckCircle2, Plus, X, Send, Lightbulb } from 'lucide-react';
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
const miniInputStyle = { ...inputStyle, fontSize: 11.5, padding: '4px 6px' };
function focusIn(e) { e.target.style.border = '1px solid var(--blue)'; e.target.style.background = 'var(--surface)'; }
function focusOut(e) { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }

function emptyRow(defaultEmployeeId = '') {
  return {
    employeeId: defaultEmployeeId, manualName: '', position: '', category: '', competency: '', skill: '', needReason: '',
    priority: 'Medium', importance: '', currentLevel: '', requiredLevel: '',
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

  useEffect(() => {
    sb.from('competency_library').select('dept, position, category, competency, sub_competency, criticality, required_level').then(({ data }) => {
      setLibrary(data || []);
    });
  }, []);

  function deptForRow(r) {
    if (r.employeeId) {
      const m = selectableEmployees.find((t) => t.id === r.employeeId);
      if (m?.dept) return m.dept;
    }
    return profile.dept;
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
    // date fields (start/end) stay optional.
    if (filled.some((r) => !r.position.trim())) {
      setError('Doldurulan hər sətirdə "Vəzifə" mütləqdir.');
      return;
    }
    if (filled.some((r) => !r.category.trim())) {
      setError('Doldurulan hər sətirdə "Kateqoriya" mütləqdir.');
      return;
    }
    if (filled.some((r) => !r.competency.trim())) {
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

    const payloads = filled.map((r) => {
      const member = r.employeeId ? selectableEmployees.find((t) => t.id === r.employeeId) : null;
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
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>İllik TNA — {planYear}</div>
      <div className="section-sub" style={{ marginBottom: 10 }}>
        {hasTeam
          ? `${planYear}-ci il üçün öz təlim ehtiyacınızı və ya komandanızın ehtiyaclarını cədvəldə doldurun. Əməkdaşı siyahıdan seçə, ya da əl ilə yaza bilərsiniz.`
          : `${planYear}-ci il üçün öz təlim ehtiyacınızı cədvəldə doldurun.`}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12.5, color: 'var(--blue)', marginBottom: 18 }}>
        <Lightbulb size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Əməkdaş seçdikdən sonra Kateqoriya → Səriştə → Alt səriştə sahələrində onun departamentinə aid bütün səriştə
          siyahısı görünəcək (istəyə bağlı — özünüz də tamamilə fərqli bir şey yaza bilərsiniz).
        </span>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-xs)', marginBottom: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 1260 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                {['Əməkdaş *', 'Vəzifə *', 'İnkişaf istiqaməti *', 'Ehtiyacın yaranma səbəbi *', 'Prioritet', 'Əhəmiyyət *', 'Cari *', 'Tələb olunan *', 'Başlama', 'Bitmə', ''].map((h, i) => (
                  <th key={i}>{h}</th>
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
                  <td style={{ textAlign: 'center', color: 'var(--ink-300)', fontSize: 12, fontWeight: 600, borderTop: '1px solid var(--ink-100)' }}>{idx + 1}</td>
                  <td style={{ minWidth: 170, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <select value={r.employeeId} onChange={(e) => updateRow(idx, 'employeeId', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle}>
                      <option value="">— Siyahıdan seç —</option>
                      <option value={self.id}>{self.full_name_az} (Mən)</option>
                      {team.map((m) => <option key={m.id} value={m.id}>{m.full_name_az}</option>)}
                    </select>
                    {!r.employeeId && (
                      <input type="text" placeholder="və ya əl ilə yaz" value={r.manualName} onChange={(e) => updateRow(idx, 'manualName', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={{ ...inputStyle, marginTop: 2 }} />
                    )}
                  </td>
                  <td style={{ minWidth: 130, borderTop: '1px solid var(--ink-100)', padding: '4px 8px' }}>
                    <input type="text" value={r.position} onChange={(e) => updateRow(idx, 'position', e.target.value)} onFocus={focusIn} onBlur={focusOut} style={inputStyle} />
                  </td>
                  <td style={{ minWidth: 230, borderTop: '1px solid var(--ink-100)', padding: '4px 8px', background: 'rgba(37,99,235,0.03)' }}>
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
