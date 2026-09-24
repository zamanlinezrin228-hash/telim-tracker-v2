import { useState, useMemo } from 'react';
import { Folder, Clock, Search, CheckCircle2, XCircle, CalendarDays, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { sb } from '../lib/supabase';
import { showToast } from '../lib/toast';
import { fmtDateTime, isDecidedStatus, reqStatusMeta } from '../lib/helpers';
import { ReqStatusBadge, PriorityBadge } from './Badges';
import ApprovalStepper from './ApprovalStepper';
import EmptyState from './EmptyState';
import NoteModal from './NoteModal';
import CountUp from './CountUp';

function deptAnchorId(dept) {
  return 'tna-dept-' + dept.replace(/[^a-zA-Z0-9əöüğıçşƏÖÜĞIÇŞ]+/g, '-');
}

function scrollToDept(dept) {
  const el = document.getElementById(deptAnchorId(dept));
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// "Departament üzrə baxış" tab content — every Manager Survey request that
// isn't yet terminally decided, grouped by department. L&D's RLS access
// already covers every row regardless of stage, so this includes requests
// still sitting at a manager hop ('Pending Manager Review') too — L&D can
// see a request exists and its current stage from the moment it's
// submitted, not only once it actually reaches L&D's own queue. The
// take-into-review / approve / revise / reject actions only ever appear
// once a row has actually reached L&D (Pending/In Review); a still-at-
// manager-stage row is read-only here.
const STATUS_FILTERS = [
  { key: 'all', label: 'Hamısı' },
  { key: 'Pending Manager Review', label: 'Rəhbər səviyyəsində' },
  { key: 'Pending', label: 'Analiz gözləyir' },
  { key: 'In Review', label: 'Baxılır' },
];

export default function AnnualTnaActiveReview({ profile, requests, onDataChanged }) {
  const [noteAction, setNoteAction] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  // The `requests` prop only catches up once the parent's app-wide refresh
  // (several sequential queries) finishes — without this, a just-decided
  // row sits there looking untouched and invites clicking it again.
  const [locallyUpdated, setLocallyUpdated] = useState(() => new Map());

  const surveyRequests = useMemo(
    () => requests.filter((r) => r.source === 'Manager Survey').map((r) => locallyUpdated.get(r.id) ? { ...r, ...locallyUpdated.get(r.id) } : r),
    [requests, locallyUpdated]
  );

  const activeRequests = useMemo(
    () => surveyRequests.filter((r) => !isDecidedStatus(r.status)),
    [surveyRequests]
  );

  const grouped = useMemo(() => {
    const g = {};
    activeRequests.filter((r) => statusFilter === 'all' || r.status === statusFilter).forEach((r) => {
      (g[r.dept] = g[r.dept] || []).push(r);
    });
    return g;
  }, [activeRequests, statusFilter]);

  const decided = surveyRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Needs Revision');

  const pendingCount = surveyRequests.filter((r) => r.status === 'Pending').length;
  const inReviewCount = surveyRequests.filter((r) => r.status === 'In Review').length;
  const approvedCount = decided.filter((r) => r.status === 'Approved').length;
  const revisionCount = decided.filter((r) => r.status === 'Needs Revision').length;
  const rejectedCount = decided.filter((r) => r.status === 'Rejected').length;

  const statCards = [
    { label: 'Analiz gözləyir', value: pendingCount, Icon: Clock, color: '#d97706' },
    { label: 'Baxılır', value: inReviewCount, Icon: Search, color: '#2563eb' },
    { label: 'Təsdiqlənib', value: approvedCount, Icon: CheckCircle2, color: '#059669' },
    { label: 'Düzəliş tələb olunur', value: revisionCount, Icon: RotateCcw, color: '#ea580c' },
    { label: 'Rədd edilib', value: rejectedCount, Icon: XCircle, color: '#dc2626' },
  ];

  const activeDepts = Object.keys(grouped).sort();

  function toggleDept(dept) {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept); else next.add(dept);
      return next;
    });
  }

  function jumpToDept(dept) {
    setExpandedDepts((prev) => new Set(prev).add(dept));
    setTimeout(() => scrollToDept(dept), 50);
  }

  function refresh() {
    setNoteAction(null);
    // Fire-and-forget: this can take a few seconds and must never gate the
    // modal closing or the row updating — locallyUpdated already handles that.
    if (onDataChanged) onDataChanged();
  }

  async function takeIntoReview(id) {
    const { error } = await sb.from('training_requests').update({ status: 'In Review', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setLocallyUpdated((prev) => new Map(prev).set(id, { status: 'In Review' }));
    if (onDataChanged) onDataChanged();
  }

  const DECIDE_TOAST = { Approved: 'Təsdiqləndi.', 'Needs Revision': 'Geri göndərildi.', Rejected: 'Rədd edildi.' };

  async function decide(id, targetStatus, note) {
    const { error } = await sb.from('training_requests').update({
      status: targetStatus, reviewer_note: note, reviewed_by: profile.id, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    setLocallyUpdated((prev) => new Map(prev).set(id, { status: targetStatus, reviewer_note: note }));
    showToast(DECIDE_TOAST[targetStatus] || 'Yadda saxlanıldı.', 'success');
    refresh();
  }

  if (surveyRequests.length === 0) {
    return <div className="card"><EmptyState icon={CalendarDays}>Hələ illik TNA sorğusu daxil olmayıb.</EmptyState></div>;
  }

  return (
    <div>
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

      <div className="subtab-nav" style={{ marginBottom: 16 }}>
        {STATUS_FILTERS.map((f) => {
          const count = f.key === 'all' ? activeRequests.length : activeRequests.filter((r) => r.status === f.key).length;
          return (
            <button
              key={f.key}
              className={'subtab-pill' + (statusFilter === f.key ? ' active' : '')}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label} <span className="badge-count">{count}</span>
            </button>
          );
        })}
      </div>

      {activeDepts.length > 1 && (
        <div className="dept-jump-nav">
          {activeDepts.map((dept) => (
            <button key={dept} className="dept-jump-pill" onClick={() => jumpToDept(dept)}>
              <Folder size={13} strokeWidth={2} /> {dept} <span className="count">{grouped[dept].length}</span>
            </button>
          ))}
        </div>
      )}

      {activeDepts.map((dept, i) => {
        const isOpen = expandedDepts.has(dept);
        return (
          <div key={dept} id={deptAnchorId(dept)} className="card stagger-item" style={{ marginBottom: 14, padding: isOpen ? undefined : '14px 20px', '--i': i }}>
            <button className="req-dept-head req-dept-head-toggle" onClick={() => toggleDept(dept)}>
              {isOpen ? <ChevronDown size={15} strokeWidth={2.4} /> : <ChevronRight size={15} strokeWidth={2.4} />}
              <Folder size={15} strokeWidth={2} /> {dept} <span className="req-dept-count">{grouped[dept].length}</span>
            </button>
            {isOpen && (
              <div className="req-list" style={{ marginTop: 14 }}>
                {grouped[dept].map((r) => (
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

                    <ApprovalStepper request={r} profile={profile} />

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
                          <button onClick={() => setNoteAction({ type: 'revise', id: r.id })} className="btn btn-warning btn-sm"><RotateCcw size={13} strokeWidth={2.2} /> Geri göndər</button>
                          <button onClick={() => setNoteAction({ type: 'reject', id: r.id })} className="btn btn-danger btn-sm"><XCircle size={13} strokeWidth={2.2} /> Rədd et</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {activeDepts.length === 0 && (
        <div className="card"><EmptyState icon={CheckCircle2}>Aktiv sorğu yoxdur</EmptyState></div>
      )}

      {noteAction && (
        <NoteModal
          title={noteAction.type === 'approve' ? 'Analiz qeydiniz' : noteAction.type === 'revise' ? 'Nəyin düzəldilməli olduğunu izah edin' : 'Rədd səbəbi'}
          placeholder={noteAction.type === 'revise' ? 'Məsələn: təlimin adını daha dəqiq yazın, səbəbi əlavə edin...' : 'Qeydinizi yazın (istəyə bağlı)...'}
          confirmLabel={noteAction.type === 'approve' ? 'Təsdiqlə' : noteAction.type === 'revise' ? 'Geri göndər' : 'Rədd et'}
          confirmVariant={noteAction.type === 'approve' ? 'success' : noteAction.type === 'revise' ? 'warning' : 'danger'}
          required={noteAction.type === 'revise'}
          onCancel={() => setNoteAction(null)}
          onConfirm={async (note) => {
            const targetStatus = noteAction.type === 'approve' ? 'Approved' : noteAction.type === 'revise' ? 'Needs Revision' : 'Rejected';
            await decide(noteAction.id, targetStatus, note);
          }}
        />
      )}
    </div>
  );
}
