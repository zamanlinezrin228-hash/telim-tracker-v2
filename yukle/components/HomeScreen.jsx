import { LayoutDashboard, ClipboardList, FileText, CalendarDays, UserSquare2, ArrowRight, Target } from 'lucide-react';

export default function HomeScreen({ profile, team, setView, tnaWindowOpen, planYear, canSeeDashboard, requestsNotifCount, tnaNotifCount, showAnnualTna }) {
  const hasTeam = team && team.length > 0;
  const isReviewer = profile.role === 'ld' || profile.role === 'hr';

  const cards = [];

  if (canSeeDashboard) {
    cards.push({
      key: 'dashboard',
      title: 'Dashboard',
      desc: 'Ümumi mənzərə — təlim sayı, büdcə, status və departament üzrə analiz.',
      Icon: LayoutDashboard,
      accent: '#2563eb',
      linkLabel: 'Analizə bax',
    });
  }

  cards.push(
    {
      key: 'tracking',
      title: 'İzləmə Cədvəli',
      desc: 'Bütün təlimlərin təfərrüatlı siyahısı — filtrlə, axtar, Excel-ə ixrac et.',
      Icon: ClipboardList,
      accent: '#059669',
      linkLabel: 'Cədvələ keç',
    },
    {
      key: 'requests',
      title: 'Təlim Sorğuları',
      desc: hasTeam
        ? 'Yeni sorğu göndər, komandanın sorğularına bax və qərar ver.'
        : 'Öz təlim ehtiyacın üçün sorğu göndər və statusunu izlə.',
      Icon: FileText,
      accent: '#d97706',
      linkLabel: 'Sorğu göndər',
      badge: requestsNotifCount,
    },
    {
      key: 'competency-map',
      title: 'Səriştə Xəritəsi',
      desc: 'Departament və vəzifə seçin — səriştələri, tələb olunan səviyyəni və kritikliyi görün.',
      Icon: Target,
      accent: '#0f766e',
      linkLabel: 'Xəritəyə bax',
    },
  );

  if (showAnnualTna ?? (tnaWindowOpen || profile.role === 'ld')) {
    cards.push({
      key: 'annual-tna',
      title: `İllik TNA — ${planYear}`,
      desc: tnaWindowOpen
        ? (hasTeam
            ? 'Öz təlim ehtiyacınızı və komandanızın ehtiyaclarını cədvəl formasında doldurun.'
            : 'Öz illik təlim ehtiyacınızı cədvəl formasında doldurun.')
        : (profile.role === 'ld'
            ? 'Pəncərə hazırda bağlıdır (yalnız L&D test məqsədilə görür).'
            : 'Komandanızın illik TNA sorğularını izləyin və qərar verin.'),
      Icon: CalendarDays,
      accent: '#dc2626',
      linkLabel: 'Formu doldur',
      badge: tnaNotifCount,
    });
  }

  if (isReviewer || hasTeam) {
    cards.push({
      key: 'idp',
      title: 'Fərdi İnkişaf Planı (IDP)',
      desc: hasTeam && !isReviewer
        ? 'Komanda üzvlərinizin təlim tarixçəsinə baxın və tamamlanmış təlimləri qiymətləndirin.'
        : 'Bir əməkdaşın bütün təlim sorğularını və nəticələrini vahid, çap edilə bilən sənəddə görün.',
      Icon: UserSquare2,
      accent: '#7c3aed',
      linkLabel: 'Plan yarat',
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
              <div className="home-card-icon" style={{ '--icon-color': c.accent, color: c.accent }}>
                <c.Icon size={22} strokeWidth={2} />
              </div>
              <div className="home-card-title">
                {c.title}
                {!!c.badge && <span className="home-card-badge">{c.badge > 99 ? '99+' : c.badge}</span>}
              </div>
              <div className="home-card-desc">{c.desc}</div>
              <div className="home-card-link" style={{ color: c.accent }}>
                {c.linkLabel} <ArrowRight size={15} strokeWidth={2.3} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
