import { useState, useMemo } from 'react';
import { Users2, CheckCircle2, XCircle, RotateCcw, Pencil, History } from 'lucide-react';
import { sb } from '../lib/supabase';
import { showToast } from '../lib/toast';
import { fmtDateTime, isDecidedStatus, reqStatusMeta, matchesOwnScope, deriveApprovalStage, needsUpwardForward } from '../lib/helpers';
import { ReqStatusBadge, PriorityBadge } from './Badges';
import ApprovalStepper from './ApprovalStepper';
import EmptyState from './EmptyState';
import NoteModal from './NoteModal';
import TnaRowEditModal from './TnaRowEditModal';

const HISTORY_STATUS_FILTERS = [
  { key: 'all', label: 'Hamısı' },
  { key: 'Pending Manager Review', label: 'Rəhbər səviyyəsində' },
  { key: 'Pending', label: 'L&D gözləyir' },
  { key: 'In Review', label: 'L&D baxır' },
  { key: 'Approved', label: 'Təsdiqlənib' },
  { key: 'Needs Revision', label: 'Düzəliş tələb olunur' },
  { key: 'Rejected', label: 'Rədd edilib' },
];

// "Departament üzrə baxış" tab content for ANY manager with direct reports
// — dept-level or şöbə-level alike. Unlike L&D's company-wide
// AnnualTnaActiveReview (which shows every dept's Pending/In Review
// ad-hoc-stage rows), "incoming" only ever reads rows where
// reviewing_manager_id = profile.id — whatever's currently addressed to
// THIS manager. "history" is broader: every Manager Survey request within
// this manager's own dept/şöbə (matchesOwnScope), at ANY stage — so a
// request an approving manager forwarded stays visible to them, showing its
// CURRENT live stage, instead of vanishing the moment it moves to the next
// reviewer. Never widened to dept-wide or company-wide data beyond that.
export default function AnnualTnaManagerReview({ profile, team, requests, onDataChanged }) {
  const [noteAction, setNoteAction] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  // The `requests` prop only catches up once the parent's app-wide refresh
  // (several sequential queries) finishes, which can take a few seconds —
  // without this, a just-decided row sits there looking untouched and
  // invites the user to click Təsdiqlə again on a row already forwarded.
  // A Map (not a hide-only Set) so the row moves into "history" showing its
  // new live stage, rather than disappearing from the page entirely.
  const [locallyUpdated, setLocallyUpdated] = useState(() => new Map());

  const surveyRequests = useMemo(
    () => requests.filter((r) => r.source === 'Manager Survey').map((r) => locallyUpdated.get(r.id) ? { ...r, ...locallyUpdated.get(r.id) } : r),
    [requests, locallyUpdated]
  );

  const isAwaitingMe = (r) => r.reviewing_manager_id === profile.id && r.status === 'Pending Manager Review';

  const incoming = useMemo(
    () => surveyRequests.filter(isAwaitingMe),
    [surveyRequests, profile.id]
  );

  const history = useMemo(
    () => surveyRequests.filter((r) => matchesOwnScope(r, profile) && !isAwaitingMe(r)),
    [surveyRequests, profile]
  );

  const filteredHistory = useMemo(
    () => (historyFilter === 'all' ? history : history.filter((r) => r.status === historyFilter)),
    [history, historyFilter]
  );

  function groupBySubmitter(list) {
    const g = {};
    list.forEach((r) => {
      const submitter = team.find((t) => t.id === r.requested_by);
      const key = submitter ? submitter.full_name_az : (r.employee_name || r.sube || r.dept || '—');
      (g[key] = g[key] || []).push(r);
    });
    return g;
  }

  const grouped = useMemo(() => groupBySubmitter(incoming), [incoming]);
  const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'az'));

  const historyGrouped = useMemo(() => groupBySubmitter(filteredHistory), [filteredHistory, team]);
  const historyGroupKeys = Object.keys(historyGrouped).sort((a, b) => a.localeCompare(b, 'az'));

  function refresh() {
    setNoteAction(null);
    setEditingRequest(null);
    // Fire-and-forget: this can take a few seconds and must never gate the
    // modal closing or the row updating — locallyUpdated already handles that.
    if (onDataChanged) onDataChanged();
  }

  const DECIDE_TOAST = {
    Pending: 'Təsdiqləndi və L&D-yə göndərildi.',
    'Pending Manager Review': 'Təsdiqləndi və növbəti rəhbərə göndərildi.',
    'Needs Revision': 'Geri göndərildi.',
    Rejected: 'Rədd edildi.',
  };

  // A şöbə manager's approval forwards one level up to their own dept
  // manager. A dept-level manager is always the top of the chain —
  // needsUpwardForward() caps it there regardless of profiles.manager_id
  // (the real HR reporting line, which can continue up through VPs/the
  // CEO — never an approval gate in this workflow) — same rule as
  // RequestsView.jsx's managerApprove and AnnualTnaForm.jsx's
  // computeForwardStatus.
  async function decide(id, targetStatus, note) {
    const forward = targetStatus === 'Pending'
      ? (needsUpwardForward(profile)
          ? { status: 'Pending Manager Review', reviewing_manager_id: profile.manager_id }
          : { status: 'Pending', reviewing_manager_id: null })
      : { status: targetStatus };
    const { error } = await sb.from('training_requests').update({
      ...forward, manager_note: note, manager_reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setLocallyUpdated((prev) => new Map(prev).set(id, { ...forward, manager_note: note, manager_reviewed_by: profile.id }));
    showToast(DECIDE_TOAST[forward.status] || 'Yadda saxlanıldı.', 'success');
    refresh();
  }

  if (incoming.length === 0 && history.length === 0) {
    return <div className="card"><EmptyState icon={Users2}>Hələ illik TNA sorğusu daxil olmayıb.</EmptyState></div>;
  }

  return (
    <div>
      <div className="section-title">İllik TNA — Departament üzrə Baxış</div>
      <div className="section-sub">Şöbə rəhbərlərinin göndərdiyi illik TNA qeydləri, sizin təsdiqinizi gözləyir</div>

      {incoming.length === 0 && (
        <div className="card" style={{ marginBottom: 20 }}><EmptyState icon={CheckCircle2}>Baxılmalı şöbə sorğusu yoxdur.</EmptyState></div>
      )}

      {groupKeys.map((key, i) => (
        <div key={key} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
          <div className="req-dept-head"><Users2 size={15} strokeWidth={2} /> {key} <span className="req-dept-count">{grouped[key].length}</span></div>
          <div className="req-list" style={{ marginTop: 12 }}>
            {grouped[key].map((r) => (
              <div className="req-card" key={r.id} style={{ '--state-color': reqStatusMeta(r.status).color }}>
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

                <div className="req-timestamps"><span><b>Göndərilib:</b> {fmtDateTime(r.created_at)}</span></div>

                <ApprovalStepper request={r} profile={profile} team={team} />

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

      <div className="section-head" style={{ marginTop: 8 }}><div className="section-title">Tarixçə ({history.length})</div></div>
      <div className="section-sub" style={{ marginBottom: 14 }}>Departamentinizin bütün illik TNA sorğuları, göndərildiyi andan indiki mərhələsinə qədər</div>

      <div className="subtab-nav" style={{ marginBottom: 18 }}>
        {HISTORY_STATUS_FILTERS.map((f) => {
          const count = f.key === 'all' ? history.length : history.filter((r) => r.status === f.key).length;
          if (f.key !== 'all' && count === 0) return null;
          return (
            <button
              key={f.key}
              className={'subtab-pill' + (historyFilter === f.key ? ' active' : '')}
              onClick={() => setHistoryFilter(f.key)}
            >
              {f.label} <span className="badge-count">{count}</span>
            </button>
          );
        })}
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ marginBottom: 20 }}><EmptyState icon={History}>Hələ tarixçə yoxdur.</EmptyState></div>
      ) : filteredHistory.length === 0 ? (
        <div className="card" style={{ marginBottom: 20 }}><EmptyState icon={History}>Bu status üzrə sorğu yoxdur.</EmptyState></div>
      ) : (
        historyGroupKeys.map((key, i) => (
          <div key={key} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
            <div className="req-dept-head"><Users2 size={15} strokeWidth={2} /> {key} <span className="req-dept-count">{historyGrouped[key].length}</span></div>
            <div className="req-list" style={{ marginTop: 12 }}>
              {historyGrouped[key].map((r) => {
                const stage = deriveApprovalStage(r, { profile, team });
                return (
                  <div className="req-card" key={r.id} style={{ '--state-color': reqStatusMeta(r.status).color }}>
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

                    <div className="req-timestamps">
                      <span><b>Göndərilib:</b> {fmtDateTime(r.created_at)}</span>
                      {isDecidedStatus(r.status) && <span><b>Qərar:</b> {fmtDateTime(r.updated_at)}</span>}
                    </div>

                    <ApprovalStepper request={r} profile={profile} team={team} />

                    {stage.decisionBy && (r.status === 'Rejected' || r.status === 'Needs Revision') && (
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 700, marginBottom: 4 }}>
                        {stage.decisionBy.role}{stage.decisionBy.name ? ` — ${stage.decisionBy.name}` : ''} qərarı
                      </div>
                    )}
                    {stage.origin === 'manager' && r.manager_note && (
                      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6 }}><b>Qeyd:</b> {r.manager_note}</div>
                    )}
                    {stage.origin !== 'manager' && r.reviewer_note && (
                      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6 }}><b>Qeyd:</b> {r.reviewer_note}</div>
                    )}
                    {/* Anyone who can see this row in their own dept/şöbə history can
                        fix and resubmit it — not just the original submitter.
                        Resubmitting routes it forward from THIS manager's own level
                        (see TnaRowEditModal.jsx), not back to whoever sent it back. */}
                    {r.status === 'Needs Revision' && (
                      <button onClick={() => setEditingRequest(r)} className="btn btn-warning btn-sm">
                        <Pencil size={13} strokeWidth={2.2} /> Redaktə et və yenidən göndər
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

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
        <TnaRowEditModal request={editingRequest} profile={profile} onClose={() => setEditingRequest(null)} onSaved={refresh} />
      )}
    </div>
  );
}
