// ═══════════════════════════════════════════════════════════════
// AR — البحث
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { createEl, escapeHTML, debounce } from '../utils.js';
import { showError } from '../modals.js';
import { renderPostCard } from './feed.js';

let activeSearchTab = 'all';
let currentQuery = '';

export function renderSearchPage(container) {
  container.innerHTML = '';
  activeSearchTab = 'all';
  currentQuery = '';

  const page = createEl('div', { class: 'search-page' });
  const inputWrap = createEl('div', { class: 'search-input-wrap' });
  const input = createEl('input', { type: 'search', class: 'field__input search-input', placeholder: 'ابحث بـAR' });
  inputWrap.appendChild(input);

  const tabs = renderSearchTabs();
  const results = createEl('div', { id: 'search-results' });

  page.append(inputWrap, tabs, results);
  container.appendChild(page);

  const doSearch = debounce((q) => {
    currentQuery = q;
    if (q.trim().length < 2) {
      results.innerHTML = '';
      return;
    }
    runSearch(q);
  }, 300);

  input.addEventListener('input', (e) => doSearch(e.target.value));
  input.focus();
}

function renderSearchTabs() {
  const tabDefs = [
    { id: 'all', label: 'الكل' },
    { id: 'users', label: 'أشخاص' },
    { id: 'posts', label: 'منشورات' },
    { id: 'hashtags', label: 'هاشتاقات' },
  ];
  const wrap = createEl('div', { class: 'tabs' });

  tabDefs.forEach((tab) => {
    const el = createEl('button', {
      class: `tab${activeSearchTab === tab.id ? ' tab--active' : ''}`,
      onclick: () => {
        activeSearchTab = tab.id;
        wrap.querySelectorAll('.tab').forEach((t2) => t2.classList.remove('tab--active'));
        el.classList.add('tab--active');
        if (currentQuery.trim().length >= 2) runSearch(currentQuery);
      },
    }, [tab.label]);
    wrap.appendChild(el);
  });

  return wrap;
}

async function runSearch(q) {
  const results = document.getElementById('search-results');
  if (!results) return;
  results.innerHTML = '';
  results.appendChild(createEl('div', { class: 'spinner', style: 'margin:24px auto' }));

  try {
    const res = await api.get(`/search?q=${encodeURIComponent(q)}&type=${activeSearchTab}`);
    results.innerHTML = '';

    const { users = [], posts = [], hashtags = [] } = res.data || {};
    const isEmpty = users.length === 0 && posts.length === 0 && hashtags.length === 0;

    if (isEmpty) {
      results.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['لا نتائج']),
      ]));
      return;
    }

    if (users.length > 0) {
      results.appendChild(createEl('div', { class: 'search-section-title' }, ['أشخاص']));
      users.forEach((u) => results.appendChild(renderUserResult(u)));
    }

    if (hashtags.length > 0) {
      results.appendChild(createEl('div', { class: 'search-section-title' }, ['هاشتاقات']));
      hashtags.forEach((h) => results.appendChild(renderHashtagResult(h)));
    }

    if (posts.length > 0) {
      results.appendChild(createEl('div', { class: 'search-section-title' }, ['منشورات']));
      posts.forEach((p) => results.appendChild(renderPostCard(p)));
    }
  } catch (err) {
    results.innerHTML = '';
    showError(err);
  }
}

function renderUserResult(user) {
  return createEl('a', {
    href: `/profile/${user.username}`, 'data-link': true, class: 'follow-list__item',
  }, [
    createEl('img', { class: 'avatar avatar--sm', src: user.avatar_url || '/img/default-avatar.svg', alt: '' }),
    createEl('div', {}, [
      createEl('div', { class: 'post-card__name' }, [escapeHTML(user.display_name)]),
      createEl('div', { class: 'post-card__username' }, [`@${escapeHTML(user.username)}`]),
    ]),
  ]);
}

function renderHashtagResult(hashtag) {
  return createEl('a', {
    href: `/hashtag/${encodeURIComponent(hashtag.tag)}`, 'data-link': true, class: 'follow-list__item',
  }, [
    createEl('div', {}, [
      createEl('div', { class: 'post-card__name' }, [`#${escapeHTML(hashtag.tag)}`]),
      createEl('div', { class: 'post-card__username' }, [`${hashtag.posts_count || 0} منشور`]),
    ]),
  ]);
}
