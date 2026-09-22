import { useEffect, useState } from 'react';
import { Users2, CheckCircle2, Clock } from 'lucide-react';
import { sb } from '../lib/supabase';
import EmptyState from './EmptyState';

function byName(a, b) {
  return (a.full_name_az || '').localeCompare(b.full_name_az || '', 'az');
}

function summarize(list) {
  const sorted = [...list].sort(byName);
  const done = sorted.filter((m) => m.submitted).length;
  return { managers: sorted, done, total: sorted.length };
}

// A profile counts as a "manager with direct reports" when its role is
// 'manager' AND at least one other profile points to it via manager_id —
// a manager role with nobody reporting to them has nothing to submit for.
// Status is tracked per individual manager (never collapsed into a single
// dept-wide flag), and further subdivided by şöbə within a dept whenever a
// dept's managers actually span more than one şöbə — otherwise the extra
// nesting would just be a redundant single group under the dept header.
function computeGroups(profiles, submittedManagerIds) {
  const managerIdsWithReports = new Set(profiles.map((p) => p.manager_id).filter(Boolean));
  const managers = profiles
    .filter((p) => p.role === 'manager' && managerIdsWithReports.has(p.id))
    .map((m) => ({ ...m, submitted: submittedManagerIds.has(m.id) }));

  const byDept = {};
  managers.forEach((m) => {
    const dept = m.dept || '—';
    (byDept[dept] = byDept[dept] || []).push(m);
  });

  return Object.entries(byDept)
    .map(([dept, list]) => {
      const bySube = {};
      list.forEach((m) => { const s = m.sube || '—'; (bySube[s] = bySube[s] || []).push(m); });
      const subeKeys = Object.keys(bySube);
      const subeGroups = subeKeys.length > 1
        ? subeKeys.sort((a, b) => a.localeCompare(b, 'az')).map((sube) => ({ sube, ...summarize(bySube[sube]) }))
        : null;
      return { dept, subeGroups, ...summarize(list) };
    })
    .sort((a, b) => a.dept.localeCompare(b.dept, 'az'));
}

function ProgressBlock({ done, total, managers }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const complete = done === total;
  const pending = managers.filter((m) => !m.submitted);
  return (
    <>
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
    </>
  );
}

// The dept-manager variant needs none of computeGroups' dept/şöbə nesting —
// `team` (profiles where manager_id = this dept manager's own id) is
// already scoped to one department, so it only has to pick out the şöbə
// managers within it and check who has submitted.
function DeptManagerCompletionCard({ team, requests, planYear }) {
  const submittedManagerIds = new Set(
    requests
      .filter((r) => r.source === 'Manager Survey' && new Date(r.created_at).getFullYear() === planYear)
      .map((r) => r.requested_by)
  );
  const managers = team
    .filter((m) => m.scope_level === 'sube')
    .map((m) => ({ ...m, submitted: submittedManagerIds.has(m.id) }))
    .sort(byName);
  const done = managers.filter((m) => m.submitted).length;
  const total = managers.length;

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="section-title">İllik TNA Tamamlanma Statusu — Şöbə Rəhbərləri ({planYear})</div>
      <div className="section-sub">
        Sizə birbaşa tabe olan şöbə rəhbərlərindən hansıların {planYear}-ci il üçün İllik TNA cədvəlini doldurduğu
        {total ? ` — ${done}/${total} rəhbər tamamlayıb.` : '.'}
      </div>
      {total === 0 ? (
        <div className="card"><EmptyState icon={Users2}>Sizə tabe olan şöbə rəhbəri tapılmadı.</EmptyState></div>
      ) : (
        <div className="card" style={{ maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Şöbə rəhbərləri</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: done === total ? 'var(--green)' : 'var(--amber)' }}>{done}/{total}</div>
          </div>
          <ProgressBlock done={done} total={total} managers={managers} />
        </div>
      )}
    </div>
  );
}

export default function TnaCompletionTracker({ profile, team, requests, planYear }) {
  const isLd = profile.role === 'ld';
  const [profiles, setProfiles] = useState(null);

  useEffect(() => {
    if (!isLd) return;
    sb.from('profiles').select('id, full_name_az, dept, sube, role, manager_id').then(({ data }) => {
      setProfiles(data || []);
    });
  }, [isLd]);

  if (!isLd) {
    if (!team) return null;
    return <DeptManagerCompletionCard team={team} requests={requests} planYear={planYear} />;
  }
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
            const complete = g.done === g.total;
            return (
              <div className="card" key={g.dept}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{g.dept}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: complete ? 'var(--green)' : 'var(--amber)' }}>
                    {g.done}/{g.total} rəhbər
                  </div>
                </div>

                {g.subeGroups ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {g.subeGroups.map((sg) => {
                      const subComplete = sg.done === sg.total;
                      return (
                        <div key={sg.sube} style={{ paddingTop: 10, borderTop: '1px solid var(--ink-100)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)' }}>{sg.sube}</div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: subComplete ? 'var(--green)' : 'var(--amber)' }}>
                              {sg.done}/{sg.total}
                            </div>
                          </div>
                          <ProgressBlock done={sg.done} total={sg.total} managers={sg.managers} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ProgressBlock done={g.done} total={g.total} managers={g.managers} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
