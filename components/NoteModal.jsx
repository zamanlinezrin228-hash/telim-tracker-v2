import { useState } from 'react';

export default function NoteModal({ title, placeholder, confirmLabel, confirmVariant, onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
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
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className={'btn ' + (confirmVariant === 'success' ? 'btn-success' : confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary')}
            style={{ flex: 1 }}
          >
            {saving ? 'Göndərilir...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
