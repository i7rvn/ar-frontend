// الإعدادات تُقرأ من متغيرات Vite وقت البناء. القيم الافتراضية = نشر الإنتاج
// الحالي، فيخدم المشروع مباشرة بلا ملف .env أثناء التطوير.
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://ar-backend-tvx7.onrender.com/api',
  clientKey:
    (import.meta.env.VITE_CLIENT_KEY as string | undefined) ||
    '316755279b8e57c08c4fac2b83a743a76ef8097820a10b1135d32793afaaf868',
  storageKeys: {
    access: 'ar_access_token',
    refresh: 'ar_refresh_token',
    lang: 'ar_lang',
    theme: 'ar_theme',
  },
  // مفتاح طوارئ مؤقت — نفس معنى SKIP_OTP_STEP بالفرونت القديم. true = التسجيل
  // يتخطى خطوة OTP (يتطلب SKIP_OTP_VERIFICATION=true بالباك اند أيضاً).
  skipOtpStep: (import.meta.env.VITE_SKIP_OTP_STEP as string | undefined) === 'true',
} as const
