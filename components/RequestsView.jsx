import { useState, useMemo } from 'react';
import { Plus, Folder, Clock, Search, CheckCircle2, XCircle, FileText, CheckCheck, ListPlus, RotateCcw, Pencil } from 'lucide-react';
import { sb } from '../lib/supabase';
import { reqStatusMeta, groupByEmployee, fmtDateTime, isDecidedStatus, deriveApprovalStage } from '../lib/helpers';
import { showToast } from '../lib/toast';
import { ReqStatusBadge, PriorityBadge } from './Badges';
import ApprovalStepper from './ApprovalStepper';
import StageMeta from './StageMeta';
import EmptyState from './EmptyState';
import RequestFormModal from './RequestFormModal';
import NoteModal from './NoteModal';
import AddToPlanModal from './AddToPlanModal';
import ResubmitModal from './ResubmitModal';
import CountUp from './CountUp';

export default function RequestsView({ profile, team, requests, planYear, adhocRequestsOpen, onDataChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [noteAction, setNoteAction] = useState(null);
  const [addToPlanRequest, setAddToPlanRequest] = useState(null);
  const [resubmitRequest, setResubmitRequest] = useState(null);

  // The `requests` prop only catches up once the parent's app-wide refresh
  // (several sequential queries) finishes — without this, a just-decided
  // row sits there looking untouched and invites clicking it again.
  const [locallyUpdated, setLocallyUpdated] = useState(() => new Map());
  const mergedRequests = useMemo(
    () => requests.map((r) => locallyUpdated.get(r.id) ? { ...r, ...locallyUpdated.get(r.id) } : r),
    [requests, locallyUpdated]
  );

  const role = profile.role;
  const canCreateAdhoc = role === 'ld' || !!adhocRequestsOpen;
  const hasTeam = team && team.length > 0;
  const isReviewer = role === 'hr' || role === 'ld';
  const myRequests = mergedRequests.filter((r) => r.requested_by === profile.id);
  const toReview = mergedRequests.filter((r) => r.reviewing_manager_id === profile.id && r.status === 'Pending Manager Review');

  const scopeHistory = useMemo(() => {
    if (!hasTeam) return [];
    const inScope = (r) => profile.scope_level === 'dept' ? r.dept === profile.dept : r.sube === profile.sube;
    return mergedRequests.filter((r) => r.status !== 'Pending Manager Review' && inScope(r));
  }, [mergedRequests, hasTeam, profile]);

  const reviewerGrouped = useMemo(() => {
    if (!isReviewer) return {};
    const visible = mergedRequests.filter((r) => r.status !== 'Pending Manager Review' && r.source !== 'Manager Survey');
    const grouped = {};
    visible.forEach((r) => { (grouped[r.dept] = grouped[r.dept] || []).push(r); });
    return grouped;
  }, [mergedRequests, isReviewer]);

  const reviewerActive = isReviewer
    ? Object.fromEntries(Object.entries(reviewerGrouped).map(([d, list]) => [d, list.filter((r) => r.status === 'Pending' || r.status === 'In Review')]).filter(([, list]) => list.length))
    : {};
  const reviewerDecided = isReviewer ? mergedRequests.filter((r) => (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Needs Revision') && r.source !== 'Manager Survey') : [];
  const pendingCount = isReviewer ? mergedRequests.filter((r) => r.status === 'Pending').length : 0;

  const reviewInReviewCount = isReviewer ? Object.values(reviewerActive).flat().filter((r) => r.status === 'In Review').length : 0;
  const reviewApprovedCount = reviewerDecided.filter((r) => r.status === 'Approved').length;
  const reviewRejectedCount = reviewerDecided.filter((r) => r.status === 'Rejected').length;

  const myPendingCount = myRequests.filter((r) => r.status === 'Pending' || r.status === 'Pending Manager Review' || r.status === 'In Review').length;
  const myApprovedCount = myRequests.filter((r) => r.status === 'Approved').length;
  const myRejectedCount = myRequests.filter((r) => r.status === 'Rejected').length;

  const statCards = isReviewer
    ? [
        { label: 'Analiz gözləyir', value: pendingCount, Icon: Clock, color: '#d97706' },
        { label: 'Baxılır', value: reviewInReviewCount, Icon: Search, color: '#2563eb' },
        { label: 'Təsdiqlənib', value: reviewApprovedCount, Icon: CheckCircle2, color: '#059669' },
        { label: 'Rədd edilib', value: reviewRejectedCount, Icon: XCircle, color: '#dc2626' },
      ]
    : [
        { label: 'Mənim sorğularım', value: myRequests.length, Icon: FileText, color: '#2563eb' },
        { label: 'Gözləyir', value: myPendingCount, Icon: Clock, color: '#d97706' },
        { label: 'Təsdiqlənib', value: myApprovedCount, Icon: CheckCircle2, color: '#059669' },
        { label: 'Rədd edilib', value: myRejectedCount, Icon: XCircle, color: '#dc2626' },
      ];

  function refresh() {
    setShowForm(false);
    setNoteAction(null);
    setAddToPlanRequest(null);
    setResubmitRequest(null);
    // Fire-and-forget: this can take a few seconds and must never gate the
    // modal closing or the row updating — locallyUpdated already handles that.
    if (onDataChanged) onDataChanged();
  }

  const MANAGER_DECIDE_TOAST = {
    Pending: 'Təsdiqləndi və L&D-yə göndərildi.',
    'Pending Manager Review': 'Təsdiqləndi və növbəti rəhbərə göndərildi.',
    Rejected: 'Rədd edildi.',
  };
  const LD_DECIDE_TOAST = { Approved: 'Təsdiqləndi.', 'Needs Revision': 'Geri göndərildi.', Rejected: 'Rədd edildi.' };

  // Bug fix (Task 6): approving used to jump straight to status='Pending'
  // (visible to L&D), skipping the approving manager's OWN manager — so a
  // şöbə manager's approval would bypass the dept manager above them, and a
  // dept manager's approval would bypass their own manager too when one was
  // set. Now: if the approving manager has their own manager_id, forward one
  // level up ('Pending Manager Review' + reviewing_manager_id = that
  // manager's manager_id); only a manager with no manager_id (top of the
  // chain) opens the request up to L&D ('Pending').
  async function managerApprove(id, note) {
    const forward = profile.manager_id
      ? { status: 'Pending Manager Review', reviewing_manager_id: profile.manager_id }
      : { status: 'Pending', reviewing_manager_id: null };
    const { error } = await sb.from('training_requests').update({
      ...forward, manager_note: note, manager_reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setLocallyUpdated((prev) => new Map(prev).set(id, { ...forward, manager_note: note }));
    showToast(MANAGER_DECIDE_TOAST[forward.status] || 'Yadda saxlanıldı.', 'success');
    refresh();
  }

  async function managerReject(id, note) {
    const { error } = await sb.from('training_requests').update({
      status: 'Rejected', manager_note: note, manager_reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setLocallyUpdated((prev) => new Map(prev).set(id, { status: 'Rejected', manager_note: note }));
    showToast(MANAGER_DECIDE_TOAST.Rejected, 'success');
    refresh();
  }

  async function takeIntoReview(id) {
    const { error } = await sb.from('training_requests').update({ status: 'In Review', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setLocallyUpdated((prev) => new Map(prev).set(id, { status: 'In Review' }));
    if (onDataChanged) onDataChanged();
  }

  async function ldDecide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, reviewer_note: note, reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setLocallyUpdated((prev) => new Map(prev).set(id, { status: targetStatus, reviewer_note: note }));
    showToast(LD_DECIDE_TOAST[targetStatus] || 'Yadda saxlanıldı.', 'success');
    refresh();
  }

  function RequestTable({ list, showNotes }) {
    const colCount = showNotes ? 8 : 6;
    return (
      <table>
        <thead>
          <tr>
            <th>Təlim</th><th>Prioritet</th><th>Status</th><th>Göndərilib</th><th>Qərar tarixi</th>
            {showNotes && <><th>Manager qeydi</th><th>L&D qeydi</th></>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.length ? list.map((r) => (
            <tr key={r.id}>
              <td>{r.training_title}</td>
              <td><PriorityBadge priority={r.priority} /></td>
              <td><ReqStatusBadge status={r.status} /><StageMeta request={r} profile={profile} team={team} /></td>
              <td style={{ fontSize: 12.5 }}>{fmtDateTime(r.created_at)}</td>
              <td style={{ fontSize: 12.5 }}>{isDecidedStatus(r.status) ? fmtDateTime(r.updated_at) : '—'}</td>
              {showNotes && (<><td style={{ fontSize: 12.5 }}>{r.manager_note || '—'}</td><td style={{ fontSize: 12.5 }}>{r.reviewer_note || '—'}</td></>)}
              <td>
                {r.status === 'Needs Revision' && (
                  <button onClick={() => setResubmitRequest(r)} className="btn btn-warning btn-sm">
                    <Pencil size={12} strokeWidth={2.2} /> Redaktə et
                  </button>
                )}
              </td>
            </tr>
          )) : (
            <tr><td colSpan={colCount}><EmptyState icon={FileText}>Hələ sorğu yoxdur</EmptyState></td></tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Təlim Sorğuları</h1>
            <p>Yeni sorğu göndər, komandanın sorğularına bax və qərar ver.</p>
          </div>
          {canCreateAdhoc && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus size={15} strokeWidth={2.4} /> Yeni Sorğu</button>
          )}
        </div>
      </div>

      <div className="page">
        <div className="kpi-grid">
          {statCards.map((s, i) => (
            <div className="stat-card stagger-item" key={s.label} style={{ '--i': i }}>
              <div className="stat-icon" style={{ '--icon-color': s.color, color: s.color }}><s.Icon size={16} strokeWidth={2.2} /></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}><CountUp value={s.value} /></div>
            </div>
          ))}
        </div>

        {hasTeam && (
          <>
            <div className="section-head"><div className="section-title">Baxılmalı Komanda Sorğuları ({toReview.length})</div></div>
            {toReview.length ? (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="req-list">
                  {toReview.map((r) => (
                    <div className="req-card" key={r.id} style={{ '--state-color': reqStatusMeta(r.status).color }}>
                      <div className="req-card-top">
                        <div>
                          <div className="req-card-name">{r.employee_name}</div>
                          <div className="req-card-training">{r.training_title}</div>
                        </div>
                        <div className="req-card-badges"><PriorityBadge priority={r.priority} /></div>
                      </div>
                      <div className="req-timestamps"><span><b>Göndərilib:</b> {fmtDateTime(r.created_at)}</span></div>
                      <ApprovalStepper request={r} profile={profile} team={team} />
                      {r.reason && (
                        <div className="req-field-highlight">
                          <div className="req-field-label">Səbəb</div>
                          <div className="req-field-value">{r.reason}</div>
                        </div>
                      )}
                      {(r.comp_cat || r.importance_level || r.current_skill_level || r.required_skill_level) && (
                        <div className="req-field-grid">
                          {r.comp_cat && (
                            <div><div className="req-field-label">Kateqoriya</div><div className="req-field-value">{r.comp_cat}</div></div>
                          )}
                          {r.importance_level && (
                            <div><div className="req-field-label">Əhəmiyyət dərəcəsi</div><div className="req-field-value">{r.importance_level}</div></div>
                          )}
                          {r.current_skill_level && (
                            <div><div className="req-field-label">Cari səviyyə</div><div className="req-field-value">{r.current_skill_level}</div></div>
                          )}
                          {r.required_skill_level && (
                            <div><div className="req-field-label">Tələb olunan səviyyə</div><div className="req-field-value">{r.required_skill_level}</div></div>
                          )}
                        </div>
                      )}
                      <div className="req-card-footer">
                        <button onClick={() => setNoteAction({ type: 'manager-approve', id: r.id })} className="btn btn-success btn-sm">
                          <CheckCheck size={13} strokeWidth={2.2} /> Təsdiqlə → göndər
                        </button>
                        <button onClick={() => setNoteAction({ type: 'manager-reject', id: r.id })} className="btn btn-danger btn-sm">
                          <XCircle size={13} strokeWidth={2.2} /> Rədd et
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: 20 }}><EmptyState icon={CheckCircle2}>Baxılmalı sorğu yoxdur</EmptyState></div>
            )}

            <div className="section-head"><div className="section-title">Sahəmin Qərarları ({scopeHistory.length})</div></div>
            {scopeHistory.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
                {groupByEmployee(scopeHistory).map(([employeeName, items], i) => (
                  <div key={employeeName} className="card card-hover stagger-item" style={{ padding: 0, overflow: 'hidden', '--i': i }}>
                    <div style={{ padding: '12px 14px 4px', fontWeight: 700, fontSize: 14 }}>{employeeName}</div>
                    {items.map((r) => {
                      const sm = reqStatusMeta(r.status);
                      const stage = deriveApprovalStage(r, { profile, team });
                      return (
                        <div key={r.id} style={{ borderTop: '1px solid var(--ink-100)' }}>
                          <div style={{ height: 4, background: sm.color }} />
                          <div style={{ padding: 12 }}>
                            <div style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 8 }}>{r.training_title}</div>
                            <ReqStatusBadge status={r.status} />
                            <ApprovalStepper request={r} profile={profile} team={team} />
                            <div className="req-timestamps" style={{ margin: '6px 0 0' }}>
                              <span><b>Göndərilib:</b> {fmtDateTime(r.created_at)}</span>
                              {isDecidedStatus(r.status) && <span><b>Qərar:</b> {fmtDateTime(r.updated_at)}</span>}
                            </div>
                            {r.manager_note && (
                              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 8 }}>
                                <b>{stage.decisionBy?.role === 'Rəhbər' ? (stage.decisionBy.name || 'Rəhbər') : 'Manager'}:</b> {r.manager_note}
                              </div>
                            )}
                            {r.reviewer_note && (
                              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>
                                <b>{stage.decisionBy?.role === 'L&D' ? (stage.decisionBy.name || 'L&D') : 'L&D'}:</b> {r.reviewer_note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ marginBottom: 24 }}><EmptyState>Hələ qərar yoxdur</EmptyState></div>
            )}
          </>
        )}

        {isReviewer && (
          <>
            <div className="section-head" style={{ marginBottom: 4 }}><div className="section-title">Gələn Təlim Sorğuları (L&D)</div></div>
            <div className="section-sub">{pendingCount} sorğu analiz gözləyir</div>
            {Object.keys(reviewerActive).sort().map((dept, i) => (
              <div key={dept} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
                <div className="req-dept-head"><Folder size={15} strokeWidth={2} /> {dept} <span className="req-dept-count">{reviewerActive[dept].length}</span></div>
                <div className="req-list">
                  {reviewerActive[dept].map((r) => (
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

                      {r.reason && (
                        <div className="req-field-highlight">
                          <div className="req-field-label">Ehtiyacın yaranma səbəbi</div>
                          <div className="req-field-value">{r.reason}</div>
                        </div>
                      )}

                      <div className="req-field-grid">
                        {r.comp_cat && (
                          <div><div className="req-field-label">Kateqoriya</div><div className="req-field-value">{r.comp_cat}</div></div>
                        )}
                        {r.importance_level && (
                          <div><div className="req-field-label">Əhəmiyyət dərəcəsi</div><div className="req-field-value">{r.importance_level}</div></div>
                        )}
                        {r.current_skill_level && (
                          <div><div className="req-field-label">Cari səviyyə</div><div className="req-field-value">{r.current_skill_level}</div></div>
                        )}
                        {r.required_skill_level && (
                          <div><div className="req-field-label">Tələb olunan səviyyə</div><div className="req-field-value">{r.required_skill_level}</div></div>
                        )}
                        {(r.preferred_start || r.preferred_end) && (
                          <div><div className="req-field-label">İstənilən müddət</div><div className="req-field-value">{r.preferred_start || '—'} → {r.preferred_end || '—'}</div></div>
                        )}
                      </div>

                      {r.manager_note && (
                        <div className="req-field-note">
                          <div className="req-field-label">Manager qeydi</div>
                          <div className="req-field-value">{r.manager_note}</div>
                        </div>
                      )}

                      <div className="req-card-footer">
                        {r.status === 'Pending' && (
                          <button onClick={() => takeIntoReview(r.id)} className="btn btn-accent btn-sm"><Search size={13} strokeWidth={2.2} /> Analizə götür</button>
                        )}
                        {r.status === 'In Review' && (
                          <>
                            <button onClick={() => setNoteAction({ type: 'ld-approve', id: r.id })} className="btn btn-success btn-sm"><CheckCircle2 size={13} strokeWidth={2.2} /> Təsdiqlə</button>
                            <button onClick={() => setNoteAction({ type: 'ld-revise', id: r.id })} className="btn btn-warning btn-sm"><RotateCcw size={13} strokeWidth={2.2} /> Geri göndər</button>
                            <button onClick={() => setNoteAction({ type: 'ld-reject', id: r.id })} className="btn btn-danger btn-sm"><XCircle size={13} strokeWidth={2.2} /> Rədd et</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(reviewerActive).length === 0 && (
              <div className="card" style={{ marginBottom: 20 }}><EmptyState icon={CheckCircle2}>Aktiv sorğu yoxdur</EmptyState></div>
            )}

            {reviewerDecided.length > 0 && (
              <>
                <div className="section-head"><div className="section-title">Qərarlar tarixçəsi ({reviewerDecided.length})</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {groupByEmployee(reviewerDecided).map(([employeeName, items], i) => (
                    <div key={employeeName} className="card card-hover stagger-item" style={{ padding: 0, overflow: 'hidden', '--i': i }}>
                      <div style={{ padding: '12px 14px 4px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{employeeName}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{items[0].dept}</div>
                      </div>
                      {items.map((r) => {
                        const sm = reqStatusMeta(r.status);
                        const stage = deriveApprovalStage(r, { profile, team });
                        return (
                          <div key={r.id} style={{ borderTop: '1px solid var(--ink-100)' }}>
                            <div style={{ height: 4, background: sm.color }} />
                            <div style={{ padding: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                <div style={{ fontSize: 13, color: 'var(--ink-700)' }}>{r.training_title}</div>
                                <ReqStatusBadge status={r.status} />
                              </div>
                              <div className="req-timestamps" style={{ margin: '0 0 8px' }}>
                                <span><b>Göndərilib:</b> {fmtDateTime(r.created_at)}</span>
                                <span><b>Qərar:</b> {fmtDateTime(r.updated_at)}</span>
                              </div>
                              <ApprovalStepper request={r} profile={profile} team={team} />
                              {stage.decisionBy && (r.status === 'Rejected' || r.status === 'Needs Revision') && (
                                <div style={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 700, marginBottom: 4 }}>
                                  {stage.decisionBy.role}{stage.decisionBy.name ? ` — ${stage.decisionBy.name}` : ''} qərarı
                                </div>
                              )}
                              {r.manager_note && r.status !== 'Approved' && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 6 }}><b>Qeyd:</b> {r.manager_note}</div>}
                              {r.reviewer_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}><b>L&D qeyd:</b> {r.reviewer_note}</div>}
                              {/* Task 5: only L&D performs this final step — 'hr' is also a
                                  reviewer (isReviewer) for the review queue above, but not for
                                  this action. */}
                              {profile.role === 'ld' && r.status === 'Approved' && !r.linked_training_id && (
                                <button onClick={() => setAddToPlanRequest(r)} className="btn btn-purple btn-sm btn-block"><ListPlus size={13} strokeWidth={2.2} /> Plana Əlavə Et</button>
                              )}
                              {r.linked_training_id && (
                                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={13} strokeWidth={2.4} /> Planda var
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="section-head"><div className="section-title">Mənim Göndərdiklərim</div></div>
        <div className="card"><RequestTable list={myRequests} showNotes /></div>

        {showForm && (
          <RequestFormModal profile={profile} team={team} onClose={() => setShowForm(false)} onSubmitted={refresh} />
        )}

        {noteAction && (
          <NoteModal
            title={
              noteAction.type === 'manager-approve' ? 'Təsdiq qeydiniz (əsaslandırma)' :
              noteAction.type === 'manager-reject' ? 'Rədd səbəbi' :
              noteAction.type === 'ld-approve' ? 'Analiz qeydiniz (vəzifə uyğunluğu, büdcə və s.)' :
              noteAction.type === 'ld-revise' ? 'Nəyin düzəldilməli olduğunu izah edin' :
              'Rədd səbəbi'
            }
            placeholder={noteAction.type === 'ld-revise' ? 'Məsələn: təlimin adını daha dəqiq yazın, səbəbi əlavə edin...' : 'Qeydinizi yazın (istəyə bağlı)...'}
            confirmLabel={noteAction.type.includes('approve') ? 'Təsdiqlə' : noteAction.type === 'ld-revise' ? 'Geri göndər' : 'Rədd et'}
            confirmVariant={noteAction.type.includes('approve') ? 'success' : noteAction.type === 'ld-revise' ? 'warning' : 'danger'}
            required={noteAction.type === 'ld-revise'}
            onCancel={() => setNoteAction(null)}
            onConfirm={async (note) => {
              if (noteAction.type === 'manager-approve') await managerApprove(noteAction.id, note);
              if (noteAction.type === 'manager-reject') await managerReject(noteAction.id, note);
              if (noteAction.type === 'ld-approve') await ldDecide(noteAction.id, 'Approved', note);
              if (noteAction.type === 'ld-revise') await ldDecide(noteAction.id, 'Needs Revision', note);
              if (noteAction.type === 'ld-reject') await ldDecide(noteAction.id, 'Rejected', note);
            }}
          />
        )}

        {addToPlanRequest && (
          <AddToPlanModal request={addToPlanRequest} planYear={planYear} onClose={() => setAddToPlanRequest(null)} onSubmitted={refresh} />
        )}

        {resubmitRequest && (
          <ResubmitModal request={resubmitRequest} onClose={() => setResubmitRequest(null)} onSubmitted={refresh} />
        )}
      </div>
    </div>
  );
}
