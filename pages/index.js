import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { sb } from '../lib/supabase';
import LoginScreen from '../components/LoginScreen';
import TopBar from '../components/TopBar';
import HomeScreen from '../components/HomeScreen';
import DashboardView from '../components/DashboardView';
import TrackingView from '../components/TrackingView';
import RequestsView from '../components/RequestsView';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [view, setView] = useState('home');

  const loadData = useCallback(async (currentProfile) => {
    const { data: tData } = await sb.from('trainings').select('*').order('id');
    setTrainings(tData || []);
    const { data: rData } = await sb.from('training_requests').select('*').order('created_at', { ascending: false });
    setRequests(rData || []);
  }, []);

  const afterLogin = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser();
    const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);
    const { data: teamData } = await sb.from('profiles').select('id, full_name_az, dept, sube, position').eq('manager_id', prof.id);
    setTeam(teamData || []);
    await loadData(prof);
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
    await loadData(profile);
  }

  if (loading) {
    return (
      <>
        <Head><title>Təlim Tracker — Mars Overseas</title></Head>
        <div className="loading">Yüklənir...</div>
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <Head><title>Təlim Tracker — Mars Overseas</title></Head>
        <LoginScreen onLoggedIn={afterLogin} />
      </>
    );
  }

  return (
    <>
      <Head><title>Təlim Tracker — Mars Overseas</title></Head>
      <TopBar view={view} setView={setView} />
      {view === 'home' && <HomeScreen profile={profile} team={team} setView={setView} />}
      {view === 'dashboard' && <DashboardView trainings={trainings} />}
      {view === 'tracking' && <TrackingView trainings={trainings} profile={profile} />}
      {view === 'requests' && (
        <RequestsView profile={profile} team={team} requests={requests} onDataChanged={handleDataChanged} />
      )}
    </>
  );
}
