import { useState, useMemo } from 'react';
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

  const sliced = useMemo(() => {
    return trainings.filter((t) => {
      for (const f of SLICER_FIELDS) {
        const val = slicers[f];
        if (val && val !== 'all' && displayVal(t[f]) !== val) return false;
      }
      return true;
    });
  }, [trainings, slicers]);

  const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotal } = useMemo(() => {
    const rowSet = new Set(), colSet = new Set();
    const cells = {}, rTotals = {}, cTotals = {};
    let gTotal = 0;

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
    });

    const rowKeysArr = [...rowSet].sort((a, b) => (rTotals[b] || 0) - (rTotals[a] || 0));
    const colKeysArr = [...colSet].sort();

    return { rowKeys: rowKeysArr, colKeys: colKeysArr, matrix: cells, rowTotals: rTotals, colTotals: cTotals, grandTotal: gTotal };
  }, [sliced, rowField, colField, metric]);

  function fmt(n) {
    if (metric === 'count') return Math.round(n).toLocaleString('az-AZ');
    if (metric === 'man_hours') return Math.round(n).toLocaleString('az-AZ') + ' saat';
    return Math.round(n).toLocaleString('az-AZ') + ' ₼';
  }

  function uniqueSlicerVals(field) {
    return [...new Set(trainings.map((t) => displayVal(t[field])))].sort();
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Ətraflı Analiz</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Sahələri seçib canlı cədvəl analiz qurun</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div className="filter-label">Sətir sahəsi</div>
            <select value={rowField} onChange={(e) => setRowField(e.target.value)} style={{ minWidth: 180 }}>
              {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </select>
          </div>
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
        </div>

        <div className="filter-label" style={{ marginBottom: 8 }}>Slicer-lər (əlavə filtrlər)</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SLICER_FIELDS.map((f) => (
            <select key={f} value={slicers[f] || 'all'} onChange={(e) => setSlicers((s) => ({ ...s, [f]: e.target.value }))} style={{ minWidth: 150, fontSize: 13 }}>
              <option value="all">{FIELD_LABELS[f]}: Hamısı</option>
              {uniqueSlicerVals(f).map((v) => <option key={v} value={v}>{FIELD_LABELS[f]}: {labelFor(f, v)}</option>)}
            </select>
          ))}
          {Object.values(slicers).some((v) => v && v !== 'all') && (
            <button onClick={() => setSlicers({})} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12.5 }}>
              Slicer-ləri təmizlə
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
                {colKeys.map((c) => <td key={c}>{fmt(matrix[r + '|||' + c] || 0)}</td>)}
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
