export default function HomeScreen({ profile, team, setView }) {
  const hasTeam = team && team.length > 0;

  const cards = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      desc: 'Ümumi mənzərə — təlim sayı, büdcə, status və departament üzrə analiz.',
      icon: '📊',
      accent: '#2563eb',
      bg: '#eff6ff',
    },
    {
      key: 'tracking',
      title: 'İzləmə Cədvəli',
      desc: 'Bütün təlimlərin təfərrüatlı siyahısı — filtrlə, axtar, Excel-ə ixrac et.',
      icon: '📋',
      accent: '#059669',
      bg: '#ecfdf5',
    },
    {
      key: 'requests',
      title: 'Təlim Sorğuları',
      desc: hasTeam
        ? 'Yeni sorğu göndər, komandanın sorğularına bax və qərar ver.'
        : 'Öz təlim ehtiyacın üçün sorğu göndər və statusunu izlə.',
      icon: '📝',
      accent: '#d97706',
      bg: '#fffbeb',
    },
  ];

  return (
    <div>
      <div className="hero" style={{ padding: '56px 32px 64px' }}>
        <h1 style={{ marginBottom: 8 }}>Xoş gəldiniz, {profile.full_name_az || ''}</h1>
        <p>Nə etmək istəyirsiniz? Aşağıdan seçin.</p>
      </div>

      <div className="page" style={{ maxWidth: 960, margin: '-32px auto 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {cards.map((c) => (
            <button
              key={c.key}
              onClick={() => setView(c.key)}
              style={{
                textAlign: 'left', cursor: 'pointer', border: 'none',
                background: '#fff', borderRadius: 16, padding: '26px 24px',
                boxShadow: '0 2px 8px rgba(11,37,69,0.08)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(11,37,69,0.14)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(11,37,69,0.08)'; }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, marginBottom: 14,
              }}>
                {c.icon}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0b2545' }}>{c.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, marginBottom: 14 }}>{c.desc}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
                Aç <span style={{ fontSize: 16 }}>→</span>
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 36, marginBottom: 40, textAlign: 'center', fontSize: 12.5, color: '#94a3b8' }}>
          İstənilən vaxt yuxarıdakı 🏠 işarəsinə basaraq bura qayıda bilərsiniz.
        </div>
      </div>
    </div>
  );
}
