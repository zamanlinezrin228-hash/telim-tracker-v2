import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const LANGS = [
  { code: 'az', label: 'AZ', flag: '🇦🇿' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
];

// Bütün mətnlər bura yığılır. Struktur: dict.KEY = { az: '...', en: '...', ru: '...' }
export const dict = {
  // ---- Ümumi / hər yerdə istifadə olunan sözlər ----
  app_name: { az: 'Təlim Tracker', en: 'Training Tracker', ru: 'Трекер обучения' },
  save: { az: 'Yadda saxla', en: 'Save', ru: 'Сохранить' },
  cancel: { az: 'Ləğv et', en: 'Cancel', ru: 'Отмена' },
  close: { az: 'Bağla', en: 'Close', ru: 'Закрыть' },
  edit: { az: 'Redaktə et', en: 'Edit', ru: 'Изменить' },
  delete: { az: 'Sil', en: 'Delete', ru: 'Удалить' },
  confirm: { az: 'Təsdiqlə', en: 'Confirm', ru: 'Подтвердить' },
  loading: { az: 'Yüklənir...', en: 'Loading...', ru: 'Загрузка...' },
  error_prefix: { az: 'Xəta:', en: 'Error:', ru: 'Ошибка:' },
  yes: { az: 'Bəli', en: 'Yes', ru: 'Да' },
  no: { az: 'Xeyr', en: 'No', ru: 'Нет' },
  search_placeholder: { az: 'Axtar...', en: 'Search...', ru: 'Поиск...' },
  logout: { az: 'Çıxış', en: 'Log out', ru: 'Выход' },

  // ---- Naviqasiya (TopBar) ----
  nav_dashboard: { az: 'Dashboard', en: 'Dashboard', ru: 'Дашборд' },
  nav_tracking: { az: 'İzləmə Cədvəli', en: 'Tracking Table', ru: 'Таблица отслеживания' },
  nav_requests: { az: 'Təlim Sorğuları', en: 'Training Requests', ru: 'Заявки на обучение' },

  // ---- Login ----
  login_title: { az: 'Daxil ol', en: 'Log in', ru: 'Войти' },
  login_email: { az: 'Email', en: 'Email', ru: 'Email' },
  login_password: { az: 'Parol', en: 'Password', ru: 'Пароль' },
  login_button: { az: 'Daxil ol', en: 'Log in', ru: 'Войти' },
  login_no_account: { az: 'Hesabınız yoxdur?', en: "Don't have an account?", ru: 'Нет аккаунта?' },
  login_signup_link: { az: 'Qeydiyyatdan keçin', en: 'Sign up', ru: 'Зарегистрироваться' },
  login_error: { az: 'E-poçt və ya şifrə yanlışdır', en: 'Incorrect email or password', ru: 'Неверный email или пароль' },
  login_show: { az: 'Göstər', en: 'Show', ru: 'Показать' },
  login_hide: { az: 'Gizlət', en: 'Hide', ru: 'Скрыть' },
  login_forgot: { az: 'Parolu unutmusunuz?', en: 'Forgot password?', ru: 'Забыли пароль?' },
  login_forgot_need_email: { az: 'Əvvəlcə email daxil edin.', en: 'Please enter your email first.', ru: 'Сначала введите email.' },
  login_forgot_error: { az: 'Xəta baş verdi, yenidən cəhd edin.', en: 'Something went wrong, please try again.', ru: 'Произошла ошибка, попробуйте снова.' },
  login_forgot_sent: { az: 'Parol bərpa linki emailinizə göndərildi.', en: 'A password reset link has been sent to your email.', ru: 'Ссылка для сброса пароля отправлена на вашу почту.' },
  login_logging_in: { az: 'Daxil olunur...', en: 'Logging in...', ru: 'Вход...' },

  // ---- Signup ----
  signup_title: { az: 'Qeydiyyat', en: 'Sign up', ru: 'Регистрация' },
  signup_fullname: { az: 'Ad Soyad', en: 'Full name', ru: 'Имя Фамилия' },
  signup_email: { az: 'E-poçt', en: 'Email', ru: 'Эл. почта' },
  signup_password: { az: 'Şifrə', en: 'Password', ru: 'Пароль' },
  signup_dept: { az: 'Departament *', en: 'Department *', ru: 'Департамент *' },
  signup_dept_placeholder: { az: '— Seçin —', en: '— Select —', ru: '— Выбрать —' },
  signup_sube: { az: 'Şöbə', en: 'Unit', ru: 'Отдел' },
  signup_sube_empty: { az: '— Bu departamentdə şöbə yoxdur —', en: '— No units in this department —', ru: '— В этом департаменте нет отделов —' },
  signup_position: { az: 'Vəzifə', en: 'Position', ru: 'Должность' },
  signup_manager: { az: 'Rəhbər', en: 'Manager', ru: 'Руководитель' },
  signup_manager_placeholder: { az: '— Seçin —', en: '— Select —', ru: '— Выбрать —' },
  signup_submit: { az: 'Qeydiyyatdan keç', en: 'Sign up', ru: 'Зарегистрироваться' },
  signup_have_account: { az: 'Artıq hesabınız var?', en: 'Already have an account?', ru: 'Уже есть аккаунт?' },
  signup_login_link: { az: 'Daxil olun', en: 'Log in', ru: 'Войти' },
  signup_subtitle: { az: 'Yeni hesab yaradın', en: 'Create a new account', ru: 'Создать новый аккаунт' },
  signup_fullname_star: { az: 'Ad Soyad *', en: 'Full name *', ru: 'Имя Фамилия *' },
  signup_email_star: { az: 'Email *', en: 'Email *', ru: 'Email *' },
  signup_password_star: { az: 'Parol *', en: 'Password *', ru: 'Пароль *' },
  signup_position_star: { az: 'Vəzifə *', en: 'Position *', ru: 'Должность *' },
  signup_direct_manager: { az: 'Birbaşa rəhbər', en: 'Direct manager', ru: 'Непосредственный руководитель' },
  signup_required_error: { az: 'Ulduzlu (*) sahələri doldurun.', en: 'Please fill in the fields marked with (*).', ru: 'Заполните поля, отмеченные (*).' },
  signup_no_session_error: { az: 'Qeydiyyat tamamlandı, amma sessiya açılmadı. Zəhmət olmasa Supabase-də "Confirm email" söndürülüb yoxlayın.', en: 'Sign-up completed, but no session was opened. Please check that "Confirm email" is disabled in Supabase.', ru: 'Регистрация завершена, но сессия не открылась. Проверьте, что "Confirm email" отключён в Supabase.' },
  signup_profile_error: { az: 'Profil tamamlanmadı:', en: 'Profile could not be completed:', ru: 'Профиль не был завершён:' },
  signup_submitting: { az: 'Qeydiyyat aparılır...', en: 'Signing up...', ru: 'Регистрация...' },
  signup_back_to_login: { az: 'Artıq hesabım var, daxil ol', en: 'I already have an account, log in', ru: 'У меня уже есть аккаунт, войти' },

  // ---- Home ----
  home_welcome: { az: 'Xoş gəldiniz', en: 'Welcome', ru: 'Добро пожаловать' },
  home_dashboard_title: { az: 'Dashboard', en: 'Dashboard', ru: 'Дашборд' },
  home_dashboard_desc: { az: 'KPI-lar, büdcə və status qrafikləri', en: 'KPIs, budget and status charts', ru: 'KPI, бюджет и графики статусов' },
  home_tracking_title: { az: 'İzləmə Cədvəli', en: 'Tracking Table', ru: 'Таблица отслеживания' },
  home_tracking_desc: { az: 'Bütün təlimlərin siyahısı və filtrlər', en: 'All trainings, list and filters', ru: 'Все обучения, список и фильтры' },
  home_requests_title: { az: 'Təlim Sorğuları', en: 'Training Requests', ru: 'Заявки на обучение' },
  home_requests_desc: { az: 'Ad-hoc sorğu göndər və izlə', en: 'Submit and track ad-hoc requests', ru: 'Подать и отслеживать заявки' },
  home_hero_subtitle: { az: 'Nə etmək istəyirsiniz? Aşağıdan seçin.', en: 'What would you like to do? Choose below.', ru: 'Что вы хотите сделать? Выберите ниже.' },
  home_dashboard_desc_full: { az: 'Ümumi mənzərə — təlim sayı, büdcə, status və departament üzrə analiz.', en: 'Overview — training count, budget, status and department analysis.', ru: 'Обзор — количество обучений, бюджет, статус и анализ по департаментам.' },
  home_dashboard_link: { az: 'Analizə bax', en: 'View analysis', ru: 'Смотреть анализ' },
  home_tracking_desc_full: { az: 'Bütün təlimlərin təfərrüatlı siyahısı — filtrlə, axtar, Excel-ə ixrac et.', en: 'Detailed list of all trainings — filter, search, export to Excel.', ru: 'Подробный список всех обучений — фильтр, поиск, экспорт в Excel.' },
  home_tracking_link: { az: 'Cədvələ keç', en: 'Go to table', ru: 'Перейти к таблице' },
  home_requests_desc_team: { az: 'Yeni sorğu göndər, komandanın sorğularına bax və qərar ver.', en: "Submit a new request, review and decide on your team's requests.", ru: 'Отправить новую заявку, рассмотреть заявки команды и принять решение.' },
  home_requests_desc_solo: { az: 'Öz təlim ehtiyacın üçün sorğu göndər və statusunu izlə.', en: 'Submit a request for your own training needs and track its status.', ru: 'Отправить заявку на своё обучение и отслеживать статус.' },
  home_requests_link: { az: 'Sorğu göndər', en: 'Submit a request', ru: 'Отправить заявку' },
  home_footer_hint: { az: 'İstənilən vaxt yuxarıdakı 🏠 işarəsinə basaraq bura qayıda bilərsiniz.', en: 'You can return here anytime by clicking the 🏠 icon above.', ru: 'Вы можете вернуться сюда в любой момент, нажав на значок 🏠 выше.' },

  // ---- Dashboard ----
  dash_total_trainings: { az: 'Ümumi Təlim', en: 'Total Trainings', ru: 'Всего обучений' },
  dash_completed: { az: 'Tamamlanıb', en: 'Completed', ru: 'Завершено' },
  dash_in_progress: { az: 'Davam edir', en: 'In progress', ru: 'В процессе' },
  dash_budgeted: { az: 'Büdcələnmiş', en: 'Budgeted', ru: 'Бюджетировано' },

  // ---- Tracking ----
  track_export: { az: 'Excel-ə ixrac et', en: 'Export to Excel', ru: 'Экспорт в Excel' },
  track_apply: { az: 'Tətbiq et', en: 'Apply', ru: 'Применить' },
  track_select_all: { az: 'Hamısını seç', en: 'Select all', ru: 'Выбрать все' },
  track_no_results: { az: 'Nəticə tapılmadı', en: 'No results found', ru: 'Результатов не найдено' },

  // ---- Requests ----
  req_title: { az: 'Təlim Sorğuları', en: 'Training Requests', ru: 'Заявки на обучение' },
  req_new: { az: '+ Yeni Sorğu', en: '+ New Request', ru: '+ Новая заявка' },
  req_awaiting_approval: { az: 'Təsdiqinizi Gözləyən Sorğular', en: 'Requests Awaiting Your Approval', ru: 'Заявки, ожидающие вашего одобрения' },
  req_no_pending: { az: 'Baxılmalı sorğu yoxdur', en: 'No requests to review', ru: 'Нет заявок для рассмотрения' },
  req_my_requests: { az: 'Şəxsi Sorğularım', en: 'My Requests', ru: 'Мои заявки' },
  req_status: { az: 'Status', en: 'Status', ru: 'Статус' },
  req_results: { az: 'nəticə', en: 'results', ru: 'результатов' },
  req_filter_all: { az: 'Hamısı', en: 'All', ru: 'Все' },
  req_filter_pending: { az: 'Gözləyir', en: 'Pending', ru: 'В ожидании' },
  req_filter_review: { az: 'Baxılır (L&D)', en: 'In Review (L&D)', ru: 'На рассмотрении (L&D)' },
  req_filter_approved: { az: 'Təsdiqləndi', en: 'Approved', ru: 'Одобрено' },
  req_filter_rejected: { az: 'Rədd edildi', en: 'Rejected', ru: 'Отклонено' },
  req_no_category: { az: 'Bu kateqoriyada sorğu yoxdur', en: 'No requests in this category', ru: 'Нет заявок в этой категории' },
  req_no_decisions: { az: 'Hələ qərar yoxdur', en: 'No decisions yet', ru: 'Пока нет решений' },
  req_col_name: { az: 'Ad Soyad', en: 'Name', ru: 'Имя Фамилия' },
  req_col_training: { az: 'Təlim', en: 'Training', ru: 'Обучение' },
  req_col_reason: { az: 'Səbəb', en: 'Reason', ru: 'Причина' },
  req_col_priority: { az: 'Prioritet', en: 'Priority', ru: 'Приоритет' },
  req_col_action: { az: 'Əməliyyat', en: 'Action', ru: 'Действие' },
  req_col_status: { az: 'Status', en: 'Status', ru: 'Статус' },
  req_col_submitted: { az: 'Göndərilib', en: 'Submitted', ru: 'Отправлено' },
  req_col_manager_note: { az: 'Manager qeydi', en: "Manager's note", ru: 'Заметка руководителя' },
  req_col_lnd_note: { az: 'L&D qeydi', en: 'L&D note', ru: 'Заметка L&D' },
  req_approve_send: { az: 'Təsdiqlə → göndər', en: 'Approve → send', ru: 'Одобрить → отправить' },
  req_reject: { az: 'Rədd et', en: 'Reject', ru: 'Отклонить' },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('az');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null;
    if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
  }, []);

  const setLang = useCallback((code) => {
    setLangState(code);
    if (typeof window !== 'undefined') window.localStorage.setItem('lang', code);
  }, []);

  const t = useCallback((key) => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang] || entry.az || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage() LanguageProvider daxilində istifadə olunmalıdır');
  return ctx;
}
