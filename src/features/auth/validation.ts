import type { TranslationKey } from '@/i18n/dictionary'

// قواعد مطابقة لـZod بالباك اند (middleware/validate.js). هذي للتغذية الراجعة
// الفورية فقط — الخادم يبقى المرجع الحقيقي ويعيد التحقق من كل شيء.
export const rules = {
  email: (v: string): TranslationKey | null =>
    !v ? 'err_required' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255 ? null : 'err_email',
  username: (v: string): TranslationKey | null =>
    !v ? 'err_required' : /^[a-zA-Z0-9_]{3,50}$/.test(v) ? null : 'err_username',
  password: (v: string): TranslationKey | null =>
    !v ? 'err_required' : v.length >= 8 && v.length <= 100 && /[A-Z]/.test(v) && /[0-9]/.test(v) ? null : 'err_password',
  displayName: (v: string): TranslationKey | null =>
    !v.trim() ? 'err_required' : v.trim().length >= 2 && v.trim().length <= 100 ? null : 'err_display_name',
  inviteCode: (v: string): TranslationKey | null => (!v || v.trim().length === 16 ? null : 'err_invite'),
  phone: (v: string): TranslationKey | null =>
    !v ? 'err_required' : /^\+[1-9]\d{7,14}$/.test(v) ? null : 'err_phone',
  otp: (v: string): TranslationKey | null => (/^\d{6}$/.test(v) ? null : 'err_code'),
}
