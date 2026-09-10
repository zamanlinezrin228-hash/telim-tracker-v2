export default function HomeScreen({ profile, team, setView, tnaWindowOpen, planYear }) {
  const hasTeam = team && team.length > 0;

  const cards = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      desc: 'Ümumi mənzərə — təlim sayı, büdcə, status və departament üzrə analiz.',
      icon: '📊',
      accent: '#2563eb',
      bg: '#eff6ff',
      linkLabel: 'Analizə bax',
    },
    {
      key: 'tracking',
      title: 'İzləmə Cədvəli',
      desc: 'Bütün təlimlərin təfərrüatlı siyahısı — filtrlə, axtar, Excel-ə ixrac et.',
      icon: '📋',
      accent: '#059669',
      bg: '#f0fdf4',
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
      bg: '#fffbeb',
      linkLabel: 'Sorğu göndər',
    },
  ];

  if (hasTeam && (tnaWindowOpen || profile.role === 'ld')) {
    cards.push({
      key: 'annual-tna',
      title: `İllik TNA — ${planYear}`,
      desc: tnaWindowOpen
        ? 'Komandanızın illik təlim ehtiyaclarını cədvəl formasında doldurun.'
        : 'Pəncərə hazırda bağlıdır (yalnız L&D test məqsədilə görür).',
      icon: '🗓️',
      accent: '#dc2626',
      bg: '#fef2f2',
      linkLabel: 'Formu doldur',
    });
  }

  return (
    <div>
      <div className="home-hero">
        <h1>Xoş gəldiniz, {profile.full_name_az || ''}</h1>
        <p>Nə etmək istəyirsiniz? Aşağıdan seçin.</p>
      </div>

      <div className="page" style={{ maxWidth: 1040 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 12 }}>
          {cards.map((c, i) => (
            <button key={c.key} className="home-card stagger-item" style={{ '--i': i }} onClick={() => setView(c.key)}>
              <div className="home-card-icon" style={{ background: c.bg, color: c.accent }}>
                {c.icon}
              </div>
              <div className="home-card-title">{c.title}</div>
              <div className="home-card-desc">{c.desc}</div>
              <div className="home-card-link" style={{ color: c.accent }}>
                {c.linkLabel} <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
