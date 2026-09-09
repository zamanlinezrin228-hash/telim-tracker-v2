import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { statusMeta } from '../lib/helpers';

const FIELD_LABELS = {
  dept: 'Departament', sube: 'Şöbə', category: 'Vəzifə Kateqoriyası',
  comp_cat: 'Səriştə Kateqoriyası', vendor: 'Vendor', status: 'Status',
  priority: 'Prioritet', budget_status: 'Büdcə Statusu',
};
const FIELD_OPTIONS = Object.keys(FIELD_LABELS);
const SLICER_FIELDS = ['dept', 'sube', 'comp_cat', 'priority', 'status', 'budget_status'];

function displayVal(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}
function labelFor(field, v) {
  if (field === 'status') return statusMeta(v).label;
  return v;
}

export default function AnalysisView({ trainings }) {
  const [rowField, setRowField] = useState('dept');
  const [colField, setColField] = useState('status');
  const [metric, setMetric] = useState('budget');
  const [slicers, setSlicers] = useState({});
  const [showPct, setShowPct] = useState(false);

  function swapFields() {
    setRowField(colField);
    setColField(rowField);
  }

  const sliced = useMemo(() => {
    return trainings.filter((t) => {
      for (const f of SLICER_FIELDS) {
        const val = slicers[f];
        if (val && val !== 'all' && displayVal(t[f]) !== val) return false;
      }
      return true;
    });
  }, [trainings, slicers]);

  const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotal, maxCell } = useMemo(() => {
    const rowSet = new Set(), colSet = new Set();
    const cells = {}, rTotals = {}, cTotals = {};
    let gTotal = 0, mCell = 0;

    sliced.forEach((t) => {
      const r = displayVal(t[rowField]);
      const c = displayVal(t[colField]);
      rowSet.add(r); colSet.add(c);
      const key = r + '|||' + c;
      const val = metric === 'count' ? 1 : (metric === 'budget' ? (t.budget || 0) : (t.man_hours || 0));
      cells[key] = (cells[key] || 0) + val;
      rTotals[r] = (rTotals[r] || 0) + val;
      cTotals[c] = (cTotals[c] || 0) + val;
      gTotal += val;
      if (cells[key] > mCell) mCell = cells[key];
    });

    const rowKeysArr = [...rowSet].sort((a, b) => (rTotals[b] || 0) - (rTotals[a] || 0));
    const colKeysArr = [...colSet].sort();

    return { rowKeys: rowKeysArr, colKeys: colKeysArr, matrix: cells, rowTotals: rTotals, colTotals: cTotals, grandTotal: gTotal, maxCell: mCell || 1 };
  }, [sliced, rowField, colField, metric]);

  function fmt(n) {
    if (metric === 'count') return Math.round(n).toLocaleString('az-AZ');
    if (metric === 'man_hours') return Math.round(n).toLocaleString('az-AZ') + ' saat';
    return Math.round(n).toLocaleString('az-AZ') + ' ₼';
  }

  function cellDisplay(raw, rowTotal) {
    if (showPct) {
      const pct = rowTotal ? Math.round((raw / rowTotal) * 100) : 0;
      return `${pct}%`;
    }
    return fmt(raw);
  }

  function heatColor(raw) {
    if (!raw) return 'transparent';
    const intensity = Math.min(1, raw / maxCell);
    const alpha = 0.08 + intensity * 0.35;
    return `rgba(37, 99, 235, ${alpha.toFixed(2)})`;
  }

  function uniqueSlicerVals(field) {
    return [...new Set(trainings.map((t) => displayVal(t[field])))].sort();
  }

  function exportPivot() {
    const rows = rowKeys.map((r) => {
      const row = { [FIELD_LABELS[rowField]]: labelFor(rowField, r) };
      colKeys.forEach((c) => { row[labelFor(colField, c)] = matrix[r + '|||' + c] || 0; });
      row['Cəmi'] = rowTotals[r] || 0;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analiz');
    XLSX.writeFile(wb, `analiz-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const activeSlicerCount = Object.values(slicers).filter((v) => v && v !== 'all').length;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Ətraflı Analiz</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Sahələri seçib canlı cədvəl analiz qurun</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <div className="filter-label">Sətir sahəsi</div>
            <select value={rowField} onChange={(e) => setRowField(e.target.value)} style={{ minWidth: 180 }}>
              {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </select>
          </div>
          <button
            onClick={swapFields}
            title="Sətir/Sütunu dəyiş"
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 14, height: 40 }}
          >
            ⇄
          </button>
          <div>
            <div className="filter-label">Sütun sahəsi</div>
            <select value={colField} onChange={(e) => setColField(e.target.value)} style={{ minWidth: 180 }}>
              {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </select>
          </div>
          <div>
            <div className="filter-label">Dəyər</div>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ minWidth: 160 }}>
              <option value="budget">Büdcənin cəmi</option>
              <option value="count">Təlim sayı</option>
              <option value="man_hours">Saatın cəmi</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, height: 40, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPct} onChange={(e) => setShowPct(e.target.checked)} />
            Faizlə göstər (sətir üzrə)
          </label>
          <button
            onClick={exportPivot}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, height: 40, marginLeft: 'auto' }}
          >
            Excel-ə ixrac et
          </button>
        </div>

        <div className="filter-label" style={{ marginBottom: 8 }}>
          Slicer-lər (əlavə filtrlər) {activeSlicerCount > 0 && <span style={{ color: '#2563eb' }}>· {activeSlicerCount} aktiv</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SLICER_FIELDS.map((f) => {
            const active = slicers[f] && slicers[f] !== 'all';
            return (
              <select
                key={f}
                value={slicers[f] || 'all'}
                onChange={(e) => setSlicers((s) => ({ ...s, [f]: e.target.value }))}
                style={{
                  minWidth: 150, fontSize: 12.5, borderRadius: 999, padding: '7px 14px',
                  border: active ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: active ? '#eff6ff' : '#fff', color: active ? '#1d4ed8' : '#1e293b', fontWeight: active ? 600 : 400,
                }}
              >
                <option value="all">{FIELD_LABELS[f]}: Hamısı</option>
                {uniqueSlicerVals(f).map((v) => <option key={v} value={v}>{FIELD_LABELS[f]}: {labelFor(f, v)}</option>)}
              </select>
            );
          })}
          {activeSlicerCount > 0 && (
            <button onClick={() => setSlicers({})} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
              ✕ Təmizlə
            </button>
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
                  const raw = matrix[r + '|||' + c] || 0;
                  return (
                    <td key={c} style={{ background: heatColor(raw) }}>
                      {cellDisplay(raw, rowTotals[r])}
                    </td>
                  );
                })}
                <td style={{ fontWeight: 700 }}>{fmt(rowTotals[r] || 0)}</td>
              </tr>
            ))}
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ fontWeight: 800 }}>Cəmi</td>
              {colKeys.map((c) => <td key={c} style={{ fontWeight: 700 }}>{fmt(colTotals[c] || 0)}</td>)}
              <td style={{ fontWeight: 800 }}>{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
