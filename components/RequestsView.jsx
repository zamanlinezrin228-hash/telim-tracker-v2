import { useState, useMemo } from 'react';
import { Plus, Folder, Clock, Search, CheckCircle2, XCircle, FileText, CheckCheck, ListPlus } from 'lucide-react';
import { sb } from '../lib/supabase';
import { reqStatusMeta } from '../lib/helpers';
import { showToast } from '../lib/toast';
import { ReqStatusBadge, PriorityBadge } from './Badges';
import EmptyState from './EmptyState';
import RequestFormModal from './RequestFormModal';
import NoteModal from './NoteModal';
import AddToPlanModal from './AddToPlanModal';
import CountUp from './CountUp';

export default function RequestsView({ profile, team, requests, planYear, onDataChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [noteAction, setNoteAction] = useState(null);
  const [addToPlanRequest, setAddToPlanRequest] = useState(null);

  const role = profile.role;
  const hasTeam = team && team.length > 0;
  const isReviewer = role === 'hr' || role === 'ld';
  const myRequests = requests.filter((r) => r.requested_by === profile.id);
  const toReview = requests.filter((r) => r.reviewing_manager_id === profile.id && r.status === 'Pending Manager Review');

  const scopeHistory = useMemo(() => {
    if (!hasTeam) return [];
    const inScope = (r) => profile.scope_level === 'dept' ? r.dept === profile.dept : r.sube === profile.sube;
    return requests.filter((r) => r.status !== 'Pending Manager Review' && inScope(r));
  }, [requests, hasTeam, profile]);

  const reviewerGrouped = useMemo(() => {
    if (!isReviewer) return {};
    const visible = requests.filter((r) => r.status !== 'Pending Manager Review' && r.source !== 'Manager Survey');
    const grouped = {};
    visible.forEach((r) => { (grouped[r.dept] = grouped[r.dept] || []).push(r); });
    return grouped;
  }, [requests, isReviewer]);

  const reviewerActive = isReviewer
    ? Object.fromEntries(Object.entries(reviewerGrouped).map(([d, list]) => [d, list.filter((r) => r.status === 'Pending' || r.status === 'In Review')]).filter(([, list]) => list.length))
    : {};
  const reviewerDecided = isReviewer ? requests.filter((r) => (r.status === 'Approved' || r.status === 'Rejected') && r.source !== 'Manager Survey') : [];
  const pendingCount = isReviewer ? requests.filter((r) => r.status === 'Pending').length : 0;

  const reviewInReviewCount = isReviewer ? Object.values(reviewerActive).flat().filter((r) => r.status === 'In Review').length : 0;
  const reviewApprovedCount = reviewerDecided.filter((r) => r.status === 'Approved').length;
  const reviewRejectedCount = reviewerDecided.filter((r) => r.status === 'Rejected').length;

  const myPendingCount = myRequests.filter((r) => r.status === 'Pending' || r.status === 'Pending Manager Review' || r.status === 'In Review').length;
  const myApprovedCount = myRequests.filter((r) => r.status === 'Approved').length;
  const myRejectedCount = myRequests.filter((r) => r.status === 'Rejected').length;

  const statCards = isReviewer
    ? [
        { label: 'Analiz gözləyir', value: pendingCount, Icon: Clock, color: '#d97706', bg: '#fffbeb' },
        { label: 'Baxılır', value: reviewInReviewCount, Icon: Search, color: '#2563eb', bg: '#eff6ff' },
        { label: 'Təsdiqlənib', value: reviewApprovedCount, Icon: CheckCircle2, color: '#059669', bg: '#f0fdf4' },
        { label: 'Rədd edilib', value: reviewRejectedCount, Icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
      ]
    : [
        { label: 'Mənim sorğularım', value: myRequests.length, Icon: FileText, color: '#2563eb', bg: '#eff6ff' },
        { label: 'Gözləyir', value: myPendingCount, Icon: Clock, color: '#d97706', bg: '#fffbeb' },
        { label: 'Təsdiqlənib', value: myApprovedCount, Icon: CheckCircle2, color: '#059669', bg: '#f0fdf4' },
        { label: 'Rədd edilib', value: myRejectedCount, Icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
      ];

  async function refresh() {
    setShowForm(false);
    setNoteAction(null);
    setAddToPlanRequest(null);
    await onDataChanged();
  }

  async function managerDecide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, manager_note: note, manager_reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    await refresh();
  }

  async function takeIntoReview(id) {
    const { error } = await sb.from('training_requests').update({ status: 'In Review', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    await onDataChanged();
  }

  async function ldDecide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, reviewer_note: note, reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    await refresh();
  }

  function RequestTable({ list, showNotes }) {
    return (
      <table>
        <thead>
          <tr>
            <th>Təlim</th><th>Prioritet</th><th>Status</th><th>Göndərilib</th>
            {showNotes && <><th>Manager qeydi</th><th>L&D qeydi</th></>}
          </tr>
        </thead>
        <tbody>
          {list.length ? list.map((r) => (
            <tr key={r.id}>
              <td>{r.training_title}</td>
              <td><PriorityBadge priority={r.priority} /></td>
              <td><ReqStatusBadge status={r.status} /></td>
              <td>{new Date(r.created_at).toLocaleDateString('az-AZ')}</td>
              {showNotes && (<><td style={{ fontSize: 12.5 }}>{r.manager_note || '—'}</td><td style={{ fontSize: 12.5 }}>{r.reviewer_note || '—'}</td></>)}
            </tr>
          )) : (
            <tr><td colSpan={showNotes ? 6 : 4}><EmptyState icon={FileText}>Hələ sorğu yoxdur</EmptyState></td></tr>
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
          <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus size={15} strokeWidth={2.4} /> Yeni Sorğu</button>
        </div>
      </div>

      <div className="page">
        <div className="kpi-grid">
          {statCards.map((s, i) => (
            <div className="stat-card stagger-item" key={s.label} style={{ '--i': i }}>
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}><s.Icon size={16} strokeWidth={2.2} /></div>
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
                    <div className="req-card" key={r.id}>
                      <div className="req-card-top">
                        <div>
                          <div className="req-card-name">{r.employee_name}</div>
                          <div className="req-card-training">{r.training_title}</div>
                        </div>
                        <div className="req-card-badges"><PriorityBadge priority={r.priority} /></div>
                      </div>
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
                {scopeHistory.map((r, i) => {
                  const sm = reqStatusMeta(r.status);
                  return (
                    <div key={r.id} className="card card-hover stagger-item" style={{ padding: 0, overflow: 'hidden', '--i': i }}>
                      <div style={{ height: 6, background: sm.color }} />
                      <div style={{ padding: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.employee_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 10 }}>{r.training_title}</div>
                        <ReqStatusBadge status={r.status} />
                        {r.manager_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 8 }}><b>Manager:</b> {r.manager_note}</div>}
                        {r.reviewer_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}><b>L&D:</b> {r.reviewer_note}</div>}
                      </div>
                    </div>
                  );
                })}
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
                  {reviewerDecided.map((r, i) => {
                    const sm = reqStatusMeta(r.status);
                    return (
                      <div key={r.id} className="card card-hover stagger-item" style={{ padding: 0, overflow: 'hidden', '--i': i }}>
                        <div style={{ height: 6, background: sm.color }} />
                        <div style={{ padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.employee_name}</div>
                              <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{r.dept}</div>
                            </div>
                            <ReqStatusBadge status={r.status} />
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 8 }}>{r.training_title}</div>
                          {r.reviewer_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}><b>L&D qeyd:</b> {r.reviewer_note}</div>}
                          {r.status === 'Approved' && !r.linked_training_id && (
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
              'Rədd səbəbi'
            }
            placeholder="Qeydinizi yazın (istəyə bağlı)..."
            confirmLabel={noteAction.type.includes('approve') ? 'Təsdiqlə' : 'Rədd et'}
            confirmVariant={noteAction.type.includes('approve') ? 'success' : 'danger'}
            onCancel={() => setNoteAction(null)}
            onConfirm={async (note) => {
              if (noteAction.type === 'manager-approve') await managerDecide(noteAction.id, 'Pending', note);
              if (noteAction.type === 'manager-reject') await managerDecide(noteAction.id, 'Rejected', note);
              if (noteAction.type === 'ld-approve') await ldDecide(noteAction.id, 'Approved', note);
              if (noteAction.type === 'ld-reject') await ldDecide(noteAction.id, 'Rejected', note);
            }}
          />
        )}

        {addToPlanRequest && (
          <AddToPlanModal request={addToPlanRequest} planYear={planYear} onClose={() => setAddToPlanRequest(null)} onSubmitted={refresh} />
        )}
      </div>
    </div>
  );
}
