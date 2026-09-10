import { useState, useMemo } from 'react';
import { sb } from '../lib/supabase';
import { reqStatusMeta, priorityMeta } from '../lib/helpers';
import { showToast } from '../lib/toast';
import RequestFormModal from './RequestFormModal';
import NoteModal from './NoteModal';
import AddToPlanModal from './AddToPlanModal';

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

  function Badge({ meta }) {
    return <span className="badge" style={{ background: meta.color }}>{meta.label}</span>;
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
              <td><Badge meta={priorityMeta(r.priority)} /></td>
              <td><Badge meta={reqStatusMeta(r.status)} /></td>
              <td>{new Date(r.created_at).toLocaleDateString('az-AZ')}</td>
              {showNotes && (<><td style={{ fontSize: 12.5 }}>{r.manager_note || '—'}</td><td style={{ fontSize: 12.5 }}>{r.reviewer_note || '—'}</td></>)}
            </tr>
          )) : (
            <tr><td colSpan={showNotes ? 6 : 4} className="empty-state">Hələ sorğu yoxdur</td></tr>
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
          <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Yeni Sorğu</button>
        </div>
      </div>

      <div className="page">
        {hasTeam && (
          <>
            <div className="section-head"><div className="section-title">Baxılmalı Komanda Sorğuları ({toReview.length})</div></div>
            <div className="card" style={{ marginBottom: 20 }}>
              <table>
                <thead><tr><th>Ad Soyad</th><th>Təlim</th><th>Səbəb</th><th>Prioritet</th><th>Əməliyyat</th></tr></thead>
                <tbody>
                  {toReview.length ? toReview.map((r) => (
                    <tr key={r.id}>
                      <td>{r.employee_name}</td>
                      <td>{r.training_title}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{r.reason || '—'}</td>
                      <td><Badge meta={priorityMeta(r.priority)} /></td>
                      <td>
                        <button onClick={() => setNoteAction({ type: 'manager-approve', id: r.id })} className="btn btn-success btn-sm" style={{ marginRight: 6 }}>
                          Təsdiqlə → göndər
                        </button>
                        <button onClick={() => setNoteAction({ type: 'manager-reject', id: r.id })} className="btn btn-danger btn-sm">
                          Rədd et
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="empty-state">Baxılmalı sorğu yoxdur</td></tr>
                  )}
                </tbody>
              </table>
            </div>

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
                        <Badge meta={sm} />
                        {r.manager_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 8 }}><b>Manager:</b> {r.manager_note}</div>}
                        {r.reviewer_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}><b>L&D:</b> {r.reviewer_note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card empty-state" style={{ marginBottom: 24 }}>Hələ qərar yoxdur</div>
            )}
          </>
        )}

        {isReviewer && (
          <>
            <div className="section-head" style={{ marginBottom: 4 }}><div className="section-title">Gələn Təlim Sorğuları (L&D)</div></div>
            <div className="section-sub">{pendingCount} sorğu analiz gözləyir</div>
            {Object.keys(reviewerActive).sort().map((dept, i) => (
              <div key={dept} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>📁 {dept} ({reviewerActive[dept].length})</div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Ad Soyad</th><th>Təlim</th><th>Manager qeydi</th>
                        <th>Kateqoriya</th><th>Əhəmiyyət</th><th>Cari səviyyə</th><th>Tələb olunan</th>
                        <th>Prioritet</th><th>Status</th><th>Əməliyyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewerActive[dept].map((r) => (
                        <tr key={r.id}>
                          <td>{r.employee_name}</td>
                          <td>{r.training_title}<div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{r.reason || ''}</div></td>
                          <td style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{r.manager_note || '—'}</td>
                          <td style={{ fontSize: 12.5 }}>{r.comp_cat || '—'}</td>
                          <td style={{ fontSize: 12.5 }}>{r.importance_level || '—'}</td>
                          <td style={{ fontSize: 12.5 }}>{r.current_skill_level || '—'}</td>
                          <td style={{ fontSize: 12.5 }}>{r.required_skill_level || '—'}</td>
                          <td><Badge meta={priorityMeta(r.priority)} /></td>
                          <td><Badge meta={reqStatusMeta(r.status)} /></td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {r.status === 'Pending' && (
                              <button onClick={() => takeIntoReview(r.id)} className="btn btn-accent btn-sm">Analizə götür</button>
                            )}
                            {r.status === 'In Review' && (
                              <>
                                <button onClick={() => setNoteAction({ type: 'ld-approve', id: r.id })} className="btn btn-success btn-sm" style={{ marginRight: 6 }}>Təsdiqlə</button>
                                <button onClick={() => setNoteAction({ type: 'ld-reject', id: r.id })} className="btn btn-danger btn-sm">Rədd et</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {Object.keys(reviewerActive).length === 0 && (
              <div className="card empty-state" style={{ marginBottom: 20 }}>Aktiv sorğu yoxdur</div>
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
                            <Badge meta={sm} />
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 8 }}>{r.training_title}</div>
                          {r.reviewer_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}><b>L&D qeyd:</b> {r.reviewer_note}</div>}
                          {r.status === 'Approved' && !r.linked_training_id && (
                            <button onClick={() => setAddToPlanRequest(r)} className="btn btn-purple btn-sm btn-block">Plana Əlavə Et</button>
                          )}
                          {r.linked_training_id && <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Planda var</div>}
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
