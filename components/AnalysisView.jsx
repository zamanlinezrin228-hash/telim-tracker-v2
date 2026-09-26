import { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { Download, ArrowDown, ArrowUp } from 'lucide-react';
import { statusMeta, priorityMeta, fmtMoney } from '../lib/helpers';
import { hasSavedCost, rowSavedCost } from '../lib/analytics';
import { styleHeaderRow, downloadWorkbook } from '../lib/excelExport';
import MultiSelectFilter from './MultiSelectFilter';

// ---------------------------------------------------------------------------
// Ətraflı Analiz — sual-yönümlü qurulub, sərbəst "hər sahəni hər sahə ilə"
// pivot deyil:
//  • Sətir (qruplaşdırma) yalnız mənalı ölçülərdən seçilir.
//  • Sütun (bölgü) yalnız az dəyərli, müqayisəyə yararlı sahələrdir
//    (status, prioritet, səriştə kateqoriyası ...) — "Təlim × Vəzifə" kimi
//    yüzlərlə boş xanalı cədvəl yaranmır.
//  • Sütun seçilməyəndə bir sətirdə bütün əsas göstəricilər (say, iştirakçı,
//    saat, büdcə, qənaət, tamamlanma) yan-yana — ən çox lazım olan görünüş.
//  • Filtrlər bir-birinə uyğunlaşır: hər filtrin siyahısı digər filtrlərdən
//    sonra qalan məlumatdan qurulur, boş kombinasiya seçmək mümkün olmur.
// ---------------------------------------------------------------------------

const EMPTY = '—';

const STATUS_ORDER = ['Scheduled to Commence on Planned Date', 'In Progress', 'Postponed', 'Completed', 'Canceled'];
const PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

function monthKey(t) {
  if (!t.start_date) return EMPTY;
  const d = new Date(t.start_date);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

// Qruplaşdırma (sətir) ölçüləri
const DIMS = {
  dept: { label: 'Departament', get: (t) => t.dept },
  vendor: { label: 'Provayder', get: (t) => t.vendor, many: true },
  skill: { label: 'Təlim', get: (t) => t.skill, many: true },
  employee_name: { label: 'Əməkdaş', get: (t) => t.employee_name, many: true },
  category: { label: 'Vəzifə kateqoriyası', get: (t) => t.category, small: true },
  comp_cat: { label: 'Səriştə kateqoriyası', get: (t) => t.comp_cat, small: true },
  priority: { label: 'Prioritet', get: (t) => t.priority, small: true, order: PRIORITY_ORDER, fmt: (v) => priorityMeta(v).label },
  status: { label: 'Status', get: (t) => t.status, small: true, order: STATUS_ORDER, fmt: (v) => statusMeta(v).label },
  budget_status: { label: 'Büdcə statusu', get: (t) => t.budget_status, small: true },
  learning_method: { label: 'Öyrənmə metodu', get: (t) => t.learning_method, small: true },
  month: {
    label: 'Başlama ayı', get: monthKey, chrono: true,
    fmt: (v) => { if (v === EMPTY) return v; const [y, m] = v.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; },
  },
};
const ROW_DIMS = ['dept', 'vendor', 'skill', 'employee_name', 'category', 'comp_cat', 'priority', 'status', 'learning_method', 'month'];
// Sütun (bölgü) — yalnız az dəyərli sahələr
const COL_DIMS = ['status', 'priority', 'comp_cat', 'budget_status', 'category', 'learning_method'];

// Göstəricilər — tərifləri Dashboard KPI-ları ilə eynidir
const METRICS = {
  count: { label: 'Təlim sayı', fmt: (n) => n.toLocaleString('az-AZ') },
  participants: { label: 'İştirakçı', fmt: (n) => n.toLocaleString('az-AZ') },
  hours: { label: 'Saat', fmt: (n) => Math.round(n).toLocaleString('az-AZ') },
  planned: { label: 'Planlanmış büdcə', fmt: fmtMoney },
  used: { label: 'İstifadə olunmuş', fmt: fmtMoney, hint: 'Yalnız tamamlanmış təlimlər' },
  saved: { label: 'Qənaət', fmt: fmtMoney, signed: true },
  completion: { label: 'Tamamlanma', fmt: (n) => `${n}%`, pct: true },
};
const SUMMARY_METRICS = ['count', 'participants', 'hours', 'planned', 'used', 'saved', 'completion'];

// Hazır analizlər — hər biri real bir suala cavabdır
const PRESETS = [
  { label: 'Departamentlər üzrə icmal', row: 'dept', col: '', sort: 'planned', desc: 'Hər departament üzrə təlim sayı, iştirakçı, saat, büdcə, qənaət və tamamlanma faizi.' },
  { label: 'Provayder performansı', row: 'vendor', col: '', sort: 'used', desc: 'Hansı provayderə nə qədər xərclənib, nə qədər qənaət olunub, təlimlərin neçə faizi tamamlanıb.' },
  { label: 'Ən çox planlanan təlimlər', row: 'skill', col: '', sort: 'count', desc: 'Ən çox tələb olunan təlimlər — toplu (qrup) təlim imkanlarını görmək üçün.' },
  { label: 'Departament × Status', row: 'dept', col: 'status', metric: 'count', desc: 'Hər departamentdə təlimlər hansı mərhələdədir.' },
  { label: 'Kritik təlimlər icra olunurmu?', row: 'priority', col: 'status', metric: 'count', desc: 'Prioritet səviyyəsinə görə təlimlərin statusu — kritik təlimlər geridə qalırmı.' },
  { label: 'Hard / Soft investisiya', row: 'dept', col: 'comp_cat', metric: 'planned', desc: 'Departamentlər üzrə büdcənin Hard və Soft Skills arasında bölgüsü.' },
  { label: 'Vəzifə kateqoriyası üzrə', row: 'category', col: '', sort: 'planned', desc: 'Hansı vəzifə səviyyəsinə nə qədər investisiya edilir.' },
  { label: 'Aylıq təlim təqvimi', row: 'month', col: 'status', metric: 'count', desc: 'Təlimlərin aylar üzrə paylanması və statusu.' },
];

// Filtrlər (slicer) — hamısı az-orta dəyərli, bir-birinə uyğunlaşan
const FILTER_DIMS = ['dept', 'status', 'priority', 'comp_cat', 'category', 'budget_status'];

function val(dim, t) {
  const v = DIMS[dim].get(t);
  return v === null || v === undefined || String(v).trim() === '' ? EMPTY : String(v).trim();
}
function label(dim, v) {
  if (v === EMPTY) return 'Qeyd olunmayıb';
  return DIMS[dim].fmt ? DIMS[dim].fmt(v) : v;
}

function newAgg() {
  return { count: 0, people: new Set(), hours: 0, planned: 0, used: 0, saved: 0, done: 0 };
}
function addTo(a, t) {
  a.count += 1;
  if (t.employee_name) a.people.add(t.employee_name);
  a.hours += Number(t.man_hours) || 0;
  a.planned += Number(t.budget) || 0;
  if (t.status === 'Completed') { a.used += Number(t.used_budget) || 0; a.done += 1; }
  if (hasSavedCost(t)) a.saved += rowSavedCost(t);
}
function metricOf(a, m) {
  if (!a) return 0;
  switch (m) {
    case 'count': return a.count;
    case 'participants': return a.people.size;
    case 'hours': return a.hours;
    case 'planned': return a.planned;
    case 'used': return a.used;
    case 'saved': return a.saved;
    case 'completion': return a.count ? Math.round((a.done / a.count) * 100) : 0;
    default: return 0;
  }
}
function mergeAgg(list) {
  const out = newAgg();
  list.forEach((a) => {
    out.count += a.count; out.hours += a.hours; out.planned += a.planned;
    out.used += a.used; out.saved += a.saved; out.done += a.done;
    a.people.forEach((p) => out.people.add(p));
  });
  return out;
}

function orderKeys(dim, keys) {
  const d = DIMS[dim];
  if (d.order) return [...keys].sort((a, b) => (d.order.indexOf(a) + 99 * (d.order.indexOf(a) < 0)) - (d.order.indexOf(b) + 99 * (d.order.indexOf(b) < 0)));
  return [...keys].sort((a, b) => (a === EMPTY) - (b === EMPTY) || label(dim, a).localeCompare(label(dim, b), 'az'));
}

export default function AnalysisView({ trainings }) {
  const [row, setRow] = useState('dept');
  const [col, setCol] = useState('');
  const [metric, setMetric] = useState('count');
  const [sort, setSort] = useState({ key: 'planned', dir: 'desc' });
  const [limit, setLimit] = useState(15);
  const [filters, setFilters] = useState({}); // dim -> Set | undefined (undefined = hamısı)

  const activePreset = PRESETS.find((p) => p.row === row && p.col === col && (!p.col || p.metric === metric));

  function applyPreset(p) {
    setRow(p.row);
    setCol(p.col);
    if (p.metric) setMetric(p.metric);
    if (p.sort) setSort({ key: p.sort, dir: 'desc' });
  }
  function changeRow(v) {
    setRow(v);
    if (col === v) setCol('');
  }

  // --- Uyğunlaşan filtrlər ---
  const passes = (t, except) => FILTER_DIMS.every((d) => {
    if (d === except) return true;
    const s = filters[d];
    return !s || s.has(val(d, t));
  });
  const filtered = useMemo(() => trainings.filter((t) => passes(t, null)), [trainings, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const filterOptions = useMemo(() => {
    const out = {};
    FILTER_DIMS.forEach((d) => {
      const vals = new Set(trainings.filter((t) => passes(t, d)).map((t) => val(d, t)));
      (filters[d] || new Set()).forEach((v) => vals.add(v));
      out[d] = orderKeys(d, vals);
    });
    return out;
  }, [trainings, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeFilterCount = FILTER_DIMS.filter((d) => filters[d]).length;
  function setFilter(d, set) {
    setFilters((prev) => {
      const next = { ...prev };
      const all = filterOptions[d] || [];
      if (!set || set.size === 0 || set.size === all.length) delete next[d]; else next[d] = set;
      return next;
    });
  }

  // --- Aqreqasiya ---
  const { rowKeys, byRow, byCell, colKeys, byCol, total } = useMemo(() => {
    const byRowM = new Map(); const byCellM = new Map(); const byColM = new Map(); const tot = newAgg();
    filtered.forEach((t) => {
      const r = val(row, t);
      if (!byRowM.has(r)) byRowM.set(r, newAgg());
      addTo(byRowM.get(r), t);
      addTo(tot, t);
      if (col) {
        const c = val(col, t);
        const k = `${r}\u0000${c}`;
        if (!byCellM.has(k)) byCellM.set(k, newAgg());
        addTo(byCellM.get(k), t);
        if (!byColM.has(c)) byColM.set(c, newAgg());
        addTo(byColM.get(c), t);
      }
    });
    return {
      rowKeys: [...byRowM.keys()], byRow: byRowM, byCell: byCellM,
      colKeys: col ? orderKeys(col, byColM.keys()) : [], byCol: byColM, total: tot,
    };
  }, [filtered, row, col]);

  const sortMetric = col ? metric : sort.key;
  const sortedRows = useMemo(() => {
    const keys = [...rowKeys];
    if (DIMS[row].chrono) return keys.sort((a, b) => (a === EMPTY) - (b === EMPTY) || a.localeCompare(b));
    if (DIMS[row].order && col) return orderKeys(row, keys);
    const dir = col ? -1 : (sort.dir === 'asc' ? 1 : -1);
    return keys.sort((a, b) => dir * (metricOf(byRow.get(a), sortMetric) - metricOf(byRow.get(b), sortMetric)));
  }, [rowKeys, byRow, row, col, sort, sortMetric]);

  const isMany = !!DIMS[row].many;
  const effectiveLimit = isMany ? limit : 0;
  const shownRows = effectiveLimit && sortedRows.length > effectiveLimit ? sortedRows.slice(0, effectiveLimit) : sortedRows;
  const hiddenRows = effectiveLimit && sortedRows.length > effectiveLimit ? sortedRows.slice(effectiveLimit) : [];
  const otherAgg = hiddenRows.length ? mergeAgg(hiddenRows.map((k) => byRow.get(k))) : null;

  const maxCell = useMemo(() => {
    if (!col) return 0;
    let m = 0;
    byCell.forEach((a) => { m = Math.max(m, Math.abs(metricOf(a, metric))); });
    return m || 1;
  }, [byCell, col, metric]);
  const maxByMetric = useMemo(() => {
    const out = {};
    SUMMARY_METRICS.forEach((m) => { out[m] = Math.max(1, ...sortedRows.map((k) => Math.abs(metricOf(byRow.get(k), m)))); });
    return out;
  }, [sortedRows, byRow]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  }

  function colorFor(m, v) {
    if (METRICS[m].signed) return v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : undefined;
    if (METRICS[m].pct) return v >= 70 ? 'var(--green)' : v >= 40 ? '#d97706' : 'var(--red)';
    return undefined;
  }
  function heat(v) {
    if (!v) return undefined;
    const a = 0.06 + Math.min(1, Math.abs(v) / maxCell) * 0.34;
    return `rgba(37, 99, 235, ${a.toFixed(2)})`;
  }

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Analiz');
    const lines = [...shownRows.map((k) => [label(row, k), byRow.get(k), k]), ...(otherAgg ? [[`Digər (${hiddenRows.length})`, otherAgg, null]] : [])];
    if (col) {
      ws.columns = [{ header: DIMS[row].label, width: 34 }, ...colKeys.map((c) => ({ header: label(col, c), width: 16 })), { header: 'Cəmi', width: 16 }];
      lines.forEach(([lab, agg, k]) => ws.addRow([
        lab,
        ...colKeys.map((c) => (k === null ? metricOf(mergeAgg(hiddenRows.map((h) => byCell.get(`${h}\u0000${c}`)).filter(Boolean)), metric) : metricOf(byCell.get(`${k}\u0000${c}`), metric))),
        metricOf(agg, metric),
      ]));
      ws.addRow(['Cəmi', ...colKeys.map((c) => metricOf(byCol.get(c), metric)), metricOf(total, metric)]);
    } else {
      ws.columns = [{ header: DIMS[row].label, width: 34 }, ...SUMMARY_METRICS.map((m) => ({ header: METRICS[m].label + (METRICS[m].pct ? ' (%)' : ''), width: 18 }))];
      lines.forEach(([lab, agg]) => ws.addRow([lab, ...SUMMARY_METRICS.map((m) => metricOf(agg, m))]));
      ws.addRow(['Cəmi', ...SUMMARY_METRICS.map((m) => metricOf(total, m))]);
    }
    styleHeaderRow(ws);
    ws.lastRow.font = { bold: true };
    await downloadWorkbook(wb, `etrafli-analiz-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const colOptions = COL_DIMS.filter((d) => d !== row);
  const description = activePreset?.desc
    || (col
      ? `${DIMS[row].label} üzrə ${METRICS[metric].label.toLowerCase()}, ${DIMS[col].label.toLowerCase()} bölgüsü ilə.`
      : `${DIMS[row].label} üzrə bütün əsas göstəricilər.`);

  return (
    <div style={{ marginTop: 8 }}>
      <div className="section-title">Ətraflı Analiz</div>
      <div className="section-sub" style={{ marginBottom: 18 }}>Hazır suallardan birini seçin, ya da qruplaşdırmanı özünüz qurun</div>

      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div className="filter-label" style={{ marginBottom: 10 }}>Hazır analizlər</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => applyPreset(p)} title={p.desc}
              className={activePreset === p ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div className="filter-label">Qruplaşdır</div>
            <select value={row} onChange={(e) => changeRow(e.target.value)} style={{ minWidth: 190 }}>
              {ROW_DIMS.map((d) => <option key={d} value={d}>{DIMS[d].label}</option>)}
            </select>
          </div>
          <div>
            <div className="filter-label">Bölgü (istəyə bağlı)</div>
            <select value={col} onChange={(e) => setCol(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">— Yoxdur (bütün göstəricilər) —</option>
              {colOptions.map((d) => <option key={d} value={d}>{DIMS[d].label}</option>)}
            </select>
          </div>
          {col && (
            <div>
              <div className="filter-label">Göstərici</div>
              <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ minWidth: 180 }}>
                {Object.keys(METRICS).map((m) => <option key={m} value={m}>{METRICS[m].label}</option>)}
              </select>
            </div>
          )}
          {isMany && (
            <div>
              <div className="filter-label">Göstər</div>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ minWidth: 120 }}>
                <option value={10}>İlk 10</option>
                <option value={15}>İlk 15</option>
                <option value={30}>İlk 30</option>
                <option value={0}>Hamısı</option>
              </select>
            </div>
          )}
          <button onClick={exportExcel} className="btn btn-success" style={{ marginLeft: 'auto' }}>
            <Download size={14} strokeWidth={2.2} /> Excel-ə ixrac et
          </button>
        </div>

        <div className="slicer-row" style={{ marginTop: 14 }}>
          {FILTER_DIMS.map((d) => (
            <MultiSelectFilter
              key={d}
              label={DIMS[d].label}
              options={filterOptions[d] || []}
              selected={filters[d] || new Set(filterOptions[d] || [])}
              onChange={(s) => setFilter(d, s)}
              labelFor={(v) => label(d, v)}
            />
          ))}
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters({})} className="btn btn-outline btn-sm">Filtrləri təmizlə</button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--ink-600)', background: 'var(--ink-50)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
        {description} <span style={{ color: 'var(--ink-500)' }}>· {filtered.length} təlim qeydi{activeFilterCount ? `, ${activeFilterCount} filtr aktiv` : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--ink-500)', padding: 28 }}>Seçilmiş filtrlərə uyğun məlumat yoxdur.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{DIMS[row].label}</th>
                {col
                  ? <>{colKeys.map((c) => <th key={c} style={{ textAlign: 'right' }}>{label(col, c)}</th>)}<th style={{ textAlign: 'right' }}>Cəmi</th></>
                  : SUMMARY_METRICS.map((m) => (
                    <th key={m} onClick={() => toggleSort(m)} title={METRICS[m].hint || 'Sıralamaq üçün klikləyin'}
                      style={{ textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {METRICS[m].label}
                      {sort.key === m && (sort.dir === 'desc' ? <ArrowDown size={12} style={{ marginLeft: 3, verticalAlign: -1 }} /> : <ArrowUp size={12} style={{ marginLeft: 3, verticalAlign: -1 }} />)}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {shownRows.map((k) => {
                const a = byRow.get(k);
                return (
                  <tr key={k}>
                    <td style={{ fontWeight: 600, maxWidth: 360 }}>{label(row, k)}</td>
                    {col
                      ? <>
                          {colKeys.map((c) => {
                            const v = metricOf(byCell.get(`${k}\u0000${c}`), metric);
                            return (
                              <td key={c} style={{ textAlign: 'right', background: heat(v), color: colorFor(metric, v) }}>
                                {v ? METRICS[metric].fmt(v) : <span style={{ color: 'var(--ink-300)' }}>–</span>}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: colorFor(metric, metricOf(a, metric)) }}>{METRICS[metric].fmt(metricOf(a, metric))}</td>
                        </>
                      : SUMMARY_METRICS.map((m) => {
                        const v = metricOf(a, m);
                        const showBar = m === sort.key && !METRICS[m].pct;
                        return (
                          <td key={m} style={{ textAlign: 'right', color: colorFor(m, v), fontWeight: m === sort.key ? 700 : 400 }}>
                            {METRICS[m].fmt(v)}
                            {showBar && (
                              <div style={{ height: 3, marginTop: 3, borderRadius: 2, background: 'var(--ink-100)' }}>
                                <div style={{ height: 3, borderRadius: 2, width: `${Math.round((Math.abs(v) / maxByMetric[m]) * 100)}%`, background: v < 0 ? 'var(--red)' : 'var(--blue, #2563eb)' }} />
                              </div>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
              {otherAgg && (
                <tr style={{ color: 'var(--ink-500)' }}>
                  <td style={{ fontStyle: 'italic' }}>Digər ({hiddenRows.length})</td>
                  {col
                    ? <>
                        {colKeys.map((c) => {
                          const v = metricOf(mergeAgg(hiddenRows.map((h) => byCell.get(`${h}\u0000${c}`)).filter(Boolean)), metric);
                          return <td key={c} style={{ textAlign: 'right' }}>{v ? METRICS[metric].fmt(v) : '–'}</td>;
                        })}
                        <td style={{ textAlign: 'right' }}>{METRICS[metric].fmt(metricOf(otherAgg, metric))}</td>
                      </>
                    : SUMMARY_METRICS.map((m) => <td key={m} style={{ textAlign: 'right' }}>{METRICS[m].fmt(metricOf(otherAgg, m))}</td>)}
                </tr>
              )}
              <tr style={{ background: 'var(--ink-50)' }}>
                <td style={{ fontWeight: 800 }}>Cəmi</td>
                {col
                  ? <>
                      {colKeys.map((c) => <td key={c} style={{ textAlign: 'right', fontWeight: 700 }}>{METRICS[metric].fmt(metricOf(byCol.get(c), metric))}</td>)}
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>{METRICS[metric].fmt(metricOf(total, metric))}</td>
                    </>
                  : SUMMARY_METRICS.map((m) => (
                    <td key={m} style={{ textAlign: 'right', fontWeight: 800, color: colorFor(m, metricOf(total, m)) }}>{METRICS[m].fmt(metricOf(total, m))}</td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 8 }}>
        İstifadə olunmuş büdcə yalnız tamamlanmış təlimləri, qənaət isə planlanmış və istifadə olunmuş büdcəsi qeyd olunmuş bütün təlimləri əhatə edir (Dashboard kartları ilə eyni qayda).
      </div>
    </div>
  );
}
