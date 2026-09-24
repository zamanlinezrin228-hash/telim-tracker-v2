import { useState } from 'react';
import { PlusSquare, Users2, Folder, History } from 'lucide-react';
import { sb } from '../lib/supabase';
import { showToast } from '../lib/toast';
import { matchesOwnScope } from '../lib/helpers';
import AnnualTnaForm from './AnnualTnaForm';
import AnnualTnaActiveReview from './AnnualTnaActiveReview';
import AnnualTnaManagerReview from './AnnualTnaManagerReview';
import AnnualTnaDecisionHistory from './AnnualTnaDecisionHistory';
import TnaCompletionTracker from './TnaCompletionTracker';

// L&D/HR gets the full company-wide picture. ANY manager with direct
// reports — dept-level (scope_level='dept') or şöbə-level (scope_level=
// 'sube') alike — gets the exact same four-tab pill layout, but every tab's
// DATA stays scoped to just their own dept/şöbə: "Departament üzrə baxış"
// renders AnnualTnaManagerReview, which shows both what's currently
// addressed to this manager (reviewing_manager_id = profile.id) AND a full
// history of every request in their dept/şöbə at its live current stage —
// so a request an earlier-hop manager approved and forwarded stays visible
// to them, not just to whoever needs to act on it right now — never L&D's
// company-wide AnnualTnaActiveReview; "Qərarlar tarixçəsi" pre-filters to
// this manager's own dept/şöbə before handing rows to the purely-
// presentational AnnualTnaDecisionHistory. "Statuslar" (completion tracking
// of managers reporting to YOU) only makes sense one level up the chain, so
// it stays dept-manager/L&D only. None of this reuses L&D's company-wide
// data-fetching logic — only the tab/nav layout.
export default function AnnualTnaHub({ profile, team, requests, planYear, tnaWindowOpen, adhocRequestsOpen, onDataChanged }) {
  const isLd = profile.role === 'ld';
  const [togglingAdhoc, setTogglingAdhoc] = useState(false);

  // L&D-only in-app switch for app_settings.adhoc_requests_open, so this no
  // longer needs manual SQL each time the annual TNA window opens/closes —
  // a direct UPDATE to the single id=1 settings row, same as every other
  // app_settings read/write in this app.
  async function toggleAdhocOpen() {
    setTogglingAdhoc(true);
    const { error } = await sb.from('app_settings').update({ adhoc_requests_open: !adhocRequestsOpen }).eq('id', 1);
    setTogglingAdhoc(false);
    if (error) { showToast('Xəta: ' + error.message, 'error'); return; }
    if (onDataChanged) onDataChanged();
  }
  const hasTeam = team && team.length > 0;
  const isScopedManager = !isLd && profile.role === 'manager' && hasTeam;
  const isDeptManager = isScopedManager && profile.scope_level === 'dept';

  // Not gated by hasTeam: L&D/HR/dept-manager staff are individual
  // employees too and need to log their own personal need even with zero
  // direct reports — AnnualTnaForm already handles a teamless profile fine
  // (it just offers "Mən" as the only selectable person).
  const showSorgu = tnaWindowOpen || isLd || isScopedManager;
  const showStatuslar = isLd || isDeptManager;

  const surveyRequests = requests.filter((r) => r.source === 'Manager Survey');

  // BUG FIX: "Departament üzrə baxış" used to be an either/or — isScopedManager
  // (profile.role==='manager') got their own "awaiting me" queue with an
  // approve action (AnnualTnaManagerReview), anyone else (including L&D/HR)
  // got the company-wide, read-only-at-manager-stage AnnualTnaActiveReview.
  // That silently broke for someone whose role is 'ld'/'hr' but who ALSO has
  // direct reports (e.g. a şöbə lead whose own team sits inside L&D/HR,
  // confirmed case: Tural Dadaşov) — a request correctly forwarded to THEM
  // (reviewing_manager_id === their id) landed them in the read-only company-
  // wide view, which has no button at all for a 'Pending Manager Review' row,
  // so they had no way to ever approve it. Now anyone with hasTeam gets their
  // own actionable queue (regardless of role), and anyone who isn't a plain
  // scoped manager (i.e. is L&D/HR) ALSO keeps the company-wide view — both
  // render together when both apply, exactly like RequestsView.jsx already
  // does for the ad-hoc equivalent ("Baxılmalı Komanda Sorğuları" + L&D's
  // "Gələn Təlim Sorğuları" coexist there for the same reason).
  const ownQueueCount = hasTeam
    ? surveyRequests.filter((r) => r.reviewing_manager_id === profile.id && r.status === 'Pending Manager Review').length
    : 0;
  const companyWideCount = surveyRequests.filter((r) => r.status === 'Pending' || r.status === 'In Review').length;
  const activeCount = isScopedManager
    ? ownQueueCount
    : (hasTeam ? ownQueueCount + companyWideCount : companyWideCount);

  // matchesOwnScope does a case/whitespace-normalized dept-or-şöbə
  // comparison (dept for a dept-level manager, şöbə for a şöbə-level one) —
  // a plain `===` here previously mismatched whenever a submitter's
  // profile.dept disagreed on casing with this manager's own profile.dept
  // (the same class of bug behind Dashboard showing 0 for a dept manager).
  const decisionHistoryRequests = isScopedManager
    ? surveyRequests.filter((r) => matchesOwnScope(r, profile))
    : surveyRequests;
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
              {isScopedManager
                ? (profile.scope_level === 'sube'
                    ? 'Şöbənizin illik təlim ehtiyacı sorğularını yaradın, izləyin və qərar verin.'
                    : 'Departamentinizin illik təlim ehtiyacı sorğularını yaradın, izləyin və qərar verin.')
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

        {isLd && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, cursor: togglingAdhoc ? 'default' : 'pointer', width: 'fit-content' }}>
            <input
              type="checkbox"
              checked={!!adhocRequestsOpen}
              disabled={togglingAdhoc}
              onChange={toggleAdhocOpen}
            />
            İl ortası (ad-hoc) sorğulara icazə ver
          </label>
        )}
      </div>

      <div className="page">
        {activeTab === 'sorgu' && (
          <AnnualTnaForm profile={profile} team={team} planYear={planYear} onSubmitted={onDataChanged} />
        )}
        {activeTab === 'statuslar' && (
          <TnaCompletionTracker profile={profile} team={team} requests={requests} planYear={planYear} />
        )}
        {activeTab === 'departament' && (
          <>
            {hasTeam && (
              <AnnualTnaManagerReview profile={profile} team={team} requests={requests} onDataChanged={onDataChanged} />
            )}
            {!isScopedManager && (
              <AnnualTnaActiveReview profile={profile} requests={requests} onDataChanged={onDataChanged} />
            )}
          </>
        )}
        {activeTab === 'qerarlar' && (
          <AnnualTnaDecisionHistory profile={profile} team={team} requests={decisionHistoryRequests} planYear={planYear} onDataChanged={onDataChanged} />
        )}
      </div>
    </div>
  );
}
