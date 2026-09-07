import { useState, useMemo } from 'react';
import { sb } from '../lib/supabase';
import { reqStatusMeta, priorityMeta } from '../lib/helpers';
import NoteModal from './NoteModal';
import AddToPlanModal from './AddToPlanModal';

export default function AnnualTnaReview({ profile, requests, onDataChanged }) {
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
    if (error) { alert('Xəta: ' + error.message); return; }
    await onDataChanged();
  }

  async function decide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, reviewer_note: note, reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { alert('Xəta: ' + error.message); return; }
    await refresh();
  }

  if (surveyRequests.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: 30, marginTop: 20 }}>
        Hələ illik TNA sorğusu daxil olmayıb.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ height: 1, background: '#e2e8f0', margin: '10px 0 24px' }} />
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>İllik TNA — Departament üzrə Baxış</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Rəhbərlərin doldurduğu illik cədvəllərdən daxil olan qeydlər</div>

      {Object.keys(grouped).sort().map((dept) => (
        <div key={dept} className="card" style={{ marginBottom: 14 }}>
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
                        <button onClick={() => takeIntoReview(r.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>
                          Analizə götür
                        </button>
                      )}
                      {r.status === 'In Review' && (
                        <>
                          <button onClick={() => setNoteAction({ type: 'approve', id: r.id })} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: 12.5, cursor: 'pointer', marginRight: 6 }}>
                            Təsdiqlə
                          </button>
                          <button onClick={() => setNoteAction({ type: 'reject', id: r.id })} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, cursor: 'pointer' }}>
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
      {Object.keys(grouped).length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: 24, marginBottom: 20 }}>Aktiv sorğu yoxdur</div>
      )}

      {decided.length > 0 && (
        <>
          <div style={{ fontSize: 15, fontWeight: 800, margin: '20px 0 12px' }}>Qərarlar tarixçəsi ({decided.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {decided.map((r) => {
              const sm = reqStatusMeta(r.status);
              return (
                <div key={r.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: 6, background: sm.color }} />
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.employee_name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.dept}</div>
                      </div>
                      <Badge meta={sm} />
                    </div>
                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>{r.training_title}</div>
                    {r.reviewer_note && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}><b>Qeyd:</b> {r.reviewer_note}</div>}
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

      {noteAction && (
        <NoteModal
          title={noteAction.type === 'approve' ? 'Analiz qeydiniz' : 'Rədd səbəbi'}
          placeholder="Qeydinizi yazın (istəyə bağlı)..."
          confirmLabel={noteAction.type === 'approve' ? 'Təsdiqlə' : 'Rədd et'}
          confirmColor={noteAction.type === 'approve' ? '#059669' : '#dc2626'}
          onCancel={() => setNoteAction(null)}
          onConfirm={async (note) => {
            await decide(noteAction.id, noteAction.type === 'approve' ? 'Approved' : 'Rejected', note);
          }}
        />
      )}

      {addToPlanRequest && (
        <AddToPlanModal request={addToPlanRequest} onClose={() => setAddToPlanRequest(null)} onSubmitted={refresh} />
      )}
    </div>
  );
}
