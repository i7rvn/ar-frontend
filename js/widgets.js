// ═══════════════════════════════════════════════════════════════
// AR — عمود الويدجت الجانبي (بحث + الرائج + من تتابع)
// نفس محتوى العمود الأيمن بـX. تُستدعى مرة واحدة من renderShell()
// بعد تسجيل الدخول، وتُعاد تحديثها عند تغيّر المسار (اقتراحات
// المتابعة تتغيّر بعد أي متابعة جديدة يديرها المستخدم).
// ═══════════════════════════════════════════════════════════════

import { api } from './api.js';
import { t } from './i18n.js';
import { createEl, escapeHTML } from './utils.js';
import { navigate } from './router.js';
import { showError } from './modals.js';

export async function renderWidgetsColumn(container) {
  container.innerHTML = '';
  container.appendChild(renderSearchBox());

  const trendingCard = createEl('div', { class: 'widget-card' }, [renderSkeleton(3)]);
  const suggestionsCard = createEl('div', { class: 'widget-card' }, [renderSkeleton(3)]);
  container.append(trendingCard, suggestionsCard);

  // الطلبين بالتوازي — واحد ماشي يبطّئ الآخر
  loadTrending(trendingCard);
  loadSuggestions(suggestionsCard);
}

function renderSearchBox() {
  const input = createEl('input', {
    class: 'field__input widget-search__input',
    type: 'search',
    placeholder: t('widgets_search_placeholder'),
    'aria-label': t('widgets_search_placeholder'),
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      navigate(`/search?q=${encodeURIComponent(input.value.trim())}`);
    }
  });
  return createEl('div', { class: 'widget-search' }, [input]);
}

function renderSkeleton(rows) {
  const wrap = createEl('div', { class: 'widget-card__skeleton' });
  for (let i = 0; i < rows; i++) {
    wrap.appendChild(createEl('div', { class: 'skeleton skeleton--text', style: 'width: 80%' }));
  }
  return wrap;
}

async function loadTrending(card) {
  try {
    const res = await api.get('/hashtags/trending');
    const tags = (res.data || []).slice(0, 5);
    card.innerHTML = '';
    card.appendChild(createEl('div', { class: 'widget-card__title' }, [t('widgets_trending_title')]));

    if (!tags.length) {
      card.appendChild(createEl('div', { class: 'widget-card__empty' }, [t('feed_empty')]));
      return;
    }

    tags.forEach((tag) => {
      const row = createEl('a', {
        href: `/hashtag/${encodeURIComponent(tag.tag)}`, 'data-link': true,
        class: 'trend-row',
      }, [
        createEl('div', { class: 'trend-row__tag' }, [`#${escapeHTML(tag.tag)}`]),
        createEl('div', { class: 'trend-row__count' }, [`${formatCount(tag.recent_posts ?? tag.posts_count)} ${t('widgets_trending_posts')}`]),
      ]);
      card.appendChild(row);
    });
  } catch (err) {
    card.innerHTML = '';
    card.appendChild(createEl('div', { class: 'widget-card__title' }, [t('widgets_trending_title')]));
    card.appendChild(createEl('div', { class: 'widget-card__empty' }, [t('common_error')]));
  }
}

async function loadSuggestions(card) {
  try {
    const res = await api.get('/users/suggestions?limit=3');
    const users = res.data || [];
    card.innerHTML = '';
    card.appendChild(createEl('div', { class: 'widget-card__title' }, [t('widgets_suggestions_title')]));

    if (!users.length) {
      card.appendChild(createEl('div', { class: 'widget-card__empty' }, [t('feed_empty')]));
      return;
    }

    users.forEach((user) => card.appendChild(renderSuggestionRow(user)));
  } catch (err) {
    card.innerHTML = '';
    card.appendChild(createEl('div', { class: 'widget-card__title' }, [t('widgets_suggestions_title')]));
    card.appendChild(createEl('div', { class: 'widget-card__empty' }, [t('common_error')]));
  }
}

function renderSuggestionRow(user) {
  const followBtn = createEl('button', { class: 'btn btn--glass btn--sm suggestion-row__btn' }, [t('common_follow')]);

  followBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    followBtn.disabled = true;
    try {
      await api.post(`/follows/${user.id}`);
      followBtn.textContent = t('common_following');
      followBtn.classList.add('suggestion-row__btn--done');
    } catch (err) {
      followBtn.disabled = false;
      showError(err);
    }
  });

  return createEl('a', {
    href: `/profile/${user.username}`, 'data-link': true, class: 'suggestion-row',
  }, [
    createEl('img', {
      class: 'avatar avatar--sm', src: user.avatar_url || '/img/default-avatar.png', alt: '',
    }),
    createEl('div', { class: 'suggestion-row__body' }, [
      createEl('div', { class: 'suggestion-row__name' }, [
        escapeHTML(user.display_name || user.username),
        user.is_verified ? createEl('span', { class: 'verified-badge', 'aria-label': 'verified' }, [' ✓']) : '',
      ]),
      createEl('div', { class: 'suggestion-row__username' }, [`@${escapeHTML(user.username)}`]),
    ]),
    followBtn,
  ]);
}

function formatCount(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
