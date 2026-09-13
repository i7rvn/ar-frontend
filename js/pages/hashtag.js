// ═══════════════════════════════════════════════════════════════
// AR — صفحة هاشتاق واحد
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { t } from '../i18n.js';
import { createEl, escapeHTML } from '../utils.js';
import { showError } from '../modals.js';
import { renderPostCard } from './feed.js';

export async function renderHashtagPage(container, tag) {
  container.innerHTML = '';
  container.appendChild(createEl('div', { class: 'page-header' }, [
    createEl('button', { class: 'page-header__back', onclick: () => history.back(), 'aria-label': 'رجوع' }, ['←']),
    createEl('span', { class: 'page-header__title' }, [`#${escapeHTML(tag)}`]),
  ]));

  const list = createEl('div', { id: 'hashtag-posts' });
  container.appendChild(list);

  for (let i = 0; i < 4; i++) {
    list.appendChild(createEl('div', { class: 'post-card' }, [
      createEl('div', { class: 'skeleton skeleton--avatar' }),
      createEl('div', { class: 'skeleton skeleton--text', style: 'flex:1' }),
    ]));
  }

  try {
    const res = await api.get(`/hashtags/${encodeURIComponent(tag)}`);
    const posts = res.data.posts || [];
    list.innerHTML = '';

    if (posts.length === 0) {
      list.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, [t('feed_empty')]),
      ]));
      return;
    }
    posts.forEach((post) => list.appendChild(renderPostCard(post)));
  } catch (err) {
    list.innerHTML = '';
    showError(err);
  }
}
