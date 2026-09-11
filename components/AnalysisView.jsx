import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ArrowLeftRight, Download } from 'lucide-react';
import { statusMeta, priorityMeta } from '../lib/helpers';
import MultiSelectFilter from './MultiSelectFilter';

const FIELD_LABELS = {
  dept: 'Departament', sube: 'Şöbə', position: 'Vəzifə', category: 'Vəzifə Kateqoriyası',
  skill: 'Təlimin Adı', comp_cat: 'Səriştə Kateqoriyası', vendor: 'Provayder', status: 'Status',
  priority: 'Prioritet', budget_status: 'Büdcə Statusu', employee_name: 'Ad Soyad', plan_year: 'İl',
};
const DIMENSION_FIELDS = Object.keys(FIELD_LABELS);

const METRIC_LABELS = {
  budget: 'Büdcənin cəmi', count: 'Təlim sayı', man_hours: 'Saatın cəmi',
  avg_budget: 'Orta büdcə', avg_hours: 'Orta saat', completion_rate: 'Tamamlanma faizi',
  participants: 'İştirakçı sayı (unikal)',
};
const METRIC_OPTIONS = Object.keys(METRIC_LABELS);

function displayVal(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}
function labelFor(field, v) {
  if (field === 'status') return statusMeta(v).label;
  if (field === 'priority') return priorityMeta(v).label;
  return v;
}

function newAgg() {
  return { count: 0, budgetSum: 0, hoursSum: 0, completedCount: 0, participants: new Set() };
}
function addToAgg(agg, t) {
  agg.count += 1;
  agg.budgetSum += Number(t.budget) || 0;
  agg.hoursSum += Number(t.man_hours) || 0;
  if (t.status === 'Completed') agg.completedCount += 1;
  if (t.employee_name) agg.participants.add(t.employee_name);
}

export default function AnalysisView({ trainings }) {
  const [rowField, setRowField] = useState('dept');
  const [colField, setColField] = useState('status');
  const [metric, setMetric] = useState('budget');
  const [catFilters, setCatFilters] = useState({});
  const [showPct, setShowPct] = useState(false);

  function swapFields() {
    setRowField(colField);
    setColField(rowField);
  }

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
    switch (metric) {
      case 'count': return agg.count;
      case 'budget': return agg.budgetSum;
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
      const c = displayVal(t[colField]);
      rowSet.add(r); colSet.add(c);
      const key = r + '|||' + c;
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
    const maxCellVal = Math.max(...Object.values(cellAgg).map((a) => metricValue(a)), 1);

    return { rowKeys: rowKeysArr, colKeys: colKeysArr, cellAgg, rowAgg, colAgg, grandAgg, maxCellVal };
  }, [sliced, rowField, colField, metric]);

  function fmt(n) {
    if (metric === 'count' || metric === 'participants') return Math.round(n).toLocaleString('az-AZ');
    if (metric === 'man_hours' || metric === 'avg_hours') return (Math.round(n * 10) / 10).toLocaleString('az-AZ') + ' saat';
    if (metric === 'completion_rate') return Math.round(n) + '%';
    return Math.round(n).toLocaleString('az-AZ') + ' ₼';
  }

  function cellDisplay(agg, rowTotalAgg) {
    const raw = metricValue(agg);
    if (showPct && metric !== 'completion_rate' && metric !== 'participants') {
      const rowTotal = metricValue(rowTotalAgg);
      const pct = rowTotal ? Math.round((raw / rowTotal) * 100) : 0;
      return `${pct}%`;
    }
    return fmt(raw);
  }

  function heatColor(agg) {
    const raw = metricValue(agg);
    if (!raw) return 'transparent';
    const intensity = Math.min(1, raw / maxCellVal);
    const alpha = 0.08 + intensity * 0.35;
    return `rgba(37, 99, 235, ${alpha.toFixed(2)})`;
  }

  function exportPivot() {
    const rows = rowKeys.map((r) => {
      const row = { [FIELD_LABELS[rowField]]: labelFor(rowField, r) };
      colKeys.forEach((c) => { row[labelFor(colField, c)] = metricValue(cellAgg[r + '|||' + c]); });
      row['Cəmi'] = metricValue(rowAgg[r]);
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analiz');
    XLSX.writeFile(wb, `analiz-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      <div className="section-sub" style={{ marginBottom: 18 }}>Sahələri seçib canlı cədvəl analiz qurun</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <div className="filter-label">Sətir sahəsi</div>
            <select value={rowField} onChange={(e) => setRowField(e.target.value)} style={{ minWidth: 180 }}>
              {DIMENSION_FIELDS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </select>
          </div>
          <button
            onClick={swapFields}
            title="Sətir/Sütunu dəyiş"
            className="btn btn-outline btn-sm"
            style={{ height: 40, padding: '0 12px' }}
          >
            <ArrowLeftRight size={15} strokeWidth={2.2} />
          </button>
          <div>
            <div className="filter-label">Sütun sahəsi</div>
            <select value={colField} onChange={(e) => setColField(e.target.value)} style={{ minWidth: 180 }}>
              {DIMENSION_FIELDS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </select>
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

        <div className="filter-label" style={{ marginBottom: 8 }}>
          Slicer-lər (əlavə filtrlər) {activeSlicerCount > 0 && <span style={{ color: 'var(--blue)' }}>· {activeSlicerCount} aktiv</span>}
        </div>
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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{FIELD_LABELS[rowField]}</th>
              {colKeys.map((c) => <th key={c}>{labelFor(colField, c)}</th>)}
              <th>Cəmi</th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((r) => (
              <tr key={r}>
                <td style={{ fontWeight: 600 }}>{labelFor(rowField, r)}</td>
                {colKeys.map((c) => {
                  const agg = cellAgg[r + '|||' + c];
                  return (
                    <td key={c} style={{ background: heatColor(agg) }}>
                      {cellDisplay(agg, rowAgg[r])}
                    </td>
                  );
                })}
                <td style={{ fontWeight: 700 }}>{fmt(metricValue(rowAgg[r]))}</td>
              </tr>
            ))}
            <tr style={{ background: 'var(--ink-50)' }}>
              <td style={{ fontWeight: 800 }}>Cəmi</td>
              {colKeys.map((c) => <td key={c} style={{ fontWeight: 700 }}>{fmt(metricValue(colAgg[c]))}</td>)}
              <td style={{ fontWeight: 800 }}>{fmt(metricValue(grandAgg))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
