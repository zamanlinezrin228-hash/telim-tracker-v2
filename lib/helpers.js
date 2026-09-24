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

// Case/whitespace-insensitive dept/sube match. trainings.dept/sube and
// training_requests.dept/sube are free-text columns copied from whichever
// profiles row was in play at the time, and different profiles disagree on
// casing for what's meant to be the same dept/sube (confirmed in prod data,
// e.g. "Maliyyə Departamenti" on trainings vs "Maliyyə departamenti" on a
// manager's own profile) — the same inconsistency the trainings RLS
// policies already normalize for with lower(trim(...)). A plain `===`
// comparison silently returns zero matches whenever casing/whitespace
// differs, which is exactly what caused Dashboard to show 0 for a dept
// manager. toLocaleLowerCase('az') (not plain toLowerCase) matters here for
// correct dotted/dotless İ/I handling, same as AnnualTnaForm.jsx's own
// normalize().
function normalizeText(s) {
  return (s || '').toLocaleLowerCase('az').trim();
}
export function matchesOwnScope(row, profile) {
  if (!row || !profile) return false;
  return profile.scope_level === 'sube'
    ? normalizeText(row.sube) === normalizeText(profile.sube)
    : normalizeText(row.dept) === normalizeText(profile.dept);
}

// Whether an approval/submission from this profile needs to climb one more
// hop up profiles.manager_id, or is already at the top of the TNA/ad-hoc
// approval chain and should go straight to L&D. A dept-level manager
// (scope_level='dept') is ALWAYS the top of this chain — their own
// manager_id reflects the real HR reporting line, which can continue up
// through VPs and the CEO, and those must never be pulled into this
// workflow as an approval gate. Only a şöbə-level manager (or a plain
// employee with no scope_level at all) forwards up to whoever their own
// manager_id points to.
export function needsUpwardForward(profile) {
  return profile.scope_level !== 'dept' && !!profile.manager_id;
}

// Every place that forwards a request (fresh submit, manager-approve,
// resubmit-after-revision) must decide where it goes from the CURRENT
// profiles.manager_id/scope_level — not from the `profile` object already
// sitting in React state. That state is fetched once at login and never
// refreshed afterward, so a manager whose own manager_id changes mid-
// session (an org-chart edit made by an admin while they're still logged
// in) would otherwise go on forwarding to their OLD manager for as long as
// their browser session stays open, silently routing requests to whoever
// used to be correct. This re-reads the two fields fresh, right before
// computing the decision, instead of trusting the stale prop.
export async function computeForward(sb, profileId) {
  const { data, error } = await sb.from('profiles').select('manager_id, scope_level').eq('id', profileId).single();
  if (error || !data) throw new Error('Rəhbər zənciri yoxlanıla bilmədi: ' + (error?.message || 'profil tapılmadı'));
  return needsUpwardForward(data)
    ? { status: 'Pending Manager Review', reviewing_manager_id: data.manager_id }
    : { status: 'Pending', reviewing_manager_id: null };
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

// Which hop of the (up to 2-level) manager chain a still-in-flight
// 'Pending Manager Review' row is currently sitting at. manager_reviewed_by
// is only ever stamped by an approve/forward action — never by the initial
// submission — so its presence means someone has already approved and
// forwarded this row once, meaning it's now at the SECOND manager hop
// (employee/şöbə-manager's own manager, i.e. the dept-level manager).
// Its absence means this is the very first hop, right after submission.
// This needs no profile lookup beyond the row itself, so it resolves
// identically for every viewer (the submitter, the şöbə manager, the dept
// manager, and L&D) regardless of what each of them is individually
// allowed to see via RLS.
function managerReviewHop(r) {
  return r.manager_reviewed_by ? 2 : 1;
}

const MANAGER_STEP_LABEL = { 1: 'Rəhbər təsdiqi', 2: 'Departament rəhbəri təsdiqi' };
const MANAGER_OWNER_LABEL = { 1: 'Rəhbər baxışında', 2: 'Departament rəhbəri baxışında' };

export function deriveApprovalStage(r, { profile, team } = {}) {
  const origin = decisionOrigin(r);
  const steps = APPROVAL_STEPS.map((s) => ({ ...s, state: 'pending' }));
  steps[0].state = 'done';

  const hop = r.status === 'Pending Manager Review' ? managerReviewHop(r) : null;

  if (r.status === 'Pending Manager Review') {
    steps[1].state = 'current';
    steps[1].label = MANAGER_STEP_LABEL[hop];
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
      : (resolveName(r.reviewing_manager_id, team) || MANAGER_OWNER_LABEL[hop]);
  } else if (r.status === 'Pending') {
    currentOwnerLabel = 'L&D təsdiqi gözləyir';
  } else if (r.status === 'In Review') {
    currentOwnerLabel = 'L&D analiz edir';
  }

  let decisionBy = null;
  if (origin === 'manager') {
    decisionBy = { role: 'Rəhbər', name: resolveName(r.manager_reviewed_by, team) };
  } else if (origin === 'ld') {
    decisionBy = { role: 'L&D', name: resolveName(r.reviewed_by, team) };
  }

  return { steps, currentOwnerLabel, decisionBy, origin };
}

// Same "own requests / own scope / everything" visibility RequestsView.jsx
// (myRequests + scopeHistory + toReview) and AnnualTnaManagerReview.jsx
// (incoming + history) already establish — reused here so the red
// notification badge never disagrees with what those two pages actually
// show: L&D/HR see every row, a manager (dept- or şöbə-level, ANY role —
// e.g. an L&D staffer who also manages a direct team, see the
// AnnualTnaHub dual-role fix) sees their own submissions plus their own
// dept/şöbə plus anything directly addressed to them, and a plain
// employee sees only their own.
export function inNotificationScope(r, profile, { isReviewer, hasTeam }) {
  if (isReviewer) return true;
  if (r.requested_by === profile.id) return true;
  if (hasTeam && (matchesOwnScope(r, profile) || r.reviewing_manager_id === profile.id)) return true;
  return false;
}

// A row counts as unseen once EITHER its creation (a brand-new
// submission) or its last update (any status move — forwarded, approved,
// rejected, returned for revision, added to plan) happened after this
// profile's last_seen_requests_at. No lastSeenAt at all (a profile from
// before the column existed, or one that's simply never visited the
// page) means everything currently in scope counts as unseen.
export function isUnseenRequest(r, lastSeenAt) {
  if (!lastSeenAt) return true;
  const seen = new Date(lastSeenAt).getTime();
  return new Date(r.created_at).getTime() > seen || new Date(r.updated_at).getTime() > seen;
}

export function countUnseenRequests(requests, profile, scopeFlags) {
  if (!profile) return 0;
  return requests.filter((r) => inNotificationScope(r, profile, scopeFlags) && isUnseenRequest(r, profile.last_seen_requests_at)).length;
}
