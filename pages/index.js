import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { sb } from '../lib/supabase';
import { showToast } from '../lib/toast';
import LoginScreen from '../components/LoginScreen';
import SignupScreen from '../components/SignupScreen';
import Sidebar from '../components/Sidebar';
import HomeScreen from '../components/HomeScreen';
import DashboardView from '../components/DashboardView';
import TrackingView from '../components/TrackingView';
import RequestsView from '../components/RequestsView';
import AnnualTnaForm from '../components/AnnualTnaForm';
import AnnualTnaHub from '../components/AnnualTnaHub';
import IdpView from '../components/IdpView';
import ProcessGuideView from '../components/ProcessGuideView';
import ToastHost from '../components/ToastHost';

const NOTIFY_POLL_MS = 60000;

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [allTrainings, setAllTrainings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [appSettings, setAppSettings] = useState({ tna_window_open: false, tna_plan_year: new Date().getFullYear(), adhoc_requests_open: false });
  const [view, setView] = useState('home');

  const loadData = useCallback(async () => {
    const { data: tData } = await sb.from('trainings').select('*').order('id');
    setTrainings(tData || []);
    // The Dashboard shows company-wide KPIs by default for every role, even
    // though the plain trainings fetch above is RLS-scoped per role (managers
    // see only their dept/sube, employees only their own rows) so Tracking
    // stays correctly restricted. get_dashboard_trainings() is a separate
    // SECURITY DEFINER function that returns every row regardless of caller,
    // purely for this reporting view — see the reviewed .sql migration.
    const { data: allTData } = await sb.rpc('get_dashboard_trainings');
    setAllTrainings(allTData || []);
    const { data: rData } = await sb.from('training_requests').select('*').order('created_at', { ascending: false });
    setRequests(rData || []);
    const { data: sData } = await sb.from('app_settings').select('*').eq('id', 1).single();
    if (sData) setAppSettings(sData);
  }, []);

  const afterLogin = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser();
    const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);
    // scope_level/role are needed to tell a şöbə-level manager's own
    // forwarded batch apart from a plain employee's single-row submission
    // when both land in this same manager's queue (see AnnualTnaForm.jsx's
    // merge effect and AnnualTnaHub.jsx's dept-manager scoping).
    const { data: teamData } = await sb.from('profiles').select('id, full_name_az, dept, sube, position, scope_level, role').eq('manager_id', prof.id);
    setTeam(teamData || []);
    await loadData();
    setLoggedIn(true);
    setLoading(false);
  }, [loadData]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        await afterLogin();
      } else {
        setLoading(false);
      }
    })();
  }, [afterLogin]);

  async function handleDataChanged() {
    await loadData();
  }

  const isReviewer = profile && (profile.role === 'ld' || profile.role === 'hr');
  // A dept-level manager with şöbə-level managers reporting to them gets the
  // same İllik TNA tab layout as L&D (AnnualTnaHub), but every tab inside it
  // stays scoped to just their own department — never L&D's company-wide
  // data-fetching. See AnnualTnaHub.jsx.
  const isDeptManager = profile && profile.scope_level === 'dept' && team.length > 0;

  // Dashboard access: L&D/HR (same elevated-review roles as everywhere else
  // in the app) and anyone explicitly flagged dashboard_full_access see the
  // full company-wide picture; a manager with direct reports sees their own
  // dept/sube only; a plain employee with neither doesn't get the card/route
  // at all. See the reviewed sql/2026-09-24_add_dashboard_full_access.sql.
  const hasDashboardFullAccess = !!profile && (isReviewer || profile.dashboard_full_access === true);
  const isScopedManager = profile && profile.role === 'manager' && team.length > 0;
  const canSeeDashboard = hasDashboardFullAccess || isScopedManager;

  // Polls for newly-arrived requests (ad-hoc + annual TNA) while an L&D/HR
  // reviewer has the app open, and surfaces a toast when the count grows —
  // there's no realtime subscription set up on this Supabase project, so
  // polling is the reliable way to notice new submissions.
  const prevPendingRef = useRef(null);
  useEffect(() => {
    if (!loggedIn || !isReviewer) { prevPendingRef.current = null; return; }
    let cancelled = false;

    async function poll() {
      const { count, error } = await sb.from('training_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending');
      if (cancelled || error || count === null) return;
      if (prevPendingRef.current !== null && count > prevPendingRef.current) {
        const diff = count - prevPendingRef.current;
        showToast(diff === 1 ? 'Yeni təlim sorğusu daxil oldu.' : `${diff} yeni təlim sorğusu daxil oldu.`, 'info');
        await loadData();
      }
      prevPendingRef.current = count;
    }

    poll();
    const id = setInterval(poll, NOTIFY_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [loggedIn, isReviewer, loadData]);

  const sidebarBadges = isReviewer
    ? {
        requests: requests.filter((r) => r.status === 'Pending').length,
        'annual-tna': requests.filter((r) => r.status === 'Pending' && r.source === 'Manager Survey').length,
      }
    : {};

  if (loading) {
    return (
      <>
        <Head><title>Təlim Tracker</title></Head>
        <div className="app-shell">
          <div className="skeleton-sidebar">
            <div className="skel skel-brand" />
            <div className="skel skel-nav-item" />
            <div className="skel skel-nav-item" />
            <div className="skel skel-nav-item" />
          </div>
          <div className="app-main">
            <div className="skel skel-header" />
            <div className="page">
              <div className="kpi-grid">
                {[0, 1, 2, 3].map((i) => <div className="skel skel-stat-card" key={i} />)}
              </div>
              <div className="skel skel-block" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <Head><title>Təlim Tracker</title></Head>
        {authView === 'login' ? (
          <LoginScreen onLoggedIn={afterLogin} onShowSignup={() => setAuthView('signup')} />
        ) : (
          <SignupScreen onSignedUp={afterLogin} onBackToLogin={() => setAuthView('login')} />
        )}
      </>
    );
  }

  const showAnnualTna = appSettings.tna_window_open || profile.role === 'ld' || isDeptManager;

  return (
    <>
      <Head><title>Təlim Tracker</title></Head>
      <div className="app-shell">
        <Sidebar view={view} setView={setView} profile={profile} showAnnualTna={showAnnualTna} showDashboard={canSeeDashboard} badges={sidebarBadges} />
        <div className="app-main">
          <div key={view} className="view-enter">
            {view === 'home' && (
              <HomeScreen profile={profile} team={team} setView={setView} tnaWindowOpen={appSettings.tna_window_open} planYear={appSettings.tna_plan_year} canSeeDashboard={canSeeDashboard} />
            )}
            {view === 'dashboard' && canSeeDashboard && (
              <DashboardView trainings={allTrainings} profile={profile} team={team} requests={requests} restrictToOwnScope={!hasDashboardFullAccess} />
            )}
            {view === 'tracking' && <TrackingView trainings={trainings} profile={profile} onDataChanged={handleDataChanged} />}
            {view === 'requests' && (
              <RequestsView profile={profile} team={team} requests={requests} planYear={appSettings.tna_plan_year} adhocRequestsOpen={appSettings.adhoc_requests_open} onDataChanged={handleDataChanged} />
            )}
            {view === 'annual-tna' && (
              <div>
                {(isReviewer || isDeptManager) ? (
                  <AnnualTnaHub
                    profile={profile} team={team} requests={requests} planYear={appSettings.tna_plan_year}
                    tnaWindowOpen={appSettings.tna_window_open} onDataChanged={handleDataChanged}
                  />
                ) : (
                  appSettings.tna_window_open && (
                    <div className="page">
                      <AnnualTnaForm profile={profile} team={team} planYear={appSettings.tna_plan_year} onSubmitted={handleDataChanged} />
                    </div>
                  )
                )}
              </div>
            )}
            {view === 'idp' && (profile.role === 'ld' || profile.role === 'hr') && (
              <IdpView requests={requests} trainings={trainings} />
            )}
            {view === 'guide' && <ProcessGuideView />}
          </div>
        </div>
      </div>
      <ToastHost />
    </>
  );
}
