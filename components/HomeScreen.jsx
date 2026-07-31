export default function HomeScreen({ profile, team, setView }) {
  const hasTeam = team && team.length > 0;
  const isReviewer = profile.role === 'hr' || profile.role === 'ld';

  const cards = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      desc: 'Ümumi mənzərə — təlim sayı, büdcə, status və departament üzrə analiz.',
      icon: '📊',
    },
    {
      key: 'tracking',
      title: 'İzləmə Cədvəli',
      desc: 'Bütün təlimlərin təfərrüatlı siyahısı — filtrlə, axtar, Excel-ə ixrac et.',
      icon: '📋',
    },
    {
      key: 'requests',
      title: 'Təlim Sorğuları',
      desc: hasTeam
        ? 'Yeni sorğu göndər, komandanın sorğularına bax və qərar ver.'
        : 'Öz təlim ehtiyacın üçün sorğu göndər və statusunu izlə.',
      icon: '📝',
    },
  ];

  return (
    <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', margin: '40px 0 36px' }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Xoş gəldiniz, {profile.full_name_az || ''}</div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
          Nə etmək istəyirsiniz? Aşağıdan seçin.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => setView(c.key)}
            className="card"
            style={{
              textAlign: 'left', cursor: 'pointer', border: 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(11,37,69,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: 30, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{c.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12.5, color: '#94a3b8' }}>
        İstənilən vaxt yuxarıdakı menyudan da naviqasiya edə bilərsiniz.
      </div>
    </div>
  );
}
