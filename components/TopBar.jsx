import { sb } from '../lib/supabase';

export default function TopBar({ view, setView }) {
  async function handleLogout() {
    await sb.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="topbar" style={{ position: 'relative' }}>
      <button className={'nav-btn' + (view === 'dashboard' ? ' active' : '')} onClick={() => setView('dashboard')}>Dashboard</button>
      <button className={'nav-btn' + (view === 'tracking' ? ' active' : '')} onClick={() => setView('tracking')}>İzləmə Cədvəli</button>
      <button className={'nav-btn' + (view === 'requests' ? ' active' : '')} onClick={() => setView('requests')}>Təlim Sorğuları</button>
      <button className="nav-btn" onClick={handleLogout} style={{ position: 'absolute', right: 24, border: '1px solid rgba(255,255,255,0.4)' }}>Çıxış</button>
    </div>
  );
}
