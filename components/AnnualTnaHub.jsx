import { useState } from 'react';
import { PlusSquare, Users2, Folder, History } from 'lucide-react';
import AnnualTnaForm from './AnnualTnaForm';
import AnnualTnaActiveReview from './AnnualTnaActiveReview';
import AnnualTnaDecisionHistory from './AnnualTnaDecisionHistory';
import TnaCompletionTracker from './TnaCompletionTracker';

// L&D/HR-only İllik TNA panel: four sub-views switched by pill tabs
// instead of one long stacked page. "Sorğu yarat" only makes sense for
// an L&D/HR user who also manages people (same hasTeam gate the bulk
// entry table already used); "Statuslar" stays L&D-only, matching
// TnaCompletionTracker's own existing role check.
export default function AnnualTnaHub({ profile, team, requests, planYear, tnaWindowOpen, onDataChanged }) {
  const hasTeam = team && team.length > 0;
  const showSorgu = (tnaWindowOpen || profile.role === 'ld') && hasTeam;
  const showStatuslar = profile.role === 'ld';

  const surveyRequests = requests.filter((r) => r.source === 'Manager Survey');
  const activeCount = surveyRequests.filter((r) => r.status === 'Pending' || r.status === 'In Review').length;
  const decidedCount = surveyRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Needs Revision').length;

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
            <p>Rəhbərlərin illik təlim ehtiyacı sorğularını yaradın, izləyin və qərar verin.</p>
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
          <TnaCompletionTracker profile={profile} requests={requests} planYear={planYear} />
        )}
        {activeTab === 'departament' && (
          <AnnualTnaActiveReview profile={profile} requests={requests} onDataChanged={onDataChanged} />
        )}
        {activeTab === 'qerarlar' && (
          <AnnualTnaDecisionHistory requests={requests} planYear={planYear} onDataChanged={onDataChanged} />
        )}
      </div>
    </div>
  );
}
