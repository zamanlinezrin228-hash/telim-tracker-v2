import { useState, useMemo } from 'react';
import { sb } from '../lib/supabase';
import { reqStatusMeta, priorityMeta } from '../lib/helpers';
import RequestFormModal from './RequestFormModal';
import NoteModal from './NoteModal';
import AddToPlanModal from './AddToPlanModal';

export default function RequestsView({ profile, team, requests, onDataChanged }) {
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
    const visible = requests.filter((r) => r.status !== 'Pending Manager Review');
    const grouped = {};
    visible.forEach((r) => { (grouped[r.dept] = grouped[r.dept] || []).push(r); });
    return grouped;
  }, [requests, isReviewer]);

  const reviewerActive = isReviewer
    ? Object.fromEntries(Object.entries(reviewerGrouped).map(([d, list]) => [d, list.filter((r) => r.status === 'Pending' || r.status === 'In Review')]).filter(([, list]) => list.length))
    : {};
  const reviewerDecided = isReviewer ? requests.filter((r) => r.status === 'Approved' || r.status === 'Rejected') : [];
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
    if (error) { alert('Xəta: ' + error.message); return; }
    await refresh();
  }

  async function takeIntoReview(id) {
    const { error } = await sb.from('training_requests').update({ status: 'In Review', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('Xəta: ' + error.message); return; }
    await onDataChanged();
  }

  async function ldDecide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, reviewer_note: note, reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { alert('Xəta: ' + error.message); return; }
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
            <tr><td colSpan={showNotes ? 6 : 4} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Hələ sorğu yoxdur</td></tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Təlim Sorğuları</div>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          + Yeni Sorğu
        </button>
      </div>

      {hasTeam && (
        <>
          <div style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 8px' }}>Baxılmalı Komanda Sorğuları ({toReview.length})</div>
          <div className="card" style={{ marginBottom: 20 }}>
            <table>
              <thead><tr><th>Ad Soyad</th><th>Təlim</th><th>Səbəb</th><th>Prioritet</th><th>Əməliyyat</th></tr></thead>
              <tbody>
                {toReview.length ? toReview.map((r) => (
                  <tr key={r.id}>
                    <td>{r.employee_name}</td>
                    <td>{r.training_title}</td>
                    <td style={{ fontSize: 12.5, color: '#64748b' }}>{r.reason || '—'}</td>
                    <td><Badge meta={priorityMeta(r.priority)} /></td>
                    <td>
                      <button
                        onClick={() => setNoteAction({ type: 'manager-approve', id: r.id })}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 12.5, cursor: 'pointer', marginRight: 6 }}
                      >
                        Təsdiqlə → göndər
                      </button>
                      <button
                        onClick={() => setNoteAction({ type: 'manager-reject', id: r.id })}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}
                      >
                        Rədd et
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>Baxılmalı sorğu yoxdur</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 15, fontWeight: 800, margin: '20px 0 12px' }}>Sahəmin Qərarları ({scopeHistory.length})</div>
          {scopeHistory.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
              {scopeHistory.map((r) => {
                const sm = reqStatusMeta(r.status);
                return (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: 6, background: sm.color }} />
                    <div style={{ padding: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.employee_name}</div>
                      <div style={{ fontSize: 13, color: '#334155', marginBottom: 10 }}>{r.training_title}</div>
                      <Badge meta={sm} />
                      {r.manager_note && <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}><b>Manager:</b> {r.manager_note}</div>}
                      {r.reviewer_note && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}><b>L&D:</b> {r.reviewer_note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: 24, marginBottom: 24 }}>Hələ qərar yoxdur</div>
          )}
        </>
      )}

      {isReviewer && (
        <>
          <div style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 4px' }}>Gələn Təlim Sorğuları (L&D)</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>{pendingCount} sorğu analiz gözləyir</div>
          {Object.keys(reviewerActive).sort().map((dept) => (
            <div key={dept} className="card" style={{ marginBottom: 14 }}>
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
                        <td>{r.training_title}<div style={{ fontSize: 12, color: '#94a3b8' }}>{r.reason || ''}</div></td>
                        <td style={{ fontSize: 12.5, color: '#64748b' }}>{r.manager_note || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>{r.comp_cat || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>{r.importance_level || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>{r.current_skill_level || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>{r.required_skill_level || '—'}</td>
                        <td><Badge meta={priorityMeta(r.priority)} /></td>
                        <td><Badge meta={reqStatusMeta(r.status)} /></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {r.status === 'Pending' && (
                            <button onClick={() => takeIntoReview(r.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>
                              Analizə götür
                            </button>
                          )}
                          {r.status === 'In Review' && (
                            <>
                              <button onClick={() => setNoteAction({ type: 'ld-approve', id: r.id })} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 12.5, cursor: 'pointer', marginRight: 6 }}>
                                Təsdiqlə
                              </button>
                              <button onClick={() => setNoteAction({ type: 'ld-reject', id: r.id })} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>
                                Rədd et
                              </button>
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
            <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: 30, marginBottom: 20 }}>Aktiv sorğu yoxdur</div>
          )}

          {reviewerDecided.length > 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, margin: '20px 0 12px' }}>Qərarlar tarixçəsi ({reviewerDecided.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
                {reviewerDecided.map((r) => {
                  const sm = reqStatusMeta(r.status);
                  return (
                    <div key={r.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: 6, background: sm.color }} />
                      <div style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.employee_name}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.dept}</div>
                          </div>
                          <Badge meta={sm} />
                        </div>
                        <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>{r.training_title}</div>
                        {r.reviewer_note && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}><b>L&D qeyd:</b> {r.reviewer_note}</div>}
                        {r.status === 'Approved' && !r.linked_training_id && (
                          <button onClick={() => setAddToPlanRequest(r)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                            Plana Əlavə Et
                          </button>
                        )}
                        {r.linked_training_id && <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ Planda var</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 8px' }}>Mənim Göndərdiklərim</div>
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
          confirmColor={noteAction.type.includes('approve') ? '#059669' : '#dc2626'}
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
        <AddToPlanModal request={addToPlanRequest} onClose={() => setAddToPlanRequest(null)} onSubmitted={refresh} />
      )}
    </div>
  );
}
