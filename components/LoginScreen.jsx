import { useState } from 'react';
import { sb } from '../lib/supabase';

export default function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleLogin() {
    setError(''); setInfo('');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setError('Email və ya parol yanlışdır.'); return; }
    onLoggedIn();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email) { setError('Əvvəlcə email daxil edin.'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined });
    if (error) { setError('Xəta baş verdi, yenidən cəhd edin.'); return; }
    setInfo('Parol bərpa linki emailinizə göndərildi.');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg,#0b2545 0%,#13315c 45%,#2f9bd6 100%)' }}>
      <div className="card" style={{ width: 360, padding: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>Təlim Tracker</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 22, textAlign: 'center' }}>Mars Overseas — daxil olun</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 5 }}>Email</label>
          <input type="text" style={{ width: '100%' }} placeholder="email@marsoverseas.az"
            value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 5 }}>Parol</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} style={{ width: '100%', paddingRight: 70 }}
              value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
            <button type="button" onClick={() => setShowPw(s => !s)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#2563eb', fontSize: 12.5, cursor: 'pointer', fontWeight: 600 }}>
              {showPw ? 'Gizlət' : 'Göstər'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginBottom: 18 }}>
          <a href="#" onClick={handleForgotPassword} style={{ fontSize: 12.5, color: '#2563eb', textDecoration: 'none' }}>Parolu unutmusunuz?</a>
        </div>

        <button onClick={handleLogin} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          Daxil ol
        </button>

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</div>}
        {info && <div style={{ color: '#059669', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{info}</div>}
      </div>
    </div>
  );
}
