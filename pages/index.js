<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MARS Talent Wise</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%2316233F'/%3E%3Cpath d='M15.5 45V22.5L26 35.5L36.5 22.5L47.5 13.5' fill='none' stroke='%234CC3F5' stroke-width='5.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='47' cy='44' r='3.4' fill='%23FFC53A'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #EEF1F6;
    --surface: #FFFFFF;
    --ink: #16233F;
    --ink-2: #4A5A78;
    --ink-3: #7A879F;
    --line: #D9DFEA;
    --blue: #1E7FCB;
    --sky: #D6E9F4;
    --seg-lms: #2F74B8;
    --seg-tracker: #3DB449;
    --seg-recruit: #FFC53A;
    --seg-ai: #F59E2B;
    --font: "Onest", "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
    box-sizing: border-box;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  *, *::before, *::after { box-sizing: inherit; }
  html { height: 100%; scroll-padding-top: env(safe-area-inset-top, 0px); }
  body {
    margin: 0; min-height: 100%;
    background: var(--bg); color: var(--ink);
    font-family: var(--font); font-size: 16px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }
  :focus-visible { outline: 3px solid var(--blue); outline-offset: 3px; border-radius: 8px; }

  /* ---------- Shell ---------- */
  .app { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
  .rail {
    position: sticky; top: 0; height: 100vh;
    display: flex; flex-direction: column;
    padding: 36px 28px 28px 32px;
    border-right: 1px solid var(--line);
  }
  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .brand svg { width: 46px; height: 46px; flex: none; }
  .wordmark { display: flex; flex-direction: column; line-height: 1.05; }
  .wordmark b { font-size: 21px; font-weight: 800; letter-spacing: .06em; }
  .wordmark span { font-size: 14px; font-weight: 500; color: var(--blue); margin-top: 3px; }

  .nav { margin-top: 48px; display: flex; flex-direction: column; gap: 2px; }
  .nav a {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 12px;
    text-decoration: none; color: var(--ink-2); font-weight: 500; font-size: 15px; white-space: nowrap;
  }
  .nav a:hover { background: rgba(22,35,63,.05); color: var(--ink); }
  .nav a[aria-current="page"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 0 var(--line); }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; background: var(--c, var(--ink-3)); }
  .nav .soon { margin-left: auto; font-size: 12px; color: var(--ink-3); font-weight: 500; }

  .rail-foot { margin-top: auto; font-size: 13px; color: var(--ink-3); }
  .rail-foot strong { display: block; color: var(--ink-2); font-weight: 600; }

  .topbar { display: none; }
  #view:focus { outline: none; }
  main { min-width: 0; padding: 32px clamp(24px, 5vw, 88px) 48px; }
  .langbar { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .lang { display: flex; gap: 6px; }
  .lang button {
    font: inherit; font-size: 14px; font-weight: 600; min-width: 50px;
    padding: 7px 12px; border-radius: 10px; cursor: pointer;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
  }
  .lang button:hover { border-color: var(--ink-3); color: var(--ink); }
  .lang button[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
  .topbar .lang { display: none; }

  /* ---------- Home ---------- */
  .hero { max-width: 900px; }
  .hero h1 {
    margin: 0; font-weight: 500; letter-spacing: -.02em;
    font-size: clamp(34px, 5vw, 60px); line-height: 1.12;
  }
  .hero h1 mark {
    background: var(--sky); color: inherit;
    padding: 0 .18em; border-radius: 10px;
    -webkit-box-decoration-break: clone; box-decoration-break: clone;
  }
  .hero p { margin: 22px 0 0; max-width: 56ch; font-size: 18px; color: var(--ink-2); }

  .capsule {
    margin-top: 52px;
    display: flex; height: clamp(300px, 42vh, 400px);
    border-radius: 999px; overflow: hidden;
    background: var(--ink);
  }
  .seg {
    flex: 1 1 0; position: relative;
    display: flex; flex-direction: column; justify-content: center;
    padding: 32px 28px; text-decoration: none;
    background: var(--c); color: var(--t, var(--ink));
    transition: flex-grow .45s cubic-bezier(.2,.7,.2,1);
  }
  .seg:first-child { padding-left: clamp(48px, 6vw, 88px); }
  .seg:last-child  { padding-right: clamp(48px, 6vw, 88px); }
  .capsule:hover .seg:hover, .seg:focus-visible { flex-grow: 1.45; }
  .seg:focus-visible { outline: 3px solid var(--ink); outline-offset: -6px; border-radius: 0; }
  .seg svg { width: 44px; height: 44px; margin-bottom: 20px; }
  .seg h2 { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.2; letter-spacing: -.01em; }
  .seg p { margin: 8px 0 0; font-size: 14.5px; opacity: .85; max-width: 24ch; min-height: 4.5em; }
  .seg h2 { min-height: 2.4em; display: flex; align-items: flex-end; }
  .seg .state {
    margin-top: 18px; align-self: flex-start;
    font-size: 13px; font-weight: 600;
    padding: 5px 12px; border-radius: 999px;
    background: rgba(255,255,255,.28); white-space: nowrap;
  }
  .seg[data-empty] .state { background: rgba(22,35,63,.12); }

  .below {
    margin-top: 44px; display: grid; gap: 32px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    max-width: 1100px; color: var(--ink-2); font-size: 15px;
  }
  .below h3 { margin: 0 0 6px; font-size: 15px; color: var(--ink); font-weight: 600; }
  .below p { margin: 0; }

  /* ---------- Module window ---------- */
  .module { display: flex; flex-direction: column; height: calc(100vh - 150px); min-height: 520px; }
  .module-head { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
  .module-head .badge {
    width: 52px; height: 52px; border-radius: 16px; flex: none;
    display: grid; place-items: center;
    background: var(--c); color: var(--t, var(--ink));
  }
  .module-head .badge svg { width: 28px; height: 28px; }
  .module-head h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -.015em; line-height: 1.2; }
  .module-head p { margin: 2px 0 0; color: var(--ink-2); font-size: 15px; }
  .actions { margin-left: auto; display: flex; gap: 10px; }
  .btn {
    font: inherit; font-size: 14px; font-weight: 600;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink);
    text-decoration: none;
  }
  .btn:hover { border-color: var(--ink-3); }
  .btn.primary { background: var(--ink); border-color: var(--ink); color: #fff; }
  .btn.primary:hover { background: #22345C; }
  .btn svg { width: 16px; height: 16px; }

  .window {
    flex: 1; position: relative; overflow: hidden;
    background: var(--surface); border-radius: 28px;
    border: 1px solid var(--line);
  }
  .window::before {
    content: ""; position: absolute; inset: 0 0 auto 0; height: 6px; background: var(--c); z-index: 1;
  }
  .window iframe { position: absolute; inset: 6px 0 0 0; width: 100%; height: calc(100% - 6px); border: 0; }
  .panel {
    height: 100%; display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
    padding: 48px clamp(28px, 6vw, 80px);
  }
  .panel h2 { margin: 0; font-size: clamp(24px, 3vw, 34px); font-weight: 600; letter-spacing: -.015em; line-height: 1.2; max-width: 22ch; }
  .panel p { margin: 14px 0 28px; color: var(--ink-2); max-width: 52ch; font-size: 16.5px; }
  .panel .shape { width: 120px; height: 44px; border-radius: 999px; background: var(--c); margin-bottom: 32px; opacity: .9; }
  .loading {
    position: absolute; inset: 6px 0 0 0; display: grid; place-items: center;
    color: var(--ink-3); font-size: 14px; background: var(--surface);
  }

  footer { margin-top: 56px; font-size: 13px; color: var(--ink-3); display: flex; gap: 20px; flex-wrap: wrap; }

  /* ---------- Responsive ---------- */
  @media (max-width: 1100px) {
    .seg p { display: none; }
  }
  @media (max-width: 900px) {
    .app { grid-template-columns: 1fr; }
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
      padding: 14px 20px; background: rgba(238,241,246,.92);
      backdrop-filter: blur(8px); border-bottom: 1px solid var(--line);
    }
    .topbar .brand svg { width: 38px; height: 38px; }
    .menu-btn {
      font: inherit; border: 1px solid var(--line); background: var(--surface);
      border-radius: 12px; width: 44px; height: 44px; display: grid; place-items: center; cursor: pointer; color: var(--ink);
    }
    .rail {
      position: fixed; z-index: 30; inset: 0 auto 0 0; width: min(300px, 86vw); height: 100%;
      background: var(--bg); transform: translateX(-100%); transition: transform .3s ease;
      padding-top: calc(28px + env(safe-area-inset-top, 0px));
      box-shadow: 8px 0 40px rgba(22,35,63,.18);
    }
    .rail.open { transform: none; }
    .scrim { position: fixed; inset: 0; z-index: 25; background: rgba(22,35,63,.35); }
    main { padding: 28px 20px 40px; }
    .langbar { display: none; }
    .topbar .lang { display: flex; }
    .topbar .lang button { min-width: 0; padding: 6px 9px; font-size: 13px; }
    .top-right { display: flex; align-items: center; gap: 10px; }
    .capsule { flex-direction: column; height: auto; border-radius: 36px; }
    .seg, .seg:first-child, .seg:last-child { padding: 24px 28px; flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; }
    .seg svg { margin: 0; width: 36px; height: 36px; }
    .seg h2, .seg p { min-height: 0; }
    .seg .text { flex: 1; min-width: 0; }
    .seg .state { margin: 0; }
    .capsule:hover .seg:hover, .seg:focus-visible { flex-grow: 1; }
    .module { height: calc(100vh - 150px); }
    .actions { margin-left: 0; width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="mtw-grad" x1="12" y1="48" x2="52" y2="12" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1E6FC0"/><stop offset="1" stop-color="#4CC3F5"/>
    </linearGradient>
    <symbol id="mtw-mark" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#16233F"/>
      <path d="M9 50.5C22 57 40 55.5 55 43" fill="none" stroke="#4CC3F5" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M15.5 45V22.5L26 35.5L36.5 22.5L47.5 13.5" fill="none" stroke="url(#mtw-grad)" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M40.5 12.5H48.5V20.5" fill="none" stroke="#4CC3F5" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="47" cy="44" r="3.4" fill="#FFC53A"/>
    </symbol>
  </defs>
</svg>

<header class="topbar">
  <a class="brand" href="#/">
    <svg aria-hidden="true"><use href="#mtw-mark"/></svg>
    <span class="wordmark"><b>MARS</b><span>Talent Wise</span></span>
  </a>
  <div class="top-right">
    <div class="lang" data-lang-switch></div>
    <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="rail">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>
</header>

<div class="app">
  <aside class="rail" id="rail">
    <a class="brand" href="#/" aria-label="MARS Talent Wise">
      <svg aria-hidden="true"><use href="#mtw-mark"/></svg>
      <span class="wordmark"><b>MARS</b><span>Talent Wise</span></span>
    </a>
    <nav class="nav" id="nav"></nav>
    <div class="rail-foot">
      <strong id="footTeam"></strong>
      Mars Overseas Baku LTD
    </div>
  </aside>
  <main>
    <div class="langbar"><div class="lang" data-lang-switch></div></div>
    <div id="view" tabindex="-1"></div>
  </main>
</div>

<script>
/* =========================================================
   MODULE SETTINGS — edit this list to add or change tools.
   url:  the tool's address ("" = not ready yet)
   mode: "embed"  -> shows the tool inside the portal window
         "launch" -> opens in a new tab (use for SharePoint /
                     Microsoft 365, which block embedding)
   name / short / desc: text in English (en), Azerbaijani (az), Russian (ru)
   ========================================================= */
const MODULES = [
  {
    id: "lms",
    url: "https://marsoverseasltd.sharepoint.com/sites/MARSOVERSEASSKLLSUP/SitePages/LearnHome.aspx",
    mode: "launch",
    color: "var(--seg-lms)", text: "#FFFFFF",
    name:  { en: "Learning (LMS)", az: "Təlim (LMS)", ru: "Обучение (LMS)" },
    short: { en: "Learning", az: "Təlim", ru: "Обучение" },
    desc:  { en: "Courses, learning paths and certificates",
             az: "Kurslar, təlim proqramları və sertifikatlar",
             ru: "Курсы, учебные программы и сертификаты" },
    icon: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/><path d="M9 8h7M9 11.5h5"/>'
  },
  {
    id: "tracker",
    url: "https://telim-tracker-v2.vercel.app/",
    mode: "embed",
    color: "var(--seg-tracker)", text: "var(--ink)",
    name:  { en: "Training Tracker", az: "Təlim İzləyicisi", ru: "Трекер обучения" },
    short: { en: "Training tracker", az: "Təlim izləyicisi", ru: "Трекер обучения" },
    desc:  { en: "Development plans and training records for every employee",
             az: "Hər əməkdaş üçün inkişaf planları və təlim qeydləri",
             ru: "Планы развития и история обучения сотрудников" },
    icon: '<path d="M3 20h18"/><path d="M6 16v-4M11 16V8M16 16v-6"/><path d="m14 5 3 3 4-5"/>'
  },
  {
    id: "recruitment",
    url: "https://script.google.com/macros/s/AKfycbxHPJBd5Bi457BiOVE-CN-xr9gnHrM9kSvjvhzMfj2dXKguE5ldceBFK9mBQGsM_GU0_g/exec",
    mode: "embed",
    color: "var(--seg-recruit)", text: "var(--ink)",
    name:  { en: "Recruitment", az: "İşə qəbul", ru: "Подбор персонала" },
    short: { en: "Recruitment", az: "İşə qəbul", ru: "Подбор" },
    desc:  { en: "Vacancies, candidates and hiring stages",
             az: "Vakansiyalar, namizədlər və işə qəbul mərhələləri",
             ru: "Вакансии, кандидаты и этапы найма" },
    icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>'
  },
  {
    id: "ai",
    url: "",
    mode: "embed",
    color: "var(--seg-ai)", text: "var(--ink)",
    name:  { en: "AI Assistant", az: "Sİ köməkçisi", ru: "ИИ-ассистент" },
    short: { en: "AI assistant", az: "Sİ köməkçisi", ru: "ИИ-ассистент" },
    desc:  { en: "Ask HR and learning questions, get instant answers",
             az: "HR və təlim sualları verin, dərhal cavab alın",
             ru: "Вопросы по HR и обучению с мгновенными ответами" },
    icon: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="m12 7.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"/>'
  }
];

/* ---------- Interface text ---------- */
const LANGS = [
  { code: "en", label: "en",  html: "en" },
  { code: "az", label: "aze", html: "az" },
  { code: "ru", label: "рус", html: "ru" }
];

const T = {
  en: {
    home: "Home", soon: "Soon", comingSoon: "Coming soon", open: "Open", sharepoint: "SharePoint",
    team: "Learning & Development", menu: "Open menu", back: "Back to home",
    heroMark: "Every skill", heroRest: " you grow at Mars Overseas, in one place",
    heroText: "Take courses, follow your training plan, manage hiring and get quick answers from our AI assistant — all from MARS Talent Wise.",
    b1t: "New to the platform?", b1: "Start with Learning to see the courses assigned to you, then check your plan in the Training Tracker.",
    b2t: "Managers", b2: "Use the Training Tracker to follow your team's progress and Recruitment to follow open vacancies.",
    b3t: "Need help?", b3: "Contact the Learning & Development team at Mars Overseas.",
    reload: "Reload", newTab: "Open in new tab", loading: "Loading…",
    emptyTitle: n => `${n} is being set up`,
    emptyText: "This tool will open here as soon as it is ready. Until then, contact the Learning & Development team with any questions.",
    launchTitle: "Your courses open in SharePoint",
    launchText: "Microsoft 365 keeps the LMS in its own secure tab. Sign in with your Mars Overseas account if asked, then keep this portal open to come back to your other tools.",
    launchBtn: "Open the LMS", backHome: "Back to home"
  },
  az: {
    home: "Ana səhifə", soon: "Tezliklə", comingSoon: "Tezliklə", open: "Aç", sharepoint: "SharePoint",
    team: "Təlim və İnkişaf", menu: "Menyunu aç", back: "Ana səhifəyə qayıt",
    heroMark: "İnkişafınız üçün", heroRest: " hər şey bir yerdə",
    heroText: "Kurslar keçin, təlim planınızı izləyin, işə qəbulu idarə edin və Sİ köməkçisindən sürətli cavablar alın — hamısı MARS Talent Wise-da.",
    b1t: "Platformada yenisiniz?", b1: "Sizə təyin olunmuş kursları görmək üçün Təlim bölməsindən başlayın, sonra planınızı Təlim İzləyicisində yoxlayın.",
    b2t: "Rəhbərlər üçün", b2: "Komandanızın irəliləyişini Təlim İzləyicisində, açıq vakansiyaları isə İşə qəbul bölməsində izləyin.",
    b3t: "Kömək lazımdır?", b3: "Mars Overseas Təlim və İnkişaf komandası ilə əlaqə saxlayın.",
    reload: "Yenilə", newTab: "Yeni tabda aç", loading: "Yüklənir…",
    emptyTitle: n => `${n} bölməsi hazırlanır`,
    emptyText: "Bu alət hazır olan kimi burada açılacaq. Hələlik suallarınız üçün Təlim və İnkişaf komandası ilə əlaqə saxlayın.",
    launchTitle: "Kurslarınız SharePoint-də açılır",
    launchText: "Microsoft 365 LMS-i ayrıca təhlükəsiz tabda açır. Tələb olunarsa, Mars Overseas hesabınızla daxil olun və digər alətlərə qayıtmaq üçün bu portalı açıq saxlayın.",
    launchBtn: "LMS-i aç", backHome: "Ana səhifəyə qayıt"
  },
  ru: {
    home: "Главная", soon: "Скоро", comingSoon: "Скоро", open: "Открыть", sharepoint: "SharePoint",
    team: "Обучение и развитие", menu: "Открыть меню", back: "На главную",
    heroMark: "Всё для вашего развития", heroRest: " в одном месте",
    heroText: "Проходите курсы, следите за планом обучения, управляйте подбором и получайте быстрые ответы от ИИ-ассистента — всё в MARS Talent Wise.",
    b1t: "Впервые на платформе?", b1: "Начните с раздела «Обучение», чтобы увидеть назначенные вам курсы, затем проверьте свой план в трекере обучения.",
    b2t: "Руководителям", b2: "Следите за прогрессом команды в трекере обучения, а за открытыми вакансиями — в разделе «Подбор персонала».",
    b3t: "Нужна помощь?", b3: "Обратитесь в команду обучения и развития Mars Overseas.",
    reload: "Обновить", newTab: "Открыть в новой вкладке", loading: "Загрузка…",
    emptyTitle: n => `Раздел «${n}» готовится`,
    emptyText: "Инструмент откроется здесь, как только будет готов. Пока по всем вопросам обращайтесь в команду обучения и развития.",
    launchTitle: "Ваши курсы открываются в SharePoint",
    launchText: "Microsoft 365 открывает LMS в отдельной защищённой вкладке. При необходимости войдите в учётную запись Mars Overseas и не закрывайте портал, чтобы вернуться к другим инструментам.",
    launchBtn: "Открыть LMS", backHome: "На главную"
  }
};

/* ---------- Language choice (remembered in this browser) ---------- */
function initialLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && T[q]) return q;
  try { const saved = localStorage.getItem("mtw-lang"); if (saved && T[saved]) return saved; } catch (e) {}
  const b = (navigator.language || "").slice(0, 2);
  return T[b] ? b : "en";
}
let lang = initialLang();
const t = key => T[lang][key];
const L = obj => obj[lang] || obj.en;

function setLang(code) {
  lang = code;
  try { localStorage.setItem("mtw-lang", code); } catch (e) {}
  route();
}

function renderLangSwitch() {
  document.documentElement.lang = LANGS.find(x => x.code === lang).html;
  document.querySelectorAll("[data-lang-switch]").forEach(box => {
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Language");
    box.innerHTML = LANGS.map(x =>
      `<button type="button" data-code="${x.code}" aria-pressed="${x.code === lang}" lang="${x.html}">${x.label}</button>`
    ).join("");
    box.querySelectorAll("button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.code)));
  });
  document.getElementById("footTeam").textContent = t("team");
  menuBtn.setAttribute("aria-label", t("menu"));
}

/* ---------- Icons ---------- */
const icon = (paths, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON_EXT = '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>';
const ICON_RELOAD = '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>';
const ICON_BACK = '<path d="M15 5l-7 7 7 7"/>';

const view = document.getElementById("view");
const nav = document.getElementById("nav");
const rail = document.getElementById("rail");
const menuBtn = document.getElementById("menuBtn");

function stateLabel(m) {
  if (!m.url) return t("comingSoon");
  return m.mode === "launch" ? t("sharepoint") : t("open");
}

function renderNav(active) {
  const home = `<a href="#/" ${active === "home" ? 'aria-current="page"' : ""}><span class="dot" style="--c:var(--ink)"></span>${t("home")}</a>`;
  nav.innerHTML = home + MODULES.map(m => `
    <a href="#/${m.id}" ${active === m.id ? 'aria-current="page"' : ""}>
      <span class="dot" style="--c:${m.color}"></span>${L(m.short)}
      ${m.url ? "" : `<span class="soon">${t("soon")}</span>`}
    </a>`).join("");
}

function renderHome() {
  document.title = "MARS Talent Wise";
  view.innerHTML = `
    <section class="hero">
      <h1><mark>${t("heroMark")}</mark>${t("heroRest")}</h1>
      <p>${t("heroText")}</p>
    </section>

    <div class="capsule" role="list">
      ${MODULES.map(m => `
        <a class="seg" role="listitem" href="#/${m.id}" style="--c:${m.color};--t:${m.text}" ${m.url ? "" : "data-empty"}>
          ${icon(m.icon, 44)}
          <div class="text">
            <h2>${L(m.name)}</h2>
            <p>${L(m.desc)}</p>
          </div>
          <span class="state">${stateLabel(m)}</span>
        </a>`).join("")}
    </div>

    <div class="below">
      <div><h3>${t("b1t")}</h3><p>${t("b1")}</p></div>
      <div><h3>${t("b2t")}</h3><p>${t("b2")}</p></div>
      <div><h3>${t("b3t")}</h3><p>${t("b3")}</p></div>
    </div>

    <footer><span>© ${new Date().getFullYear()} Mars Overseas Baku LTD</span><span>MARS Talent Wise</span></footer>`;
}

function renderModule(m) {
  const name = L(m.name);
  document.title = `${name} | MARS Talent Wise`;
  const head = `
    <div class="module-head">
      <a class="btn" href="#/" aria-label="${t("back")}">${icon(ICON_BACK, 16)}</a>
      <div class="badge" style="--c:${m.color};--t:${m.text}">${icon(m.icon, 28)}</div>
      <div><h1>${name}</h1><p>${L(m.desc)}</p></div>
      ${m.url ? `<div class="actions">
        ${m.mode === "embed" ? `<button class="btn" id="reloadBtn">${icon(ICON_RELOAD, 16)}${t("reload")}</button>` : ""}
        <a class="btn" href="${m.url}" target="_blank" rel="noopener">${icon(ICON_EXT, 16)}${t("newTab")}</a>
      </div>` : ""}
    </div>`;

  let body;
  if (!m.url) {
    body = `<div class="panel">
      <div class="shape"></div>
      <h2>${T[lang].emptyTitle(name)}</h2>
      <p>${t("emptyText")}</p>
      <a class="btn" href="#/">${t("backHome")}</a>
    </div>`;
  } else if (m.mode === "launch") {
    body = `<div class="panel">
      <div class="shape"></div>
      <h2>${t("launchTitle")}</h2>
      <p>${t("launchText")}</p>
      <a class="btn primary" href="${m.url}" target="_blank" rel="noopener">${icon(ICON_EXT, 16)}${t("launchBtn")}</a>
    </div>`;
  } else {
    body = `<div class="loading" id="loading">${t("loading")}</div>
      <iframe id="frame" src="${m.url}" title="${name}" allow="clipboard-write; microphone; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }

  view.innerHTML = `<section class="module">${head}<div class="window" style="--c:${m.color}">${body}</div></section>`;

  const frame = document.getElementById("frame");
  if (frame) {
    frame.addEventListener("load", () => document.getElementById("loading")?.remove());
    document.getElementById("reloadBtn")?.addEventListener("click", () => { frame.src = m.url; });
  }
}

function route() {
  const id = location.hash.replace(/^#\/?/, "") || "home";
  const m = MODULES.find(x => x.id === id);
  renderLangSwitch();
  if (m) renderModule(m); else renderHome();
  renderNav(m ? m.id : "home");
  closeMenu();
}

/* Mobile menu */
let scrim;
function openMenu() {
  rail.classList.add("open"); menuBtn.setAttribute("aria-expanded", "true");
  scrim = document.createElement("div"); scrim.className = "scrim";
  scrim.addEventListener("click", closeMenu); document.body.appendChild(scrim);
}
function closeMenu() {
  rail.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false");
  scrim?.remove(); scrim = null;
}
menuBtn.addEventListener("click", () => rail.classList.contains("open") ? closeMenu() : openMenu());
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

window.addEventListener("hashchange", () => { route(); view.focus({ preventScroll: true }); window.scrollTo(0, 0); });
route();
</script>
</body>
</html>
