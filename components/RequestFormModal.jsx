import { useState } from 'react';
import { sb } from '../lib/supabase';

const LEVEL_OPTIONS = [
  { value: '1 – Fundamental (əsas biliklər)', label: '1 – Fundamental' },
  { value: '2 – İnkişaf etməkdə olan (məhdud tətbiq)', label: '2 – İnkişaf etməkdə' },
  { value: '3 – Yetərli (müstəqil icra)', label: '3 – Yetərli' },
  { value: '4 – İrəli səviyyə (mürəkkəb problemləri həll edir)', label: '4 – İrəli səviyyə' },
  { value: '5 – Ekspert (standart yaradır)', label: '5 – Ekspert' },
];

const IMPORTANCE_OPTIONS = [
  '1 – Aşağı (minimal təsir)',
  '2 – Orta (əsas işə təsir edir)',
  '3 – Yüksək (vacib nəticələrə təsir edir)',
  '4 – Kritik (ciddi risk yaradır)',
  '5 – Strateji (gələcək uğur üçün həlledici)',
];

export default function RequestFormModal({ profile, team, onClose, onSubmitted }) {
  const hasTeam = team && team.length > 0;
  const [forTeam, setForTeam] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [compCat, setCompCat] = useState('');
  const [importance, setImportance] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [requiredLevel, setRequiredLevel] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  function toggleMember(id) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Təlimin adı vacibdir.'); return; }

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

    let payloads = [];
    if (forTeam) {
      if (selectedIds.length === 0) { setError('Ən azı bir komanda üzvü seçin.'); return; }
      const needsUpwardReview = profile.scope_level === 'sube' && !!profile.manager_id;
      payloads = selectedIds.map(id => {
        const m = team.find(t => t.id === id);
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

    const { error } = await sb.from('training_requests').insert(payloads);
    if (error) { setError('Xəta: ' + error.message); return; }
    onSubmitted();
  }

  return (
    <div className="modal-overlay">
      <div className="card modal-card">
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Yeni Təlim Sorğusu</div>

        {hasTeam && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 6 }}>Kimin üçün?</label>
              <label style={{ fontSize: 13.5, marginRight: 16 }}>
                <input type="radio" name="rqFor" checked={!forTeam} onChange={() => setForTeam(false)} /> Özüm üçün
              </label>
              <label style={{ fontSize: 13.5 }}>
                <input type="radio" name="rqFor" checked={forTeam} onChange={() => setForTeam(true)} /> Komanda üzv(lər)i üçün
              </label>
            </div>
            {forTeam && (
              <div style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, maxHeight: 140, overflow: 'auto' }}>
                {team.map(m => (
                  <label key={m.id} style={{ display: 'block', fontSize: 13.5, padding: '4px 0' }}>
                    <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                    {' '}{m.full_name_az || m.id}{m.position ? ` — ${m.position}` : ''}
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Təlimin adı *</label>
          <input type="text" style={{ width: '100%' }} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Səbəb</label>
          <input type="text" style={{ width: '100%' }} value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Prioritet</label>
          <select style={{ width: '100%' }} value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="Low">Aşağı</option>
            <option value="Medium">Orta</option>
            <option value="High">Yüksək</option>
            <option value="Critical">Kritik</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Səriştə Kateqoriyası (istəyə bağlı)</label>
          <select style={{ width: '100%' }} value={compCat} onChange={e => setCompCat(e.target.value)}>
            <option value="">— Seçilməyib —</option>
            <option value="Hard Skills">Hard Skills</option>
            <option value="Soft Skills">Soft Skills</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Əhəmiyyət dərəcəsi (istəyə bağlı)</label>
          <select style={{ width: '100%' }} value={importance} onChange={e => setImportance(e.target.value)}>
            <option value="">— Seçilməyib —</option>
            {IMPORTANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>Cari səviyyə (istəyə bağlı)</label>
            <select style={{ width: '100%' }} value={currentLevel} onChange={e => setCurrentLevel(e.target.value)}>
              <option value="">—</option>
              {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>Tələb olunan səviyyə (istəyə bağlı)</label>
            <select style={{ width: '100%' }} value={requiredLevel} onChange={e => setRequiredLevel(e.target.value)}>
              <option value="">—</option>
              {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>İstənilən başlama</label>
            <input type="date" style={{ width: '100%' }} value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>İstənilən bitmə</label>
            <input type="date" style={{ width: '100%' }} value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Ləğv et</button>
          <button onClick={handleSubmit} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Göndər</button>
        </div>
      </div>
    </div>
  );
}
