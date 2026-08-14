import { useState } from 'react';
import { sb } from '../lib/supabase';

export default function LoginScreen({ onLoggedIn, onShowSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(''); setInfo('');
    setLoading(true);
    const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) { setError('Email və ya parol yanlışdır.'); return; }
    await onLoggedIn();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  async function handleForgotPassword() {
    setError(''); setInfo('');
    if (!email.trim()) { setError('Əvvəlcə email daxil edin.'); return; }
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (err) { setError('Xəta baş verdi, yenidən cəhd edin.'); return; }
    setInfo('Parol bərpa linki emailinizə göndərildi.');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg,#0b2545 0%,#13315c 45%,#2f9bd6 100%)' }}>
      <div className="card" style={{ width: 360, padding: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>Təlim Tracker</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 22, textAlign: 'center' }}>Daxil olun</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 5 }}>Email</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12.5, color: '#64748b', display: 'block', marginBottom: 5 }}>Parol</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ width: '100%', paddingRight: 70 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#2563eb', fontSize: 12.5, cursor: 'pointer', fontWeight: 600 }}
            >
              {showPw ? 'Gizlət' : 'Göstər'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginBottom: 18 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }} style={{ fontSize: 12.5, color: '#2563eb', textDecoration: 'none' }}>
            Parolu unutmusunuz?
          </a>
        </div>

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {loading ? 'Daxil olunur...' : 'Daxil ol'}
        </button>

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</div>}
        {info && <div style={{ color: '#059669', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{info}</div>}

        <div style={{ textAlign: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Hesabınız yoxdur? </span>
          <button
            onClick={onShowSignup}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            Qeydiyyatdan keçin
          </button>
        </div>
      </div>
    </div>
  );
}
