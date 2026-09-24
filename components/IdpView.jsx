import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  UserSquare2, Download, FileText, BookOpen, Wallet, Timer, CheckCircle2, Search, Map as MapIcon, ClipboardCheck,
} from 'lucide-react';
import { sb } from '../lib/supabase';
import { fmtMoney, fmtDateTime } from '../lib/helpers';
import { ReqStatusBadge, PriorityBadge, TrainingStatusBadge } from './Badges';
import EmptyState from './EmptyState';
import TrainingEvaluationModal from './TrainingEvaluationModal';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('az-AZ');
}

function normalizeSkill(s) {
  return (s || '').toLocaleLowerCase('az').replace(/\s+/g, ' ').trim();
}

// Same leading-digit comparison as TrainingEvaluationModal.jsx's verdict —
// duplicated rather than imported since it's a 3-line pure function and
// this read-only summary badge needs it independently of the modal being
// open, same as LEVEL_OPTIONS is already duplicated across several forms
// in this app rather than centralized.
function leadingLevel(s) {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}
function evaluationVerdict(t) {
  const requiredNum = leadingLevel(t.required_skill_level);
  const newNum = leadingLevel(t.post_training_skill_level);
  if (requiredNum === null || newNum === null) return null;
  if (newNum > requiredNum) return { icon: '🌟', text: 'Tələb olunandan yüksək səviyyəyə çatıb', color: '#7c3aed' };
  if (newNum === requiredNum) return { icon: '✅', text: 'Tələb olunan səviyyəyə çatıb', color: '#059669' };
  return { icon: '⚠️', text: 'Hələ tələb olunan səviyyəyə çatmayıb', color: '#d97706' };
}

export default function IdpView({ requests, trainings, profile, team, onDataChanged }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [library, setLibrary] = useState([]);
  const [evalTraining, setEvalTraining] = useState(null);
  const [ambiguousNames, setAmbiguousNames] = useState(new Set());

  useEffect(() => {
    sb.from('competency_library').select('category, competency, sub_competency').then(({ data }) => {
      setLibrary(data || []);
    });
    // A handful of names are shared by two genuinely different people in
    // this org (confirmed live: e.g. two different "Tural Əhmədov"
    // profiles in different departments) — for those specific names, dept
    // stays part of the picker identity below to keep them apart. Every
    // other name is grouped by name ALONE, because trainings/
    // training_requests' free-text dept for the SAME real person can
    // legitimately differ across rows (a transfer between departments, or
    // simply inconsistent historical data entry) — keying by name+dept
    // there was silently splitting one person's history into multiple
    // picker entries, e.g. Həmidə Əsgərova's real 2026 trainings (logged
    // under "İnformasiya texnologiyaları şöbəsi") never appearing once she
    // ALSO got a row under her current "Maliyyə departamenti".
    sb.from('profiles').select('full_name_az').then(({ data }) => {
      const counts = new Map();
      (data || []).forEach((p) => counts.set(p.full_name_az, (counts.get(p.full_name_az) || 0) + 1));
      setAmbiguousNames(new Set([...counts].filter(([, n]) => n > 1).map(([name]) => name)));
    });
  }, []);

  // Maps a skill/training_title string to its Kateqoriya → Səriştə, matched
  // against competency_library.sub_competency. Exact (case/whitespace
  // -insensitive) match only — if nothing matches, callers just skip the
  // line rather than showing a wrong/fuzzy guess.
  const competencyBySkill = useMemo(() => {
    const map = new Map();
    library.forEach((row) => {
      const key = normalizeSkill(row.sub_competency);
      if (key && !map.has(key)) map.set(key, { category: row.category, competency: row.competency });
    });
    return map;
  }, [library]);

  function competencyMappingFor(skillText) {
    return competencyBySkill.get(normalizeSkill(skillText)) || null;
  }

  // The IDP picker is scoped to employees who have at least one training
  // request OR logged training on file — that's the population this
  // document is meant for, not every profile in the directory (many of
  // whom may have no history to build a plan from yet). Pulling from both
  // sources matters: most employees only ever show up in `trainings`
  // (their actual completed/logged training history), while a much smaller
  // number have Annual TNA / ad-hoc `training_requests` on file — using
  // requests alone left most of the company invisible in this picker.
  const employees = useMemo(() => {
    const map = new Map();
    function absorb(r) {
      if (!r.employee_name) return;
      const key = ambiguousNames.has(r.employee_name) ? `${r.employee_name}|||${r.dept || ''}` : r.employee_name;
      if (!map.has(key)) {
        map.set(key, { key, name: r.employee_name, dept: r.dept, sube: r.sube, position: r.position, latest: r.created_at || null });
      } else {
        const cur = map.get(key);
        if (!cur.position && r.position) cur.position = r.position;
        // dept/sube/position all track whichever row is most recent, so a
        // merged entry (see the ambiguousNames comment above) shows this
        // person's latest known assignment, not just whichever row
        // happened to be absorbed first.
        if (r.created_at && (!cur.latest || r.created_at > cur.latest)) {
          cur.latest = r.created_at;
          if (r.position) cur.position = r.position;
          cur.dept = r.dept; cur.sube = r.sube;
        }
      }
    }
    requests.forEach(absorb);
    trainings.forEach(absorb);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'az'));
  }, [requests, trainings, ambiguousNames]);

  // Same "İl" filter pattern as Dashboard/Tracking. training_requests has
  // no plan_year column, so its rows are bucketed by the year they were
  // submitted (created_at) instead.
  const years = useMemo(() => {
    const set = new Set();
    trainings.forEach((t) => { if (t.plan_year) set.add(t.plan_year); });
    requests.forEach((r) => { if (r.created_at) set.add(new Date(r.created_at).getFullYear()); });
    return [...set].sort((a, b) => b - a);
  }, [trainings, requests]);

  const employee = employees.find((e) => e.key === selectedKey) || null;

  // `team` is already exactly "profiles whose manager_id === my id" (see
  // pages/index.js's afterLogin) — the same direct-report relationship the
  // task asks for, not the wider dept/şöbə scope a manager can otherwise
  // see. An L&D/HR viewer who also happens to directly manage someone
  // (e.g. a şöbə lead whose own team sits inside L&D/HR) gets this too,
  // same dual-role handling as the İllik TNA hub. Matched on name ALONE,
  // not also dept — team is already narrowed to just this manager's own
  // reports, and trainings.dept/profiles.dept disagree on casing in real
  // data (confirmed: "Maliyyə Departamenti" on trainings vs "Maliyyə
  // departamenti" on profiles), the same casing mismatch matchesOwnScope
  // exists to handle elsewhere — a plain dept `===` here silently hid the
  // Qiymətləndir button for every real manager/report pair.
  const isDirectManager = !!employee && !!team && team.some((t) => t.full_name_az === employee.name);

  // Matches the same identity the `employees` picker groups by: name alone
  // for everyone except the handful of genuinely ambiguous (shared) names,
  // where dept stays part of the match to keep two different real people
  // apart. See the ambiguousNames fetch above for why a plain dept match
  // for everyone else was wrong.
  const employeeIsAmbiguous = !!employee && ambiguousNames.has(employee.name);

  const employeeRequests = useMemo(() => {
    if (!employee) return [];
    return requests
      .filter((r) => r.employee_name === employee.name && (!employeeIsAmbiguous || (r.dept || '') === (employee.dept || '')))
      .filter((r) => selectedYear === 'all' || new Date(r.created_at).getFullYear() === Number(selectedYear))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [requests, employee, employeeIsAmbiguous, selectedYear]);

  const employeeTrainings = useMemo(() => {
    if (!employee) return [];
    return trainings
      .filter((t) => t.employee_name === employee.name && (!employeeIsAmbiguous || (t.dept || '') === (employee.dept || '')))
      .filter((t) => selectedYear === 'all' || t.plan_year === Number(selectedYear))
      .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
  }, [trainings, employee, employeeIsAmbiguous, selectedYear]);

  const stats = useMemo(() => {
    const totalRequests = employeeRequests.length;
    const approved = employeeRequests.filter((r) => r.status === 'Approved').length;
    const completedTrainings = employeeTrainings.filter((t) => t.status === 'Completed').length;
    const totalHours = employeeTrainings.reduce((a, t) => a + (Number(t.man_hours) || 0), 0);
    const totalBudget = employeeTrainings.reduce((a, t) => a + (Number(t.budget) || 0), 0);
    return { totalRequests, approved, completedTrainings, totalHours, totalBudget };
  }, [employeeRequests, employeeTrainings]);

  function exportPdf() {
    window.print();
  }

  function closeEvalModal() {
    setEvalTraining(null);
  }
  async function handleEvalSaved() {
    setEvalTraining(null);
    if (onDataChanged) await onDataChanged();
  }

  return (
    <div>
      <div className="page-header no-print">
        <div className="page-header-row">
          <div>
            <h1>Fərdi İnkişaf Planı (IDP)</h1>
            <p>Bir əməkdaşın bütün təlim sorğularını və nəticələrini vahid, çap edilə bilən sənəddə görün.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ minWidth: 280 }}>
              <div className="filter-label">Əməkdaş</div>
              <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                <option value="">— Əməkdaş seçin —</option>
                {employees.map((e) => (
                  <option key={e.key} value={e.key}>{e.name} — {e.dept || 'Departament yoxdur'}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="filter-label">İl</div>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ minWidth: 120 }}>
                <option value="all">Bütün illər</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {employee && (
              <button onClick={exportPdf} className="btn btn-success" style={{ height: 40 }}>
                <Download size={14} strokeWidth={2.2} /> PDF-ə ixrac et
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page">
        {!employee && (
          <div className="card">
            <EmptyState icon={Search}>
              {employees.length
                ? 'Sənədi yaratmaq üçün yuxarıdan bir əməkdaş seçin.'
                : 'Hələ heç bir əməkdaşın təlim sorğusu tarixçəsi yoxdur.'}
            </EmptyState>
          </div>
        )}

        {employee && (
          <div id="idp-doc">
            <div className="card idp-header-card">
              <div className="idp-header-icon"><UserSquare2 size={26} strokeWidth={1.8} /></div>
              <div style={{ flex: 1 }}>
                <div className="idp-employee-name">{employee.name}</div>
                <div className="idp-employee-meta">
                  {employee.position && <span>{employee.position}</span>}
                  {employee.position && (employee.dept || employee.sube) && <span className="idp-meta-dot">·</span>}
                  <span>{employee.dept}{employee.sube && employee.sube !== employee.dept ? ' / ' + employee.sube : ''}</span>
                </div>
              </div>
              <div className="idp-generated">Hazırlanma tarixi: {fmtDate(new Date())}</div>
            </div>

            <div className="kpi-grid" style={{ marginTop: 16 }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ '--icon-color': '#2563eb', color: '#2563eb' }}><FileText size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Ümumi Sorğu</div>
                <div className="stat-value" style={{ color: '#2563eb' }}>{stats.totalRequests}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ '--icon-color': '#059669', color: '#059669' }}><CheckCircle2 size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Təsdiqlənmiş Sorğu</div>
                <div className="stat-value" style={{ color: '#059669' }}>{stats.approved}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ '--icon-color': '#7c3aed', color: '#7c3aed' }}><BookOpen size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Tamamlanmış Təlim</div>
                <div className="stat-value" style={{ color: '#7c3aed' }}>{stats.completedTrainings}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ '--icon-color': '#0891b2', color: '#0891b2' }}><Timer size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Ümumi Saat</div>
                <div className="stat-value" style={{ color: '#0891b2' }}>{stats.totalHours}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ '--icon-color': '#d97706', color: '#d97706' }}><Wallet size={16} strokeWidth={2.2} /></div>
                <div className="stat-label">Ümumi Büdcə</div>
                <div className="stat-value" style={{ color: '#d97706' }}>{fmtMoney(stats.totalBudget)}</div>
              </div>
            </div>

            <div className="section-head"><div className="section-title">Təlim Sorğuları Tarixçəsi ({employeeRequests.length})</div></div>
            {employeeRequests.length ? (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="req-list">
                  {employeeRequests.map((r) => {
                    const mapping = competencyMappingFor(r.training_title);
                    return (
                    <div className="req-card idp-req-card" key={r.id}>
                      <div className="req-card-top">
                        <div>
                          <div className="req-card-training">{r.training_title}</div>
                          {mapping && (
                            <div style={{ fontSize: 11, color: 'var(--purple)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapIcon size={11} strokeWidth={2.4} /> Kateqoriya: {mapping.category} → Səriştə: {mapping.competency}
                            </div>
                          )}
                          <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>
                            {fmtDate(r.created_at)} · {r.source === 'Manager Survey' ? 'İllik TNA' : 'Ad-hoc sorğu'}
                          </div>
                        </div>
                        <div className="req-card-badges">
                          <PriorityBadge priority={r.priority} />
                          <ReqStatusBadge status={r.status} />
                        </div>
                      </div>
                      {r.reason && (
                        <div className="req-field-highlight">
                          <div className="req-field-label">Ehtiyacın yaranma səbəbi</div>
                          <div className="req-field-value">{r.reason}</div>
                        </div>
                      )}
                      {(r.importance_level || r.current_skill_level || r.required_skill_level) && (
                        <div className="req-field-grid">
                          {r.importance_level && (<div><div className="req-field-label">Əhəmiyyət</div><div className="req-field-value">{r.importance_level}</div></div>)}
                          {r.current_skill_level && (<div><div className="req-field-label">Cari səviyyə</div><div className="req-field-value">{r.current_skill_level}</div></div>)}
                          {r.required_skill_level && (<div><div className="req-field-label">Tələb olunan</div><div className="req-field-value">{r.required_skill_level}</div></div>)}
                        </div>
                      )}
                      {r.manager_note && (
                        <div className="req-field-note"><div className="req-field-label">Manager qeydi</div><div className="req-field-value">{r.manager_note}</div></div>
                      )}
                      {r.reviewer_note && (
                        <div className="req-field-note"><div className="req-field-label">L&D qeydi</div><div className="req-field-value">{r.reviewer_note}</div></div>
                      )}
                    </div>
                  );})}
                </div>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: 24 }}><EmptyState>Sorğu tarixçəsi yoxdur</EmptyState></div>
            )}

            <div className="section-head"><div className="section-title">Təlim Planı və Nəticələri ({employeeTrainings.length})</div></div>
            {employeeTrainings.length ? (
              <div className="table-wrap" style={{ marginBottom: 24, maxHeight: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>İl</th><th>Təlim</th><th>Cari səviyyə</th><th>Tələb olunan</th><th>Əhəmiyyət</th><th>Prioritet</th><th>Provayder</th><th>Status</th><th>Başlama</th><th>Bitmə</th><th>Saat</th><th>Büdcə</th><th className="no-print">Qiymətləndirmə</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeTrainings.map((t) => {
                      const mapping = competencyMappingFor(t.skill);
                      const verdict = evaluationVerdict(t);
                      const canEvaluate = isDirectManager && t.status === 'Completed';
                      // `team` only ever holds the viewer's DIRECT REPORTS
                      // (see pages/index.js), never the viewer's own
                      // profile — so the most common case (the evaluator
                      // IS whoever is currently looking at this page) has
                      // to be resolved from `profile` first, falling back
                      // to `team` for the rarer case of an L&D/HR viewer
                      // looking at an evaluation a different manager left.
                      const evaluator = !t.evaluated_by ? null
                        : t.evaluated_by === profile?.id ? profile
                        : (team || []).find((m) => m.id === t.evaluated_by);
                      return (
                      <Fragment key={t.id}>
                      <tr>
                        <td>{t.plan_year || '—'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {t.skill}
                          {t.learning_goal && (
                            <div style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--ink-500)', marginTop: 3 }}>
                              <b>Öyrənmə Məqsədi:</b> {t.learning_goal}
                            </div>
                          )}
                          {mapping && (
                            <div style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--purple)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapIcon size={10} strokeWidth={2.4} /> Səriştə: {mapping.competency}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>{t.current_skill_level || '—'}</td>
                        <td style={{ fontSize: 12 }}>{t.required_skill_level || '—'}</td>
                        <td style={{ fontSize: 12 }}>{t.importance_level || '—'}</td>
                        <td>{t.priority ? <PriorityBadge priority={t.priority} /> : '—'}</td>
                        <td>{t.vendor || '—'}</td>
                        <td><TrainingStatusBadge status={t.status} /></td>
                        <td>{t.start_date || t.start_raw || '—'}</td>
                        <td>{t.end_date || t.end_raw || '—'}</td>
                        <td>{t.man_hours ?? '—'}</td>
                        <td>{fmtMoney(t.budget)}</td>
                        <td className="no-print">
                          {t.evaluated_at ? (
                            <span style={{ fontSize: 11, fontWeight: 700, color: verdict?.color || 'var(--ink-500)', whiteSpace: 'nowrap' }}>
                              {verdict ? `${verdict.icon} Qiymətləndirilib` : 'Qiymətləndirilib'}
                            </span>
                          ) : canEvaluate ? (
                            <button onClick={() => setEvalTraining(t)} className="btn btn-outline btn-sm">
                              <ClipboardCheck size={12} strokeWidth={2.2} /> Qiymətləndir
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>—</span>
                          )}
                        </td>
                      </tr>
                      {t.evaluated_at && (
                        <tr key={t.id + '-eval'} className="idp-eval-row">
                          <td colSpan={13} style={{ padding: 0 }}>
                            <div className="idp-eval-block" style={{ '--eval-color': verdict?.color || 'var(--ink-400)' }}>
                              <div className="idp-eval-header">
                                <ClipboardCheck size={14} strokeWidth={2.2} />
                                Post-Təlim Qiymətləndirməsi
                                {isDirectManager && (
                                  <button onClick={() => setEvalTraining(t)} className="btn btn-outline btn-sm no-print" style={{ marginLeft: 'auto' }}>
                                    Redaktə et
                                  </button>
                                )}
                              </div>
                              <div className="req-field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: verdict || t.evaluation_comment ? 10 : 0 }}>
                                <div><div className="req-field-label">Yenilənmiş cari səviyyə</div><div className="req-field-value">{t.post_training_skill_level || '—'}</div></div>
                                <div><div className="req-field-label">Qiymətləndirən</div><div className="req-field-value">{evaluator?.full_name_az || '—'}</div></div>
                                <div><div className="req-field-label">Tarix</div><div className="req-field-value">{fmtDateTime(t.evaluated_at)}</div></div>
                              </div>
                              {verdict && (
                                <div className="idp-eval-verdict" style={{ color: verdict.color, background: `color-mix(in srgb, ${verdict.color} 10%, transparent)`, borderColor: verdict.color }}>
                                  {verdict.icon} {verdict.text}
                                </div>
                              )}
                              {t.evaluation_comment && (
                                <div className="req-field-note" style={{ marginTop: 10 }}>
                                  <div className="req-field-label">Rəhbərin şərhi</div>
                                  <div className="req-field-value">{t.evaluation_comment}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                      );})}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: 24 }}><EmptyState>Hələ təlim planına əlavə edilməyib</EmptyState></div>
            )}
          </div>
        )}
      </div>

      {evalTraining && (
        <TrainingEvaluationModal training={evalTraining} onClose={closeEvalModal} onSaved={handleEvalSaved} />
      )}
    </div>
  );
}
