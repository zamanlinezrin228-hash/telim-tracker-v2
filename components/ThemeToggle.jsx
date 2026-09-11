import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

function getStored() {
  try { return localStorage.getItem('theme'); } catch (e) { return null; }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    setTheme(getStored() || 'auto');
  }, []);

  function apply(next) {
    setTheme(next);
    try {
      if (next === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch (e) {}
    if (next === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', next);
  }

  function toggle() {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    apply(isDark ? 'light' : 'dark');
  }

  if (theme === null) return <div className="theme-toggle" style={{ visibility: 'hidden' }} />;

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={isDark ? 'İşıqlı rejimə keç' : 'Qaranlıq rejimə keç'}
      aria-label={isDark ? 'İşıqlı rejimə keç' : 'Qaranlıq rejimə keç'}
    >
      {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
    </button>
  );
}
