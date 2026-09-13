// ═══════════════════════════════════════════════════════════════
// AR — نقطة التشغيل + هيكل الواجهة العام
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { store } from './store.js';
import { initLang, t } from './i18n.js';
import { registerRoute, initRouter, navigate } from './router.js';
import { api, clearTokens } from './api.js';
import { connectWS, disconnectWS } from './ws.js';
import { createEl, escapeHTML } from './utils.js';
import { showError } from './modals.js';

import { renderAuthPage } from './pages/auth.js';
import { renderFeedPage } from './pages/feed.js';
import { renderPostPage } from './pages/post.js';
import { renderProfilePage } from './pages/profile.js';
import { renderMessagesPage } from './pages/messages.js';
import { renderSearchPage } from './pages/search.js';
import { renderNotificationsPage } from './pages/notifications.js';
import { renderCommunitiesPage } from './pages/communities.js';
import { renderHashtagPage } from './pages/hashtag.js';
import { renderStatsPage } from './pages/stats.js';
import { renderSettingsPage } from './pages/settings.js';

const appRoot = document.getElementById('app');

// ─── تهيئة المظهر ───────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || CONFIG.DEFAULT_THEME;
  setTheme(saved);
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
  store.setState({ theme });
}

// ─── التحقق من الجلسة الحالية ───────────────────────────────────
async function loadCurrentUser() {
  const token = localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
  if (!token) return null;

  try {
    const res = await api.get('/auth/me');
    return res.data.user;
  } catch {
    clearTokens();
    return null;
  }
}

// ─── الهيكل العام (شريط جانبي + منطقة محتوى) ────────────────────
function renderShell() {
  appRoot.innerHTML = '';

  const layout = createEl('div', { class: 'app-layout' });
  const sidebarCol = createEl('div', { class: 'sidebar-column' }, [renderSidebar()]);
  const contentCol = createEl('main', { class: 'content-column', id: 'content-column' });
  const widgetsCol = createEl('div', { class: 'widgets-column' });

  layout.append(sidebarCol, contentCol, widgetsCol);
  appRoot.appendChild(layout);
  appRoot.appendChild(renderBottomNav());

  return contentCol;
}

function navItems() {
  return [
    { path: '/', label: t('nav_home'), icon: '⌂' },
    { path: '/search', label: t('nav_search'), icon: '⌕' },
    { path: '/notifications', label: t('nav_notifications'), icon: '♡' },
    { path: '/messages', label: t('nav_messages'), icon: '✉' },
    { path: '/communities', label: t('nav_communities'), icon: '◈' },
    { path: '/stats', label: t('nav_stats'), icon: '▤' },
  ];
}

function renderSidebar() {
  const sidebar = createEl('nav', { class: 'sidebar', 'aria-label': t('appName') });
  sidebar.appendChild(createEl('div', { class: 'sidebar-logo' }, [t('appName')]));

  for (const item of navItems()) {
    const isActive = window.location.pathname === item.path;
    sidebar.appendChild(createEl('a', {
      href: item.path, 'data-link': true,
      class: `sidebar-link${isActive ? ' sidebar-link--active' : ''}`,
    }, [
      createEl('span', { class: 'sidebar-link__icon', 'aria-hidden': 'true' }, [item.icon]),
      createEl('span', { class: 'sidebar-link__label' }, [item.label]),
    ]));
  }

  const user = store.getState().user;
  if (user) {
    sidebar.appendChild(createEl('a', {
      href: `/profile/${user.username}`, 'data-link': true, class: 'sidebar-link',
    }, [
      createEl('span', { class: 'sidebar-link__icon', 'aria-hidden': 'true' }, ['◉']),
      createEl('span', { class: 'sidebar-link__label' }, [t('nav_profile')]),
    ]));
    sidebar.appendChild(createEl('a', {
      href: '/settings', 'data-link': true, class: 'sidebar-link',
    }, [
      createEl('span', { class: 'sidebar-link__icon', 'aria-hidden': 'true' }, ['⚙']),
      createEl('span', { class: 'sidebar-link__label' }, [t('nav_settings')]),
    ]));
  }

  return sidebar;
}

function renderBottomNav() {
  const nav = createEl('nav', { class: 'bottom-nav', 'aria-label': t('appName') });
  for (const item of navItems().slice(0, 5)) {
    nav.appendChild(createEl('a', {
      href: item.path, 'data-link': true, class: 'bottom-nav__link', 'aria-label': item.label,
    }, [createEl('span', { 'aria-hidden': 'true' }, [item.icon])]));
  }
  return nav;
}

// ─── تسجيل الخروج ────────────────────────────────────────────────
export async function logout() {
  try {
    await api.post('/auth/logout', {});
  } catch {
    // نكمل تسجيل الخروج محلياً حتى لو فشل الطلب
  }
  clearTokens();
  disconnectWS();
  store.setState({ user: null });
  navigate('/login');
}

store.on('auth:logout', () => {
  store.setState({ user: null });
  disconnectWS();
  navigate('/login');
});

// ─── حراسة المسارات (تحتاج تسجيل دخول) ──────────────────────────
function requireAuth(handler) {
  return (params) => {
    if (!store.getState().user) {
      navigate('/login');
      return;
    }
    handler(params);
  };
}

// ─── تسجيل كل المسارات ──────────────────────────────────────────
function setupRoutes() {
  registerRoute('/login', () => renderAuthPage(getContentEl(), 'login'));
  registerRoute('/register', () => renderAuthPage(getContentEl(), 'register'));
  registerRoute('/forgot-password', () => renderAuthPage(getContentEl(), 'forgot-password'));
  registerRoute('/reset-password', () => renderAuthPage(getContentEl(), 'reset-password'));
  registerRoute('/', requireAuth(() => renderFeedPage(getContentEl())));
  registerRoute('/post/:id', requireAuth((params) => renderPostPage(getContentEl(), params.id)));
  registerRoute('/profile/:username', requireAuth((params) => renderProfilePage(getContentEl(), params.username)));
  registerRoute('/messages', requireAuth(() => renderMessagesPage(getContentEl())));
  registerRoute('/messages/:conversationId', requireAuth((params) => renderMessagesPage(getContentEl(), params.conversationId)));
  registerRoute('/search', requireAuth(() => renderSearchPage(getContentEl())));
  registerRoute('/notifications', requireAuth(() => renderNotificationsPage(getContentEl())));
  registerRoute('/communities', requireAuth(() => renderCommunitiesPage(getContentEl())));
  registerRoute('/communities/:slug', requireAuth((params) => renderCommunitiesPage(getContentEl(), params.slug)));
  registerRoute('/hashtag/:tag', requireAuth((params) => renderHashtagPage(getContentEl(), params.tag)));
  registerRoute('/stats', requireAuth(() => renderStatsPage(getContentEl())));
  registerRoute('/settings', requireAuth(() => renderSettingsPage(getContentEl())));
}

function getContentEl() {
  return document.getElementById('content-column') || appRoot;
}

// ─── الإقلاع ─────────────────────────────────────────────────────

// نقطة استقبال جلسة impersonation من الداشبورد: /session-entry?t=xxx
// يُفتح بتبويب جديد من الأدمن، يقرأ التوكن، يخزّنه، ثم يمسحه من
// شريط العنوان وسجل التصفح فوراً باش ما يبقاش ظاهر لأي حد يشوف
// الشاشة أو يفتح "الرجوع للخلف". بلا refresh token — الجلسة تنتهي
// بعد 60 دقيقة بلا تجديد (تصميم مقصود، راجع توثيق الباك اند).
//
// ⚠️ تحذير مهم: هذا يخزّن التوكن بنفس localStorage متاع الموقع
// العادي (نفس الأصل/origin). إذا كان للأدمن حساب شخصي عادي مسجَّل
// دخوله بنفس المتصفح بتبويب آخر، فتح رابط impersonation هنا يبدّل
// التوكن المخزَّن ويأثّر على ذاك التبويب أيضاً (localStorage مشترك
// بين كل تبويبات نفس الموقع). يُفضَّل استعمال متصفح/نافذة خاصة
// (incognito) منفصلة لجلسات impersonation لتفادي هذا التداخل.
function consumeImpersonationEntry() {
  if (window.location.pathname !== '/session-entry') return false;

  const params = new URLSearchParams(window.location.search);
  const token = params.get('t');
  if (!token) return false;

  localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(CONFIG.REFRESH_TOKEN_STORAGE_KEY); // ما كاين refresh token بimpersonation
  window.history.replaceState({}, '', '/');
  return true;
}

async function boot() {
  consumeImpersonationEntry();

  initTheme();
  initLang();
  // سجّل المسارات قبل محاولة تحميل الجلسة. إذا كان التوكن منتهياً
  // apiFetch سيطلق auth:logout، والتنقل الناتج يحتاج راوتات مسجّلة
  // حتى لا يدخل التطبيق في resolveRoute بلا نهاية أثناء الإقلاع.
  setupRoutes();

  const user = await loadCurrentUser();
  store.setState({ user });

  if (user) {
    renderShell();
    connectWS();
  }

  initRouter();

  // إعادة رسم الهيكل عند تغيير حالة الدخول (بعد login/logout)
  store.on('state:change', (state) => {
    const hasShell = document.querySelector('.app-layout');
    if (state.user && !hasShell) {
      renderShell();
      connectWS();
    }
  });
}

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message) showError(event.reason);
});

boot();
