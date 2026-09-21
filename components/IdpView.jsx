import { useEffect, useMemo, useState } from 'react';
import {
  UserSquare2, Download, FileText, BookOpen, Wallet, Timer, CheckCircle2, Search, Map as MapIcon,
} from 'lucide-react';
import { sb } from '../lib/supabase';
import { fmtMoney } from '../lib/helpers';
import { ReqStatusBadge, PriorityBadge, TrainingStatusBadge } from './Badges';
import EmptyState from './EmptyState';

function employeeKey(name, dept) {
  return `${name}|||${dept || ''}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('az-AZ');
}

function normalizeSkill(s) {
  return (s || '').toLocaleLowerCase('az').replace(/\s+/g, ' ').trim();
}

export default function IdpView({ requests, trainings }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    sb.from('competency_library').select('category, competency, sub_competency').then(({ data }) => {
      setLibrary(data || []);
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
      const key = employeeKey(r.employee_name, r.dept);
      if (!map.has(key)) {
        map.set(key, { key, name: r.employee_name, dept: r.dept, sube: r.sube, position: r.position, latest: r.created_at || null });
      } else {
        const cur = map.get(key);
        if (!cur.position && r.position) cur.position = r.position;
        if (r.created_at && (!cur.latest || r.created_at > cur.latest)) { cur.latest = r.created_at; if (r.position) cur.position = r.position; }
      }
    }
    requests.forEach(absorb);
    trainings.forEach(absorb);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'az'));
  }, [requests, trainings]);

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

  const employeeRequests = useMemo(() => {
    if (!employee) return [];
    return requests
      .filter((r) => r.employee_name === employee.name && (r.dept || '') === (employee.dept || ''))
      .filter((r) => selectedYear === 'all' || new Date(r.created_at).getFullYear() === Number(selectedYear))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [requests, employee, selectedYear]);

  const employeeTrainings = useMemo(() => {
    if (!employee) return [];
    return trainings
      .filter((t) => t.employee_name === employee.name && (t.dept || '') === (employee.dept || ''))
      .filter((t) => selectedYear === 'all' || t.plan_year === Number(selectedYear))
      .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
  }, [trainings, employee, selectedYear]);

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
                      <th>İl</th><th>Təlim</th><th>Provayder</th><th>Status</th><th>Başlama</th><th>Bitmə</th><th>Saat</th><th>Büdcə</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeTrainings.map((t) => {
                      const mapping = competencyMappingFor(t.skill);
                      return (
                      <tr key={t.id}>
                        <td>{t.plan_year || '—'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {t.skill}
                          {mapping && (
                            <div style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--purple)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapIcon size={10} strokeWidth={2.4} /> Kateqoriya: {mapping.category} → Səriştə: {mapping.competency}
                            </div>
                          )}
                        </td>
                        <td>{t.vendor || '—'}</td>
                        <td><TrainingStatusBadge status={t.status} /></td>
                        <td>{t.start_date || t.start_raw || '—'}</td>
                        <td>{t.end_date || t.end_raw || '—'}</td>
                        <td>{t.man_hours ?? '—'}</td>
                        <td>{fmtMoney(t.budget)}</td>
                      </tr>
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
    </div>
  );
}
