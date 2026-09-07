import { useState, useMemo } from 'react';
import { fmtMoney, statusMeta } from '../lib/helpers';
import AnalysisView from './AnalysisView';

export default function DashboardView({ trainings }) {
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

  const statusCounts = {};
  filtered.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
  const statusRows = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(...statusRows.map((r) => r[1]), 1);

  const deptCounts = {};
  filtered.forEach((t) => { deptCounts[t.dept] = (deptCounts[t.dept] || 0) + 1; });
  const deptRows = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxDept = Math.max(...deptRows.map((r) => r[1]), 1);
  const deptColors = ['#0f766e', '#7c3aed', '#c026d3', '#0891b2', '#65a30d', '#b45309', '#334155', '#0369a1', '#dc2626', '#0b2545'];

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
          <div className="card"><div className="kpi-label">Tamamlanma Faizi</div><div className="kpi-value" style={{ color: '#059669' }}>{completionPct}%</div></div>
          <div className="card"><div className="kpi-label">Davam Edən</div><div className="kpi-value" style={{ color: '#2563eb' }}>{inProgress}</div></div>
        </div>

        <div className="charts-grid">
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
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Departament üzrə (top 10)</div>
            {deptRows.map(([dept, count], i) => (
              <div className="bar-row" key={dept}>
                <div className="bar-label" title={dept}>{dept}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((count / maxDept) * 100)}%`, background: deptColors[i % deptColors.length] }} /></div>
                <div className="bar-val">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <AnalysisView trainings={filtered} />
      </div>
    </div>
  );
}
