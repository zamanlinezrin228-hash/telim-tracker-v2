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
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="mark">🎓</div>
        <h1>Komandanızın təlim ehtiyaclarını bir platformada idarə edin</h1>
        <p>Təlim Tracker — illik TNA planlaması, sorğu axını və icra analitikası üçün vahid mərkəz.</p>
        <ul>
          <li><span className="dot">📊</span> Departament və büdcə üzrə real-vaxt analitika</li>
          <li><span className="dot">📝</span> Rəhbər → L&D təsdiq axını ilə sorğu idarəetməsi</li>
          <li><span className="dot">📋</span> Filtrlənə bilən izləmə cədvəli və Excel ixracı</li>
        </ul>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-title">Xoş gəlmisiniz</div>
          <div className="auth-form-sub">Hesabınıza daxil olun</div>

          <div className="auth-field">
            <label>Email</label>
            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
          </div>

          <div className="auth-field" style={{ marginBottom: 8 }}>
            <label>Parol</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ paddingRight: 72 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="btn-ghost"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 12.5, padding: '4px 6px' }}
              >
                {showPw ? 'Gizlət' : 'Göstər'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: 18 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }} style={{ fontSize: 12.5, color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
              Parolu unutmusunuz?
            </a>
          </div>

          <button className="btn btn-primary btn-block" onClick={handleLogin} disabled={loading}>
            {loading ? 'Daxil olunur...' : 'Daxil ol'}
          </button>

          {error && <div className="notice notice-error" style={{ marginTop: 12, textAlign: 'center' }}>{error}</div>}
          {info && <div className="notice notice-success" style={{ marginTop: 12, textAlign: 'center' }}>{info}</div>}

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>Hesabınız yoxdur? </span>
            <button onClick={onShowSignup} className="btn-ghost" style={{ fontSize: 13, fontWeight: 700 }}>
              Qeydiyyatdan keçin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
