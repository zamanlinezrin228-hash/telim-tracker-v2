import { sb } from '../lib/supabase';

export default function TopBar({ view, setView }) {
  async function handleLogout() {
    await sb.auth.signOut();
    window.location.reload();
  }

  const onHome = view === 'home';

  return (
    <div className="topbar" style={{ position: 'relative', justifyContent: onHome ? 'space-between' : 'center', padding: '0 24px' }}>
      <button
        className="nav-btn"
        onClick={() => setView('home')}
        title="Əsas səhifə"
        style={{ fontWeight: 800, fontSize: 16, ...(onHome ? {} : { position: 'absolute', left: 24 }) }}
      >
        🏠 Təlim Tracker
      </button>

      {!onHome && (
        <>
          <button className={'nav-btn' + (view === 'dashboard' ? ' active' : '')} onClick={() => setView('dashboard')}>Dashboard</button>
          <button className={'nav-btn' + (view === 'tracking' ? ' active' : '')} onClick={() => setView('tracking')}>İzləmə Cədvəli</button>
          <button className={'nav-btn' + (view === 'requests' ? ' active' : '')} onClick={() => setView('requests')}>Təlim Sorğuları</button>
        </>
      )}

      <button
        className="nav-btn"
        onClick={handleLogout}
        style={{ border: '1px solid rgba(255,255,255,0.4)', ...(onHome ? {} : { position: 'absolute', right: 24 }) }}
      >
        Çıxış
      </button>
    </div>
  );
}
