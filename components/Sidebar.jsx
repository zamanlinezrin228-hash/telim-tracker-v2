import { GraduationCap, Home, LayoutDashboard, ClipboardList, FileText, CalendarDays, LogOut } from 'lucide-react';
import { sb } from '../lib/supabase';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'tracking', label: 'İzləmə Cədvəli', Icon: ClipboardList },
  { key: 'requests', label: 'Təlim Sorğuları', Icon: FileText },
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase();
}

const ROLE_LABELS = { ld: 'L&D', hr: 'HR', employee: 'İşçi' };

export default function Sidebar({ view, setView, profile, showAnnualTna, badges = {} }) {
  async function handleLogout() {
    await sb.auth.signOut();
    window.location.reload();
  }

  const items = showAnnualTna
    ? [...NAV_ITEMS, { key: 'annual-tna', label: 'İllik TNA', Icon: CalendarDays }]
    : NAV_ITEMS;

  return (
    <aside className="sidebar">
      <button className="sidebar-brand" onClick={() => setView('home')} title="Əsas səhifə">
        <span className="mark"><GraduationCap size={19} strokeWidth={2.2} /></span>
        <span>Təlim Tracker</span>
      </button>

      <nav className="sidebar-nav">
        <button
          className={'sidebar-link' + (view === 'home' ? ' active' : '')}
          onClick={() => setView('home')}
        >
          <span className="icon"><Home size={17} strokeWidth={2} /></span>
          <span>Əsas səhifə</span>
        </button>
        {items.map((item) => {
          const badgeCount = badges[item.key];
          const Icon = item.Icon;
          return (
            <button
              key={item.key}
              className={'sidebar-link' + (view === item.key ? ' active' : '')}
              onClick={() => setView(item.key)}
            >
              <span className="icon"><Icon size={17} strokeWidth={2} /></span>
              <span>{item.label}</span>
              {!!badgeCount && <span className="sidebar-link-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials(profile?.full_name_az)}</div>
          <div>
            <div className="sidebar-user-name">{profile?.full_name_az || ''}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[profile?.role] || profile?.role || ''}</div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm btn-block" onClick={handleLogout}>
          <LogOut size={14} strokeWidth={2} /> Çıxış
        </button>
      </div>
    </aside>
  );
}
