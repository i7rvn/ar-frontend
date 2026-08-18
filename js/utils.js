// ═══════════════════════════════════════════════════════════════
// AR — دوال مساعدة عامة
// ═══════════════════════════════════════════════════════════════

// ─── تعقيم HTML — دفاع XSS مركزي ─────────────────────────────
// أي نص قادم من المستخدم (منشور، بيوغرافيا، اسم عرض...) يمر من هنا
// وجوباً قبل إدراجه بالـHTML. لا نستخدم innerHTML مباشرة مع نص خام
// بأي مكان بالمشروع.
const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'/]/g, (ch) => escapeMap[ch]);
}

// تعقيم قيمة تُستخدم داخل رابط (href) — يمنع بروتوكولات خطرة مثل
// javascript: أو data: التي قد تُنفَّذ عند الضغط على الرابط
export function sanitizeURL(url) {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return '#';
}

// ─── Debounce ─────────────────────────────────────────────────
export function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── التاريخ النسبي (منذ 5 دقائق، منذ يوم...) ──────────────────
export function relativeTime(dateString, lang = 'ar') {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const units = [
    { limit: 60, divisor: 1, unit: { ar: 'ثانية', en: 'second', fr: 'seconde' } },
    { limit: 3600, divisor: 60, unit: { ar: 'دقيقة', en: 'minute', fr: 'minute' } },
    { limit: 86400, divisor: 3600, unit: { ar: 'ساعة', en: 'hour', fr: 'heure' } },
    { limit: 2592000, divisor: 86400, unit: { ar: 'يوم', en: 'day', fr: 'jour' } },
    { limit: 31536000, divisor: 2592000, unit: { ar: 'شهر', en: 'month', fr: 'mois' } },
  ];

  if (seconds < 10) return { ar: 'الآن', en: 'just now', fr: "à l'instant" }[lang];

  for (const { limit, divisor, unit } of units) {
    if (seconds < limit) {
      const value = Math.floor(seconds / divisor);
      return `${value} ${unit[lang]}`;
    }
  }

  const years = Math.floor(seconds / 31536000);
  return `${years} ${{ ar: 'سنة', en: 'year', fr: 'an' }[lang]}`;
}

// ─── تنسيق أرقام مختصرة (1.2K, 3.4M) ────────────────────────────
export function formatCount(n) {
  const num = Number(n) || 0;
  if (num < 1000) return String(num);
  if (num < 1000000) return `${(num / 1000).toFixed(num % 1000 >= 100 ? 1 : 0)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

// ─── دوال DOM صغيرة ───────────────────────────────────────────
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

// ─── قص نص طويل مع علامة اقتباس آمنة للعرض ──────────────────────
export function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str || '';
  return `${str.slice(0, maxLength)}…`;
}
