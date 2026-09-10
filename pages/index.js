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
import AnnualTnaReview from '../components/AnnualTnaReview';
import ToastHost from '../components/ToastHost';

const NOTIFY_POLL_MS = 60000;

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [appSettings, setAppSettings] = useState({ tna_window_open: false, tna_plan_year: new Date().getFullYear() });
  const [view, setView] = useState('home');

  const loadData = useCallback(async () => {
    const { data: tData } = await sb.from('trainings').select('*').order('id');
    setTrainings(tData || []);
    const { data: rData } = await sb.from('training_requests').select('*').order('created_at', { ascending: false });
    setRequests(rData || []);
    const { data: sData } = await sb.from('app_settings').select('*').eq('id', 1).single();
    if (sData) setAppSettings(sData);
  }, []);

  const afterLogin = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser();
    const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);
    const { data: teamData } = await sb.from('profiles').select('id, full_name_az, dept, sube, position').eq('manager_id', prof.id);
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
        <div className="loading"><span className="spinner" /> Yüklənir...</div>
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

  const showAnnualTna = appSettings.tna_window_open || profile.role === 'ld';

  return (
    <>
      <Head><title>Təlim Tracker</title></Head>
      <div className="app-shell">
        <Sidebar view={view} setView={setView} profile={profile} showAnnualTna={showAnnualTna} badges={sidebarBadges} />
        <div className="app-main">
          <div key={view} className="view-enter">
            {view === 'home' && (
              <HomeScreen profile={profile} team={team} setView={setView} tnaWindowOpen={appSettings.tna_window_open} planYear={appSettings.tna_plan_year} />
            )}
            {view === 'dashboard' && <DashboardView trainings={trainings} requests={requests} />}
            {view === 'tracking' && <TrackingView trainings={trainings} profile={profile} onDataChanged={handleDataChanged} />}
            {view === 'requests' && (
              <RequestsView profile={profile} team={team} requests={requests} planYear={appSettings.tna_plan_year} onDataChanged={handleDataChanged} />
            )}
            {view === 'annual-tna' && (
              <div>
                {(appSettings.tna_window_open || profile.role === 'ld') && (
                  <AnnualTnaForm profile={profile} team={team} planYear={appSettings.tna_plan_year} onSubmitted={handleDataChanged} />
                )}
                {(profile.role === 'ld' || profile.role === 'hr') && (
                  <div className="page" style={{ paddingTop: 0 }}>
                    <AnnualTnaReview profile={profile} requests={requests} planYear={appSettings.tna_plan_year} onDataChanged={handleDataChanged} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastHost />
    </>
  );
}
