import { useState, useMemo } from 'react';
import { sb } from '../lib/supabase';
import { reqStatusMeta, priorityMeta } from '../lib/helpers';
import { showToast } from '../lib/toast';
import NoteModal from './NoteModal';
import AddToPlanModal from './AddToPlanModal';

export default function AnnualTnaReview({ profile, requests, planYear, onDataChanged }) {
  const [noteAction, setNoteAction] = useState(null);
  const [addToPlanRequest, setAddToPlanRequest] = useState(null);

  const surveyRequests = useMemo(
    () => requests.filter((r) => r.source === 'Manager Survey'),
    [requests]
  );

  const grouped = useMemo(() => {
    const g = {};
    surveyRequests.filter((r) => r.status === 'Pending' || r.status === 'In Review').forEach((r) => {
      (g[r.dept] = g[r.dept] || []).push(r);
    });
    return g;
  }, [surveyRequests]);

  const decided = surveyRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected');

  function Badge({ meta }) {
    return <span className="badge" style={{ background: meta.color }}>{meta.label}</span>;
  }

  async function refresh() {
    setNoteAction(null);
    setAddToPlanRequest(null);
    await onDataChanged();
  }

  async function takeIntoReview(id) {
    const { error } = await sb.from('training_requests').update({ status: 'In Review', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    await onDataChanged();
  }

  async function decide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, reviewer_note: note, reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    await refresh();
  }

  if (surveyRequests.length === 0) {
    return <div className="card empty-state" style={{ marginTop: 20 }}>Hələ illik TNA sorğusu daxil olmayıb.</div>;
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ height: 1, background: 'var(--border)', margin: '10px 0 24px' }} />
      <div className="section-title">İllik TNA — Departament üzrə Baxış</div>
      <div className="section-sub">Rəhbərlərin doldurduğu illik cədvəllərdən daxil olan qeydlər</div>

      {Object.keys(grouped).sort().map((dept, i) => (
        <div key={dept} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>📁 {dept} ({grouped[dept].length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Ad Soyad</th><th>Vəzifə</th><th>Təlim</th><th>Səbəb</th>
                  <th>Prioritet</th><th>Status</th><th>Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {grouped[dept].map((r) => (
                  <tr key={r.id}>
                    <td>{r.employee_name}</td>
                    <td style={{ fontSize: 12.5 }}>{r.position || '—'}</td>
                    <td>{r.training_title}</td>
                    <td style={{ fontSize: 12.5, maxWidth: 220 }}>{r.reason || '—'}</td>
                    <td><Badge meta={priorityMeta(r.priority)} /></td>
                    <td><Badge meta={reqStatusMeta(r.status)} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.status === 'Pending' && (
                        <button onClick={() => takeIntoReview(r.id)} className="btn btn-accent btn-sm">Analizə götür</button>
                      )}
                      {r.status === 'In Review' && (
                        <>
                          <button onClick={() => setNoteAction({ type: 'approve', id: r.id })} className="btn btn-success btn-sm" style={{ marginRight: 6 }}>Təsdiqlə</button>
                          <button onClick={() => setNoteAction({ type: 'reject', id: r.id })} className="btn btn-danger btn-sm">Rədd et</button>
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
      {Object.keys(grouped).length === 0 && (
        <div className="card empty-state" style={{ marginBottom: 20 }}>Aktiv sorğu yoxdur</div>
      )}

      {decided.length > 0 && (
        <>
          <div className="section-head"><div className="section-title">Qərarlar tarixçəsi ({decided.length})</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {decided.map((r, i) => {
              const sm = reqStatusMeta(r.status);
              return (
                <div key={r.id} className="card card-hover stagger-item" style={{ padding: 0, overflow: 'hidden', '--i': i }}>
                  <div style={{ height: 6, background: sm.color }} />
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.employee_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{r.dept}</div>
                      </div>
                      <Badge meta={sm} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 8 }}>{r.training_title}</div>
                    {r.reviewer_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}><b>Qeyd:</b> {r.reviewer_note}</div>}
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

      {noteAction && (
        <NoteModal
          title={noteAction.type === 'approve' ? 'Analiz qeydiniz' : 'Rədd səbəbi'}
          placeholder="Qeydinizi yazın (istəyə bağlı)..."
          confirmLabel={noteAction.type === 'approve' ? 'Təsdiqlə' : 'Rədd et'}
          confirmVariant={noteAction.type === 'approve' ? 'success' : 'danger'}
          onCancel={() => setNoteAction(null)}
          onConfirm={async (note) => {
            await decide(noteAction.id, noteAction.type === 'approve' ? 'Approved' : 'Rejected', note);
          }}
        />
      )}

      {addToPlanRequest && (
        <AddToPlanModal request={addToPlanRequest} planYear={planYear} onClose={() => setAddToPlanRequest(null)} onSubmitted={refresh} />
      )}
    </div>
  );
}
