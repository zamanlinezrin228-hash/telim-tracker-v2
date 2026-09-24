import { useState } from 'react';
import { PlusSquare, Users2, Folder, History } from 'lucide-react';
import AnnualTnaForm from './AnnualTnaForm';
import AnnualTnaActiveReview from './AnnualTnaActiveReview';
import AnnualTnaManagerReview from './AnnualTnaManagerReview';
import AnnualTnaDecisionHistory from './AnnualTnaDecisionHistory';
import TnaCompletionTracker from './TnaCompletionTracker';

// L&D/HR gets the full company-wide picture. A dept-level manager
// (scope_level='dept') with şöbə-level managers reporting to them gets the
// exact same four-tab pill layout — but every tab's DATA stays scoped to
// just their own department: "Departament üzrə baxış" renders
// AnnualTnaManagerReview, which only ever reads rows addressed to this
// manager (reviewing_manager_id = profile.id), never L&D's company-wide
// AnnualTnaActiveReview; "Statuslar" uses TnaCompletionTracker's own-team
// branch (their şöbə-manager direct reports only); "Qərarlar tarixçəsi"
// pre-filters to r.dept === profile.dept before handing rows to the
// purely-presentational AnnualTnaDecisionHistory. None of this reuses
// L&D's company-wide data-fetching logic — only the tab/nav layout.
export default function AnnualTnaHub({ profile, team, requests, planYear, tnaWindowOpen, onDataChanged }) {
  const isLd = profile.role === 'ld';
  const isDeptManager = !isLd && profile.scope_level === 'dept';

  // Not gated by hasTeam: L&D/HR/dept-manager staff are individual
  // employees too and need to log their own personal need even with zero
  // direct reports — AnnualTnaForm already handles a teamless profile fine
  // (it just offers "Mən" as the only selectable person).
  const showSorgu = tnaWindowOpen || isLd || isDeptManager;
  const showStatuslar = isLd || isDeptManager;

  const surveyRequests = requests.filter((r) => r.source === 'Manager Survey');

  // A dept manager's "Departament üzrə baxış" tracks a completely different,
  // already-personally-scoped queue (rows forwarded straight to their own
  // id) than L&D's company-wide Pending/In-Review count, so its badge is
  // computed separately rather than reusing L&D's activeCount.
  const activeCount = isDeptManager
    ? surveyRequests.filter((r) => r.reviewing_manager_id === profile.id && r.status === 'Pending Manager Review').length
    : surveyRequests.filter((r) => r.status === 'Pending' || r.status === 'In Review').length;

  const decisionHistoryRequests = isDeptManager ? surveyRequests.filter((r) => r.dept === profile.dept) : surveyRequests;
  const decidedCount = decisionHistoryRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Needs Revision').length;

  const tabs = [
    ...(showSorgu ? [{ key: 'sorgu', label: 'Sorğu yarat', Icon: PlusSquare }] : []),
    ...(showStatuslar ? [{ key: 'statuslar', label: 'Statuslar', Icon: Users2 }] : []),
    { key: 'departament', label: 'Departament üzrə baxış', Icon: Folder, count: activeCount },
    { key: 'qerarlar', label: 'Qərarlar tarixçəsi', Icon: History, count: decidedCount },
  ];

  const [tab, setTab] = useState(tabs[0].key);
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>İllik TNA — {planYear}</h1>
            <p>
              {isDeptManager
                ? 'Departamentinizin illik təlim ehtiyacı sorğularını yaradın, izləyin və qərar verin.'
                : 'Rəhbərlərin illik təlim ehtiyacı sorğularını yaradın, izləyin və qərar verin.'}
            </p>
          </div>
          <div className="subtab-nav">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={'subtab-pill' + (activeTab === t.key ? ' active' : '')}
                onClick={() => setTab(t.key)}
              >
                <t.Icon size={14} strokeWidth={2.2} /> {t.label}
                {typeof t.count === 'number' && <span className="badge-count">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page">
        {activeTab === 'sorgu' && (
          <AnnualTnaForm profile={profile} team={team} planYear={planYear} onSubmitted={onDataChanged} />
        )}
        {activeTab === 'statuslar' && (
          <TnaCompletionTracker profile={profile} team={team} requests={requests} planYear={planYear} />
        )}
        {activeTab === 'departament' && (
          isDeptManager ? (
            <AnnualTnaManagerReview profile={profile} team={team} requests={requests} onDataChanged={onDataChanged} />
          ) : (
            <AnnualTnaActiveReview profile={profile} requests={requests} onDataChanged={onDataChanged} />
          )
        )}
        {activeTab === 'qerarlar' && (
          <AnnualTnaDecisionHistory profile={profile} team={team} requests={decisionHistoryRequests} planYear={planYear} onDataChanged={onDataChanged} />
        )}
      </div>
    </div>
  );
}
