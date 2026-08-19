// ═══════════════════════════════════════════════════════════════
// AR — الإعدادات المركزية
//
// ملاحظة أمان مهمة: CLIENT_KEY هنا ليس سراً حقيقياً — أي زائر يقدر
// يقرأه من كود الموقع (Developer Tools). هذا طبيعي ومتوقَّع لموقع
// ويب بدون خطوة بناء (build step). الحماية الحقيقية ضد استخدام
// الموقع من دومين آخر هي CORS بالخادم (مضبوط ليقبل فقط دومين هذا
// الموقع)، وRate Limiting، وليس إخفاء هذا المفتاح.
// ═══════════════════════════════════════════════════════════════

export const CONFIG = Object.freeze({
  API_URL: 'https://ar-backend-cvkf.onrender.com/api',
  WS_URL: 'wss://ar-backend-cvkf.onrender.com/ws',

  CLIENT_KEY: '316755279b8e57c08c4fac2b83a743a76ef8097820a10b1135d32793afaaf868',

  // اسم مفتاح التخزين المحلي لتوكن الدخول
  TOKEN_STORAGE_KEY: 'ar_access_token',
  REFRESH_TOKEN_STORAGE_KEY: 'ar_refresh_token',
  LANG_STORAGE_KEY: 'ar_lang',
  THEME_STORAGE_KEY: 'ar_theme',

  DEFAULT_LANG: 'ar',
  DEFAULT_THEME: 'dark',

  // حدود واجهة فقط (تجربة مستخدم)، الحد الحقيقي يأتي من رد الخادم
  DEBOUNCE_MS: 300,
  OTP_RESEND_SECONDS: 60,
});
