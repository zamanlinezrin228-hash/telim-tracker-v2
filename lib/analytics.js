import { statusMeta } from './helpers';

export function displayVal(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

const AT_RISK_STATUSES = ['Scheduled to Commence on Planned Date', 'Postponed'];
const FUNNEL_ORDER = ['Scheduled to Commence on Planned Date', 'In Progress', 'Completed'];

export function isAtRisk(t) {
  if (!AT_RISK_STATUSES.includes(t.status) || !t.start_date) return false;
  return new Date(t.start_date) < new Date(new Date().toDateString());
}

// Qənayət counts any row where BOTH budget (planned) and used_budget (real
// spend recorded so far) are set — deliberately NOT gated by status. This
// is a different population than "İstifadə Olunmuş Büdcə" (Completed-only,
// see computeKPIs' usedBudgetCompleted below) on purpose: a Postponed or
// In Progress row can still have a partial/interim used_budget recorded,
// and per explicit product decision that gap still counts here regardless
// of whether the training has formally finished. The two KPIs are NOT
// meant to reconcile with each other (Planlanmış − İstifadə(Completed) ≠
// Qənayət) — that's expected, not a bug; see components/DashboardView.jsx.
// `!= null` rather than truthy, since used_budget = 0 is a valid, common
// real value (a training delivered internally at no cost) and must still
// count as full savings, not get excluded like a missing value would.
export function hasSavedCost(t) {
  return t.budget != null && t.used_budget != null;
}
export function rowSavedCost(t) {
  return hasSavedCost(t) ? Number(t.budget) - Number(t.used_budget) : 0;
}

export function computeKPIs(trainings) {
  const total = trainings.length;
  const participants = new Set(trainings.map((t) => t.employee_name).filter(Boolean)).size;
  const departments = new Set(trainings.map((t) => t.dept).filter(Boolean)).size;
  const completed = trainings.filter((t) => t.status === 'Completed').length;
  const inProgress = trainings.filter((t) => t.status === 'In Progress').length;
  const canceled = trainings.filter((t) => t.status === 'Canceled').length;
  const postponed = trainings.filter((t) => t.status === 'Postponed').length;
  const scheduled = trainings.filter((t) => t.status === 'Scheduled to Commence on Planned Date').length;

  // Four distinct, non-overlapping budget figures — see the KPI cards in
  // DashboardView.jsx, which show all four with an explanatory subtitle
  // each so nobody expects #1 − #2 to equal #3 (it deliberately doesn't;
  // see hasSavedCost's comment above).
  //
  // 1. plannedBudget — the originally planned annual budget: sum(budget)
  //    across every row, regardless of status. Fixed at plan time, doesn't
  //    move as trainings get delivered/cancelled/postponed.
  const plannedBudget = trainings.reduce((a, t) => a + (Number(t.budget) || 0), 0);
  // 2. usedBudgetCompleted — real spend so far, but ONLY for trainings that
  //    have actually happened (status='Completed'). A Postponed/Scheduled/
  //    In Progress/Canceled row's used_budget (if any) is not real finished
  //    spend yet, so it's excluded here on purpose.
  const usedBudgetCompleted = trainings
    .filter((t) => t.status === 'Completed')
    .reduce((a, t) => a + (Number(t.used_budget) || 0), 0);
  // 3. totalSavedCost (Qənayət) — sum(budget − used_budget) wherever BOTH
  //    are set, across ANY status (see hasSavedCost above for why status
  //    doesn't gate this one, unlike #2).
  const totalSavedCost = trainings.reduce((a, t) => a + rowSavedCost(t), 0);
  // 4. realBudget — the realistic remaining budget picture: planned budget
  //    minus whatever's tied up in trainings that are realistically not
  //    going to happen. Currently that's just status='Canceled' — profiles
  //    has no "employee left the company" flag to also exclude by (checked
  //    the schema; see chat), so that half of the exclusion isn't applied.
  const realBudget = trainings
    .filter((t) => t.status !== 'Canceled')
    .reduce((a, t) => a + (Number(t.budget) || 0), 0);

  const totalHours = trainings.reduce((a, t) => a + (Number(t.man_hours) || 0), 0);
  const budgetedCount = trainings.filter((t) => t.budget_status === 'Büdcələnmiş').length;
  const outOfBudgetCount = trainings.filter((t) => t.budget_status === 'Büdcədən kənar').length;
  const atRiskCount = trainings.filter(isAtRisk).length;

  return {
    total, participants, departments,
    completed, inProgress, canceled, postponed, scheduled,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    inProgressRate: total ? Math.round((inProgress / total) * 100) : 0,
    cancellationRate: total ? Math.round((canceled / total) * 100) : 0,
    onTrackRate: total ? Math.round(((completed + inProgress) / total) * 100) : 0,
    plannedBudget, usedBudgetCompleted, totalSavedCost, realBudget, totalHours,
    avgBudget: total ? Math.round(plannedBudget / total) : 0,
    avgHours: total ? Math.round((totalHours / total) * 10) / 10 : 0,
    costPerHour: totalHours ? Math.round(plannedBudget / totalHours) : 0,
    budgetedCount, outOfBudgetCount,
    budgetedShare: total ? Math.round((budgetedCount / total) * 100) : 0,
    // Actual (Completed-only) spend as a share of planned budget.
    budgetUtilization: plannedBudget ? Math.round((usedBudgetCompleted / plannedBudget) * 100) : 0,
    atRiskCount,
  };
}

export function departmentBreakdown(trainings) {
  const map = {};
  trainings.forEach((t) => {
    const d = t.dept || '—';
    if (!map[d]) map[d] = { dept: d, total: 0, completed: 0, canceled: 0, budget: 0, hours: 0, savedCost: 0 };
    map[d].total += 1;
    if (t.status === 'Completed') map[d].completed += 1;
    if (t.status === 'Canceled') map[d].canceled += 1;
    map[d].budget += Number(t.budget) || 0;
    map[d].hours += Number(t.man_hours) || 0;
    map[d].savedCost += rowSavedCost(t);
  });
  return Object.values(map)
    .map((d) => ({ ...d, completionRate: d.total ? Math.round((d.completed / d.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

// Dedicated per-department planned/used/saved breakdown for the "Qənaət
// Analizi" dashboard section — unlike departmentBreakdown()'s `budget`
// field (sum of ALL rows' budget regardless of used_budget), this only
// ever counts rows where BOTH budget and used_budget are set (hasSavedCost),
// so plannedBudget - usedBudget always equals savedCost exactly for every
// department shown — no rows sneak into "planned" that were excluded from
// "saved" for missing used_budget.
export function departmentSavedCostBreakdown(trainings) {
  const map = {};
  trainings.forEach((t) => {
    if (!hasSavedCost(t)) return;
    const d = t.dept || '—';
    if (!map[d]) map[d] = { dept: d, count: 0, plannedBudget: 0, usedBudget: 0, savedCost: 0 };
    map[d].count += 1;
    map[d].plannedBudget += Number(t.budget);
    map[d].usedBudget += Number(t.used_budget);
    map[d].savedCost += rowSavedCost(t);
  });
  return Object.values(map).sort((a, b) => Math.abs(b.savedCost) - Math.abs(a.savedCost));
}

export function monthlyTrend(trainings) {
  const map = {};
  trainings.forEach((t) => {
    if (!t.start_date) return;
    const key = String(t.start_date).slice(0, 7);
    if (!map[key]) map[key] = { key, count: 0, budget: 0 };
    map[key].count += 1;
    map[key].budget += Number(t.budget) || 0;
  });
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
}

export function topBy(trainings, field, limit = 5) {
  const map = {};
  trainings.forEach((t) => {
    const key = displayVal(t[field]);
    if (key === '—') return;
    if (!map[key]) map[key] = { key, count: 0, budget: 0, hours: 0 };
    map[key].count += 1;
    map[key].budget += Number(t.budget) || 0;
    map[key].hours += Number(t.man_hours) || 0;
  });
  return Object.values(map).sort((a, b) => b.budget - a.budget).slice(0, limit);
}

export function topLearners(trainings, limit = 5) {
  const map = {};
  trainings.forEach((t) => {
    const key = t.employee_name;
    if (!key) return;
    if (!map[key]) map[key] = { key, dept: t.dept, count: 0, hours: 0, completed: 0 };
    map[key].count += 1;
    map[key].hours += Number(t.man_hours) || 0;
    if (t.status === 'Completed') map[key].completed += 1;
  });
  return Object.values(map).sort((a, b) => b.hours - a.hours).slice(0, limit);
}

export function completionFunnel(trainings) {
  const total = trainings.length;
  return FUNNEL_ORDER.map((status) => {
    const count = trainings.filter((t) => t.status === status).length;
    const m = statusMeta(status);
    return { status, label: m.label, color: m.color, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });
}

export function generateInsights(trainings, fmtMoney) {
  const insights = [];
  if (!trainings.length) return insights;

  const depts = departmentBreakdown(trainings);
  const topTraining = topBy(trainings, 'skill', 1)[0];
  if (topTraining) {
    insights.push({
      type: 'success', title: 'Ən çox investisiya olunan təlim',
      text: `"${topTraining.key}" — ${fmtMoney(topTraining.budget)} büdcə və ${topTraining.count} iştirakçı ilə ən çox resurs ayrılan təlim istiqamətidir.`,
    });
  }

  const worstDept = depts.filter((d) => d.total >= 2).sort((a, b) => a.completionRate - b.completionRate)[0];
  if (worstDept && worstDept.completionRate < 50) {
    insights.push({
      type: 'warning', title: 'Diqqət tələb edən departament',
      text: `${worstDept.dept} departamentində tamamlanma faizi cəmi ${worstDept.completionRate}% təşkil edir (${worstDept.completed}/${worstDept.total}).`,
    });
  }

  const avgPerTraining = trainings.reduce((a, t) => a + (Number(t.budget) || 0), 0) / trainings.length;
  const anomalyDept = depts.find((d) => d.total >= 1 && avgPerTraining > 0 && (d.budget / d.total) > avgPerTraining * 1.8);
  if (anomalyDept) {
    const ratio = Math.round(((anomalyDept.budget / anomalyDept.total) / avgPerTraining - 1) * 100);
    insights.push({
      type: 'warning', title: 'Büdcə anomaliyası',
      text: `${anomalyDept.dept} üzrə orta təlim büdcəsi şirkət ortalamasından ${ratio}% yüksəkdir — səbəbini yoxlamaq tövsiyə olunur.`,
    });
  }

  const atRisk = trainings.filter(isAtRisk);
  if (atRisk.length) {
    insights.push({
      type: 'danger', title: 'Tamamlanma riski',
      text: `${atRisk.length} təlim planlaşdırılan başlama tarixini keçib, lakin hələ başlamayıb və ya təxirə salınıb — bu təlimləri yenidən planlaşdırmaq lazımdır.`,
    });
  }

  const canceled = trainings.filter((t) => t.status === 'Canceled');
  if (canceled.length && trainings.length && canceled.length / trainings.length > 0.15) {
    insights.push({
      type: 'danger', title: 'Yüksək ləğv nisbəti',
      text: `Təlimlərin ${Math.round((canceled.length / trainings.length) * 100)}%-i ləğv edilib — planlaşdırma prosesini nəzərdən keçirmək tövsiyə olunur.`,
    });
  }

  const bestDept = depts.filter((d) => d.total >= 2).sort((a, b) => b.completionRate - a.completionRate)[0];
  if (bestDept && bestDept.completionRate >= 80 && bestDept.dept !== worstDept?.dept) {
    insights.push({
      type: 'success', title: 'Nümunəvi departament',
      text: `${bestDept.dept} departamenti ${bestDept.completionRate}% tamamlanma faizi ilə ən yaxşı nəticəni göstərir.`,
    });
  }

  return insights;
}
