import { useState, useEffect } from 'react';
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg,#0b2545 0%,#13315c 45%,#2f9bd6 100%)' }}>
      <div className="card" style={{ width: 420, padding: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>Qeydiyyat</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, textAlign: 'center' }}>Yeni hesab yaradın</div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Ad Soyad *</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Email *</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%' }} placeholder="ad.soyad@totalbeverage.group" />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Parol *</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Departament *</label>
          <input type="text" value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Şöbə</label>
          <input type="text" value={sube} onChange={(e) => setSube(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Vəzifə *</label>
          <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Birbaşa rəhbər</label>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} style={{ width: '100%' }}>
            <option value="">— Seçin —</option>
            {directory.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name_az} ({d.dept}{d.sube ? ' / ' + d.sube : ''})</option>
            ))}
          </select>
        </div>

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button onClick={handleSignup} disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
          {loading ? 'Qeydiyyat aparılır...' : 'Qeydiyyatdan keç'}
        </button>
        <button onClick={onBackToLogin} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13.5 }}>
          Artıq hesabım var, daxil ol
        </button>
      </div>
    </div>
  );
}
