import { useState, useMemo } from "react";
import { BookOpen, Wallet, Timer, TrendingUp, CheckCircle2, RefreshCw, CircleCheck, CircleX } from 'lucide-react';
import { fmtMoney, statusMeta } from "../lib/helpers";
import AnalysisView from "./AnalysisView";
import CountUp from "./CountUp";

const pct = (n) => `${n}%`;

const STATS = [
  { key: 'total', label: 'Ümumi Təlim', Icon: BookOpen, color: '#2563eb', bg: '#eff6ff' },
  { key: 'totalBudget', label: 'Ümumi Büdcə', Icon: Wallet, color: '#0f766e', bg: '#f0fdfa', format: fmtMoney },
  { key: 'totalHours', label: 'Learning Hours', Icon: Timer, color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'avgBudget', label: 'Ortalama Büdcə', Icon: TrendingUp, color: '#ea580c', bg: '#fff7ed', format: fmtMoney },
  { key: 'completionPct', label: 'Tamamlanma', Icon: CheckCircle2, color: '#059669', bg: '#f0fdf4', format: pct },
  { key: 'inProgress', label: 'Davam Edən', Icon: RefreshCw, color: '#2563eb', bg: '#eff6ff' },
  { key: 'budgetedCount', label: 'Büdcələnmiş', Icon: CircleCheck, color: '#059669', bg: '#f0fdf4' },
  { key: 'outOfBudgetCount', label: 'Büdcədən Kənar', Icon: CircleX, color: '#dc2626', bg: '#fef2f2' },
];

export default function DashboardView({ trainings }) {
  const years = useMemo(() => {
    const set = new Set(trainings.map((t) => t.plan_year).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [trainings]);

  const [selectedYear, setSelectedYear] = useState("all");

  const filtered = useMemo(() => {
    if (selectedYear === "all") return trainings;
    return trainings.filter((t) => t.plan_year === Number(selectedYear));
  }, [trainings, selectedYear]);

  const total = filtered.length;
  const totalBudget = filtered.reduce((a, t) => a + (Number(t.budget) || 0), 0);
  const totalHours = filtered.reduce((a, t) => a + (Number(t.man_hours) || 0), 0);
  const completed = filtered.filter((t) => t.status === "Completed").length;
  const inProgress = filtered.filter((t) => t.status === "In Progress").length;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;
  const avgBudget = total ? Math.round(totalBudget / total) : 0;
  const budgetedCount = filtered.filter((t) => t.budget_status === "Büdcələnmiş").length;
  const outOfBudgetCount = filtered.filter((t) => t.budget_status === "Büdcədən kənar").length;

  const statRaw = {
    total, totalBudget, totalHours, avgBudget,
    completionPct, inProgress, budgetedCount, outOfBudgetCount,
  };

  const statusCounts = {};
  filtered.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
  const statusRows = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(...statusRows.map((r) => r[1]), 1);

  const deptCounts = {};
  filtered.forEach((t) => { deptCounts[t.dept] = (deptCounts[t.dept] || 0) + 1; });
  const deptRows = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxDept = Math.max(...deptRows.map((r) => r[1]), 1);
  const deptColors = ["#0f766e", "#7c3aed", "#c026d3", "#0891b2", "#65a30d", "#b45309", "#334155", "#0369a1", "#dc2626", "#0b2545"];

  const vendorCounts = {};
  filtered.forEach((t) => { if (t.vendor) vendorCounts[t.vendor] = (vendorCounts[t.vendor] || 0) + 1; });
  const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const skillCounts = {};
  filtered.forEach((t) => { if (t.skill) skillCounts[t.skill] = (skillCounts[t.skill] || 0) + 1; });
  const topSkill = Object.entries(skillCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Executive Dashboard</h1>
            <p>Şirkətinizin təlim ehtiyacları üzrə icmal və analitika.</p>
          </div>
          <div>
            <div className="filter-label">İl</div>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ minWidth: 140 }}>
              <option value="all">Bütün illər</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="kpi-grid">
          {STATS.map((s, i) => (
            <div className="stat-card stagger-item" key={s.key} style={{ '--i': i }}>
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}><s.Icon size={16} strokeWidth={2.2} /></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>
                <CountUp value={statRaw[s.key]} format={s.format} />
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 15 }}>Executive Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            <div><strong>Top Vendor</strong><div style={{ color: 'var(--ink-700)', marginTop: 2 }}>{topVendor}</div></div>
            <div><strong>Top Skill</strong><div style={{ color: 'var(--ink-700)', marginTop: 2 }}>{topSkill}</div></div>
            <div><strong>Learning Hours</strong><div style={{ color: 'var(--ink-700)', marginTop: 2 }}>{totalHours}</div></div>
            <div><strong>Completion Rate</strong><div style={{ color: 'var(--ink-700)', marginTop: 2 }}>{completionPct}%</div></div>
          </div>
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
