import { useState } from 'react';

export default function NoteModal({ title, placeholder, confirmLabel, confirmColor, onConfirm, onCancel }) {
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
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14 }}>{title}</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
            Ləğv et
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: confirmColor || '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            {saving ? 'Göndərilir...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
