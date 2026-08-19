// ═══════════════════════════════════════════════════════════════
// AR — الترجمات (عربي افتراضي RTL / إنجليزي / فرنسي)
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { store } from './store.js';

const translations = {
  ar: {
    appName: 'AR',
    nav_home: 'الرئيسية', nav_search: 'بحث', nav_notifications: 'الإشعارات',
    nav_messages: 'الرسائل', nav_communities: 'المجتمعات', nav_profile: 'ملفي الشخصي',
    nav_settings: 'الإعدادات', nav_stats: 'الإحصائيات', nav_logout: 'تسجيل الخروج',

    auth_login_title: 'تسجيل الدخول', auth_register_title: 'حساب جديد',
    auth_identifier: 'البريد الإلكتروني أو اسم المستخدم', auth_password: 'كلمة المرور',
    auth_confirm_password: 'تأكيد كلمة المرور', auth_display_name: 'الاسم الكامل',
    auth_username: 'اسم المستخدم', auth_email: 'البريد الإلكتروني',
    auth_login_btn: 'دخول', auth_register_btn: 'إنشاء الحساب',
    auth_no_account: 'ماعندكش حساب؟', auth_have_account: 'عندك حساب؟',
    auth_forgot_password: 'نسيت كلمة المرور؟',
    auth_totp_title: 'التحقق بخطوتين', auth_totp_code: 'أدخل كود التحقق',
    auth_use_recovery: 'استخدم كود استرجاع بدلاً من ذلك',
    auth_otp_title: 'التحقق من البريد الإلكتروني', auth_otp_sent: 'أرسلنا كوداً لبريدك الإلكتروني',
    auth_resend_otp: 'إعادة الإرسال', auth_resend_otp_in: 'إعادة الإرسال خلال',
    auth_2fa_prompt_title: 'احمِ حسابك بالتحقق بخطوتين',
    auth_2fa_prompt_body: 'يضيف طبقة حماية إضافية لحسابك بكود من هاتفك عند كل دخول.',
    auth_2fa_continue: 'متابعة', auth_2fa_later: 'ذكرني لاحقاً',
    password_weak: 'ضعيفة', password_medium: 'متوسطة', password_strong: 'قوية', password_excellent: 'ممتازة',

    feed_tab_foryou: 'لأجلك', feed_tab_following: 'المتابَعون', feed_tab_trending: 'الرائج',
    feed_compose_placeholder: 'شنو راك دير؟', feed_post_btn: 'نشر',
    feed_empty: 'مافيه والو هنا حتى الآن', feed_reply: 'رد', feed_repost: 'إعادة نشر',
    feed_like: 'إعجاب', feed_share: 'مشاركة',

    common_loading: 'جاري التحميل...', common_error: 'حدث خطأ',
    common_retry: 'إعادة المحاولة', common_cancel: 'إلغاء', common_save: 'حفظ',
    common_confirm: 'تأكيد', common_delete: 'حذف', common_edit: 'تعديل',
    common_follow: 'متابعة', common_following: 'متابَع', common_network_error: 'تحقق من اتصالك بالإنترنت',

    settings_appearance: 'المظهر', settings_dark_mode: 'الوضع الداكن',
    settings_language: 'اللغة', settings_account_security: 'الحساب والأمان',
    settings_change_password: 'تغيير كلمة المرور', settings_change_email: 'تغيير البريد الإلكتروني',
    settings_2fa: 'التحقق بخطوتين', settings_devices: 'الأجهزة والجلسات',
    settings_security_log: 'السجل الأمني', settings_notifications: 'الإشعارات',
    settings_privacy: 'الخصوصية', settings_danger_zone: 'منطقة الخطر',
    settings_delete_account: 'حذف الحساب',
  },

  en: {
    appName: 'AR',
    nav_home: 'Home', nav_search: 'Search', nav_notifications: 'Notifications',
    nav_messages: 'Messages', nav_communities: 'Communities', nav_profile: 'Profile',
    nav_settings: 'Settings', nav_stats: 'Stats', nav_logout: 'Log out',

    auth_login_title: 'Log in', auth_register_title: 'Create account',
    auth_identifier: 'Email or username', auth_password: 'Password',
    auth_confirm_password: 'Confirm password', auth_display_name: 'Full name',
    auth_username: 'Username', auth_email: 'Email',
    auth_login_btn: 'Log in', auth_register_btn: 'Create account',
    auth_no_account: "Don't have an account?", auth_have_account: 'Already have an account?',
    auth_forgot_password: 'Forgot password?',
    auth_totp_title: 'Two-factor verification', auth_totp_code: 'Enter verification code',
    auth_use_recovery: 'Use a recovery code instead',
    auth_otp_title: 'Verify your email', auth_otp_sent: 'We sent a code to your email',
    auth_resend_otp: 'Resend', auth_resend_otp_in: 'Resend in',
    auth_2fa_prompt_title: 'Protect your account with 2FA',
    auth_2fa_prompt_body: 'Adds an extra layer of protection with a code from your phone at every login.',
    auth_2fa_continue: 'Continue', auth_2fa_later: 'Remind me later',
    password_weak: 'Weak', password_medium: 'Medium', password_strong: 'Strong', password_excellent: 'Excellent',

    feed_tab_foryou: 'For you', feed_tab_following: 'Following', feed_tab_trending: 'Trending',
    feed_compose_placeholder: "What's happening?", feed_post_btn: 'Post',
    feed_empty: 'Nothing here yet', feed_reply: 'Reply', feed_repost: 'Repost',
    feed_like: 'Like', feed_share: 'Share',

    common_loading: 'Loading...', common_error: 'Something went wrong',
    common_retry: 'Retry', common_cancel: 'Cancel', common_save: 'Save',
    common_confirm: 'Confirm', common_delete: 'Delete', common_edit: 'Edit',
    common_follow: 'Follow', common_following: 'Following', common_network_error: 'Check your connection',

    settings_appearance: 'Appearance', settings_dark_mode: 'Dark mode',
    settings_language: 'Language', settings_account_security: 'Account & Security',
    settings_change_password: 'Change password', settings_change_email: 'Change email',
    settings_2fa: 'Two-factor authentication', settings_devices: 'Devices & sessions',
    settings_security_log: 'Security log', settings_notifications: 'Notifications',
    settings_privacy: 'Privacy', settings_danger_zone: 'Danger zone',
    settings_delete_account: 'Delete account',
  },

  fr: {
    appName: 'AR',
    nav_home: 'Accueil', nav_search: 'Recherche', nav_notifications: 'Notifications',
    nav_messages: 'Messages', nav_communities: 'Communautés', nav_profile: 'Profil',
    nav_settings: 'Paramètres', nav_stats: 'Statistiques', nav_logout: 'Déconnexion',

    auth_login_title: 'Connexion', auth_register_title: 'Créer un compte',
    auth_identifier: "Email ou nom d'utilisateur", auth_password: 'Mot de passe',
    auth_confirm_password: 'Confirmer le mot de passe', auth_display_name: 'Nom complet',
    auth_username: "Nom d'utilisateur", auth_email: 'Email',
    auth_login_btn: 'Se connecter', auth_register_btn: 'Créer le compte',
    auth_no_account: "Vous n'avez pas de compte ?", auth_have_account: 'Vous avez déjà un compte ?',
    auth_forgot_password: 'Mot de passe oublié ?',
    auth_totp_title: 'Vérification à deux facteurs', auth_totp_code: 'Entrez le code de vérification',
    auth_use_recovery: 'Utiliser un code de récupération',
    auth_otp_title: 'Vérifiez votre email', auth_otp_sent: 'Un code a été envoyé à votre email',
    auth_resend_otp: 'Renvoyer', auth_resend_otp_in: 'Renvoyer dans',
    auth_2fa_prompt_title: 'Protégez votre compte avec la 2FA',
    auth_2fa_prompt_body: 'Ajoute une couche de protection supplémentaire à chaque connexion.',
    auth_2fa_continue: 'Continuer', auth_2fa_later: 'Plus tard',
    password_weak: 'Faible', password_medium: 'Moyen', password_strong: 'Fort', password_excellent: 'Excellent',

    feed_tab_foryou: 'Pour vous', feed_tab_following: 'Abonnements', feed_tab_trending: 'Tendance',
    feed_compose_placeholder: 'Quoi de neuf ?', feed_post_btn: 'Publier',
    feed_empty: 'Rien ici pour le moment', feed_reply: 'Répondre', feed_repost: 'Repartager',
    feed_like: "J'aime", feed_share: 'Partager',

    common_loading: 'Chargement...', common_error: "Une erreur s'est produite",
    common_retry: 'Réessayer', common_cancel: 'Annuler', common_save: 'Enregistrer',
    common_confirm: 'Confirmer', common_delete: 'Supprimer', common_edit: 'Modifier',
    common_follow: 'Suivre', common_following: 'Abonné', common_network_error: 'Vérifiez votre connexion',

    settings_appearance: 'Apparence', settings_dark_mode: 'Mode sombre',
    settings_language: 'Langue', settings_account_security: 'Compte et sécurité',
    settings_change_password: 'Changer le mot de passe', settings_change_email: "Changer l'email",
    settings_2fa: 'Authentification à deux facteurs', settings_devices: 'Appareils et sessions',
    settings_security_log: 'Journal de sécurité', settings_notifications: 'Notifications',
    settings_privacy: 'Confidentialité', settings_danger_zone: 'Zone de danger',
    settings_delete_account: 'Supprimer le compte',
  },
};

export function t(key) {
  const lang = store.getState().lang;
  return translations[lang]?.[key] ?? translations.ar[key] ?? key;
}

export function setLang(lang) {
  if (!translations[lang]) return;
  localStorage.setItem(CONFIG.LANG_STORAGE_KEY, lang);
  store.setState({ lang });
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  store.emit('lang:change', lang);
}

export function initLang() {
  const saved = localStorage.getItem(CONFIG.LANG_STORAGE_KEY) || CONFIG.DEFAULT_LANG;
  setLang(saved);
}
