import { useState } from 'react';
import { sb } from '../lib/supabase';

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

export default function RequestFormModal({ profile, team, onClose, onSubmitted }) {
  const hasTeam = team && team.length > 0;
  const [forWhom, setForWhom] = useState('self'); // 'self' | 'team'
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [compCat, setCompCat] = useState('');
  const [importance, setImportance] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [requiredLevel, setRequiredLevel] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleMember(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    setError('');
    if (!title.trim()) { setError('Təlimin adını yazın.'); return; }
    if (forWhom === 'team' && selectedIds.length === 0) { setError('Ən azı bir komanda üzvü seçin.'); return; }

    const base = {
      training_title: title.trim(),
      reason: reason.trim(),
      priority,
      preferred_start: start || null,
      preferred_end: end || null,
      comp_cat: compCat || null,
      importance_level: importance || null,
      current_skill_level: currentLevel || null,
      required_skill_level: requiredLevel || null,
      source: 'Ad-hoc',
    };

    let payloads;
    if (forWhom === 'team') {
      const needsUpwardReview = profile.scope_level === 'sube' && !!profile.manager_id;
      payloads = selectedIds.map((id) => {
        const m = team.find((t) => t.id === id);
        return {
          ...base,
          requested_by: profile.id,
          employee_name: m.full_name_az || m.id,
          dept: m.dept || profile.dept || '—',
          sube: m.sube || profile.sube || null,
          position: m.position || null,
          status: needsUpwardReview ? 'Pending Manager Review' : 'Pending',
          reviewing_manager_id: needsUpwardReview ? profile.manager_id : null,
        };
      });
    } else {
      payloads = [{
        ...base,
        requested_by: profile.id,
        employee_name: profile.full_name_az || profile.id,
        dept: profile.dept || '—',
        sube: profile.sube || null,
        position: profile.position || null,
        status: profile.manager_id ? 'Pending Manager Review' : 'Pending',
        reviewing_manager_id: profile.manager_id || null,
      }];
    }

    setSubmitting(true);
    const { error: err } = await sb.from('training_requests').insert(payloads);
    setSubmitting(false);
    if (err) { setError('Xəta: ' + err.message); return; }
    onSubmitted();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 480, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Yeni Təlim Sorğusu</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Aşağıdakı sahələri doldurub göndərin.</div>

        {hasTeam && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Kimin üçün?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setForWhom('self')}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                  border: forWhom === 'self' ? '2px solid #0b2545' : '1px solid #e2e8f0',
                  background: forWhom === 'self' ? '#eff6ff' : '#fff',
                }}
              >
                Özüm üçün
              </button>
              <button
                onClick={() => setForWhom('team')}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                  border: forWhom === 'team' ? '2px solid #0b2545' : '1px solid #e2e8f0',
                  background: forWhom === 'team' ? '#eff6ff' : '#fff',
                }}
              >
                Komandam üçün
              </button>
            </div>

            {forWhom === 'team' && (
              <div style={{ marginTop: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, maxHeight: 180, overflow: 'auto' }}>
                {team.map((m) => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 13.5 }}>
                    <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                    <span style={{ flex: 1 }}>{m.full_name_az}</span>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{m.position || ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Təlimin adı *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} placeholder="məs. Excel Advanced Kursu" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Səbəb</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%' }} placeholder="Qısaca niyə lazımdır" />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Prioritet</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%' }}>
              <option value="Low">Aşağı</option>
              <option value="Medium">Orta</option>
              <option value="High">Yüksək</option>
              <option value="Critical">Kritik</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>İstənilən başlama</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>İstənilən bitmə</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', margin: '4px 0 10px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Ətraflı məlumat (istəyə bağlı)</div>
        {true && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Səriştə Kateqoriyası</label>
              <select value={compCat} onChange={(e) => setCompCat(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Seçilməyib —</option>
                <option value="Hard Skills">Hard Skills</option>
                <option value="Soft Skills">Soft Skills</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Əhəmiyyət dərəcəsi</label>
              <select value={importance} onChange={(e) => setImportance(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Seçilməyib —</option>
                {IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Cari səviyyə</label>
                <select value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)} style={{ width: '100%' }}>
                  <option value="">—</option>
                  {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o.split(' – ')[0]} – {o.split(' – ')[1].split(' ')[0]}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Tələb olunan səviyyə</label>
                <select value={requiredLevel} onChange={(e) => setRequiredLevel(e.target.value)} style={{ width: '100%' }}>
                  <option value="">—</option>
                  {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o.split(' – ')[0]} – {o.split(' – ')[1].split(' ')[0]}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Ləğv et</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {submitting ? 'Göndərilir...' : 'Göndər'}
          </button>
        </div>
      </div>
    </div>
  );
}
