import { useState } from 'react';
import { Save } from 'lucide-react';
import { sb } from '../lib/supabase';
import { needsUpwardForward } from '../lib/helpers';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_LABELS = { Low: 'Aşağı', Medium: 'Orta', High: 'Yüksək', Critical: 'Kritik' };
const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];
const IMPORTANCE_OPTIONS = ['1 – Aşağı', '2 – Orta', '3 – Yüksək', '4 – Kritik', '5 – Strateji'];
const LEVEL_OPTIONS = ['1 – Fundamental', '2 – İnkişaf edən', '3 – Yetərli', '4 – İrəli', '5 – Ekspert'];
const LEARNING_METHOD_OPTIONS = [
  '1 – Təlim', '3 – İş Yerində Öyrənmə', '6 – E-learning', '8 – Qarışıq Model', '9 – Seminar/Workshop',
];
const ACTIVITY_DURATION_OPTIONS = [
  '1 – Qısa (1–3 gün)', '2 – Orta (1–4 həftə)', '3 – Uzun (1–3 ay)', '4 – İrəli (3–6 ay)', '5 – Strateji (6+ ay)',
];
const NEED_REASON_OPTIONS = [
  '1 – Yeni rol', '2 – Performans boşluğu', '3 – Yeni texnologiya', '4 – Hüquqi tələblər',
  '5 – Strateji bacarıq', '6 – Karyera/varislik', '7 – Rəy/sorğu əsasında', '8 – Layihə/dəyişiklik',
];
const TRANSFORMATION_AREA_OPTIONS = ['Yes', 'No'];

// Full-field edit modal for a single training_requests row — shared by a
// manager's pre-decision edit (fields only, status untouched — they still
// separately Təsdiqlə/Rədd et/Geri göndər afterwards) and, when `profile`
// is passed and the row is 'Needs Revision', fixing-and-resubmitting it:
// whoever does the fix determines where it goes next, exactly like a fresh
// submission from them (needsUpwardForward on their own profile), not back
// to whoever most recently sent it back — same rule as ResubmitModal.jsx.
export default function TnaRowEditModal({ request, profile, onClose, onSaved }) {
  const [title, setTitle] = useState(request.training_title || '');
  const [position, setPosition] = useState(request.position || '');
  const [reason, setReason] = useState(request.reason || '');
  const [priority, setPriority] = useState(request.priority || 'Medium');
  const [compCat, setCompCat] = useState(request.comp_cat || '');
  const [vendor, setVendor] = useState(request.vendor || '');
  const [manHours, setManHours] = useState(request.man_hours ?? '');
  const [budget, setBudget] = useState(request.budget ?? '');
  const [transformationArea, setTransformationArea] = useState(request.transformation_area || '');
  const [importance, setImportance] = useState(request.importance_level || '');
  const [currentLevel, setCurrentLevel] = useState(request.current_skill_level || '');
  const [requiredLevel, setRequiredLevel] = useState(request.required_skill_level || '');
  const [learningMethod, setLearningMethod] = useState(request.learning_method || '');
  const [activityDuration, setActivityDuration] = useState(request.activity_duration || '');
  const [learningGoal, setLearningGoal] = useState(request.learning_goal || '');
  const [start, setStart] = useState(request.preferred_start || '');
  const [end, setEnd] = useState(request.preferred_end || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) { setError('Təlimin adını / İnkişaf istiqamətini yazın.'); return; }
    setError('');
    setSaving(true);
    const payload = {
      training_title: title.trim(), position: position.trim() || null, reason: reason.trim(),
      priority, comp_cat: compCat || null, vendor: vendor.trim() || null,
      man_hours: manHours !== '' ? Number(manHours) : null, budget: budget !== '' ? Number(budget) : null,
      transformation_area: transformationArea || null,
      importance_level: importance || null, current_skill_level: currentLevel || null, required_skill_level: requiredLevel || null,
      learning_method: learningMethod || null, activity_duration: activityDuration || null,
      learning_goal: learningGoal.trim() || null,
      preferred_start: start || null, preferred_end: end || null,
      updated_at: new Date().toISOString(),
    };
    if (request.status === 'Needs Revision' && profile) {
      const forward = needsUpwardForward(profile)
        ? { status: 'Pending Manager Review', reviewing_manager_id: profile.manager_id }
        : { status: 'Pending', reviewing_manager_id: null };
      Object.assign(payload, forward, {
        manager_note: null, reviewer_note: null,
        manager_reviewed_by: profile.role === 'manager' ? profile.id : null,
        reviewed_by: null,
      });
    }
    const { error: err } = await sb.from('training_requests').update(payload).eq('id', request.id);
    setSaving(false);
    if (err) { setError('Xəta: ' + err.message); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-title" style={{ marginBottom: 4 }}>Qeydi Redaktə Et</div>
        <div className="section-sub" style={{ marginBottom: 14 }}>{request.employee_name} — {request.dept}{request.sube ? ' / ' + request.sube : ''}</div>

        <div style={{ marginBottom: 10 }}>
          <label>Təlimin adı / İnkişaf istiqaməti *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Vəzifə</label>
          <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Ehtiyacın yaranma səbəbi</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">— Seçin —</option>
            {NEED_REASON_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            {reason && !NEED_REASON_OPTIONS.includes(reason) && <option value={reason}>{reason}</option>}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Prioritet</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Səriştə kateqoriyası</label>
            <select value={compCat} onChange={(e) => setCompCat(e.target.value)}>
              <option value="">—</option>
              {COMP_CAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Vendor</label>
            <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Man Hours</label>
            <input type="number" value={manHours} onChange={(e) => setManHours(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Planlanmış Büdcə</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Transformation Capability Area</label>
          <select value={transformationArea} onChange={(e) => setTransformationArea(e.target.value)}>
            <option value="">—</option>
            {TRANSFORMATION_AREA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Əhəmiyyət dərəcəsi</label>
            <select value={importance} onChange={(e) => setImportance(e.target.value)}>
              <option value="">—</option>
              {IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Cari səviyyə</label>
            <select value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)}>
              <option value="">—</option>
              {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Tələb olunan səviyyə</label>
            <select value={requiredLevel} onChange={(e) => setRequiredLevel(e.target.value)}>
              <option value="">—</option>
              {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Öyrənmə metodu</label>
            <select value={learningMethod} onChange={(e) => setLearningMethod(e.target.value)}>
              <option value="">—</option>
              {LEARNING_METHOD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Təlim/İnkişaf Aktivliyinin Müddəti</label>
            <select value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)}>
              <option value="">—</option>
              {ACTIVITY_DURATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Öyrənmə Məqsədi</label>
          <textarea rows={2} value={learningGoal} onChange={(e) => setLearningGoal(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label>İstənilən başlama</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>İstənilən bitmə</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        {error && <div className="notice notice-error" style={{ marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
            <Save size={14} strokeWidth={2.2} /> {saving ? 'Saxlanılır...' : 'Saxla'}
          </button>
        </div>
      </div>
    </div>
  );
}
