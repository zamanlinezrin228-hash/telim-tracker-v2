import { useState } from 'react';
import { Send } from 'lucide-react';
import { sb } from '../lib/supabase';
import { computeBudgetStatus } from '../lib/helpers';

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
  const [forWhom, setForWhom] = useState('self');
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [compCat, setCompCat] = useState('');
  const [importance, setImportance] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [requiredLevel, setRequiredLevel] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const budgetStatus = computeBudgetStatus();

  function toggleMember(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    setError('');
    if (!title.trim()) { setError('Təlimin adını yazın.'); return; }
    if (forWhom === 'team' && selectedIds.length === 0) { setError('Ən azı bir komanda üzvü seçin.'); return; }
    if (!compCat) { setError('Səriştə Kateqoriyasını seçin.'); return; }
    if (!importance) { setError('Əhəmiyyət dərəcəsini seçin.'); return; }
    if (!currentLevel) { setError('Cari səviyyəni seçin.'); return; }
    if (!requiredLevel) { setError('Tələb olunan səviyyəni seçin.'); return; }

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
        <div className="modal-title" style={{ marginBottom: 4 }}>Yeni Təlim Sorğusu</div>
        <div className="section-sub" style={{ marginBottom: 14 }}>Aşağıdakı sahələri doldurub göndərin.</div>

        <div className={'notice ' + (budgetStatus === 'Büdcədən kənar' ? 'notice-warning' : 'notice-success')} style={{ marginBottom: 16 }}>
          {budgetStatus === 'Büdcədən kənar' ? (
            <><b>Diqqət:</b> Hazırda illik büdcə planlaşdırma dövründən (Oktyabr–Yanvar) kənardayıq. Bu sorğu təsdiqlənsə belə, <b>&quot;Büdcədən kənar&quot;</b> kateqoriyasında qeyd olunacaq və əvvəlcədən planlaşdırılmış büdcəyə daxil olmadığı üçün <b>təsdiq ehtimalı aşağıdır</b>.</>
          ) : (
            <>Hazırda illik büdcə planlaşdırma dövründəyik — bu sorğu təsdiqlənsə, <b>&quot;Büdcələnmiş&quot;</b> kateqoriyasında qeyd olunacaq.</>
          )}
        </div>

        {hasTeam && (
          <div style={{ marginBottom: 16 }}>
            <div className="filter-label" style={{ marginBottom: 8 }}>Kimin üçün?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setForWhom('self')}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                  border: forWhom === 'self' ? '2px solid var(--navy)' : '1px solid var(--ink-200)',
                  background: forWhom === 'self' ? 'var(--blue-light)' : '#fff',
                }}
              >
                Özüm üçün
              </button>
              <button
                onClick={() => setForWhom('team')}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                  border: forWhom === 'team' ? '2px solid var(--navy)' : '1px solid var(--ink-200)',
                  background: forWhom === 'team' ? 'var(--blue-light)' : '#fff',
                }}
              >
                Komandam üçün
              </button>
            </div>

            {forWhom === 'team' && (
              <div style={{ marginTop: 10, border: '1px solid var(--ink-200)', borderRadius: 10, padding: 10, maxHeight: 180, overflow: 'auto' }}>
                {team.map((m) => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 13.5 }}>
                    <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleMember(m.id)} style={{ width: 'auto' }} />
                    <span style={{ flex: 1 }}>{m.full_name_az}</span>
                    <span style={{ color: 'var(--ink-400)', fontSize: 12 }}>{m.position || ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label>Təlimin adı *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="məs. Excel Advanced Kursu" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Səbəb</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Qısaca niyə lazımdır" />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Prioritet</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="Low">Aşağı</option>
              <option value="Medium">Orta</option>
              <option value="High">Yüksək</option>
              <option value="Critical">Kritik</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>İstənilən başlama</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>İstənilən bitmə</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="filter-label" style={{ margin: '4px 0 10px' }}>Ətraflı məlumat</div>
        <div style={{ background: 'var(--ink-50)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Səriştə Kateqoriyası *</label>
            <select value={compCat} onChange={(e) => setCompCat(e.target.value)}>
              <option value="">— Seçin —</option>
              <option value="Hard Skills">Hard Skills</option>
              <option value="Soft Skills">Soft Skills</option>
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Əhəmiyyət dərəcəsi *</label>
            <select value={importance} onChange={(e) => setImportance(e.target.value)}>
              <option value="">— Seçin —</option>
              {IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Cari səviyyə *</label>
              <select value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)}>
                <option value="">—</option>
                {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o.split(' – ')[0]} – {o.split(' – ')[1].split(' ')[0]}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Tələb olunan səviyyə *</label>
              <select value={requiredLevel} onChange={(e) => setRequiredLevel(e.target.value)}>
                <option value="">—</option>
                {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o.split(' – ')[0]} – {o.split(' – ')[1].split(' ')[0]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <div className="notice notice-error" style={{ marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
            <Send size={14} strokeWidth={2.2} /> {submitting ? 'Göndərilir...' : 'Göndər'}
          </button>
        </div>
      </div>
    </div>
  );
}
