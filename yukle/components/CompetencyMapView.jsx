import { useEffect, useMemo, useState } from 'react';
import { Printer, Search, ListTree, Grid3x3, Info } from 'lucide-react';
import { sb } from '../lib/supabase';
import {
  loadCompetencyData, resolveArea, normText, uniqueInOrder,
  CRITICALITY_LABELS, LEVEL_LABELS, CRITICALITY_COLORS,
} from '../lib/competency';

const ALL = '__all__';
const LEVEL_COLOR = '#2563eb';

function CritChip({ value, prefix }) {
  if (value == null) return <span className="cm-muted">—</span>;
  const c = CRITICALITY_COLORS[value];
  return (
    <span className="cm-chip" style={{ color: c, background: `${c}1a`, borderColor: `${c}55` }}>
      {prefix}{value} · {CRITICALITY_LABELS[value]}
    </span>
  );
}

function LevelMeter({ min, max }) {
  if (max == null) return <span className="cm-muted">—</span>;
  const lo = min ?? max;
  return (
    <div>
      <div className="cm-meter" aria-label={`Tələb olunan səviyyə ${lo === max ? max : `${lo}–${max}`}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <i key={n} style={{ background: n <= lo ? LEVEL_COLOR : n <= max ? `${LEVEL_COLOR}66` : undefined }} />
        ))}
      </div>
      <div className="cm-meter-label">
        {lo === max ? `${max} – ${LEVEL_LABELS[max]}` : `${lo}–${max} (${LEVEL_LABELS[lo]} → ${LEVEL_LABELS[max]})`}
      </div>
    </div>
  );
}

function DistBars({ title, counts, labels, colorFor }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="cm-dist">
      <div className="cm-dist-title">{title}</div>
      {[5, 4, 3, 2, 1].map((n) => (
        <div className="cm-dist-row" key={n}>
          <span className="cm-dist-label">{n} · {labels[n]}</span>
          <span className="cm-dist-track"><span style={{ width: `${(counts[n - 1] / total) * 100}%`, background: colorFor(n) }} /></span>
          <span className="cm-dist-val">{counts[n - 1]}</span>
        </div>
      ))}
    </div>
  );
}

export default function CompetencyMapView({ profile, fullAccess = false, scopeProfiles = [] }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [area, setArea] = useState('');
  const [position, setPosition] = useState(ALL);
  const [mode, setMode] = useState('profile');
  const [query, setQuery] = useState('');
  const [showEn, setShowEn] = useState(false);

  useEffect(() => {
    loadCompetencyData(sb)
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, []);

  // Who sees which areas: L&D / full-access users (Nazrin, Tural, Leyla) see
  // every area. Everyone else sees only the area(s) resolved for their own
  // şöbə/department — a dept/şöbə manager also gets every area that occurs
  // anywhere in their reporting tree (e.g. Maliyyə dept head also sees ERP,
  // because the ERP şöbəsi sits inside Maliyyə). If nothing resolves (e.g.
  // top management), fall back to all areas.
  const visibleAreas = useMemo(() => {
    if (!data) return [];
    if (fullAccess) return data.areas;
    const people = [profile, ...(scopeProfiles || [])].filter(Boolean);
    const keys = new Set(people.map((p) => resolveArea(data.rules, p.dept, p.sube)).filter(Boolean));
    if (keys.size === 0) return data.areas;
    return data.areas.filter((a) => keys.has(a.key));
  }, [data, fullAccess, profile, scopeProfiles]);

  const scopeText = fullAccess
    ? 'Bütün şirkət'
    : profile?.scope_level === 'dept'
      ? (profile?.dept || 'Öz departamentim')
      : (profile?.sube || profile?.dept || 'Öz şöbəm');

  // Default to the user's own area; keep the selection inside visibleAreas.
  useEffect(() => {
    if (!data || visibleAreas.length === 0) return;
    if (visibleAreas.some((a) => a.key === area)) return;
    const own = resolveArea(data.rules, profile?.dept, profile?.sube);
    const pick = visibleAreas.find((a) => a.key === own) || visibleAreas[0];
    setArea(pick.key);
    setPosition(ALL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, visibleAreas]);

  const areaMeta = useMemo(() => data?.areas.find((a) => a.key === area), [data, area]);
  const areaCatalog = useMemo(() => (data ? data.catalog.filter((c) => c.area === area) : []), [data, area]);
  const areaRoles = useMemo(() => (data ? data.roleMap.filter((r) => r.area === area) : []), [data, area]);
  const orgUnitLabel = areaRoles[0]?.dept_label || areaMeta?.label || '';
  const positions = useMemo(
    () => uniqueInOrder(areaRoles.map((r) => r.position)).sort((a, b) => a.localeCompare(b, 'az')),
    [areaRoles]
  );

  function changeArea(key) {
    setArea(key);
    setPosition(ALL);
  }

  // Per catalog row: its values for the selected position, or — for "all
  // positions" — the range across every position the PDP map ties it to.
  const rows = useMemo(() => {
    const byCatalog = new Map();
    areaRoles.forEach((r) => {
      if (position !== ALL && r.position !== position) return;
      const s = byCatalog.get(r.catalog_id) || { positions: [], crit: null, minReq: null, maxReq: null };
      s.positions.push(r.position);
      if (r.criticality != null) s.crit = Math.max(s.crit ?? 0, r.criticality);
      if (r.required_level != null) {
        s.minReq = Math.min(s.minReq ?? 9, r.required_level);
        s.maxReq = Math.max(s.maxReq ?? 0, r.required_level);
      }
      byCatalog.set(r.catalog_id, s);
    });
    const q = normText(query);
    return areaCatalog
      .map((c) => ({ ...c, stats: byCatalog.get(c.id) || null }))
      .filter((c) => (position === ALL ? true : !!c.stats))
      .filter((c) => !q || normText([c.category, c.competency, c.sub_competency, c.sub_competency_en, c.competency_en].join(' ')).includes(q));
  }, [areaCatalog, areaRoles, position, query]);

  const groups = useMemo(() => {
    const out = [];
    rows.forEach((r) => {
      let g = out[out.length - 1];
      if (!g || g.category !== r.category) { g = { category: r.category, category_en: r.category_en, comps: [] }; out.push(g); }
      let c = g.comps[g.comps.length - 1];
      if (!c || c.competency !== r.competency) { c = { competency: r.competency, competency_en: r.competency_en, rows: [] }; g.comps.push(c); }
      c.rows.push(r);
    });
    return out;
  }, [rows]);

  const summary = useMemo(() => {
    const mapped = rows.filter((r) => r.stats);
    const crits = mapped.map((r) => r.stats.crit).filter((v) => v != null);
    const reqs = mapped.map((r) => r.stats.maxReq).filter((v) => v != null);
    const dist = (vals) => [1, 2, 3, 4, 5].map((n) => vals.filter((v) => v === n).length);
    const avg = (vals) => (vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—');
    return {
      total: rows.length, mapped: mapped.length,
      avgCrit: avg(crits), avgReq: avg(reqs),
      highCrit: crits.filter((v) => v >= 4).length,
      critDist: dist(crits), reqDist: dist(reqs),
    };
  }, [rows]);

  // Matrix: every sub-competency that at least one position in this area
  // needs, against every position — cell = required level, tint = criticality.
  const matrix = useMemo(() => {
    const cell = new Map();
    areaRoles.forEach((r) => cell.set(`${r.catalog_id}|${r.position}`, r));
    const q = normText(query);
    const mappedIds = new Set(areaRoles.map((r) => r.catalog_id));
    const mrows = areaCatalog
      .filter((c) => mappedIds.has(c.id))
      .filter((c) => !q || normText([c.competency, c.sub_competency, c.sub_competency_en].join(' ')).includes(q));
    return { cell, rows: mrows };
  }, [areaCatalog, areaRoles, query]);

  if (error) {
    return (
      <div className="page">
        <div className="notice notice-error">
          Səriştə kataloqu yüklənmədi: {error}. (sql/2026-09-26_competency_catalog.sql işə salınıbmı?)
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="page"><div className="skel skel-block" /></div>;
  }

  const positionTitle = position === ALL ? 'Bütün vəzifələr' : position;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Səriştə Xəritəsi</h1>
            <p>Departament və vəzifə üzrə səriştələr, tələb olunan səviyyə və kritiklik — yalnız baxış və analiz üçün.</p>
            <span className="scope-label">Görünüş: {scopeText}</span>
          </div>
          <div className="no-print">
            <button onClick={() => window.print()} className="btn btn-outline" style={{ height: 40 }}>
              <Printer size={14} strokeWidth={2.2} /> Çap / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="card no-print cm-controls">
          <div className="cm-control">
            <div className="filter-label">Departament / sahə</div>
            <select value={area} onChange={(e) => changeArea(e.target.value)}>
              {visibleAreas.map((a) => {
                const unit = data.roleMap.find((r) => r.area === a.key)?.dept_label;
                return <option key={a.key} value={a.key}>{a.label}{unit && unit !== a.label ? ` — ${unit}` : ''}</option>;
              })}
            </select>
          </div>
          <div className="cm-control">
            <div className="filter-label">Vəzifə</div>
            <select value={position} onChange={(e) => setPosition(e.target.value)} disabled={mode === 'matrix'}>
              <option value={ALL}>Bütün vəzifələr (sahənin tam kataloqu)</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="cm-control cm-control-grow">
            <div className="filter-label">Axtar</div>
            <div className="cm-search">
              <Search size={14} strokeWidth={2} />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Səriştə və ya alt səriştə…" />
            </div>
          </div>
          <div className="cm-control">
            <div className="filter-label">Görünüş</div>
            <div className="cm-toggle" role="tablist">
              <button className={mode === 'profile' ? 'active' : ''} onClick={() => setMode('profile')}><ListTree size={14} /> Profil</button>
              <button className={mode === 'matrix' ? 'active' : ''} onClick={() => { setMode('matrix'); setPosition(ALL); }}><Grid3x3 size={14} /> Matris</button>
            </div>
          </div>
          <label className="cm-en-toggle">
            <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} /> İngiliscə orijinalı göstər
          </label>
        </div>

        <div className="cm-hero">
          <div>
            <div className="cm-hero-eyebrow">Səriştə profili</div>
            <div className="cm-hero-title">{mode === 'matrix' ? 'Vəzifələr üzrə matris' : positionTitle}</div>
            <div className="cm-hero-sub">{areaMeta?.label}{orgUnitLabel && orgUnitLabel !== areaMeta?.label ? ` · ${orgUnitLabel}` : ''} · {positions.length} vəzifə PDP-də xəritələnib</div>
          </div>
          <div className="cm-hero-stats">
            <div className="cm-hero-stat"><b>{mode === 'matrix' ? matrix.rows.length : summary.total}</b><span>{position === ALL && mode !== 'matrix' ? 'alt səriştə (kataloq)' : 'alt səriştə'}</span></div>
            <div className="cm-hero-stat"><b>{summary.avgReq}</b><span>orta tələb olunan səviyyə</span></div>
            <div className="cm-hero-stat"><b>{summary.avgCrit}</b><span>orta kritiklik</span></div>
            <div className="cm-hero-stat"><b>{summary.highCrit}</b><span>kritik / strateji</span></div>
          </div>
        </div>

        {mode === 'profile' && (
          <>
            {summary.mapped > 0 && (
              <div className="card cm-dist-card">
                <DistBars title="Kritiklik paylanması" counts={summary.critDist} labels={CRITICALITY_LABELS} colorFor={(n) => CRITICALITY_COLORS[n]} />
                <DistBars title="Tələb olunan səviyyə paylanması" counts={summary.reqDist} labels={LEVEL_LABELS} colorFor={() => LEVEL_COLOR} />
              </div>
            )}

            {position === ALL && (
              <div className="cm-note">
                <Info size={14} strokeWidth={2.2} />
                <span>
                  Sahənin bütün kataloqu göstərilir. Kritiklik və səviyyə sütunları PDP-də bu səriştəni tələb edən vəzifələr üzrə
                  maksimum / aralıqdır; heç bir vəzifəyə bağlanmayan səriştələr &quot;—&quot; ilə göstərilir. Konkret vəzifəni seçərək onun PDP profilinə baxın.
                </span>
              </div>
            )}

            {groups.length === 0 && <div className="card cm-empty">Bu seçim üzrə səriştə tapılmadı.</div>}

            {groups.map((g) => (
              <section className="cm-group" key={g.category}>
                <header className="cm-group-head">
                  <div>
                    {g.category}
                    {showEn && <div className="cm-en">{g.category_en}</div>}
                  </div>
                  <span className="cm-group-count">{g.comps.reduce((a, c) => a + c.rows.length, 0)}</span>
                </header>
                <div className="cm-row cm-row-head">
                  <span>Kod</span><span>Alt səriştə</span><span>Kritiklik</span><span>Tələb olunan səviyyə</span>
                </div>
                {g.comps.map((c) => (
                  <div key={c.competency}>
                    <div className="cm-comp-head">
                      {c.competency}
                      {showEn && <span className="cm-en"> · {c.competency_en}</span>}
                    </div>
                    {c.rows.map((r) => (
                      <div className={'cm-row' + (r.stats ? '' : ' cm-row-unmapped')} key={r.id}>
                        <span className="cm-code">{r.code}</span>
                        <div>
                          <div className="cm-sub">{r.sub_competency.replace(/^\s*\d+(\.\d+)+\s*/, '')}</div>
                          {showEn && <div className="cm-en">{r.sub_competency_en?.replace(/^\s*\d+(\.\d+)+\s*/, '')}</div>}
                          {position === ALL && r.stats && (
                            <div className="cm-positions" title={r.stats.positions.join('\n')}>
                              {r.stats.positions.length} vəzifədə tələb olunur
                            </div>
                          )}
                        </div>
                        <div className="cm-col-crit"><CritChip value={r.stats?.crit ?? null} prefix={position === ALL && r.stats && r.stats.positions.length > 1 ? 'maks. ' : ''} /></div>
                        <div className="cm-col-level"><LevelMeter min={r.stats?.minReq ?? null} max={r.stats?.maxReq ?? null} /></div>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </>
        )}

        {mode === 'matrix' && (
          <>
            <div className="cm-legend">
              <span>Xanadakı rəqəm — tələb olunan səviyyə (1–5); rəng — kritiklik:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="cm-legend-item"><i style={{ background: CRITICALITY_COLORS[n] }} />{CRITICALITY_LABELS[n]}</span>
              ))}
              <span className="cm-muted">Vəzifə başlığına klikləyin → həmin vəzifənin profili açılır.</span>
            </div>
            {matrix.rows.length === 0 ? (
              <div className="card cm-empty">Bu sahədə PDP vəzifə xəritəsi yoxdur.</div>
            ) : (
              <div className="table-wrap cm-matrix">
                <table>
                  <thead>
                    <tr>
                      <th className="sticky-col cm-matrix-first">Alt səriştə</th>
                      {positions.map((p) => (
                        <th key={p} className="cm-vert-th">
                          <button className="cm-vert" onClick={() => { setPosition(p); setMode('profile'); }} title={p}>{p}</button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((c) => (
                      <tr key={c.id}>
                        <td className="sticky-col cm-matrix-first">
                          <span className="cm-code">{c.code}</span> {c.sub_competency.replace(/^\s*\d+(\.\d+)+\s*/, '')}
                          <div className="cm-matrix-comp">{c.competency}</div>
                        </td>
                        {positions.map((p) => {
                          const r = matrix.cell.get(`${c.id}|${p}`);
                          if (!r) return <td key={p} className="cm-matrix-cell" />;
                          const col = CRITICALITY_COLORS[r.criticality] || '#94a3b8';
                          return (
                            <td key={p} className="cm-matrix-cell">
                              <span
                                className="cm-cell"
                                style={{ background: `${col}22`, color: col, borderColor: `${col}66` }}
                                title={`${p}\nTələb olunan: ${r.required_level ?? '—'} · Kritiklik: ${r.criticality ?? '—'}${r.criticality ? ' (' + CRITICALITY_LABELS[r.criticality] + ')' : ''}`}
                              >
                                {r.required_level ?? '·'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
