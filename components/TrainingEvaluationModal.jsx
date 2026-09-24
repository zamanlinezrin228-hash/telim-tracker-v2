import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { sb } from '../lib/supabase';

const LEVEL_OPTIONS = ['1 – Fundamental', '2 – İnkişaf edən', '3 – Yetərli', '4 – İrəli', '5 – Ekspert'];

// The leading digit is the only thing that matters for the reached/not-
// reached comparison — current_skill_level/required_skill_level on file
// can come from any of several forms in this app that word the same
// 5-point scale slightly differently (short "1 – Fundamental" vs. long
// "1 – Fundamental (əsas biliklər)"), so comparing full strings would
// silently mismatch identical levels.
function leadingLevel(s) {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

// Reopens once an evaluation already exists (edit, not just create) —
// pre-fills from the existing post_training_skill_level/evaluation_comment
// rather than starting blank.
export default function TrainingEvaluationModal({ training, onClose, onSaved }) {
  const [level, setLevel] = useState(training.post_training_skill_level || '');
  const [comment, setComment] = useState(training.evaluation_comment || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const requiredNum = leadingLevel(training.required_skill_level);
  const newNum = leadingLevel(level);
  let verdict = null;
  if (requiredNum !== null && newNum !== null) {
    if (newNum > requiredNum) verdict = { icon: '🌟', text: 'Tələb olunandan yüksək səviyyəyə çatıb', color: '#7c3aed' };
    else if (newNum === requiredNum) verdict = { icon: '✅', text: 'Tələb olunan səviyyəyə çatıb', color: '#059669' };
    else verdict = { icon: '⚠️', text: 'Hələ tələb olunan səviyyəyə çatmayıb', color: '#d97706' };
  }

  async function handleSubmit() {
    if (!level) { setError('Yenilənmiş cari səviyyəni seçin.'); return; }
    setError('');
    setSaving(true);
    const { data: { user } } = await sb.auth.getUser();
    const { error: err } = await sb.from('trainings').update({
      post_training_skill_level: level,
      evaluation_comment: comment.trim() || null,
      evaluated_by: user.id,
      evaluated_at: new Date().toISOString(),
    }).eq('id', training.id);
    setSaving(false);
    if (err) { setError('Xəta: ' + err.message); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 480, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-title" style={{ marginBottom: 4 }}>Qiymətləndirmə</div>
        <div className="section-sub" style={{ marginBottom: 16 }}>
          {training.employee_name} — <b>{training.skill}</b>
        </div>

        <div className="notice" style={{ marginBottom: 16, background: 'var(--ink-50)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
            Planlaşdırma zamanı qeyd olunan (dəyişməz)
          </div>
          <div className="req-field-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div><div className="req-field-label">Cari səviyyə (əvvəlki)</div><div className="req-field-value">{training.current_skill_level || '—'}</div></div>
            <div><div className="req-field-label">Tələb olunan səviyyə</div><div className="req-field-value">{training.required_skill_level || '—'}</div></div>
            <div><div className="req-field-label">Əhəmiyyət dərəcəsi</div><div className="req-field-value">{training.importance_level || '—'}</div></div>
            <div><div className="req-field-label">Prioritet</div><div className="req-field-value">{training.priority || '—'}</div></div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Yenilənmiş cari səviyyə *</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">— Seçin —</option>
            {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            {level && !LEVEL_OPTIONS.includes(level) && <option value={level}>{level}</option>}
          </select>
        </div>

        {verdict && (
          <div className="notice" style={{ marginBottom: 12, background: `color-mix(in srgb, ${verdict.color} 10%, transparent)`, border: `1px solid ${verdict.color}`, color: verdict.color, fontWeight: 700 }}>
            {verdict.icon} {verdict.text}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label>Rəhbərin şərhi</label>
          <textarea rows={3} placeholder="Nəticə haqqında qeydinizi yazın (istəyə bağlı)..." value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        {error && <div className="notice notice-error" style={{ marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
            <ClipboardCheck size={14} strokeWidth={2.2} /> {saving ? 'Saxlanılır...' : 'Qiymətləndirməni Saxla'}
          </button>
        </div>
      </div>
    </div>
  );
}
