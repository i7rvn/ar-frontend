// يُشغَّل قبل أول رسم للصفحة لتفادي وميض الثيم/اللغة الخاطئة.
// ملف خارجي عمداً (ماشي inline) لأن CSP يمنع السكربتات المضمّنة.
(function () {
  try {
    var theme = localStorage.getItem('ar_theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    var lang = localStorage.getItem('ar_lang') || 'ar';
    var el = document.documentElement;
    el.setAttribute('data-theme', theme);
    el.setAttribute('lang', lang);
    el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
