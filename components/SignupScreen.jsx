import { useState, useEffect, useMemo } from 'react';
import { sb } from '../lib/supabase';

export default function SignupScreen({ onSignedUp, onBackToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dept, setDept] = useState('');
  const [sube, setSube] = useState('');
  const [position, setPosition] = useState('');
  const [managerId, setManagerId] = useState('');
  const [directory, setDirectory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sb.from('directory').select('*').then(({ data }) => {
      if (data) setDirectory(data.sort((a, b) => (a.full_name_az || '').localeCompare(b.full_name_az || '')));
    });
  }, []);

  // Mövcud işçilərin dept/sube dəyərlərindən dəqiq siyahı çıxarırıq —
  // beləliklə yeni işçi yalnız artıq sistemdə olan adları seçə bilər,
  // yeni yazılış fərqi (məs. "Marketinq" / "marketinq") yaranmır.
  const deptOptions = useMemo(() => {
    return [...new Set(directory.map((d) => d.dept).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [directory]);

  const subeOptions = useMemo(() => {
    if (!dept) return [];
    return [...new Set(directory.filter((d) => d.dept === dept).map((d) => d.sube).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [directory, dept]);

  // Departament dəyişəndə əvvəlki seçilmiş Şöbə artıq uyğun olmaya bilər — sıfırlayırıq
  function handleDeptChange(value) {
    setDept(value);
    setSube('');
  }

  async function handleSignup() {
    setError('');
    if (!fullName.trim() || !email.trim() || !password.trim() || !dept.trim() || !position.trim()) {
      setError('Ulduzlu (*) sahələri doldurun.');
      return;
    }
    setLoading(true);

    const { data, error: signErr } = await sb.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (signErr) { setError('Xəta: ' + signErr.message); setLoading(false); return; }
    if (!data.session) {
      setError('Qeydiyyat tamamlandı, amma sessiya açılmadı. Zəhmət olmasa Supabase-də "Confirm email" söndürülüb yoxlayın.');
      setLoading(false);
      return;
    }

    const { error: updErr } = await sb.from('profiles').update({
      dept: dept.trim(), sube: sube.trim() || null, position: position.trim(),
      manager_id: managerId || null, role: 'employee',
    }).eq('id', data.user.id);

    setLoading(false);
    if (updErr) { setError('Profil tamamlanmadı: ' + updErr.message); return; }
    onSignedUp();
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="mark">🎓</div>
        <h1>Yeni əməkdaş olaraq qoşulun</h1>
        <p>Bir neçə sahəni doldurun — sistem sizi departamentiniz və birbaşa rəhbəriniz üzrə avtomatik təşkil edəcək.</p>
        <ul>
          <li><span className="dot">✅</span> Mövcud direktoriyadan dəqiq departament/şöbə seçimi</li>
          <li><span className="dot">🔒</span> Yalnız rəhbərinizə və L&D-yə görünən sorğu axını</li>
          <li><span className="dot">⚡</span> Qeydiyyatdan sonra dərhal istifadəyə hazır</li>
        </ul>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card" style={{ maxWidth: 400 }}>
          <div className="auth-form-title">Qeydiyyat</div>
          <div className="auth-form-sub">Yeni hesab yaradın</div>

          <div className="auth-field">
            <label>Ad Soyad *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>Email *</label>
            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad.soyad@totalbeverage.group" />
          </div>
          <div className="auth-field">
            <label>Parol *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="auth-field">
            <label>Departament *</label>
            <select value={dept} onChange={(e) => handleDeptChange(e.target.value)}>
              <option value="">— Seçin —</option>
              {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label>Şöbə</label>
            <select value={sube} onChange={(e) => setSube(e.target.value)} disabled={!dept || subeOptions.length === 0}>
              <option value="">{dept && subeOptions.length === 0 ? '— Bu departamentdə şöbə yoxdur —' : '— Seçin —'}</option>
              {subeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label>Vəzifə *</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div className="auth-field" style={{ marginBottom: 18 }}>
            <label>Birbaşa rəhbər</label>
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— Seçin —</option>
              {directory.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name_az} ({d.dept}{d.sube ? ' / ' + d.sube : ''})</option>
              ))}
            </select>
          </div>

          {error && <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary btn-block" onClick={handleSignup} disabled={loading} style={{ marginBottom: 10 }}>
            {loading ? 'Qeydiyyat aparılır...' : 'Qeydiyyatdan keç'}
          </button>
          <button onClick={onBackToLogin} className="btn btn-ghost btn-block">
            Artıq hesabım var, daxil ol
          </button>
        </div>
      </div>
    </div>
  );
}
