import { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Users, CheckCircle2, RefreshCw, Timer, Wallet, TrendingUp, Percent,
  XCircle, AlertTriangle, PauseCircle, CalendarClock, Building2, Trophy, Target,
  Sparkles, ThumbsUp, ShieldAlert, FilterX, Award, GraduationCap,
} from 'lucide-react';
import { fmtMoney, statusMeta } from '../lib/helpers';
import {
  displayVal, computeKPIs, departmentBreakdown, monthlyTrend, topBy, topLearners,
  completionFunnel, generateInsights,
} from '../lib/analytics';
import AnalysisView from './AnalysisView';
import CountUp from './CountUp';
import MultiSelectFilter from './MultiSelectFilter';
import EmptyState from './EmptyState';

const CAT_LABELS = { dept: 'Departament', sube: 'Filial', comp_cat: 'Təlim Kateqoriyası', category: 'Vəzifə Kateqoriyası', vendor: 'Provayder', budget_status: 'Büdcə Statusu' };
const CAT_FIELDS = ['dept', 'sube', 'comp_cat', 'category', 'vendor', 'budget_status'];
const STATUS_OPTIONS = ['Scheduled to Commence on Planned Date', 'In Progress', 'Postponed', 'Completed', 'Canceled'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_LABELS = { Low: 'Aşağı', Medium: 'Orta', High: 'Yüksək', Critical: 'Kritik' };

const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

const LEARNING_STATS = [
  { key: 'total', label: 'Ümumi Təlim', Icon: BookOpen, color: '#2563eb' },
  { key: 'participants', label: 'İştirakçılar', Icon: Users, color: '#0891b2' },
  { key: 'completionRate', label: 'Tamamlanma Faizi', Icon: CheckCircle2, color: '#059669', format: (n) => `${n}%` },
  { key: 'inProgress', label: 'Davam Edən', Icon: RefreshCw, color: '#2563eb' },
  { key: 'totalHours', label: 'Ümumi Təlim Saatı', Icon: Timer, color: '#7c3aed' },
];

const FINANCIAL_STATS = [
  { key: 'totalBudget', label: 'Ümumi Büdcə', Icon: Wallet, color: '#0f766e', format: fmtMoney },
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
        {stats.map((s, i) => (
          <div className="stat-card stagger-item" key={s.key} style={{ '--i': i0 + i }}>
            <div className="stat-icon" style={{ '--icon-color': s.color, color: s.color }}><s.Icon size={16} strokeWidth={2.2} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              <CountUp value={raw[s.key]} format={s.format} />
            </div>
          </div>
        ))}
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

export default function DashboardView({ trainings }) {
  const years = useMemo(() => {
    const set = new Set(trainings.map((t) => t.plan_year).filter(Boolean));
    return [...set].sort((a, b) => b - a);
  }, [trainings]);

  const [selectedYear, setSelectedYear] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [hoursMin, setHoursMin] = useState('');
  const [hoursMax, setHoursMax] = useState('');
  const [catFilters, setCatFilters] = useState({});
  const [statusFilter, setStatusFilter] = useState(new Set(STATUS_OPTIONS));
  const [priorityFilter, setPriorityFilter] = useState(new Set(PRIORITY_OPTIONS));

  const uniqueValsByField = useMemo(() => {
    const map = {};
    CAT_FIELDS.forEach((f) => { map[f] = [...new Set(trainings.map((t) => displayVal(t[f])))].filter((v) => v !== '—').sort(); });
    return map;
  }, [trainings]);

  useEffect(() => {
    const initial = {};
    CAT_FIELDS.forEach((f) => { initial[f] = new Set(uniqueValsByField[f]); });
    setCatFilters(initial);
    setStatusFilter(new Set(STATUS_OPTIONS));
    setPriorityFilter(new Set(PRIORITY_OPTIONS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainings.length]);

  function setCatFilter(field, set) { setCatFilters((prev) => ({ ...prev, [field]: set })); }

  const filtered = useMemo(() => {
    return trainings.filter((t) => {
      if (selectedYear !== 'all' && t.plan_year !== Number(selectedYear)) return false;
      if (dateFrom && (!t.start_date || t.start_date < dateFrom)) return false;
      if (dateTo && (!t.start_date || t.start_date > dateTo)) return false;
      const budget = Number(t.budget) || 0;
      if (budgetMin !== '' && budget < Number(budgetMin)) return false;
      if (budgetMax !== '' && budget > Number(budgetMax)) return false;
      const hours = Number(t.man_hours) || 0;
      if (hoursMin !== '' && hours < Number(hoursMin)) return false;
      if (hoursMax !== '' && hours > Number(hoursMax)) return false;
      for (const f of CAT_FIELDS) {
        const sel = catFilters[f];
        if (sel && displayVal(t[f]) !== '—' && !sel.has(displayVal(t[f]))) return false;
      }
      if (!statusFilter.has(t.status)) return false;
      if (t.priority && !priorityFilter.has(t.priority)) return false;
      return true;
    });
  }, [trainings, selectedYear, dateFrom, dateTo, budgetMin, budgetMax, hoursMin, hoursMax, catFilters, statusFilter, priorityFilter]);

  const activeSlicerCount =
    CAT_FIELDS.filter((f) => catFilters[f] && catFilters[f].size < uniqueValsByField[f].length).length +
    (statusFilter.size < STATUS_OPTIONS.length ? 1 : 0) +
    (priorityFilter.size < PRIORITY_OPTIONS.length ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) + (budgetMin !== '' || budgetMax !== '' ? 1 : 0) + (hoursMin !== '' || hoursMax !== '' ? 1 : 0);

  function clearAllSlicers() {
    const reset = {};
    CAT_FIELDS.forEach((f) => { reset[f] = new Set(uniqueValsByField[f]); });
    setCatFilters(reset);
    setStatusFilter(new Set(STATUS_OPTIONS));
    setPriorityFilter(new Set(PRIORITY_OPTIONS));
    setSelectedYear('all'); setDateFrom(''); setDateTo('');
    setBudgetMin(''); setBudgetMax(''); setHoursMin(''); setHoursMax('');
  }

  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const depts = useMemo(() => departmentBreakdown(filtered), [filtered]);
  const trend = useMemo(() => monthlyTrend(filtered), [filtered]);
  const topTrainings = useMemo(() => topBy(filtered, 'skill', 6), [filtered]);
  const topVendors = useMemo(() => topBy(filtered, 'vendor', 6), [filtered]);
  const topLearnersList = useMemo(() => topLearners(filtered, 6), [filtered]);
  const funnel = useMemo(() => completionFunnel(filtered), [filtered]);
  const insights = useMemo(() => generateInsights(filtered, fmtMoney), [filtered]);

  const topDept = depts[0];
  const bestCompletionDept = [...depts].filter((d) => d.total >= 1).sort((a, b) => b.completionRate - a.completionRate)[0];
  const avgPerDept = depts.length ? Math.round(kpis.total / depts.length) : 0;

  const maxTrend = Math.max(...trend.map((m) => m.count), 1);
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  const statusRows = useMemo(() => {
    const counts = {};
    filtered.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const maxStatus = Math.max(...statusRows.map((r) => r[1]), 1);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Executive Dashboard</h1>
            <p>Şirkətinizin təlim ehtiyacları üzrə icmal və analitika — BI-səviyyəli hesabat mərkəzi.</p>
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
        {/* ---------- Slicer bar ---------- */}
        <div className="card slicer-bar-card">
          <div className="slicer-bar-head">
            <div className="filter-label" style={{ marginBottom: 0 }}>
              Slicer-lər {activeSlicerCount > 0 && <span style={{ color: 'var(--blue)' }}>· {activeSlicerCount} aktiv</span>}
            </div>
            {activeSlicerCount > 0 && (
              <button onClick={clearAllSlicers} className="btn btn-outline btn-sm"><FilterX size={13} strokeWidth={2.2} /> Hamısını təmizlə</button>
            )}
          </div>
          <div className="slicer-row">
            {CAT_FIELDS.map((f) => (
              <MultiSelectFilter
                key={f}
                label={CAT_LABELS[f]}
                options={uniqueValsByField[f] || []}
                selected={catFilters[f] || new Set()}
                onChange={(s) => setCatFilter(f, s)}
              />
            ))}
            <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} labelFor={(v) => statusMeta(v).label} />
            <MultiSelectFilter label="Prioritet" options={PRIORITY_OPTIONS} selected={priorityFilter} onChange={setPriorityFilter} labelFor={(v) => PRIORITY_LABELS[v] || v} />
          </div>
          <div className="slicer-row slicer-row-ranges">
            <div className="range-filter">
              <span className="filter-label" style={{ marginBottom: 0 }}>Tarix aralığı</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: 140 }} />
              <span className="range-sep">—</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: 140 }} />
            </div>
            <div className="range-filter">
              <span className="filter-label" style={{ marginBottom: 0 }}>Büdcə (₼)</span>
              <input type="number" placeholder="min" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} style={{ width: 90 }} />
              <span className="range-sep">—</span>
              <input type="number" placeholder="max" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} style={{ width: 90 }} />
            </div>
            <div className="range-filter">
              <span className="filter-label" style={{ marginBottom: 0 }}>Saat</span>
              <input type="number" placeholder="min" value={hoursMin} onChange={(e) => setHoursMin(e.target.value)} style={{ width: 80 }} />
              <span className="range-sep">—</span>
              <input type="number" placeholder="max" value={hoursMax} onChange={(e) => setHoursMax(e.target.value)} style={{ width: 80 }} />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ marginTop: 16 }}>
            <EmptyState icon={FilterX}>Seçilmiş filtrlərə uyğun nəticə yoxdur.</EmptyState>
          </div>
        ) : (
          <>
            {/* ---------- KPI groups ---------- */}
            <StatGroup title="Learning KPI-lər" stats={LEARNING_STATS} raw={kpis} i0={0} />
            <StatGroup title="Maliyyə KPI-ləri" stats={FINANCIAL_STATS} raw={kpis} i0={5} />
            <StatGroup title="Fəallıq KPI-ləri" stats={ENGAGEMENT_STATS} raw={kpis} i0={10} />

            <div className="kpi-group-title">İdarəetmə KPI-ləri</div>
            <div className="kpi-grid">
              <div className="stat-card stagger-item" style={{ '--i': 15 }}>
                <div className="stat-icon" style={{ '--icon-color': '#0891b2', color: '#0891b2' }}><Building2 size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Aktiv Departament</div>
                <div className="stat-value" style={{ color: '#0891b2' }}><CountUp value={kpis.departments} /></div>
              </div>
              <div className="stat-card stagger-item" style={{ '--i': 16 }}>
                <div className="stat-icon" style={{ '--icon-color': '#2563eb', color: '#2563eb' }}><Trophy size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Ən Fəal Departament</div>
                <div className="stat-value stat-value-text" style={{ color: '#2563eb' }} title={topDept?.dept}>{topDept ? topDept.dept : '—'}</div>
                {topDept && <div className="stat-sub">{topDept.total} təlim</div>}
              </div>
              <div className="stat-card stagger-item" style={{ '--i': 17 }}>
                <div className="stat-icon" style={{ '--icon-color': '#059669', color: '#059669' }}><Award size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Ən Yüksək Tamamlanma</div>
                <div className="stat-value stat-value-text" style={{ color: '#059669' }} title={bestCompletionDept?.dept}>{bestCompletionDept ? bestCompletionDept.dept : '—'}</div>
                {bestCompletionDept && <div className="stat-sub">{bestCompletionDept.completionRate}%</div>}
              </div>
              <div className="stat-card stagger-item" style={{ '--i': 18 }}>
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
            </div>

            {/* ---------- Rankings ---------- */}
            <div className="charts-grid">
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Top Təlimlər (büdcəyə görə)</div>
                <div className="section-sub" style={{ marginBottom: 4 }}>İstiqamət üzrə ən çox resurs ayrılan təlimlər</div>
                <RankList items={topTrainings} renderValue={(it) => fmtMoney(it.budget)} emptyLabel="Məlumat yoxdur" />
              </div>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Top Provayderlər</div>
                <div className="section-sub" style={{ marginBottom: 4 }}>Büdcəyə görə ən çox işlənən provayderlər</div>
                <RankList items={topVendors} renderValue={(it) => `${it.count} təlim`} emptyLabel="Məlumat yoxdur" />
              </div>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><GraduationCap size={15} strokeWidth={2.2} /> Top İştirakçılar (saata görə)</div>
                <div className="section-sub" style={{ marginBottom: 4 }}>Ən çox təlim saatı alan işçilər</div>
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
                ) : <EmptyState>Məlumat yoxdur</EmptyState>}
              </div>
            </div>

            <AnalysisView trainings={filtered} />
          </>
        )}
      </div>
    </div>
  );
}
