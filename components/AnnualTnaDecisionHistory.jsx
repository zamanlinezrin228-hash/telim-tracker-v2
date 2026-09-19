import { useState, useMemo } from 'react';
import { Folder, ListPlus, CheckCircle2, History } from 'lucide-react';
import { reqStatusMeta, groupByEmployee } from '../lib/helpers';
import { ReqStatusBadge, PriorityBadge } from './Badges';
import EmptyState from './EmptyState';
import AddToPlanModal from './AddToPlanModal';

// "Qərarlar tarixçəsi" tab content — the decided (Approved / Rejected /
// Needs Revision) Manager Survey requests, grouped by department and
// then by employee, with the "Plana Əlavə Et" action for approved items.
export default function AnnualTnaDecisionHistory({ requests, planYear, onDataChanged }) {
  const [addToPlanRequest, setAddToPlanRequest] = useState(null);

  const surveyRequests = useMemo(
    () => requests.filter((r) => r.source === 'Manager Survey'),
    [requests]
  );

  const decided = useMemo(
    () => surveyRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Needs Revision'),
    [surveyRequests]
  );

  const decidedGrouped = useMemo(() => {
    const g = {};
    decided.forEach((r) => { (g[r.dept] = g[r.dept] || []).push(r); });
    return g;
  }, [decided]);

  async function refresh() {
    setAddToPlanRequest(null);
    await onDataChanged();
  }

  if (decided.length === 0) {
    return <div className="card"><EmptyState icon={History}>Hələ qərar yoxdur</EmptyState></div>;
  }

  return (
    <div>
      <div className="section-title">Qərarlar tarixçəsi ({decided.length})</div>
      <div className="section-sub" style={{ marginBottom: 18 }}>Təsdiqlənmiş, rədd edilmiş və düzəlişə göndərilmiş illik TNA sorğuları</div>

      {Object.keys(decidedGrouped).sort().map((dept, i) => (
        <div key={dept} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
          <div className="req-dept-head"><Folder size={15} strokeWidth={2} /> {dept} <span className="req-dept-count">{decidedGrouped[dept].length}</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginTop: 12 }}>
            {groupByEmployee(decidedGrouped[dept]).map(([employeeName, items]) => (
              <div key={employeeName} className="card card-hover" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px 4px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{employeeName}</div>
                  {items[0].position && <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{items[0].position}</div>}
                </div>
                {items.map((r) => {
                  const statusColor = reqStatusMeta(r.status).color;
                  return (
                    <div key={r.id} style={{ borderTop: '1px solid var(--ink-100)' }}>
                      <div style={{ height: 4, background: statusColor }} />
                      <div style={{ padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                          <div style={{ fontSize: 13, color: 'var(--ink-700)' }}>{r.training_title}</div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <PriorityBadge priority={r.priority} />
                            <ReqStatusBadge status={r.status} />
                          </div>
                        </div>
                        {r.reason && (
                          <div className="req-field-highlight" style={{ marginBottom: 8 }}>
                            <div className="req-field-label">Ehtiyacın yaranma səbəbi</div>
                            <div className="req-field-value">{r.reason}</div>
                          </div>
                        )}
                        <div className="req-field-grid" style={{ marginBottom: 8 }}>
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
                        {r.reviewer_note && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}><b>Qeyd:</b> {r.reviewer_note}</div>}
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
            ))}
          </div>
        </div>
      ))}

      {addToPlanRequest && (
        <AddToPlanModal request={addToPlanRequest} planYear={planYear} onClose={() => setAddToPlanRequest(null)} onSubmitted={refresh} />
      )}
    </div>
  );
}
