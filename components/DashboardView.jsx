import { useState, useMemo } from 'react';
import { fmtMoney, statusMeta } from '../lib/helpers';
import AnalysisView from './AnalysisView';

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key) {
  const [y, m] = key.split('-');
  const names = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

export default function DashboardView({ trainings, requests }) {
  const years = useMemo(() => {
    const set = new Set(trainings.map((t) => t.plan_year).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [trainings]);

  const [selectedYear, setSelectedYear] = useState('all');

  const filtered = useMemo(() => {
    if (selectedYear === 'all') return trainings;
    return trainings.filter((t) => t.plan_year === Number(selectedYear));
  }, [trainings, selectedYear]);

  const total = filtered.length;
  const totalBudget = filtered.reduce((a, t) => a + (Number(t.budget) || 0), 0);
  const completed = filtered.filter((t) => t.status === 'Completed').length;
  const inProgress = filtered.filter((t) => t.status === 'In Progress').length;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;

  const unbudgetedCount = filtered.filter((t) => t.budget_status === 'Büdcədən kənar').length;
  const unbudgetedPct = total ? Math.round((unbudgetedCount / total) * 100) : 0;
  const budgetedSpend = filtered.filter((t) => t.budget_status !== 'Büdcədən kənar').reduce((a, t) => a + (Number(t.budget) || 0), 0);

  const avgApprovalDays = useMemo(() => {
    if (!requests || requests.length === 0) return null;
    const decided = requests.filter((r) => r.status === 'Approved' || r.status === 'Rejected');
    if (decided.length === 0) return null;
    const totalDays = decided.reduce((sum, r) => {
      const start = new Date(r.created_at);
      const end = new Date(r.updated_at || r.created_at);
      return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    }, 0);
    return (totalDays / decided.length).toFixed(1);
  }, [requests]);

  const trend = useMemo(() => {
    const counts = {};
    filtered.forEach((t) => {
      const key = monthKey(t.start_date) || monthKey(t.created_at);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    const keys = Object.keys(counts).sort().slice(-12);
    return keys.map((k) => ({ key: k, label: monthLabel(k), count: counts[k] }));
  }, [filtered]);

  const maxTrend = Math.max(...trend.map((t) => t.count), 1);
  const trendPoints = trend.map((t, i) => {
    const x = trend.length > 1 ? (i / (trend.length - 1)) * 100 : 50;
    const y = 100 - (t.count / maxTrend) * 90;
    return `${x},${y}`;
  }).join(' ');

  const statusCounts = {};
  filtered.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
  const statusRows = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(...statusRows.map((r) => r[1]), 1);

  const deptStats = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const d = t.dept || '—';
      if (!map[d]) map[d] = { dept: d, count: 0, completed: 0, budget: 0 };
      map[d].count += 1;
      if (t.status === 'Completed') map[d].completed += 1;
      map[d].budget += Number(t.budget) || 0;
    });
    return Object.values(map)
      .map((d) => ({ ...d, completionPct: d.count ? Math.round((d.completed / d.count) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [filtered]);

  function healthColor(pct) {
    if (pct >= 70) return '#059669';
    if (pct >= 40) return '#d97706';
    return '#dc2626';
  }

  return (
    <div>
      <div className="hero">
        <h1>Təlim Tracker Platforması</h1>
        <p>Şirkətinizin təlim ehtiyacları məlumatları əsasında canlı izləmə və analiz.</p>
      </div>
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <div>
            <div className="filter-label">İl</div>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ minWidth: 140 }}>
              <option value="all">Bütün illər</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="card"><div className="kpi-label">Ümumi Təlim Sayı</div><div className="kpi-value">{total}</div></div>
          <div className="card"><div className="kpi-label">Ümumi Büdcə</div><div className="kpi-value">{fmtMoney(totalBudget)}</div></div>
          <div className="card"><div className="kpi-label">Tamamlanma Faizi</div><div className="kpi-value" style={{ color: healthColor(completionPct) }}>{completionPct}%</div></div>
          <div className="card"><div className="kpi-label">Davam Edən</div><div className="kpi-value" style={{ color: '#2563eb' }}>{inProgress}</div></div>
        </div>

        <div className="kpi-grid">
          <div className="card">
            <div className="kpi-label">Büdcələnmiş Xərc</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{fmtMoney(budgetedSpend)}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Büdcədən Kənar Nisbəti</div>
            <div className="kpi-value" style={{ color: healthColor(100 - unbudgetedPct) }}>{unbudgetedPct}%</div>
          </div>
          <div className="card">
            <div className="kpi-label">Orta Təsdiq Müddəti</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{avgApprovalDays !== null ? `${avgApprovalDays} gün` : '—'}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Aktiv Departament Sayı</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{deptStats.length}</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Aylıq Trend (son 12 ay)</div>
            {trend.length > 1 ? (
              <div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 140, overflow: 'visible' }}>
                  <polyline points={trendPoints} fill="none" stroke="#2563eb" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {trend.map((t) => (
                    <div key={t.key} style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>{t.label}<br />{t.count}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: 20, textAlign: 'center' }}>Trend üçün kifayət qədər tarix datası yoxdur</div>
            )}
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Status üzrə bölgü</div>
            {statusRows.map(([st, count]) => {
              const meta = statusMeta(st);
              return (
                <div className="bar-row" key={st}>
                  <div className="bar-label">{meta.label}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((count / maxStatus) * 100)}%`, background: meta.color }} /></div>
                  <div className="bar-val">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Departament üzrə Sıralama</div>
          <table>
            <thead>
              <tr><th>Departament</th><th>Təlim Sayı</th><th>Tamamlanma</th><th>Büdcə</th></tr>
            </thead>
            <tbody>
              {deptStats.map((d) => (
                <tr key={d.dept}>
                  <td>{d.dept}</td>
                  <td>{d.count}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 8, background: '#eef2f6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${d.completionPct}%`, height: '100%', background: healthColor(d.completionPct) }} />
                      </div>
                      <span style={{ fontSize: 12.5, color: healthColor(d.completionPct), fontWeight: 700 }}>{d.completionPct}%</span>
                    </div>
                  </td>
                  <td>{fmtMoney(d.budget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AnalysisView trainings={filtered} />
      </div>
    </div>
  );
}
