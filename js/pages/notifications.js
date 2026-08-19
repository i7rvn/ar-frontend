// ═══════════════════════════════════════════════════════════════
// AR — الإشعارات
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, escapeHTML, relativeTime } from '../utils.js';
import { showError, showToast } from '../modals.js';

const TYPE_ICONS = {
  like: '♥', follow: '👤', reply: '↩', repost: '⇄',
  community_post: '◈', mention: '@',
};

const TYPE_TEXT = {
  like: 'أعجب بمنشورك', follow: 'تابعك', reply: 'ردّ على منشورك',
  repost: 'أعاد نشر منشورك', community_post: 'نشر بمجتمع تشارك فيه', mention: 'أشار إليك',
};

export function renderNotificationsPage(container) {
  container.innerHTML = '';

  const header = createEl('div', { class: 'page-header notifications-header' }, [
    createEl('span', { class: 'page-header__title' }, [t('nav_notifications')]),
    createEl('button', { class: 'link-btn', onclick: markAllRead }, ['وضع الكل كمقروء']),
  ]);

  const list = createEl('div', { id: 'notifications-list' });
  container.append(header, list);

  loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('notifications-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    list.appendChild(createEl('div', { class: 'notification-item' }, [
      createEl('div', { class: 'skeleton skeleton--avatar' }),
      createEl('div', { class: 'skeleton skeleton--text', style: 'flex:1' }),
    ]));
  }

  try {
    const res = await api.get('/notifications');
    const notifications = res.data.notifications || [];
    list.innerHTML = '';

    if (notifications.length === 0) {
      list.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['لا إشعارات بعد']),
      ]));
      return;
    }

    notifications.forEach((n) => list.appendChild(renderNotificationItem(n)));
  } catch (err) {
    list.innerHTML = '';
    showError(err);
  }
}

function renderNotificationItem(n) {
  const item = createEl('a', {
    href: n.post_id ? `/post/${n.post_id}` : `/profile/${n.actor_username}`,
    'data-link': true,
    class: `notification-item${n.is_read ? '' : ' notification-item--unread'}`,
  }, [
    createEl('span', { class: 'notification-item__icon' }, [TYPE_ICONS[n.type] || '•']),
    createEl('img', { class: 'avatar avatar--sm', src: n.actor_avatar || '/img/default-avatar.svg', alt: '' }),
    createEl('div', { class: 'notification-item__body' }, [
      createEl('div', {}, [
        createEl('strong', {}, [escapeHTML(n.actor_display_name)]),
        ` ${TYPE_TEXT[n.type] || ''}`,
      ]),
      n.post_content ? createEl('div', { class: 'notification-item__preview' }, [escapeHTML(n.post_content)]) : null,
      createEl('div', { class: 'post-card__time' }, [relativeTime(n.created_at, store.getState().lang)]),
    ]),
  ]);
  return item;
}

async function markAllRead() {
  try {
    await api.put('/notifications/read-all', {});
    showToast('تم', 'success');
    loadNotifications();
  } catch (err) {
    showError(err);
  }
}
