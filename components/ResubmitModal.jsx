import { useState } from 'react';
import { Send } from 'lucide-react';
import { sb } from '../lib/supabase';
import { showToast } from '../lib/toast';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_LABELS = { Low: 'Aşağı', Medium: 'Orta', High: 'Yüksək', Critical: 'Kritik' };

const IMPORTANCE_SUGGESTIONS = [
  '1 – Aşağı', '2 – Orta', '3 – Yüksək', '4 – Kritik', '5 – Strateji',
];
const LEVEL_SUGGESTIONS = ['1 – Fundamental', '2 – İnkişaf edən', '3 – Yetərli', '4 – İrəli', '5 – Ekspert'];

// Reopens a 'Needs Revision' request for the submitter to edit and send
// back, rather than making them start a brand new request from scratch.
// Importance/level fields stay free-text (datalist) instead of a rigid
// <select> because the two request-creation forms in this app store
// slightly different wording for the same scale, so a fixed dropdown
// could fail to match whatever string is already saved on the row.
export default function ResubmitModal({ request, onClose, onSubmitted }) {
  const [title, setTitle] = useState(request.training_title || '');
  const [reason, setReason] = useState(request.reason || '');
  const [priority, setPriority] = useState(request.priority || 'Medium');
  const [start, setStart] = useState(request.preferred_start || '');
  const [end, setEnd] = useState(request.preferred_end || '');
  const [compCat, setCompCat] = useState(request.comp_cat || '');
  const [importance, setImportance] = useState(request.importance_level || '');
  const [currentLevel, setCurrentLevel] = useState(request.current_skill_level || '');
  const [requiredLevel, setRequiredLevel] = useState(request.required_skill_level || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!title.trim()) { setError('Təlimin adını yazın.'); return; }

    const nextStatus = request.reviewing_manager_id ? 'Pending Manager Review' : 'Pending';
    const payload = {
      training_title: title.trim(),
      reason: reason.trim(),
      priority,
      preferred_start: start || null,
      preferred_end: end || null,
      comp_cat: compCat || null,
      importance_level: importance || null,
      current_skill_level: currentLevel || null,
      required_skill_level: requiredLevel || null,
      status: nextStatus,
      reviewer_note: null,
      updated_at: new Date().toISOString(),
    };

    setSubmitting(true);
    const { error: err } = await sb.from('training_requests').update(payload).eq('id', request.id);
    setSubmitting(false);
    if (err) { showToast('Xəta: ' + err.message, 'error'); return; }
    onSubmitted();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 480, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-title" style={{ marginBottom: 4 }}>Sorğunu Redaktə Et və Yenidən Göndər</div>
        <div className="section-sub" style={{ marginBottom: 14 }}>{request.employee_name} — {request.dept}</div>

        {request.reviewer_note && (
          <div className="notice notice-warning" style={{ marginBottom: 16 }}>
            <b>L&D-nin düzəliş qeydi:</b> {request.reviewer_note}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label>Təlimin adı / İnkişaf istiqaməti *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Ehtiyacın yaranma səbəbi</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Prioritet</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Səriştə Kateqoriyası</label>
            <select value={compCat} onChange={(e) => setCompCat(e.target.value)}>
              <option value="">—</option>
              <option value="Hard Skills">Hard Skills</option>
              <option value="Soft Skills">Soft Skills</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label>İstənilən başlama</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>İstənilən bitmə</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Əhəmiyyət dərəcəsi</label>
          <input type="text" list="resubmit-importance" value={importance} onChange={(e) => setImportance(e.target.value)} />
          <datalist id="resubmit-importance">{IMPORTANCE_SUGGESTIONS.map((o) => <option key={o} value={o} />)}</datalist>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label>Cari səviyyə</label>
            <input type="text" list="resubmit-levels" value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Tələb olunan səviyyə</label>
            <input type="text" list="resubmit-levels" value={requiredLevel} onChange={(e) => setRequiredLevel(e.target.value)} />
          </div>
          <datalist id="resubmit-levels">{LEVEL_SUGGESTIONS.map((o) => <option key={o} value={o} />)}</datalist>
        </div>

        {error && <div className="notice notice-error" style={{ marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
            <Send size={14} strokeWidth={2.2} /> {submitting ? 'Göndərilir...' : 'Yenidən Göndər'}
          </button>
        </div>
      </div>
    </div>
  );
}
