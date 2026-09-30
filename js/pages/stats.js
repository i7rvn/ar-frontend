// ═══════════════════════════════════════════════════════════════
// AR — إحصائيات صانع المحتوى
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { t } from '../i18n.js';
import { createEl, formatCount } from '../utils.js';
import { showError } from '../modals.js';

let selectedPeriod = 7;

export function renderStatsPage(container) {
  container.innerHTML = '';
  selectedPeriod = 7;

  const header = createEl('div', { class: 'page-header' }, [
    createEl('span', { class: 'page-header__title' }, [t('nav_stats')]),
  ]);

  const periodSwitch = createEl('div', { class: 'period-switch' });
  [7, 28].forEach((days) => {
    const btn = createEl('button', {
      class: `tab${selectedPeriod === days ? ' tab--active' : ''}`,
      onclick: () => {
        selectedPeriod = days;
        periodSwitch.querySelectorAll('.tab').forEach((b) => b.classList.remove('tab--active'));
        btn.classList.add('tab--active');
        loadStats();
      },
    }, [`آخر ${days} يوم`]);
    periodSwitch.appendChild(btn);
  });

  const body = createEl('div', { id: 'stats-body' });
  container.append(header, periodSwitch, body);

  loadStats();
}

async function loadStats() {
  const body = document.getElementById('stats-body');
  if (!body) return;
  body.innerHTML = '';
  body.appendChild(createEl('div', { class: 'spinner', style: 'margin:40px auto' }));

  try {
    const res = await api.get(`/stats?days=${selectedPeriod}`);
    body.innerHTML = '';

    const cardsGrid = createEl('div', { class: 'stats-grid' }, [
      renderStatCard('الانطباعات', res.impressions),
      renderStatCard('التفاعل', res.engagement),
      renderStatCard('زيارات الملف', res.profileVisits),
      renderStatCard('متابعون جدد', res.newFollowers),
    ]);

    const topPostsSection = createEl('div', {}, [
      createEl('div', { class: 'search-section-title' }, ['أفضل المنشورات']),
    ]);

    if (!res.topPosts || res.topPosts.length === 0) {
      topPostsSection.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['لا بيانات كافية بعد']),
      ]));
    } else {
      res.topPosts.forEach((post) => {
        topPostsSection.appendChild(createEl('div', { class: 'top-post-row' }, [
          createEl('div', { class: 'post-card__content' }, [(post.content?.slice(0, 100) || '')]),
          createEl('div', { class: 'top-post-row__stats' }, [
            `${formatCount(post.views_count || 0)} مشاهدة · ${formatCount(post.likes_count || 0)} إعجاب`,
          ]),
        ]));
      });
    }

    body.append(cardsGrid, topPostsSection);
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

function renderStatCard(label, data) {
  const change = data?.changePercent ?? 0;
  const isPositive = change >= 0;
  return createEl('div', { class: 'stat-card' }, [
    createEl('div', { class: 'stat-card__label' }, [label]),
    createEl('div', { class: 'stat-card__value' }, [formatCount(data?.value ?? 0)]),
    createEl('div', { class: `stat-card__change ${isPositive ? 'stat-card__change--up' : 'stat-card__change--down'}` }, [
      `${isPositive ? '▲' : '▼'} ${Math.abs(change)}%`,
    ]),
  ]);
}
