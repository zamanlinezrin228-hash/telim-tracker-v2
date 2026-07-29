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
export function computeBudgetStatus() {
  const month = new Date().getMonth() + 1;
  const inWindow = month === 10 || month === 11 || month === 12 || month === 1;
  return inWindow ? 'Büdcələnmiş' : 'Büdcədən kənar';
}
