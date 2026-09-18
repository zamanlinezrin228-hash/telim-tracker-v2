import { useEffect, useState } from 'react';
import { Users2, CheckCircle2, Clock } from 'lucide-react';
import { sb } from '../lib/supabase';
import EmptyState from './EmptyState';

// A profile counts as a "manager with direct reports" when its role is
// 'manager' AND at least one other profile points to it via manager_id —
// a manager role with nobody reporting to them has nothing to submit for.
function computeGroups(profiles, submittedManagerIds) {
  const managerIdsWithReports = new Set(profiles.map((p) => p.manager_id).filter(Boolean));
  const managers = profiles.filter((p) => p.role === 'manager' && managerIdsWithReports.has(p.id));

  const byDept = {};
  managers.forEach((m) => {
    const dept = m.dept || '—';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push({ ...m, submitted: submittedManagerIds.has(m.id) });
  });

  return Object.entries(byDept)
    .map(([dept, list]) => {
      const sorted = [...list].sort((a, b) => (a.full_name_az || '').localeCompare(b.full_name_az || '', 'az'));
      const done = sorted.filter((m) => m.submitted).length;
      return { dept, managers: sorted, done, total: sorted.length };
    })
    .sort((a, b) => a.dept.localeCompare(b.dept, 'az'));
}

export default function TnaCompletionTracker({ profile, requests, planYear }) {
  const [profiles, setProfiles] = useState(null);

  useEffect(() => {
    if (profile.role !== 'ld') return;
    sb.from('profiles').select('id, full_name_az, dept, sube, role, manager_id').then(({ data }) => {
      setProfiles(data || []);
    });
  }, [profile.role]);

  if (profile.role !== 'ld') return null;
  if (profiles === null) return null;

  const submittedManagerIds = new Set(
    requests
      .filter((r) => r.source === 'Manager Survey' && new Date(r.created_at).getFullYear() === planYear)
      .map((r) => r.requested_by)
  );

  const groups = computeGroups(profiles, submittedManagerIds);
  const overallDone = groups.reduce((a, g) => a + g.done, 0);
  const overallTotal = groups.reduce((a, g) => a + g.total, 0);

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="section-title">İllik TNA Tamamlanma Statusu — Rəhbərlər ({planYear})</div>
      <div className="section-sub">
        Birbaşa tabeliyində əməkdaşı olan rəhbərlərdən hansıların {planYear}-ci il üçün İllik TNA cədvəlini doldurduğu
        {overallTotal ? ` — ümumilikdə ${overallDone}/${overallTotal} rəhbər tamamlayıb.` : '.'}
      </div>

      {groups.length === 0 ? (
        <div className="card"><EmptyState icon={Users2}>Birbaşa tabeliyində əməkdaşı olan rəhbər tapılmadı.</EmptyState></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {groups.map((g) => {
            const pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
            const complete = g.done === g.total;
            const pending = g.managers.filter((m) => !m.submitted);
            return (
              <div className="card" key={g.dept}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{g.dept}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: complete ? 'var(--green)' : 'var(--amber)' }}>
                    {g.done}/{g.total} rəhbər
                  </div>
                </div>
                <div className="bar-track" style={{ marginBottom: 10 }}>
                  <div className="bar-fill" style={{ width: `${Math.max(4, pct)}%`, background: complete ? 'var(--green)' : 'var(--amber)' }} />
                </div>
                {complete ? (
                  <div style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                    <CheckCircle2 size={13} strokeWidth={2.4} /> Hamısı tamamlayıb
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                    <Clock size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Gözlənilən: {pending.map((m) => m.full_name_az).join(', ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
