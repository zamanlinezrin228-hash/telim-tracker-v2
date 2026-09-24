export const STATUS_META = {
  'Scheduled to Commence on Planned Date': { label: 'Planlaşdırılıb', color: '#d97706' },
  'In Progress': { label: 'Davam edir', color: '#2563eb' },
  'Postponed': { label: 'Təxirə salınıb', color: '#ea580c' },
  'Completed': { label: 'Tamamlanıb', color: '#059669' },
  'Canceled': { label: 'Ləğv edilib', color: '#dc2626' },
};

export const PRIORITY_META = {
  Critical: { label: 'Kritik', color: '#dc2626' },
  High: { label: 'Yüksək', color: '#ea580c' },
  Medium: { label: 'Orta', color: '#d97706' },
  Low: { label: 'Aşağı', color: '#64748b' },
};

export const REQ_STATUS_META = {
  'Pending Manager Review': { label: 'Manager Baxışında', color: '#7c3aed' },
  Pending: { label: 'Gözləyir', color: '#d97706' },
  'In Review': { label: 'Baxılır (L&D)', color: '#2563eb' },
  'Needs Revision': { label: 'Düzəliş tələb olunur', color: '#ea580c' },
  Approved: { label: 'Təsdiqləndi', color: '#059669' },
  Rejected: { label: 'Rədd edildi', color: '#dc2626' },
};

export function statusMeta(st) {
  return STATUS_META[st] || { label: st || '—', color: '#94a3b8' };
}
export function priorityMeta(pr) {
  return PRIORITY_META[pr] || { label: '—', color: '#94a3b8' };
}
export function reqStatusMeta(s) {
  return REQ_STATUS_META[s] || { label: s || '—', color: '#94a3b8' };
}
export function fmtMoney(n) {
  return Math.round(n || 0).toLocaleString('az-AZ') + ' ₼';
}

// day-month-year hour:minute, used for submission/decision timestamps on
// training_requests (created_at / updated_at) wherever status is shown.
export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

const DECIDED_STATUSES = new Set(['Approved', 'Rejected', 'Needs Revision']);
export function isDecidedStatus(status) {
  return DECIDED_STATUSES.has(status);
}
export function computeBudgetStatus() {
  const month = new Date().getMonth() + 1;
  const inWindow = month === 10 || month === 11 || month === 12 || month === 1;
  return inWindow ? 'Büdcələnmiş' : 'Büdcədən kənar';
}

export function groupByEmployee(list) {
  const map = {};
  list.forEach((r) => { (map[r.employee_name] = map[r.employee_name] || []).push(r); });
  return Object.entries(map);
}

// Task 8: derive an accurate approval-chain stage from status +
// reviewing_manager_id + which note field was last touched, since the flat
// status string alone doesn't say WHO currently holds a 'Pending Manager
// Review' row (could be any level of manager) or WHICH side (a manager vs
// L&D) produced a terminal Rejected/Needs Revision. No new DB columns:
// manager_reviewed_by/reviewed_by already record exactly that.
export const APPROVAL_STEPS = [
  { key: 'submitted', label: 'Göndərildi' },
  { key: 'manager', label: 'Rəhbər təsdiqi' },
  { key: 'ld', label: 'L&D baxışı' },
  { key: 'result', label: 'Nəticə' },
];

// Which side most recently decided a terminal Rejected/Needs Revision —
// L&D always stamps reviewed_by when it acts (even for a revise), so its
// presence wins over an earlier manager approval note on the same row.
export function decisionOrigin(r) {
  if (r.status !== 'Rejected' && r.status !== 'Needs Revision') return null;
  if (r.reviewed_by) return 'ld';
  if (r.manager_reviewed_by) return 'manager';
  return null;
}

function resolveName(id, team) {
  if (!id || !team) return null;
  const m = team.find((t) => t.id === id);
  return m ? m.full_name_az : null;
}

export function deriveApprovalStage(r, { profile, team } = {}) {
  const origin = decisionOrigin(r);
  const steps = APPROVAL_STEPS.map((s) => ({ ...s, state: 'pending' }));
  steps[0].state = 'done';

  if (r.status === 'Pending Manager Review') {
    steps[1].state = 'current';
  } else if (r.status === 'Pending' || r.status === 'In Review') {
    steps[1].state = 'done';
    steps[2].state = 'current';
  } else if (r.status === 'Approved') {
    steps[1].state = 'done'; steps[2].state = 'done'; steps[3].state = 'done';
  } else if (origin === 'manager') {
    steps[1].state = 'rejected'; steps[3].state = 'rejected';
  } else if (origin === 'ld') {
    steps[1].state = 'done'; steps[2].state = 'rejected'; steps[3].state = 'rejected';
  }

  let currentOwnerLabel = null;
  if (r.status === 'Pending Manager Review') {
    currentOwnerLabel = (profile && r.reviewing_manager_id === profile.id)
      ? 'Sizin baxışınız'
      : (resolveName(r.reviewing_manager_id, team) || 'Rəhbər baxışında');
  } else if (r.status === 'Pending' || r.status === 'In Review') {
    currentOwnerLabel = 'L&D baxışında';
  }

  let decisionBy = null;
  if (origin === 'manager') {
    decisionBy = { role: 'Rəhbər', name: resolveName(r.manager_reviewed_by, team) };
  } else if (origin === 'ld') {
    decisionBy = { role: 'L&D', name: resolveName(r.reviewed_by, team) };
  }

  return { steps, currentOwnerLabel, decisionBy, origin };
}
