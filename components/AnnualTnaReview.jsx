import { useState, useMemo } from 'react';
import { Folder, Clock, Search, CheckCircle2, XCircle, CalendarDays, ListPlus } from 'lucide-react';
import { sb } from '../lib/supabase';
import { reqStatusMeta } from '../lib/helpers';
import { showToast } from '../lib/toast';
import { ReqStatusBadge, PriorityBadge } from './Badges';
import EmptyState from './EmptyState';
import NoteModal from './NoteModal';
import AddToPlanModal from './AddToPlanModal';
import CountUp from './CountUp';

function deptAnchorId(dept) {
  return 'tna-dept-' + dept.replace(/[^a-zA-Z0-9əöüğıçşƏÖÜĞIÇŞ]+/g, '-');
}

function scrollToDept(dept) {
  const el = document.getElementById(deptAnchorId(dept));
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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

  const decidedGrouped = useMemo(() => {
    const g = {};
    decided.forEach((r) => { (g[r.dept] = g[r.dept] || []).push(r); });
    return g;
  }, [decided]);

  const pendingCount = surveyRequests.filter((r) => r.status === 'Pending').length;
  const inReviewCount = surveyRequests.filter((r) => r.status === 'In Review').length;
  const approvedCount = decided.filter((r) => r.status === 'Approved').length;
  const rejectedCount = decided.filter((r) => r.status === 'Rejected').length;

  const statCards = [
    { label: 'Analiz gözləyir', value: pendingCount, Icon: Clock, color: '#d97706' },
    { label: 'Baxılır', value: inReviewCount, Icon: Search, color: '#2563eb' },
    { label: 'Təsdiqlənib', value: approvedCount, Icon: CheckCircle2, color: '#059669' },
    { label: 'Rədd edilib', value: rejectedCount, Icon: XCircle, color: '#dc2626' },
  ];

  const activeDepts = Object.keys(grouped).sort();

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
    return <div className="card" style={{ marginTop: 20 }}><EmptyState icon={CalendarDays}>Hələ illik TNA sorğusu daxil olmayıb.</EmptyState></div>;
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ height: 1, background: 'var(--border)', margin: '10px 0 24px' }} />
      <div className="section-title">İllik TNA — Departament üzrə Baxış</div>
      <div className="section-sub">Rəhbərlərin doldurduğu illik cədvəllərdən daxil olan qeydlər</div>

      <div className="kpi-grid">
        {statCards.map((s, i) => (
          <div className="stat-card stagger-item" key={s.label} style={{ '--i': i }}>
            <div className="stat-icon" style={{ '--icon-color': s.color, color: s.color }}><s.Icon size={16} strokeWidth={2.2} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}><CountUp value={s.value} /></div>
          </div>
        ))}
      </div>

      {activeDepts.length > 1 && (
        <div className="dept-jump-nav">
          {activeDepts.map((dept) => (
            <button key={dept} className="dept-jump-pill" onClick={() => scrollToDept(dept)}>
              <Folder size={13} strokeWidth={2} /> {dept} <span className="count">{grouped[dept].length}</span>
            </button>
          ))}
        </div>
      )}

      {activeDepts.map((dept, i) => (
        <div key={dept} id={deptAnchorId(dept)} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
          <div className="req-dept-head"><Folder size={15} strokeWidth={2} /> {dept} <span className="req-dept-count">{grouped[dept].length}</span></div>
          <div className="req-list">
            {grouped[dept].map((r) => (
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

                <div className="req-card-footer">
                  {r.status === 'Pending' && (
                    <button onClick={() => takeIntoReview(r.id)} className="btn btn-accent btn-sm"><Search size={13} strokeWidth={2.2} /> Analizə götür</button>
                  )}
                  {r.status === 'In Review' && (
                    <>
                      <button onClick={() => setNoteAction({ type: 'approve', id: r.id })} className="btn btn-success btn-sm"><CheckCircle2 size={13} strokeWidth={2.2} /> Təsdiqlə</button>
                      <button onClick={() => setNoteAction({ type: 'reject', id: r.id })} className="btn btn-danger btn-sm"><XCircle size={13} strokeWidth={2.2} /> Rədd et</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {activeDepts.length === 0 && (
        <div className="card" style={{ marginBottom: 20 }}><EmptyState icon={CheckCircle2}>Aktiv sorğu yoxdur</EmptyState></div>
      )}

      {decided.length > 0 && (
        <>
          <div className="section-head"><div className="section-title">Qərarlar tarixçəsi ({decided.length})</div></div>
          {Object.keys(decidedGrouped).sort().map((dept, i) => (
            <div key={dept} className="card stagger-item" style={{ marginBottom: 14, '--i': i }}>
              <div className="req-dept-head"><Folder size={15} strokeWidth={2} /> {dept} <span className="req-dept-count">{decidedGrouped[dept].length}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginTop: 12 }}>
                {decidedGrouped[dept].map((r) => {
                  const statusColor = reqStatusMeta(r.status).color;
                  return (
                    <div key={r.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{ height: 6, background: statusColor }} />
                      <div style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.employee_name}</div>
                          <ReqStatusBadge status={r.status} />
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink-700)', marginBottom: 8 }}>{r.training_title}</div>
                        {r.reason && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8, lineHeight: 1.5 }}>{r.reason}</div>}
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
            </div>
          ))}
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
