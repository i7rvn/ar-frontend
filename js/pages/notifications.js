// ═══════════════════════════════════════════════════════════════
// AR — الإشعارات
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, relativeTime } from '../utils.js';
import { showError, showToast } from '../modals.js';
import { renderErrorState } from './feed.js';

const TYPE_ICONS = {
  like: '♥', follow: '👤', reply: '↩', repost: '⇄',
  community_post: '◈', mention: '@',
};

const TYPE_TEXT = {
  like: 'أعجب بمنشورك', follow: 'تابعك', reply: 'ردّ على منشورك',
  repost: 'أعاد نشر منشورك', community_post: 'نشر بمجتمع تشارك فيه', mention: 'أشار إليك',
};

let currentPage = 1;
let hasMore = true;
let isLoadingMore = false;
let scrollHandlerAttached = false;

export function renderNotificationsPage(container) {
  container.innerHTML = '';
  currentPage = 1;
  hasMore = true;

  const header = createEl('div', { class: 'page-header notifications-header' }, [
    createEl('span', { class: 'page-header__title' }, [t('nav_notifications')]),
    createEl('button', { class: 'link-btn', onclick: markAllRead }, ['وضع الكل كمقروء']),
  ]);

  const list = createEl('div', { id: 'notifications-list' });
  container.append(header, list);

  loadNotifications(true);
  attachInfiniteScroll();
}

async function loadNotifications(replace) {
  const list = document.getElementById('notifications-list');
  if (!list) return;

  if (replace) {
    list.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      list.appendChild(createEl('div', { class: 'notification-item' }, [
        createEl('div', { class: 'skeleton skeleton--avatar' }),
        createEl('div', { class: 'skeleton skeleton--text', style: 'flex:1' }),
      ]));
    }
  }
  isLoadingMore = true;

  try {
    const res = await api.get(`/notifications?page=${currentPage}&limit=20`);
    const notifications = res.data.notifications || [];

    if (replace) list.innerHTML = '';

    if (notifications.length === 0 && currentPage === 1) {
      list.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['لا إشعارات بعد']),
      ]));
      hasMore = false;
      return;
    }

    notifications.forEach((n) => list.appendChild(renderNotificationItem(n)));
    hasMore = notifications.length === 20;
  } catch (err) {
    if (replace) list.innerHTML = '';
    list.appendChild(renderErrorState(err, () => loadNotifications(true)));
  } finally {
    isLoadingMore = false;
  }
}

function attachInfiniteScroll() {
  if (scrollHandlerAttached) return;
  scrollHandlerAttached = true;

  window.addEventListener('scroll', () => {
    if (isLoadingMore || !hasMore) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
    if (nearBottom && document.getElementById('notifications-list')) {
      currentPage += 1;
      loadNotifications(false);
    }
  });
}

function renderNotificationItem(n) {
  const item = createEl('a', {
    href: n.post_id ? `/post/${n.post_id}` : `/profile/${n.actor_username}`,
    'data-link': true,
    class: `notification-item${n.is_read ? '' : ' notification-item--unread'}`,
    onclick: () => {
      if (!n.is_read) {
        n.is_read = true;
        api.put(`/notifications/${n.id}/read`, {}).catch(() => {});
      }
    },
  }, [
    createEl('span', { class: 'notification-item__icon' }, [TYPE_ICONS[n.type] || '•']),
    createEl('img', { class: 'avatar avatar--sm', src: n.actor_avatar || '/img/default-avatar.svg', alt: '' }),
    createEl('div', { class: 'notification-item__body' }, [
      createEl('div', {}, [
        createEl('strong', {}, [n.actor_display_name]),
        ` ${TYPE_TEXT[n.type] || ''}`,
      ]),
      n.post_content ? createEl('div', { class: 'notification-item__preview' }, [n.post_content]) : null,
      createEl('div', { class: 'post-card__time' }, [relativeTime(n.created_at, store.getState().lang)]),
    ]),
  ]);
  return item;
}

async function markAllRead() {
  try {
    await api.put('/notifications/read-all', {});
    showToast('تم', 'success');
    currentPage = 1;
    hasMore = true;
    loadNotifications(true);
  } catch (err) {
    showError(err);
  }
}
