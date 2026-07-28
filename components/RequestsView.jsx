import { useState } from 'react';
import { sb } from '../lib/supabase';
import { priorityMeta, reqStatusMeta } from '../lib/helpers';
import RequestFormModal from './RequestFormModal';
import AddToPlanModal from './AddToPlanModal';

function RequestListTable({ list, showNotes }) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Təlim</th><th>Prioritet</th><th>Status</th><th>Göndərilib</th>
            {showNotes && <><th>Manager qeydi</th><th>L&amp;D qeydi</th></>}
          </tr>
        </thead>
        <tbody>
          {list.length ? list.map(r => {
            const sm = reqStatusMeta(r.status), pm = priorityMeta(r.priority);
            return (
              <tr key={r.id}>
                <td>{r.training_title}</td>
                <td><span className="badge" style={{ background: pm.color }}>{pm.label}</span></td>
                <td><span className="badge" style={{ background: sm.color }}>{sm.label}</span></td>
                <td>{new Date(r.created_at).toLocaleDateString('az-AZ')}</td>
                {showNotes && <><td style={{ fontSize: 12.5 }}>{r.manager_note || '—'}</td><td style={{ fontSize: 12.5 }}>{r.reviewer_note || '—'}</td></>}
              </tr>
            );
          }) : (
            <tr><td colSpan={showNotes ? 6 : 4} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Hələ sorğu yoxdur</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function RequestsView({ profile, team, requests, onDataChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [planModalRequest, setPlanModalRequest] = useState(null);

  const role = profile.role;
  const hasTeam = team && team.length > 0;
  const isReviewer = role === 'hr' || role === 'ld';
  const myRequests = requests.filter(r => r.requested_by === profile.id);
  const toReview = requests.filter(r => r.reviewing_manager_id === profile.id && r.status === 'Pending Manager Review');

  const inScope = r => profile.scope_level === 'dept' ? r.dept === profile.dept : r.sube === profile.sube;
  const scopeHistory = requests.filter(r => r.status !== 'Pending Manager Review' && inScope(r));

  async function managerDecide(id, targetStatus) {
    const note = prompt(targetStatus === 'Pending' ? 'Təsdiq qeydiniz (əsaslandırma):' : 'Rədd səbəbi:') || '';
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, manager_note: note, manager_reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { alert('Xəta: ' + error.message); return; }
    onDataChanged();
  }

  async function takeIntoReview(id) {
    const { error } = await sb.from('training_requests').update({ status: 'In Review', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('Xəta: ' + error.message); return; }
    onDataChanged();
  }

  async function decideRequest(id, status) {
    const note = prompt(status === 'Approved' ? 'Analiz qeydiniz (vəzifə uyğunluğu, büdcə və s.):' : 'Rədd səbəbi:') || '';
    const { error } = await sb.from('training_requests').update({
      status, reviewer_note: note, reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { alert('Xəta: ' + error.message); return; }
    onDataChanged();
  }

  let visible = [], active = [], decided = [], grouped = {}, pendingCount = 0;
  if (isReviewer) {
    visible = requests.filter(r => r.status !== 'Pending Manager Review');
    active = visible.filter(r => r.status === 'Pending' || r.status === 'In Review');
    decided = visible.filter(r => r.status === 'Approved' || r.status === 'Rejected');
    active.forEach(r => { (grouped[r.dept] = grouped[r.dept] || []).push(r); });
    pendingCount = active.filter(r => r.status === 'Pending').length;
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
          <div className="card" style={{ marginBottom: 24 }}>
            <table>
              <thead><tr><th>Ad Soyad</th><th>Təlim</th><th>Səbəb</th><th>Prioritet</th><th>Əməliyyat</th></tr></thead>
              <tbody>
                {toReview.length ? toReview.map(r => {
                  const pm = priorityMeta(r.priority);
                  return (
                    <tr key={r.id}>
                      <td>{r.employee_name}</td>
                      <td>{r.training_title}</td>
                      <td style={{ fontSize: 12.5, color: '#64748b' }}>{r.reason || '—'}</td>
                      <td><span className="badge" style={{ background: pm.color }}>{pm.label}</span></td>
                      <td>
                        <button onClick={() => managerDecide(r.id, 'Pending')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 12.5, cursor: 'pointer', marginRight: 6 }}>Təsdiqlə → göndər</button>
                        <button onClick={() => managerDecide(r.id, 'Rejected')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>Rədd et</button>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>Baxılmalı sorğu yoxdur</td></tr>}
              </tbody>
            </table>
          </div>

          <details style={{ marginBottom: 24 }}>
            <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '8px 0' }}>Sahəmin Qərarları ({scopeHistory.length})</summary>
            <div className="card" style={{ marginTop: 8 }}>
              <table>
                <thead><tr><th>Ad Soyad</th><th>Təlim</th><th>Status</th><th>Manager qeydi</th><th>L&amp;D qeydi</th></tr></thead>
                <tbody>
                  {scopeHistory.length ? scopeHistory.map(r => {
                    const sm = reqStatusMeta(r.status);
                    return (
                      <tr key={r.id}>
                        <td>{r.employee_name}</td><td>{r.training_title}</td>
                        <td><span className="badge" style={{ background: sm.color }}>{sm.label}</span></td>
                        <td style={{ fontSize: 12.5 }}>{r.manager_note || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>{r.reviewer_note || '—'}</td>
                      </tr>
                    );
                  }) : <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>Hələ qərar yoxdur</td></tr>}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {isReviewer && (
        <>
          <div style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 4px' }}>Gələn Təlim Sorğuları (L&amp;D)</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>{pendingCount} sorğu analiz gözləyir</div>

          {Object.keys(grouped).length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>Aktiv sorğu yoxdur</div>
          )}
          {Object.keys(grouped).sort().map(dept => (
            <div className="card" style={{ marginBottom: 14 }} key={dept}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>📁 {dept} ({grouped[dept].length})</div>
              <table>
                <thead><tr><th>Ad Soyad</th><th>Təlim</th><th>Manager qeydi</th><th>Prioritet</th><th>Status</th><th>Əməliyyat</th></tr></thead>
                <tbody>
                  {grouped[dept].map(r => {
                    const sm = reqStatusMeta(r.status), pm = priorityMeta(r.priority);
                    return (
                      <tr key={r.id}>
                        <td>{r.employee_name}</td>
                        <td>{r.training_title}<div style={{ fontSize: 12, color: '#94a3b8' }}>{r.reason || ''}</div></td>
                        <td style={{ fontSize: 12.5, color: '#64748b' }}>{r.manager_note || '—'}</td>
                        <td><span className="badge" style={{ background: pm.color }}>{pm.label}</span></td>
                        <td><span className="badge" style={{ background: sm.color }}>{sm.label}</span></td>
                        <td>
                          {r.status === 'Pending' ? (
                            <button onClick={() => takeIntoReview(r.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>Analizə götür</button>
                          ) : (
                            <>
                              <button onClick={() => decideRequest(r.id, 'Approved')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 12.5, cursor: 'pointer', marginRight: 6 }}>Təsdiqlə</button>
                              <button onClick={() => decideRequest(r.id, 'Rejected')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>Rədd et</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {decided.length > 0 && (
            <details style={{ marginBottom: 24 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13.5, color: '#64748b', fontWeight: 600, padding: '8px 0' }}>Qərarlar tarixçəsi ({decided.length})</summary>
              <div className="card" style={{ marginTop: 8 }}>
                <table>
                  <thead><tr><th>Ad Soyad</th><th>Departament</th><th>Təlim</th><th>Status</th><th>L&amp;D qeydi</th><th>Əməliyyat</th></tr></thead>
                  <tbody>
                    {decided.map(r => {
                      const sm = reqStatusMeta(r.status);
                      const canAddToPlan = r.status === 'Approved' && !r.linked_training_id;
                      return (
                        <tr key={r.id}>
                          <td>{r.employee_name}</td><td>{r.dept}</td><td>{r.training_title}</td>
                          <td><span className="badge" style={{ background: sm.color }}>{sm.label}</span></td>
                          <td style={{ fontSize: 12.5 }}>{r.reviewer_note || '—'}</td>
                          <td>
                            {canAddToPlan ? (
                              <button onClick={() => setPlanModalRequest(r)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>Plana Əlavə Et</button>
                            ) : r.linked_training_id ? (
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>Planda var</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      <div style={{ fontSize: 16, fontWeight: 800, margin: '20px 0 8px' }}>Mənim Göndərdiklərim</div>
      <RequestListTable list={myRequests} showNotes />

      {showForm && (
        <RequestFormModal
          profile={profile}
          team={team}
          onClose={() => setShowForm(false)}
          onSubmitted={() => { setShowForm(false); onDataChanged(); }}
        />
      )}

      {planModalRequest && (
        <AddToPlanModal
          request={planModalRequest}
          onClose={() => setPlanModalRequest(null)}
          onDone={() => { setPlanModalRequest(null); onDataChanged(); }}
        />
      )}
    </div>
  );
}
