import { useState, useMemo, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { ArrowLeftRight, Download } from 'lucide-react';
import { statusMeta, priorityMeta, fmtMoney } from '../lib/helpers';
import { hasSavedCost } from '../lib/analytics';
import { styleHeaderRow, downloadWorkbook } from '../lib/excelExport';
import MultiSelectFilter from './MultiSelectFilter';

// Every column TrackingView.jsx's İzləmə Cədvəli table shows (its
// ALL_COLUMNS list) has a matching entry here, so nothing visible there is
// unavailable as a row/column dimension here. budget and used_budget are
// included deliberately — see the metric-select effect below for how
// picking one of them as a dimension shows its value directly without
// also requiring a "Dəyər" pick.
const FIELD_LABELS = {
  plan_year: 'İl', dept: 'Departament', sube: 'Şöbə', employee_name: 'Ad Soyad', position: 'Vəzifə',
  category: 'Vəzifə Kateqoriyası', comp_cat: 'Səriştə Kateqoriyası', learning_goal: 'Öyrənmə Məqsədi',
  skill: 'Təlimin Adı', vendor: 'Provayder', man_hours: 'Müddət (Man Hours)',
  used_budget: 'İstifadə Olunmuş Büdcə', budget: 'Planlanmış Büdcə', status: 'Status',
  start_date: 'Planlaşdırılan Başlama Tarixi', end_date: 'Planlaşdırılan Bitmə Tarixi',
  transformation_area: 'Transformation Capability Area', importance_level: 'Müvafiq Səriştənin Əhəmiyyətlilik dərəcəsi',
  current_skill_level: 'Mövcud Bacarıq Səviyyəsi', required_skill_level: 'Tələb Olunan Bacarıq Səviyyəsi',
  learning_method: 'Öyrənmə metodu', activity_duration: 'Təlim/İnkişaf Aktivliyinin Müddəti',
  need_reason: 'Təlim və inkişaf ehtiyacının yaranma səbəbi', weighted_gap: 'WG (Weighted Gap)',
  cgi: 'CGI (Competency Gap Index)', cgi_priority_full: 'Competency GAP Index (Priority)',
  priority: 'Prioritet', budget_status: 'Büdcə Statusu',
};
const DIMENSION_FIELDS = Object.keys(FIELD_LABELS);
// Free-text/long fields where grouping still works but produces one row
// per distinct value (near-unique per training) rather than a handful of
// meaningful buckets — kept selectable since TrackingView shows them too,
// but the "Tövsiyə olunan analizlər" presets never default to these.
const HIGH_CARDINALITY_FIELDS = new Set(['learning_goal', 'need_reason', 'cgi_priority_full']);

// '' (no metric chosen yet) is deliberately first so the table doesn't
// show numbers nobody asked for until the user actively picks a "Dəyər"
// or a preset — see the empty state in the render below.
const METRIC_LABELS = {
  '': '— Seçilməyib —',
  budget: 'Planlanmış Büdcə (cəmi)', used_budget: 'İstifadə Olunmuş Büdcə (cəmi)', count: 'Təlim sayı', man_hours: 'Saatın cəmi',
  avg_budget: 'Orta büdcə', avg_hours: 'Orta saat', completion_rate: 'Tamamlanma faizi',
  participants: 'İştirakçı sayı (unikal)', saved_cost: 'Qənaət (Planlanmış − İstifadə, status önəmli deyil)',
};
const METRIC_OPTIONS = Object.keys(METRIC_LABELS);

// Ready-made row/column/dəyər combinations for the most common questions
// this table gets used for — shown as one-click buttons above the manual
// controls so a user doesn't have to guess which of the 13 dimension
// fields to cross with which to get a specific, useful answer. Each one
// is a real, named question ("hansı departament nə qədər qənaət edib?"),
// not just a random field pairing.
const PRESETS = [
  {
    label: 'Departament üzrə Qənaət', metric: 'saved_cost', rowField: 'dept', colFields: ['status'],
    desc: 'Hər departamentin planlanmış və real xərc fərqini, statusa görə göstərir.',
  },
  {
    label: 'Departament üzrə Planlanmış Büdcə', metric: 'budget', rowField: 'dept', colFields: ['status'],
    desc: 'Hər departamentə ayrılan büdcəni statusa görə bölür.',
  },
  {
    label: 'Status üzrə Təlim Sayı', metric: 'count', rowField: 'status', colFields: ['dept'],
    desc: 'Neçə təlim hansı statusdadır — departament üzrə bölünmüş.',
  },
  {
    label: 'Provayder üzrə Real Xərc', metric: 'used_budget', rowField: 'vendor', colFields: ['status'],
    desc: 'Hansı provayderə faktiki nə qədər xərclənib.',
  },
  {
    label: 'Prioritet üzrə Tamamlanma', metric: 'completion_rate', rowField: 'priority', colFields: ['dept'],
    desc: 'Prioritet səviyyəsinə görə təlimlərin nə qədəri bitib.',
  },
  {
    label: 'Əməkdaş üzrə Təlim Saatı', metric: 'man_hours', rowField: 'employee_name', colFields: ['comp_cat'],
    desc: 'Kim nə qədər təlim saatı keçib — bacarıq növünə (Hard/Soft Skills) görə.',
  },
];

function displayVal(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}
// Row/column header labels for fields being used as a GROUPING key (not
// the aggregated metric value) — e.g. budget=1000 as a dimension shows
// the literal "1,000 ₼" group label, distinct from budget summed as the
// Dəyər metric across a whole group of rows.
function labelFor(field, v) {
  if (v === '—') return v;
  if (field === 'status') return statusMeta(v).label;
  if (field === 'priority') return priorityMeta(v).label;
  if (field === 'budget' || field === 'used_budget') return fmtMoney(Number(v));
  if (field === 'man_hours') return `${v} saat`;
  if (field === 'start_date' || field === 'end_date') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return v;
}

function newAgg() {
  return {
    count: 0, budgetSum: 0, usedBudgetSum: 0, savedCostSum: 0,
    // Separate from budgetSum/usedBudgetSum above (which include every row
    // regardless of whether the other field is set, for the plain
    // budget/used_budget metrics) — these two only ever accumulate from the
    // SAME rows counted into savedCostSum, so the "Planlanmış: X · İstifadə: Y"
    // detail line always satisfies X - Y === the Qənaət value shown next to it.
    savedCostBudgetSum: 0, savedCostUsedSum: 0,
    hoursSum: 0, completedCount: 0, participants: new Set(),
  };
}
function addToAgg(agg, t) {
  agg.count += 1;
  agg.budgetSum += Number(t.budget) || 0;
  agg.usedBudgetSum += Number(t.used_budget) || 0;
  // Saved cost only counts rows where BOTH budget and used_budget are set —
  // a row still missing one of them contributes nothing here, same rule as
  // the Dashboard's saved-cost KPI (lib/analytics.js's rowSavedCost).
  if (hasSavedCost(t)) {
    agg.savedCostSum += Number(t.budget) - Number(t.used_budget);
    agg.savedCostBudgetSum += Number(t.budget);
    agg.savedCostUsedSum += Number(t.used_budget);
  }
  agg.hoursSum += Number(t.man_hours) || 0;
  if (t.status === 'Completed') agg.completedCount += 1;
  if (t.employee_name) agg.participants.add(t.employee_name);
}

export default function AnalysisView({ trainings }) {
  const [rowField, setRowField] = useState('dept');
  // Multiple column dimensions can be selected at once (e.g. Status AND
  // Departament together), producing composite column headers — unlike
  // rowField, which stays single-select. Stored as a Set of field keys;
  // colFieldsArr (below) derives the actual, deterministically-ordered list
  // to use, always excluding rowField so the same field can't sit on both axes.
  const [colFields, setColFields] = useState(() => new Set(['status']));
  // Starts unselected on purpose — see METRIC_LABELS comment.
  const [metric, setMetric] = useState('');
  const [catFilters, setCatFilters] = useState({});
  const [showPct, setShowPct] = useState(false);
  const [showSlicers, setShowSlicers] = useState(false);

  const colFieldsArr = useMemo(
    () => DIMENSION_FIELDS.filter((f) => f !== rowField && colFields.has(f)),
    [colFields, rowField]
  );

  // Self-heals to a single fallback field whenever the derived list would
  // otherwise be empty — e.g. the user unchecked every column field, or
  // rowField changed to the one field that was previously selected for
  // columns. Keeps the table always renderable without blocking checkbox
  // interactions with extra validation logic.
  useEffect(() => {
    if (colFieldsArr.length === 0) {
      const fallback = DIMENSION_FIELDS.find((f) => f !== rowField) || DIMENSION_FIELDS[0];
      setColFields(new Set([fallback]));
    }
  }, [colFieldsArr, rowField]);

  // Only well-defined when exactly one column field is selected — mirrors
  // the field it's swapping with rowField, same as the old single-select
  // swap. Disabled (not hidden) otherwise, since swapping rowField into a
  // multi-field column selection has no obvious single meaning.
  function swapFields() {
    if (colFieldsArr.length !== 1) return;
    const other = colFieldsArr[0];
    setColFields(new Set([rowField]));
    setRowField(other);
  }

  function applyPreset(p) {
    setRowField(p.rowField);
    setColFields(new Set(p.colFields));
    setMetric(p.metric);
  }
  function isActivePreset(p) {
    return rowField === p.rowField && metric === p.metric
      && colFieldsArr.length === p.colFields.length
      && p.colFields.every((f) => colFieldsArr.includes(f));
  }

  // What actually gets computed/shown when the user hasn't explicitly
  // picked a "Dəyər": rather than an empty table, this defaults to a
  // plain row/column match count — UNLESS budget or used_budget is one of
  // the chosen dimensions, in which case that field's own sum is shown
  // directly (its literal value "on its own", without a separate metric
  // pick, per the explicit ask). An explicit metric pick always wins.
  const effectiveMetric = useMemo(() => {
    if (metric) return metric;
    if (colFieldsArr.includes('budget') || rowField === 'budget') return 'budget';
    if (colFieldsArr.includes('used_budget') || rowField === 'used_budget') return 'used_budget';
    return 'count';
  }, [metric, rowField, colFieldsArr]);

  const uniqueValsByField = useMemo(() => {
    const map = {};
    DIMENSION_FIELDS.forEach((f) => { map[f] = [...new Set(trainings.map((t) => displayVal(t[f])))].filter((v) => v !== '—').sort(); });
    return map;
  }, [trainings]);

  const sliced = useMemo(() => {
    return trainings.filter((t) => {
      for (const f of DIMENSION_FIELDS) {
        const sel = catFilters[f];
        if (sel && displayVal(t[f]) !== '—' && !sel.has(displayVal(t[f]))) return false;
      }
      return true;
    });
  }, [trainings, catFilters]);

  function metricValue(agg) {
    if (!agg) return 0;
    switch (effectiveMetric) {
      case 'count': return agg.count;
      case 'budget': return agg.budgetSum;
      case 'used_budget': return agg.usedBudgetSum;
      case 'saved_cost': return agg.savedCostSum;
      case 'man_hours': return agg.hoursSum;
      case 'avg_budget': return agg.count ? agg.budgetSum / agg.count : 0;
      case 'avg_hours': return agg.count ? agg.hoursSum / agg.count : 0;
      case 'completion_rate': return agg.count ? (agg.completedCount / agg.count) * 100 : 0;
      case 'participants': return agg.participants.size;
      default: return 0;
    }
  }

  const { rowKeys, colKeys, cellAgg, rowAgg, colAgg, grandAgg, maxCellVal } = useMemo(() => {
    const rowSet = new Set(), colSet = new Set();
    const cellAgg = {}, rowAgg = {}, colAgg = {};
    const grandAgg = newAgg();

    sliced.forEach((t) => {
      const r = displayVal(t[rowField]);
      // Composite key so multiple column fields collapse into one combined
      // column — e.g. colFieldsArr = ['status', 'dept'] produces keys like
      // "Approved|||Maliyyə departamenti". Field values themselves never
      // contain '|||', same assumption the row|||col cellAgg key below
      // already relies on.
      const c = colFieldsArr.map((f) => displayVal(t[f])).join('|||');
      rowSet.add(r); colSet.add(c);
      const key = r + '||||||' + c;
      if (!cellAgg[key]) cellAgg[key] = newAgg();
      if (!rowAgg[r]) rowAgg[r] = newAgg();
      if (!colAgg[c]) colAgg[c] = newAgg();
      addToAgg(cellAgg[key], t);
      addToAgg(rowAgg[r], t);
      addToAgg(colAgg[c], t);
      addToAgg(grandAgg, t);
    });

    const rowKeysArr = [...rowSet].sort((a, b) => metricValue(rowAgg[b]) - metricValue(rowAgg[a]));
    const colKeysArr = [...colSet].sort();
    // Math.abs so saved_cost (the only metric that can go negative) still
    // scales its heat intensity by magnitude, not just by how positive it is.
    const maxCellVal = Math.max(...Object.values(cellAgg).map((a) => Math.abs(metricValue(a))), 1);

    return { rowKeys: rowKeysArr, colKeys: colKeysArr, cellAgg, rowAgg, colAgg, grandAgg, maxCellVal };
  }, [sliced, rowField, colFieldsArr, metric]);

  // Turns a composite column key back into its per-field display label,
  // e.g. "Approved|||Maliyyə departamenti" -> "Təsdiqləndi / Maliyyə departamenti".
  function colLabel(key) {
    const parts = key.split('|||');
    return colFieldsArr.map((f, i) => labelFor(f, parts[i])).join(' / ');
  }

  function fmt(n) {
    if (effectiveMetric === 'count' || effectiveMetric === 'participants') return Math.round(n).toLocaleString('az-AZ');
    if (effectiveMetric === 'man_hours' || effectiveMetric === 'avg_hours') return (Math.round(n * 10) / 10).toLocaleString('az-AZ') + ' saat';
    if (effectiveMetric === 'completion_rate') return Math.round(n) + '%';
    return Math.round(n).toLocaleString('az-AZ') + ' ₼';
  }

  function cellDisplay(agg, rowTotalAgg) {
    const raw = metricValue(agg);
    if (showPct && effectiveMetric !== 'completion_rate' && effectiveMetric !== 'participants') {
      const rowTotal = metricValue(rowTotalAgg);
      const pct = rowTotal ? Math.round((raw / rowTotal) * 100) : 0;
      return `${pct}%`;
    }
    return fmt(raw);
  }

  // Any budget-related number is easy to misread in isolation — "3,865 ₼
  // qənaət" means nothing without knowing it's the gap between which two
  // bigger numbers. So whichever of the three budget metrics is selected,
  // the OTHER two show as a small context line under the main value:
  //  - saved_cost -> Planlanmış/İstifadə (only rows where BOTH are set,
  //    any status — see addToAgg's savedCost*Sum / lib/analytics.js's
  //    hasSavedCost)
  //  - budget -> İstifadə (plain total across every row, same population
  //    the budget metric itself sums)
  //  - used_budget -> Planlanmış (same, plain total)
  // Skipped in percent mode, where the context would clutter more than help.
  function budgetContextDetail(agg) {
    if (showPct || !agg) return null;
    if (effectiveMetric === 'saved_cost') {
      if (!agg.savedCostBudgetSum && !agg.savedCostUsedSum) return null;
      return (
        <div style={{ fontSize: 10.5, color: 'var(--ink-400)', fontWeight: 400, marginTop: 2, whiteSpace: 'nowrap' }}>
          Planlanmış: {fmt(agg.savedCostBudgetSum)} · İstifadə: {fmt(agg.savedCostUsedSum)}
        </div>
      );
    }
    if (effectiveMetric === 'budget' && agg.usedBudgetSum) {
      return (
        <div style={{ fontSize: 10.5, color: 'var(--ink-400)', fontWeight: 400, marginTop: 2, whiteSpace: 'nowrap' }}>
          İstifadə: {fmt(agg.usedBudgetSum)}
        </div>
      );
    }
    if (effectiveMetric === 'used_budget' && agg.budgetSum) {
      return (
        <div style={{ fontSize: 10.5, color: 'var(--ink-400)', fontWeight: 400, marginTop: 2, whiteSpace: 'nowrap' }}>
          Planlanmış: {fmt(agg.budgetSum)}
        </div>
      );
    }
    return null;
  }

  function heatColor(agg) {
    const raw = metricValue(agg);
    if (!raw) return 'transparent';
    // saved_cost can go negative (overspend) unlike every other metric here —
    // intensity is based on magnitude so both directions scale correctly,
    // and a negative total shades red instead of the default blue.
    const intensity = Math.min(1, Math.abs(raw) / maxCellVal);
    const alpha = 0.08 + intensity * 0.35;
    return raw < 0 ? `rgba(220, 38, 38, ${alpha.toFixed(2)})` : `rgba(37, 99, 235, ${alpha.toFixed(2)})`;
  }

  async function exportPivot() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Analiz');
    const columns = [{ header: FIELD_LABELS[rowField], key: 'rowLabel', width: 26 }];
    colKeys.forEach((c, i) => { columns.push({ header: colLabel(c), key: `c${i}`, width: 18 }); });
    columns.push({ header: 'Cəmi', key: 'total', width: 16 });
    ws.columns = columns;

    rowKeys.forEach((r) => {
      const rowData = { rowLabel: labelFor(rowField, r) };
      colKeys.forEach((c, i) => { rowData[`c${i}`] = metricValue(cellAgg[r + '||||||' + c]); });
      rowData.total = metricValue(rowAgg[r]);
      ws.addRow(rowData);
    });

    const totalRowData = { rowLabel: 'Cəmi' };
    colKeys.forEach((c, i) => { totalRowData[`c${i}`] = metricValue(colAgg[c]); });
    totalRowData.total = metricValue(grandAgg);
    const totalRow = ws.addRow(totalRowData);
    totalRow.font = { bold: true };

    const numFmt = effectiveMetric === 'budget' || effectiveMetric === 'used_budget' || effectiveMetric === 'saved_cost' || effectiveMetric === 'avg_budget' ? '#,##0 "₼"'
      : effectiveMetric === 'completion_rate' ? '0"%"'
      : effectiveMetric === 'man_hours' || effectiveMetric === 'avg_hours' ? '#,##0.0'
      : '#,##0';
    columns.forEach((col) => { if (col.key !== 'rowLabel') ws.getColumn(col.key).numFmt = numFmt; });

    styleHeaderRow(ws);
    await downloadWorkbook(wb, `analiz-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const activeSlicerCount = DIMENSION_FIELDS.filter((f) => catFilters[f] && catFilters[f].size < uniqueValsByField[f].length).length;

  function clearAllSlicers() {
    const reset = {};
    DIMENSION_FIELDS.forEach((f) => { reset[f] = new Set(uniqueValsByField[f]); });
    setCatFilters(reset);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div className="section-title">Ətraflı Analiz</div>
      <div className="section-sub" style={{ marginBottom: 18 }}>Hazır analizlərdən seçin, ya da sahələri özünüz qurun</div>

      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div className="filter-label" style={{ marginBottom: 10 }}>Tövsiyə olunan analizlər</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          {PRESETS.map((p) => {
            const active = isActivePreset(p);
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                title={p.desc}
                className={active ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>
          {PRESETS.find(isActivePreset)?.desc || 'Aşağıdakı sahələrlə öz analizinizi qurdunuz.'}
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
          <div>
            <div className="filter-label">Sətir sahəsi</div>
            <select value={rowField} onChange={(e) => setRowField(e.target.value)} style={{ minWidth: 180 }}>
              {DIMENSION_FIELDS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </select>
          </div>
          <button
            onClick={swapFields}
            title={colFieldsArr.length === 1 ? 'Sətir/Sütunu dəyiş' : 'Yalnız bir sütun sahəsi seçiləndə dəyişmək mümkündür'}
            className="btn btn-outline btn-sm"
            disabled={colFieldsArr.length !== 1}
            style={{ height: 40, padding: '0 12px' }}
          >
            <ArrowLeftRight size={15} strokeWidth={2.2} />
          </button>
          <div>
            <div className="filter-label">Sütun sahələri (çoxlu seçim)</div>
            <MultiSelectFilter
              label="Sütun sahələri"
              options={DIMENSION_FIELDS.filter((f) => f !== rowField)}
              selected={colFields}
              onChange={(s) => setColFields(s)}
              labelFor={(f) => FIELD_LABELS[f]}
            />
          </div>
          <div>
            <div className="filter-label">Dəyər</div>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ minWidth: 190 }}>
              {METRIC_OPTIONS.map((m) => <option key={m} value={m}>{METRIC_LABELS[m]}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, height: 40, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPct} onChange={(e) => setShowPct(e.target.checked)} />
            Faizlə göstər (sətir üzrə)
          </label>
          <button
            onClick={exportPivot}
            className="btn btn-success"
            style={{ height: 40, marginLeft: 'auto' }}
          >
            <Download size={14} strokeWidth={2.2} /> Excel-ə ixrac et
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--ink-600)', background: 'var(--ink-50)', borderRadius: 8, padding: '8px 12px', marginBottom: 4 }}>
          Hazırda göstərilir: <strong>{FIELD_LABELS[rowField]}</strong> üzrə sətirlər,{' '}
          <strong>{colFieldsArr.map((f) => FIELD_LABELS[f]).join(' / ')}</strong> görə sütunlar — dəyər:{' '}
          <strong>{METRIC_LABELS[effectiveMetric]}</strong>
          {!metric && <> (dəyər seçilməyib, standart olaraq {colFieldsArr.includes('budget') || colFieldsArr.includes('used_budget') || rowField === 'budget' || rowField === 'used_budget' ? 'seçilmiş büdcə sahəsi' : 'sayı'} göstərilir)</>}.
        </div>
        {(HIGH_CARDINALITY_FIELDS.has(rowField) || colFieldsArr.some((f) => HIGH_CARDINALITY_FIELDS.has(f))) && (
          <div style={{ fontSize: 12, color: 'var(--amber-700, #b45309)', marginBottom: 4 }}>
            Diqqət: seçilmiş sahə(lər) sərbəst mətndir — hər təlim demək olar unikal qiymətə malikdir, ona görə cədvəldə çox sayda sətir/sütun görünə bilər.
          </div>
        )}

        <button
          onClick={() => setShowSlicers((v) => !v)}
          className="btn btn-outline btn-sm"
          style={{ marginTop: 8 }}
        >
          {showSlicers ? 'Əlavə filtrləri gizlət' : 'Əlavə filtrlər'} {activeSlicerCount > 0 && `(${activeSlicerCount} aktiv)`}
        </button>

        {showSlicers && (
          <div style={{ marginTop: 10 }}>
            <div className="slicer-row">
              {DIMENSION_FIELDS.map((f) => (
                <MultiSelectFilter
                  key={f}
                  label={FIELD_LABELS[f]}
                  options={uniqueValsByField[f] || []}
                  selected={catFilters[f] || new Set(uniqueValsByField[f])}
                  onChange={(s) => setCatFilters((prev) => ({ ...prev, [f]: s }))}
                  labelFor={(v) => labelFor(f, v)}
                />
              ))}
              {activeSlicerCount > 0 && (
                <button onClick={clearAllSlicers} className="btn btn-outline btn-sm">Hamısını təmizlə</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{FIELD_LABELS[rowField]}</th>
              {colKeys.map((c) => <th key={c}>{colLabel(c)}</th>)}
              <th>Cəmi</th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((r) => (
              <tr key={r}>
                <td style={{ fontWeight: 600 }}>{labelFor(rowField, r)}</td>
                {colKeys.map((c) => {
                  const agg = cellAgg[r + '||||||' + c];
                  return (
                    <td key={c} style={{ background: heatColor(agg) }}>
                      {cellDisplay(agg, rowAgg[r])}
                      {budgetContextDetail(agg)}
                    </td>
                  );
                })}
                <td style={{ fontWeight: 700 }}>
                  {fmt(metricValue(rowAgg[r]))}
                  {budgetContextDetail(rowAgg[r])}
                </td>
              </tr>
            ))}
            <tr style={{ background: 'var(--ink-50)' }}>
              <td style={{ fontWeight: 800 }}>Cəmi</td>
              {colKeys.map((c) => (
                <td key={c} style={{ fontWeight: 700 }}>
                  {fmt(metricValue(colAgg[c]))}
                  {budgetContextDetail(colAgg[c])}
                </td>
              ))}
              <td style={{ fontWeight: 800 }}>
                {fmt(metricValue(grandAgg))}
                {budgetContextDetail(grandAgg)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
