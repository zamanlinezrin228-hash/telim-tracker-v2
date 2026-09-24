import { ArrowRight } from 'lucide-react';

// Shown instead of RequestFormModal when a non-LD user clicks "+ Yeni
// Sorğu" while app_settings.adhoc_requests_open is false — the button
// itself always stays visible/clickable now, this is what gates the
// actual ad-hoc submission during the annual TNA window.
export default function AdhocClosedModal({ onClose, onGoToAnnualTna }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 420 }}>
        <div className="modal-title">Hazırda aktiv deyil</div>
        <p style={{ margin: 0, color: 'var(--ink-600)', lineHeight: 1.5 }}>
          Hazırda aktiv deyil. İllik TNA dövrü olduğu üçün, sorğunuz varsa İllik TNA hissəsinə keçərək ehtiyaclarınızı qeyd edin.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Bağla</button>
          {onGoToAnnualTna && (
            <button onClick={onGoToAnnualTna} className="btn btn-primary" style={{ flex: 1 }}>
              İllik TNA-ya keç <ArrowRight size={14} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
