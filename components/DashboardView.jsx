import { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import {
  BookOpen, Users, CheckCircle2, RefreshCw, Timer, Wallet, TrendingUp, Percent,
  XCircle, AlertTriangle, PauseCircle, CalendarClock, Building2, Trophy, Target,
  Sparkles, ThumbsUp, ShieldAlert, Award, GraduationCap, Download, Printer, PiggyBank, Banknote,
} from 'lucide-react';
import { fmtMoney, statusMeta, matchesOwnScope } from '../lib/helpers';
import { styleHeaderRow, downloadWorkbook } from '../lib/excelExport';
import {
  computeKPIs, departmentBreakdown, departmentSavedCostBreakdown, monthlyTrend, topBy, topLearners,
  completionFunnel, generateInsights,
} from '../lib/analytics';
import AnalysisView from './AnalysisView';
import CountUp from './CountUp';
import EmptyState from './EmptyState';

const KPI_EXPORT_ROWS = [
  ['Ümumi Təlim', (k) => k.total],
  ['İştirakçılar', (k) => k.participants],
  ['Tamamlanma Faizi', (k) => `${k.completionRate}%`],
  ['Davam Edən', (k) => k.inProgress],
  ['Ümumi Təlim Saatı', (k) => k.totalHours],
  ['Planlanmış Büdcə', (k) => fmtMoney(k.plannedBudget)],
  ['İstifadə Olunmuş Büdcə (yalnız Completed)', (k) => fmtMoney(k.usedBudgetCompleted)],
  ['Qənaət (Planlanmış − İstifadə, status önəmsiz)', (k) => fmtMoney(k.totalSavedCost)],
  ['Real Büdcə (Canceled xaric)', (k) => fmtMoney(k.realBudget)],
  ['Büdcə İstifadəsi', (k) => `${k.budgetUtilization}%`],
  ['Orta Büdcə / Təlim', (k) => fmtMoney(k.avgBudget)],
  ['Saat Başına Xərc', (k) => fmtMoney(k.costPerHour)],
  ['Büdcələnmiş Pay', (k) => `${k.budgetedShare}%`],
  ['Büdcədən Kənar', (k) => k.outOfBudgetCount],
  ['Fəal Nisbət', (k) => `${k.onTrackRate}%`],
  ['Ləğv Nisbəti', (k) => `${k.cancellationRate}%`],
  ['Risk Altında', (k) => k.atRiskCount],
  ['Təxirə Salınmış', (k) => k.postponed],
  ['Planlaşdırılmış', (k) => k.scheduled],
  ['Aktiv Departament', (k) => k.departments],
];

const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

const LEARNING_STATS = [
  { key: 'total', label: 'Ümumi Təlim', Icon: BookOpen, color: '#2563eb' },
  { key: 'participants', label: 'İştirakçılar', Icon: Users, color: '#0891b2' },
  { key: 'completionRate', label: 'Tamamlanma Faizi', Icon: CheckCircle2, color: '#059669', format: (n) => `${n}%` },
  { key: 'inProgress', label: 'Davam Edən', Icon: RefreshCw, color: '#2563eb' },
  { key: 'totalHours', label: 'Ümumi Təlim Saatı', Icon: Timer, color: '#7c3aed' },
];

// Saved cost's color depends on its sign (green = saved, red = went over
// budget), unlike every other KPI here which has one fixed color — so its
// `color` is a function of the raw KPI values instead of a plain string;
// StatGroup below checks for that and calls it.
//
// The four budget KPIs (plannedBudget/usedBudgetCompleted/totalSavedCost/
// realBudget) are deliberately four DIFFERENT populations of rows — see
// lib/analytics.js's computeKPIs comments for the exact definition of
// each. They will not arithmetically reconcile with each other (e.g.
// plannedBudget − usedBudgetCompleted ≠ totalSavedCost) — that's expected,
// not a bug, which is why each one carries its own one-line `subtitle`
// here instead of being shown as if they were parts of one equation.
const FINANCIAL_STATS = [
  {
    key: 'plannedBudget', label: 'Planlanmış Büdcə', Icon: Wallet, color: '#0f766e', format: fmtMoney,
    subtitle: 'Bütün sətirlər üzrə planlanmış büdcə cəmi (status önəmli deyil)',
  },
  {
    key: 'usedBudgetCompleted', label: 'İstifadə Olunmuş Büdcə', Icon: Wallet, color: '#0369a1', format: fmtMoney,
    subtitle: 'Yalnız tamamlanmış (Completed) təlimlər üçün real xərc',
  },
  {
    key: 'totalSavedCost', label: 'Qənaət', Icon: PiggyBank, color: (k) => (k.totalSavedCost >= 0 ? '#059669' : '#dc2626'), format: fmtMoney,
    subtitle: 'Planlanmış − İstifadə, hər statusdan (Completed-ə məhdudlaşmır)',
  },
  {
    key: 'realBudget', label: 'Real Büdcə', Icon: Banknote, color: '#7c3aed', format: fmtMoney,
    subtitle: 'Planlanmış büdcə, ləğv edilmiş (Canceled) sətirlər çıxılmaqla',
  },
  { key: 'budgetUtilization', label: 'Büdcə İstifadəsi', Icon: Percent, color: '#7c3aed', format: (n) => `${n}%`, subtitle: 'İstifadə Olunmuş / Planlanmış' },
  { key: 'avgBudget', label: 'Orta Büdcə / Təlim', Icon: TrendingUp, color: '#ea580c', format: fmtMoney },
  { key: 'costPerHour', label: 'Saat Başına Xərc', Icon: Percent, color: '#b45309', format: fmtMoney },
  { key: 'budgetedShare', label: 'Büdcələnmiş Pay', Icon: CheckCircle2, color: '#059669', format: (n) => `${n}%` },
  { key: 'outOfBudgetCount', label: 'Büdcədən Kənar', Icon: XCircle, color: '#dc2626' },
];

const ENGAGEMENT_STATS = [
  { key: 'onTrackRate', label: 'Fəal Nisbət', Icon: ThumbsUp, color: '#059669', format: (n) => `${n}%` },
  { key: 'cancellationRate', label: 'Ləğv Nisbəti', Icon: XCircle, color: '#dc2626', format: (n) => `${n}%` },
  { key: 'atRiskCount', label: 'Risk Altında', Icon: ShieldAlert, color: '#dc2626' },
  { key: 'postponed', label: 'Təxirə Salınmış', Icon: PauseCircle, color: '#ea580c' },
  { key: 'scheduled', label: 'Planlaşdırılmış', Icon: CalendarClock, color: '#d97706' },
];

const INSIGHT_ICONS = { success: Sparkles, warning: AlertTriangle, danger: ShieldAlert };
const INSIGHT_COLORS = { success: '#059669', warning: '#d97706', danger: '#dc2626' };

function StatGroup({ title, stats, raw, i0 }) {
  return (
    <>
      <div className="kpi-group-title">{title}</div>
      <div className="kpi-grid">
        {stats.map((s, i) => {
          const color = typeof s.color === 'function' ? s.color(raw) : s.color;
          return (
            <div className="stat-card stagger-item" key={s.key} style={{ '--i': i0 + i }}>
              <div className="stat-icon" style={{ '--icon-color': color, color }}><s.Icon size={16} strokeWidth={2.2} /></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color }}>
                <CountUp value={raw[s.key]} format={s.format} />
              </div>
              {s.subtitle && <div className="stat-subtitle">{s.subtitle}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function RankList({ items, renderValue, emptyLabel }) {
  if (!items.length) return <EmptyState>{emptyLabel}</EmptyState>;
  const max = Math.max(...items.map((it) => it.budget), 1);
  return (
    <div className="rank-list">
      {items.map((it, i) => (
        <div className="rank-row" key={it.key}>
          <div className="rank-num">{i + 1}</div>
          <div className="rank-body">
            <div className="rank-name" title={it.key}>{it.key}</div>
            <div className="rank-bar-track"><div className="rank-bar-fill" style={{ width: `${Math.round((it.budget / max) * 100)}%` }} /></div>
          </div>
          <div className="rank-val">{renderValue(it)}</div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardView({ trainings, profile, team, restrictToOwnScope }) {
  const years = useMemo(() => {
    const set = new Set(trainings.map((t) => t.plan_year).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [trainings]);

  const [selectedYear, setSelectedYear] = useState('all');
  const [scopeMode, setScopeMode] = useState(restrictToOwnScope ? 'own' : 'company');

  // Only a manager with direct reports has a narrower "own dept/şöbə" view to
  // switch to — same hasTeam check used for this elsewhere (RequestsView.jsx,
  // AnnualTnaForm.jsx). Everyone else just gets the company-wide dashboard.
  const hasTeam = team && team.length > 0;
  // A manager without dashboard_full_access is FORCED to their own dept/sube
  // (restrictToOwnScope, set by pages/index.js) — no toggle to widen out to
  // company-wide data. Only a manager who already has full access gets the
  // optional company-wide/own-scope switch.
  const canScopeFilter = profile?.role === 'manager' && hasTeam && !restrictToOwnScope;
  // Same dept-vs-sube distinction TrackingView's RLS and RequestsView's
  // scopeHistory already use for a manager's own visibility scope.
  const ownScopeLabel = profile?.scope_level === 'sube' ? 'Yalnız öz şöbəm' : 'Yalnız öz departamentim';

  const scoped = useMemo(() => {
    const forceOwn = restrictToOwnScope && hasTeam;
    if (!forceOwn && (!canScopeFilter || scopeMode !== 'own')) return trainings;
    return trainings.filter((t) => matchesOwnScope(t, profile));
  }, [trainings, canScopeFilter, scopeMode, profile, restrictToOwnScope, hasTeam]);

  const filtered = useMemo(() => {
    if (selectedYear === 'all') return scoped;
    return scoped.filter((t) => t.plan_year === Number(selectedYear));
  }, [scoped, selectedYear]);

  const completedOnly = useMemo(() => filtered.filter((t) => t.status === 'Completed'), [filtered]);

  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const depts = useMemo(() => departmentBreakdown(filtered), [filtered]);
  const savedCostBreakdown = useMemo(() => departmentSavedCostBreakdown(filtered), [filtered]);
  const trend = useMemo(() => monthlyTrend(filtered), [filtered]);
  // Rankings reflect verified, completed trainings — not everything that was merely requested or started.
  const topTrainings = useMemo(() => topBy(completedOnly, 'skill', 6), [completedOnly]);
  const topVendors = useMemo(() => topBy(completedOnly, 'vendor', 6), [completedOnly]);
  const topLearnersList = useMemo(() => topLearners(completedOnly, 6), [completedOnly]);
  const funnel = useMemo(() => completionFunnel(filtered), [filtered]);
  const insights = useMemo(() => generateInsights(filtered, fmtMoney), [filtered]);

  const topDept = depts[0];
  const bestCompletionDept = [...depts].filter((d) => d.total >= 1).sort((a, b) => b.completionRate - a.completionRate)[0];
  const avgPerDept = depts.length ? Math.round(kpis.total / depts.length) : 0;

  const maxTrend = Math.max(...trend.map((m) => m.count), 1);
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);
  // Math.abs so a department deep in overspend (a large negative savedCost)
  // still scales its bar by magnitude, same reasoning as AnalysisView's
  // heatColor for the saved_cost metric.
  const savedCostDepts = useMemo(() => [...depts].sort((a, b) => Math.abs(b.savedCost) - Math.abs(a.savedCost)), [depts]);
  const maxAbsSavedCost = Math.max(...depts.map((d) => Math.abs(d.savedCost)), 1);

  const statusRows = useMemo(() => {
    const counts = {};
    filtered.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const maxStatus = Math.max(...statusRows.map((r) => r[1]), 1);

  async function exportDashboard() {
    const wb = new ExcelJS.Workbook();

    const kpiSheet = wb.addWorksheet('KPI-lər');
    kpiSheet.columns = [
      { header: 'Göstərici', key: 'label', width: 30 },
      { header: 'Dəyər', key: 'value', width: 20 },
    ];
    KPI_EXPORT_ROWS.forEach(([label, get]) => kpiSheet.addRow({ label, value: get(kpis) }));
    if (topDept) kpiSheet.addRow({ label: 'Ən Fəal Departament', value: `${topDept.dept} (${topDept.total} təlim)` });
    if (bestCompletionDept) kpiSheet.addRow({ label: 'Ən Yüksək Tamamlanma', value: `${bestCompletionDept.dept} (${bestCompletionDept.completionRate}%)` });
    kpiSheet.addRow({ label: 'Orta Təlim / Departament', value: avgPerDept });
    styleHeaderRow(kpiSheet);

    const deptSheet = wb.addWorksheet('Departament Reytinqi');
    deptSheet.columns = [
      { header: 'Departament', key: 'dept', width: 32 },
      { header: 'Təlim sayı', key: 'total', width: 12 },
      { header: 'Tamamlanıb', key: 'completed', width: 12 },
      { header: 'Ləğv edilib', key: 'canceled', width: 12 },
      { header: 'Tamamlanma Faizi', key: 'rate', width: 16 },
      { header: 'Büdcə', key: 'budget', width: 16 },
      { header: 'Qənaət', key: 'savedCost', width: 16 },
      { header: 'Saat', key: 'hours', width: 12 },
    ];
    depts.forEach((d) => deptSheet.addRow({
      dept: d.dept, total: d.total, completed: d.completed, canceled: d.canceled,
      rate: `${d.completionRate}%`, budget: d.budget, savedCost: d.savedCost, hours: d.hours,
    }));
    deptSheet.getColumn('budget').numFmt = '#,##0 "₼"';
    deptSheet.getColumn('savedCost').numFmt = '#,##0 "₼"';
    styleHeaderRow(deptSheet);

    const tarix = new Date().toISOString().slice(0, 10);
    await downloadWorkbook(wb, `dashboard-hesabati-${tarix}.xlsx`);
  }

  function exportPdf() {
    window.print();
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Executive Dashboard</h1>
            <p>Şirkətinizin təlim ehtiyacları üzrə icmal və analitika — BI-səviyyəli hesabat mərkəzi.</p>
          </div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            {canScopeFilter && (
              <div>
                <div className="filter-label">Əhatə dairəsi</div>
                <select value={scopeMode} onChange={(e) => setScopeMode(e.target.value)} style={{ minWidth: 200 }}>
                  <option value="company">Bütün şirkət</option>
                  <option value="own">{ownScopeLabel}</option>
                </select>
              </div>
            )}
            {restrictToOwnScope && hasTeam && (
              <div>
                <div className="filter-label">Əhatə dairəsi</div>
                <span className="badge" style={{ background: 'var(--ink-400)', height: 40, display: 'inline-flex', alignItems: 'center' }}>{ownScopeLabel}</span>
              </div>
            )}
            <div>
              <div className="filter-label">İl</div>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ minWidth: 140 }}>
                <option value="all">Bütün illər</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={exportPdf} className="btn btn-outline" style={{ height: 40 }}>
              <Printer size={14} strokeWidth={2.2} /> PDF-ə ixrac et
            </button>
            <button onClick={exportDashboard} className="btn btn-success" style={{ height: 40 }}>
              <Download size={14} strokeWidth={2.2} /> Excel-ə ixrac et
            </button>
          </div>
        </div>
        <div className="print-only-block" style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 4 }}>
          Hazırlanma tarixi: {new Date().toLocaleDateString('az-AZ')} {selectedYear !== 'all' ? `· İl: ${selectedYear}` : ''}
        </div>
      </div>

      <div className="page">
        {/* ---------- KPI groups ---------- */}
        <StatGroup title="Learning KPI-lər" stats={LEARNING_STATS} raw={kpis} i0={0} />
        <StatGroup title="Maliyyə KPI-ləri" stats={FINANCIAL_STATS} raw={kpis} i0={5} />
        <StatGroup title="Fəallıq KPI-ləri" stats={ENGAGEMENT_STATS} raw={kpis} i0={13} />

        <div className="kpi-group-title">İdarəetmə KPI-ləri</div>
        <div className="kpi-grid">
          <div className="stat-card stagger-item" style={{ '--i': 18 }}>
            <div className="stat-icon" style={{ '--icon-color': '#0891b2', color: '#0891b2' }}><Building2 size={16} strokeWidth={2.2} /></div>
            <div className="stat-label">Aktiv Departament</div>
            <div className="stat-value" style={{ color: '#0891b2' }}><CountUp value={kpis.departments} /></div>
          </div>
          <div className="stat-card stagger-item" style={{ '--i': 19 }}>
            <div className="stat-icon" style={{ '--icon-color': '#2563eb', color: '#2563eb' }}><Trophy size={16} strokeWidth={2.2} /></div>
            <div className="stat-label">Ən Fəal Departament</div>
            <div className="stat-value stat-value-text" style={{ color: '#2563eb' }} title={topDept?.dept}>{topDept ? topDept.dept : '—'}</div>
            {topDept && <div className="stat-sub">{topDept.total} təlim</div>}
          </div>
          <div className="stat-card stagger-item" style={{ '--i': 20 }}>
            <div className="stat-icon" style={{ '--icon-color': '#059669', color: '#059669' }}><Award size={16} strokeWidth={2.2} /></div>
            <div className="stat-label">Ən Yüksək Tamamlanma</div>
            <div className="stat-value stat-value-text" style={{ color: '#059669' }} title={bestCompletionDept?.dept}>{bestCompletionDept ? bestCompletionDept.dept : '—'}</div>
            {bestCompletionDept && <div className="stat-sub">{bestCompletionDept.completionRate}%</div>}
          </div>
          <div className="stat-card stagger-item" style={{ '--i': 21 }}>
            <div className="stat-icon" style={{ '--icon-color': '#7c3aed', color: '#7c3aed' }}><Target size={16} strokeWidth={2.2} /></div>
            <div className="stat-label">Orta Təlim / Departament</div>
            <div className="stat-value" style={{ color: '#7c3aed' }}><CountUp value={avgPerDept} /></div>
          </div>
        </div>

        {/* ---------- Executive Insights ---------- */}
        {insights.length > 0 && (
          <>
            <div className="section-head"><div className="section-title">Analitik Nəticələr</div></div>
            <div className="insights-grid">
              {insights.map((ins, i) => {
                const Icon = INSIGHT_ICONS[ins.type] || Sparkles;
                const color = INSIGHT_COLORS[ins.type];
                return (
                  <div className="insight-card stagger-item" key={i} style={{ '--i': i, borderLeftColor: color }}>
                    <div className="insight-icon" style={{ '--icon-color': color, color }}><Icon size={16} strokeWidth={2.2} /></div>
                    <div>
                      <div className="insight-title">{ins.title}</div>
                      <div className="insight-text">{ins.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ---------- Charts row 1 ---------- */}
        <div className="charts-grid">
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Aylıq Təlim Trendi</div>
            {trend.length ? (
              <div className="trend-chart">
                {trend.map((m) => {
                  const [y, mo] = m.key.split('-');
                  const label = MONTH_LABELS[Number(mo) - 1] + " '" + y.slice(2);
                  return (
                    <div className="trend-col" key={m.key} title={`${label}: ${m.count} təlim, ${fmtMoney(m.budget)}`}>
                      <div className="trend-bar-wrap"><div className="trend-bar" style={{ height: `${Math.max(6, Math.round((m.count / maxTrend) * 100))}%` }} /></div>
                      <div className="trend-label">{label}</div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState>Tarix məlumatı yoxdur</EmptyState>}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Tamamlanma Hunisi (Funnel)</div>
            <div className="funnel-chart">
              {funnel.map((f) => (
                <div className="funnel-row" key={f.status}>
                  <div className="funnel-label">{f.label}</div>
                  <div className="funnel-track"><div className="funnel-fill" style={{ width: `${Math.max(8, Math.round((f.count / maxFunnel) * 100))}%`, background: f.color }} /></div>
                  <div className="funnel-val">{f.count} <span className="funnel-pct">({f.pct}%)</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Charts row 2 ---------- */}
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
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Departament Müqayisəsi (say / tamamlanma)</div>
            {depts.slice(0, 10).map((d) => (
              <div className="bar-row" key={d.dept}>
                <div className="bar-label" title={d.dept}>{d.dept}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, d.completionRate)}%`, background: d.completionRate >= 60 ? 'var(--green)' : d.completionRate >= 30 ? 'var(--amber)' : 'var(--red)' }} /></div>
                <div className="bar-val">{d.total} / {d.completionRate}%</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Departament üzrə Qənaət</div>
            {savedCostDepts.length ? savedCostDepts.slice(0, 10).map((d) => (
              <div className="bar-row" key={d.dept}>
                <div className="bar-label" title={d.dept}>{d.dept}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max(d.savedCost ? 4 : 0, Math.round((Math.abs(d.savedCost) / maxAbsSavedCost) * 100))}%`,
                      background: d.savedCost >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  />
                </div>
                <div className="bar-val" style={{ width: 78, color: d.savedCost >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmtMoney(d.savedCost)}</div>
              </div>
            )) : <EmptyState>Məlumat yoxdur</EmptyState>}
          </div>
        </div>

        {/* ---------- Departament üzrə Sıralama (incl. per-dept saved cost) ---------- */}
        <div className="section-head"><div className="section-title">Departament üzrə Sıralama</div></div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Departament</th>
                  <th>Təlim sayı</th>
                  <th>Tamamlanma Faizi</th>
                  <th>Büdcə</th>
                  <th>Qənaət</th>
                </tr>
              </thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d.dept}>
                    <td style={{ fontWeight: 600 }}>{d.dept}</td>
                    <td>{d.total}</td>
                    <td>{d.completionRate}%</td>
                    <td>{fmtMoney(d.budget)}</td>
                    <td style={{ fontWeight: 700, color: d.savedCost >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(d.savedCost)}</td>
                  </tr>
                ))}
                {!depts.length && (
                  <tr><td colSpan={5}><EmptyState>Məlumat yoxdur</EmptyState></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------- Qənaət Analizi: dedicated planned/used/saved breakdown ---------- */}
        <div className="section-head"><div className="section-title">Qənaət Analizi</div></div>
        <div className="section-sub" style={{ marginBottom: 4 }}>
          Yalnız hər iki dəyər (planlanmış büdcə və istifadə olunmuş büdcə) qeyd edilmiş təlimlər əsasında, departament üzrə qənaət/artıq xərc
        </div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Departament</th>
                  <th>Hesablanan Təlim sayı</th>
                  <th>Planlanmış Büdcə</th>
                  <th>İstifadə Olunmuş</th>
                  <th>Qənaət</th>
                </tr>
              </thead>
              <tbody>
                {savedCostBreakdown.map((d) => (
                  <tr key={d.dept}>
                    <td style={{ fontWeight: 600 }}>{d.dept}</td>
                    <td>{d.count}</td>
                    <td>{fmtMoney(d.plannedBudget)}</td>
                    <td>{fmtMoney(d.usedBudget)}</td>
                    <td style={{ fontWeight: 700, color: d.savedCost >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(d.savedCost)}</td>
                  </tr>
                ))}
                {!savedCostBreakdown.length && (
                  <tr><td colSpan={5}><EmptyState>Hələ həm planlanmış, həm də istifadə olunmuş büdcəsi qeyd edilmiş təlim yoxdur</EmptyState></td></tr>
                )}
              </tbody>
              {savedCostBreakdown.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--ink-50)' }}>
                    <td style={{ fontWeight: 800 }}>Cəmi</td>
                    <td style={{ fontWeight: 700 }}>{savedCostBreakdown.reduce((a, d) => a + d.count, 0)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(savedCostBreakdown.reduce((a, d) => a + d.plannedBudget, 0))}</td>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(savedCostBreakdown.reduce((a, d) => a + d.usedBudget, 0))}</td>
                    <td style={{ fontWeight: 800 }}>{fmtMoney(kpis.totalSavedCost)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ---------- Rankings (based on completed trainings only) ---------- */}
        <div className="charts-grid">
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Top Təlimlər (tamamlanmış, büdcəyə görə)</div>
            <div className="section-sub" style={{ marginBottom: 4 }}>Tamamlanmış təlimlər arasında ən çox resurs ayrılan istiqamətlər</div>
            <RankList items={topTrainings} renderValue={(it) => fmtMoney(it.budget)} emptyLabel="Hələ tamamlanmış təlim yoxdur" />
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Top Provayderlər (tamamlanmış)</div>
            <div className="section-sub" style={{ marginBottom: 4 }}>Tamamlanmış təlimlərə görə ən çox işlənən provayderlər</div>
            <RankList items={topVendors} renderValue={(it) => `${it.count} təlim`} emptyLabel="Hələ tamamlanmış təlim yoxdur" />
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><GraduationCap size={15} strokeWidth={2.2} /> Top İştirakçılar (tamamlanmış, saata görə)</div>
            <div className="section-sub" style={{ marginBottom: 4 }}>Tamamlanmış təlimlər üzrə ən çox saat alan işçilər</div>
            {topLearnersList.length ? (
              <div className="rank-list">
                {topLearnersList.map((l, i) => (
                  <div className="rank-row" key={l.key}>
                    <div className="rank-num">{i + 1}</div>
                    <div className="rank-body">
                      <div className="rank-name" title={l.key}>{l.key}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{l.dept}</div>
                    </div>
                    <div className="rank-val">{l.hours} saat</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState>Hələ tamamlanmış təlim yoxdur</EmptyState>}
          </div>
        </div>

        <AnalysisView trainings={filtered} />
      </div>
    </div>
  );
}
