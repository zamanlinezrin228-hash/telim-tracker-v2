// Shared access to the competency catalog (sql/2026-09-26_competency_catalog.sql):
// 13 areas, the full sub-competency catalog per area, the PDP position map,
// and the şöbə/dept -> area rules. Fetched once per page load and cached.

export const CRITICALITY_LABELS = { 1: 'Aşağı', 2: 'Orta', 3: 'Yüksək', 4: 'Kritik', 5: 'Strateji' };
export const LEVEL_LABELS = { 1: 'Fundamental', 2: 'İnkişaf edən', 3: 'Yetərli', 4: 'İrəli', 5: 'Ekspert' };
export const CRITICALITY_COLORS = { 1: '#64748b', 2: '#0891b2', 3: '#d97706', 4: '#ea580c', 5: '#dc2626' };

// Must stay identical to public.competency_norm() in the SQL file.
export function normText(s) {
  return (s || '')
    .replace(/[İIı]/g, 'i')
    .toLocaleLowerCase('az')
    .replace(/\s+/g, ' ')
    .trim();
}

// Şöbə rules always win over dept rules — an ERP şöbəsi that sits inside the
// Maliyyə departamenti gets ERP/İT competencies, not Finance ones. Mirrors
// public.resolve_competency_area(). Returns null when nothing matches (e.g.
// top management), in which case callers show every area.
export function resolveArea(rules, dept, sube) {
  const s = normText(sube), d = normText(dept);
  const ordered = [...rules].sort((a, b) => (a.match_on === b.match_on ? a.priority - b.priority : a.match_on === 'sube' ? -1 : 1));
  for (const r of ordered) {
    const target = r.match_on === 'sube' ? s : d;
    if (target && target.includes(normText(r.pattern))) return r.area || null;
  }
  return null;
}

async function fetchAll(sb, table, columns, order) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(table).select(columns).range(from, from + PAGE - 1);
    order.forEach((col) => { q = q.order(col); });
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

let cache = null;
export function loadCompetencyData(sb) {
  if (!cache) {
    cache = Promise.all([
      fetchAll(sb, 'competency_areas', 'key, label, label_en, sort_order', ['sort_order']),
      fetchAll(sb, 'competency_catalog', 'id, area, sort_order, code, category, competency, sub_competency, category_en, competency_en, sub_competency_en', ['area', 'sort_order']),
      fetchAll(sb, 'competency_area_rules', 'match_on, pattern, area, priority', ['priority']),
      fetchAll(sb, 'competency_role_map', 'area, dept_label, position, catalog_id, criticality, required_level', ['id']),
    ]).then(([areas, catalog, rules, roleMap]) => ({ areas, catalog, rules, roleMap }))
      .catch((e) => { cache = null; throw e; });
  }
  return cache;
}

// Per catalog_id: range of criticality/required level across every position
// that the PDP map ties to it — a position-independent hint for the TNA form.
export function roleStatsByCatalogId(roleMap) {
  const m = new Map();
  roleMap.forEach((r) => {
    const s = m.get(r.catalog_id) || { positions: 0, maxCrit: null, minReq: null, maxReq: null };
    s.positions += 1;
    if (r.criticality != null) s.maxCrit = Math.max(s.maxCrit ?? 0, r.criticality);
    if (r.required_level != null) {
      s.minReq = Math.min(s.minReq ?? 9, r.required_level);
      s.maxReq = Math.max(s.maxReq ?? 0, r.required_level);
    }
    m.set(r.catalog_id, s);
  });
  return m;
}

export function uniqueInOrder(values) {
  const seen = new Set();
  const out = [];
  values.forEach((v) => { if (v && !seen.has(v)) { seen.add(v); out.push(v); } });
  return out;
}
