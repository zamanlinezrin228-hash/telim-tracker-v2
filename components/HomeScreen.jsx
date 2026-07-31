export default function HomeScreen({ profile, team, setView }) {
  const hasTeam = team && team.length > 0;

  const cards = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      desc: 'Ümumi mənzərə — təlim sayı, büdcə, status və departament üzrə analiz.',
      icon: '📊',
      accent: '#2563eb',
      iconBg: 'radial-gradient(circle at 30% 30%, #93c5fd, #2563eb)',
      linkLabel: 'Analizə bax',
    },
    {
      key: 'tracking',
      title: 'İzləmə Cədvəli',
      desc: 'Bütün təlimlərin təfərrüatlı siyahısı — filtrlə, axtar, Excel-ə ixrac et.',
      icon: '📋',
      accent: '#059669',
      iconBg: 'radial-gradient(circle at 30% 30%, #6ee7b7, #059669)',
      linkLabel: 'Cədvələ keç',
    },
    {
      key: 'requests',
      title: 'Təlim Sorğuları',
      desc: hasTeam
        ? 'Yeni sorğu göndər, komandanın sorğularına bax və qərar ver.'
        : 'Öz təlim ehtiyacın üçün sorğu göndər və statusunu izlə.',
      icon: '📝',
      accent: '#d97706',
      iconBg: 'radial-gradient(circle at 30% 30%, #fcd34d, #d97706)',
      linkLabel: 'Sorğu göndər',
    },
  ];

  return (
    <div>
      <div className="hero" style={{ padding: '56px 32px 72px' }}>
        <h1 style={{ marginBottom: 8 }}>Xoş gəldiniz, {profile.full_name_az || ''}</h1>
        <p>Nə etmək istəyirsiniz? Aşağıdan seçin.</p>
      </div>

      <div className="page" style={{ maxWidth: 1000, margin: '-40px auto 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 22 }}>
          {cards.map((c) => (
            <button
              key={c.key}
              onClick={() => setView(c.key)}
              style={{
                textAlign: 'left', cursor: 'pointer', border: 'none',
                background: '#fff', borderRadius: 18, padding: 20,
                boxShadow: '0 4px 14px rgba(11,37,69,0.10)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 30px rgba(11,37,69,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(11,37,69,0.10)'; }}
            >
              <div style={{
                background: '#f1f5f9', borderRadius: 14, height: 130,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
              }}>
                <div style={{
                  width: 76, height: 76, borderRadius: '50%', background: c.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 34, boxShadow: `0 8px 18px ${c.accent}40`,
                }}>
                  {c.icon}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0b2545', marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, marginBottom: 18, flex: 1 }}>{c.desc}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
                {c.linkLabel} <span style={{ fontSize: 16 }}>→</span>
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
