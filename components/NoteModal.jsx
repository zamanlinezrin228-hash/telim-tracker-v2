import { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

export default function NoteModal({ title, placeholder, confirmLabel, confirmVariant, required, onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ConfirmIcon = confirmVariant === 'danger' ? XCircle : confirmVariant === 'warning' ? RotateCcw : CheckCircle2;

  async function handleConfirm() {
    if (required && !note.trim()) { setError('Qeyd mütləqdir.'); return; }
    setError('');
    setSaving(true);
    await onConfirm(note);
    setSaving(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 420 }}>
        <div className="modal-title">{title}</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{ resize: 'vertical' }}
        />
        {error && <div className="notice notice-error" style={{ marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className={'btn ' + (confirmVariant === 'success' ? 'btn-success' : confirmVariant === 'danger' ? 'btn-danger' : confirmVariant === 'warning' ? 'btn-warning' : 'btn-primary')}
            style={{ flex: 1 }}
          >
            <ConfirmIcon size={14} strokeWidth={2.2} /> {saving ? 'Göndərilir...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
