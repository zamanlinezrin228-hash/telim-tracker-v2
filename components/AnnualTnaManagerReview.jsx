import { useState, useMemo } from 'react';
import { Users2, CheckCircle2, XCircle, RotateCcw, Pencil } from 'lucide-react';
import { sb } from '../lib/supabase';
import { showToast } from '../lib/toast';
import { ReqStatusBadge, PriorityBadge } from './Badges';
import EmptyState from './EmptyState';
import NoteModal from './NoteModal';
import TnaRowEditModal from './TnaRowEditModal';

// "Departament üzrə baxış" tab content for a dept-level manager. Unlike
// L&D's company-wide AnnualTnaActiveReview (which shows every dept's
// Pending/In Review ad-hoc-stage rows), this only ever reads rows where
// reviewing_manager_id = profile.id — the şöbə-manager batches forwarded
// specifically to THIS dept manager — so it is scoped by construction and
// never widened to dept-wide or company-wide data.
export default function AnnualTnaManagerReview({ profile, team, requests, onDataChanged }) {
  const [noteAction, setNoteAction] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  // The `requests` prop only catches up once the parent's app-wide refresh
  // (several sequential queries) finishes, which can take a few seconds —
  // without this, a just-decided row sits there looking untouched and
  // invites the user to click Təsdiqlə again on a row already forwarded.
  const [decidedIds, setDecidedIds] = useState(() => new Set());

  const incoming = useMemo(
    () => requests.filter((r) => r.reviewing_manager_id === profile.id && r.status === 'Pending Manager Review' && r.source === 'Manager Survey' && !decidedIds.has(r.id)),
    [requests, profile.id, decidedIds]
  );

  const grouped = useMemo(() => {
    const g = {};
    incoming.forEach((r) => {
      const submitter = team.find((t) => t.id === r.requested_by);
      const key = submitter ? submitter.full_name_az : (r.sube || r.dept || '—');
      (g[key] = g[key] || []).push(r);
    });
    return g;
  }, [incoming, team]);

  const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'az'));

  function refresh() {
    setNoteAction(null);
    setEditingRequest(null);
    // Fire-and-forget: this can take a few seconds and must never gate the
    // modal closing or the row disappearing — decidedIds already handles that.
    if (onDataChanged) onDataChanged();
  }

  const DECIDE_TOAST = { Pending: 'Təsdiqləndi və göndərildi.', 'Needs Revision': 'Geri göndərildi.', Rejected: 'Rədd edildi.' };

  async function decide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, manager_note: note, manager_reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setDecidedIds((prev) => new Set(prev).add(id));
    showToast(DECIDE_TOAST[targetStatus] || 'Yadda saxlanıldı.', 'success');
    refresh();
  }

  if (incoming.length === 0) {
    return <div className="card"><EmptyState icon={Users2}>Baxılmalı şöbə sorğusu yoxdur.</EmptyState></div>;
  }

  return (
    <div>
      <div className="section-title">İllik TNA — Departament üzrə Baxış</div>
      <div className="section-sub">Şöbə rəhbərlərinin göndərdiyi illik TNA qeydləri, sizin təsdiqinizi gözləyir</div>

      {groupKeys.map((key, i) => (
        <div key={key} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
          <div className="req-dept-head"><Users2 size={15} strokeWidth={2} /> {key} <span className="req-dept-count">{grouped[key].length}</span></div>
          <div className="req-list" style={{ marginTop: 12 }}>
            {grouped[key].map((r) => (
              <div className="req-card" key={r.id}>
                <div className="req-card-top">
                  <div>
                    <div className="req-card-name">
                      {r.employee_name}
                      {r.position && <span className="req-card-position"> · {r.position}</span>}
                    </div>
                    <div className="req-card-training">{r.training_title}</div>
                  </div>
                  <div className="req-card-badges">
                    <PriorityBadge priority={r.priority} />
                    <ReqStatusBadge status={r.status} />
                  </div>
                </div>

                {r.reason && (
                  <div className="req-field-highlight">
                    <div className="req-field-label">Ehtiyacın yaranma səbəbi</div>
                    <div className="req-field-value">{r.reason}</div>
                  </div>
                )}

                <div className="req-field-grid">
                  {r.comp_cat && (<div><div className="req-field-label">Kateqoriya</div><div className="req-field-value">{r.comp_cat}</div></div>)}
                  {r.importance_level && (<div><div className="req-field-label">Əhəmiyyət</div><div className="req-field-value">{r.importance_level}</div></div>)}
                  {r.current_skill_level && (<div><div className="req-field-label">Cari səviyyə</div><div className="req-field-value">{r.current_skill_level}</div></div>)}
                  {r.required_skill_level && (<div><div className="req-field-label">Tələb olunan</div><div className="req-field-value">{r.required_skill_level}</div></div>)}
                  {r.vendor && (<div><div className="req-field-label">Vendor</div><div className="req-field-value">{r.vendor}</div></div>)}
                  {r.budget != null && (<div><div className="req-field-label">Planlanmış büdcə</div><div className="req-field-value">{r.budget} ₼</div></div>)}
                </div>

                <div className="req-card-footer">
                  <button onClick={() => setEditingRequest(r)} className="btn btn-outline btn-sm"><Pencil size={13} strokeWidth={2.2} /> Redaktə et</button>
                  <button onClick={() => setNoteAction({ type: 'approve', id: r.id })} className="btn btn-success btn-sm"><CheckCircle2 size={13} strokeWidth={2.2} /> Təsdiqlə</button>
                  <button onClick={() => setNoteAction({ type: 'revise', id: r.id })} className="btn btn-warning btn-sm"><RotateCcw size={13} strokeWidth={2.2} /> Geri göndər</button>
                  <button onClick={() => setNoteAction({ type: 'reject', id: r.id })} className="btn btn-danger btn-sm"><XCircle size={13} strokeWidth={2.2} /> Rədd et</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {noteAction && (
        <NoteModal
          title={noteAction.type === 'approve' ? 'Təsdiq qeydiniz (əsaslandırma)' : noteAction.type === 'revise' ? 'Nəyin düzəldilməli olduğunu izah edin' : 'Rədd səbəbi'}
          placeholder={noteAction.type === 'revise' ? 'Məsələn: büdcəni yenidən yoxlayın, səbəbi daha dəqiq yazın...' : 'Qeydinizi yazın...'}
          confirmLabel={noteAction.type === 'approve' ? 'Təsdiqlə' : noteAction.type === 'revise' ? 'Geri göndər' : 'Rədd et'}
          confirmVariant={noteAction.type === 'approve' ? 'success' : noteAction.type === 'revise' ? 'warning' : 'danger'}
          required={noteAction.type === 'revise' || noteAction.type === 'reject'}
          onCancel={() => setNoteAction(null)}
          onConfirm={async (note) => {
            const targetStatus = noteAction.type === 'approve' ? 'Pending' : noteAction.type === 'revise' ? 'Needs Revision' : 'Rejected';
            await decide(noteAction.id, targetStatus, note);
          }}
        />
      )}

      {editingRequest && (
        <TnaRowEditModal request={editingRequest} onClose={() => setEditingRequest(null)} onSaved={refresh} />
      )}
    </div>
  );
}
