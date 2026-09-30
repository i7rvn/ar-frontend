// ═══════════════════════════════════════════════════════════════
// AR — المجتمعات
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, formatCount, sanitizeURL } from '../utils.js';
import { showError, showToast, openModal, confirmAction } from '../modals.js';
import { openDropdown } from '../dropdown.js';
import { renderPostCard } from './feed.js';

export async function renderCommunitiesPage(container, slug = null) {
  container.innerHTML = '';
  if (slug) {
    await renderSingleCommunity(container, slug);
  } else {
    await renderCommunitiesList(container);
  }
}

// ─── قائمة المجتمعات ─────────────────────────────────────────────
async function renderCommunitiesList(container) {
  const header = createEl('div', { class: 'page-header' }, [
    createEl('span', { class: 'page-header__title' }, [t('nav_communities')]),
    createEl('button', { class: 'btn btn--primary btn--sm', onclick: openCreateCommunityModal }, ['إنشاء مجتمع']),
  ]);
  const body = createEl('div', { id: 'communities-body' });
  container.append(header, body);

  body.appendChild(createEl('div', { class: 'spinner', style: 'margin:24px auto' }));

  try {
    const res = await api.get('/communities');
    body.innerHTML = '';

    const myCommunities = res.myCommunities || [];
    const suggested = res.suggested || [];

    body.appendChild(createEl('div', { class: 'search-section-title' }, ['مجتمعاتي']));
    if (myCommunities.length === 0) {
      body.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['لست عضواً بأي مجتمع بعد']),
      ]));
    } else {
      myCommunities.forEach((c) => body.appendChild(renderCommunityCard(c)));
    }

    if (suggested.length > 0) {
      body.appendChild(createEl('div', { class: 'search-section-title' }, ['مقترحة']));
      suggested.forEach((c) => body.appendChild(renderCommunityCard(c)));
    }
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

function renderCommunityCard(community) {
  return createEl('a', {
    href: `/communities/${community.slug}`, 'data-link': true, class: 'community-card',
  }, [
    createEl('img', { class: 'avatar', src: community.avatar_url || '/img/default-community.svg', alt: '' }),
    createEl('div', { class: 'community-card__body' }, [
      createEl('div', { class: 'post-card__name' }, [community.name]),
      createEl('div', { class: 'post-card__username' }, [`${formatCount(community.members_count)} عضو`]),
    ]),
  ]);
}

function openCreateCommunityModal() {
  const nameInput = createEl('input', { class: 'field__input', placeholder: 'اسم المجتمع', maxlength: '100' });
  const descInput = createEl('textarea', { class: 'field__input', placeholder: 'وصف مختصر', rows: '3' });
  const form = createEl('div', {}, [
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['الاسم']), nameInput]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['الوصف']), descInput]),
  ]);

  const close = openModal({
    title: 'إنشاء مجتمع',
    bodyEl: form,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: 'إنشاء', variant: 'primary',
        onClick: async () => {
          if (nameInput.value.trim().length < 3) {
            showToast('اسم المجتمع قصير جداً', 'error');
            return;
          }
          try {
            const res = await api.post('/communities', { name: nameInput.value.trim(), description: descInput.value.trim() });
            close();
            navigate(`/communities/${res.community.slug}`);
          } catch (err) {
            showError(err);
          }
        },
      },
    ],
  });
}

// ─── صفحة مجتمع واحد ─────────────────────────────────────────────
let activeCommunityTab = 'posts';

let currentRole = null; // دور المستخدم بالمجتمع المعروض (owner/moderator/member/null)

async function renderSingleCommunity(container, slug) {
  activeCommunityTab = 'posts';
  container.appendChild(createEl('div', { class: 'spinner', style: 'margin:40px auto' }));

  try {
    const res = await api.get(`/communities/${encodeURIComponent(slug)}`);
    const { community, isMember, role } = res;
    currentRole = role || null;
    container.innerHTML = '';

    const banner = createEl('div', {
      class: 'profile-banner',
      style: community.banner_url ? `background-image:url(${sanitizeURL(community.banner_url)})` : '',
    });

    const info = createEl('div', { class: 'community-info' }, [
      createEl('img', { class: 'avatar avatar--lg', src: community.avatar_url || '/img/default-community.svg', alt: '' }),
      createEl('div', { class: 'profile-display-name' }, [community.name]),
      createEl('div', { class: 'post-card__username' }, [`${formatCount(community.members_count)} عضو`]),
      community.description ? createEl('div', { class: 'profile-bio' }, [community.description]) : null,
      renderMembershipButton(community, isMember, container, slug),
      currentRole === 'owner' ? createEl('button', {
        class: 'btn btn--glass btn--sm', style: 'margin-inline-start:8px',
        onclick: () => openEditCommunityModal(community, container, slug),
      }, ['تعديل المجتمع']) : null,
    ]);

    const tabs = renderCommunityTabs(community);
    const body = createEl('div', { id: 'community-tab-body' });

    container.append(banner, info, tabs, body);
    loadCommunityTab(community, isMember);
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(createEl('div', { class: 'empty-state' }, [
      createEl('div', { class: 'empty-state__title' }, [err.message || t('common_error')]),
    ]));
  }
}

function renderMembershipButton(community, isMember, container, slug) {
  const btn = createEl('button', { class: `btn ${isMember ? 'btn--glass' : 'btn--primary'}` }, [
    isMember ? 'مغادرة' : 'انضمام',
  ]);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await api.post(`/communities/${slug}/${isMember ? 'leave' : 'join'}`, {});
      renderCommunitiesPage(container, slug);
    } catch (err) {
      showError(err);
    } finally {
      btn.disabled = false;
    }
  });
  return btn;
}

function renderCommunityTabs(community) {
  const tabDefs = [
    { id: 'posts', label: 'المنشورات' },
    { id: 'about', label: 'عن المجتمع' },
    { id: 'members', label: 'الأعضاء' },
  ];
  const wrap = createEl('div', { class: 'tabs' });

  tabDefs.forEach((tab) => {
    const el = createEl('button', {
      class: `tab${activeCommunityTab === tab.id ? ' tab--active' : ''}`,
      onclick: () => {
        activeCommunityTab = tab.id;
        wrap.querySelectorAll('.tab').forEach((t2) => t2.classList.remove('tab--active'));
        el.classList.add('tab--active');
        loadCommunityTab(community);
      },
    }, [tab.label]);
    wrap.appendChild(el);
  });

  return wrap;
}

async function loadCommunityTab(community, isMember) {
  const body = document.getElementById('community-tab-body');
  if (!body) return;
  body.innerHTML = '';
  body.appendChild(createEl('div', { class: 'spinner', style: 'margin:24px auto' }));

  try {
    if (activeCommunityTab === 'about') {
      body.innerHTML = '';
      body.appendChild(createEl('div', { class: 'profile-bio' }, [(community.description || 'لا يوجد وصف')]));
    } else if (activeCommunityTab === 'members') {
      const res = await api.get(`/communities/${community.slug}/members`);
      body.innerHTML = '';
      (res.members || []).forEach((m) => body.appendChild(renderMemberRow(community, m, body)));
    } else {
      const res = await api.get(`/communities/${community.slug}/posts`);
      body.innerHTML = '';
      const posts = res.posts || [];
      if (posts.length === 0) {
        body.appendChild(createEl('div', { class: 'empty-state' }, [
          createEl('div', { class: 'empty-state__title' }, [t('feed_empty')]),
        ]));
      } else {
        posts.forEach((p) => body.appendChild(renderPostCard(p)));
      }
    }
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

const ROLE_LABELS = { owner: 'مالك', moderator: 'مشرف', member: 'عضو' };

// نفس قاعدة الخادم بالضبط (canModerate) — للعرض فقط؛ الخادم هو المرجع الحقيقي
function canModerateMember(targetRole) {
  if (targetRole === 'owner') return false;
  if (currentRole === 'owner') return true;
  return currentRole === 'moderator' && targetRole === 'member';
}

function renderMemberRow(community, m, listBody) {
  const isMuted = m.muted_until && new Date(m.muted_until) > new Date();
  const roleText = ROLE_LABELS[m.role] || m.role;

  const link = createEl('a', {
    href: `/profile/${m.username}`, 'data-link': true, class: 'follow-list__item', style: 'flex:1; min-width:0;',
  }, [
    createEl('img', { class: 'avatar avatar--sm', src: m.avatar_url || '/img/default-avatar.svg', alt: '' }),
    createEl('div', {}, [
      createEl('div', { class: 'post-card__name' }, [m.display_name]),
      createEl('div', { class: 'post-card__username' }, [`@${m.username} · ${roleText}${isMuted ? ' · 🔇 مكتوم' : ''}`]),
    ]),
  ]);

  const row = createEl('div', { style: 'display:flex; align-items:center;' }, [link]);

  if (canModerateMember(m.role)) {
    const slot = createEl('div', { class: 'profile-menu-slot' });
    const btn = createEl('button', { class: 'post-menu-btn', type: 'button', 'aria-label': 'إدارة العضو' }, ['⋯']);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const items = [];
      items.push(isMuted
        ? { label: 'إلغاء الكتم', onClick: () => memberAction(community, m, 'unmute', listBody) }
        : { label: 'كتم 24 ساعة', onClick: () => memberAction(community, m, 'mute', listBody) });
      if (currentRole === 'owner') {
        items.push(m.role === 'moderator'
          ? { label: 'تخفيض إلى عضو', onClick: () => memberAction(community, m, 'demote', listBody) }
          : { label: 'ترقية إلى مشرف', onClick: () => memberAction(community, m, 'promote', listBody) });
      }
      items.push({ label: 'إزالة من المجتمع', danger: true, onClick: () => memberAction(community, m, 'remove', listBody) });
      openDropdown(btn, items);
    });
    slot.appendChild(btn);
    row.appendChild(slot);
  }
  return row;
}

async function memberAction(community, m, action, listBody) {
  const base = `/communities/${community.slug}/members/${encodeURIComponent(m.username)}`;
  try {
    if (action === 'remove') {
      const ok = await confirmAction({
        title: `إزالة @${m.username}`, message: 'سيُزال العضو من المجتمع ويقدر ينضم من جديد. هل تريد المتابعة؟',
      });
      if (!ok) return;
      await api.delete(base);
    } else if (action === 'mute') {
      await api.post(`${base}/mute`, { hours: 24 });
    } else if (action === 'unmute') {
      await api.delete(`${base}/mute`);
    } else if (action === 'promote') {
      await api.post(`${base}/role`, { role: 'moderator' });
    } else if (action === 'demote') {
      await api.post(`${base}/role`, { role: 'member' });
    }
    showToast('تم', 'success');
    loadCommunityTab(community); // إعادة تحميل قائمة الأعضاء لتعكس الحالة الجديدة
  } catch (err) {
    showError(err);
  }
}

function openEditCommunityModal(community, container, slug) {
  const form = createEl('div', {});
  const nameInput = createEl('input', { class: 'field__input', value: community.name, maxlength: '100' });
  const descInput = createEl('textarea', { class: 'field__input', maxlength: '500', rows: '4' }, [community.description || '']);
  form.append(
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['اسم المجتمع']), nameInput]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['الوصف']), descInput]),
  );

  const close = openModal({
    title: 'تعديل المجتمع', bodyEl: form,
    actions: [
      { label: 'إلغاء', onClick: () => close() },
      {
        label: 'حفظ', variant: 'primary',
        onClick: async () => {
          try {
            await api.put(`/communities/${encodeURIComponent(slug)}`, {
              name: nameInput.value.trim(), description: descInput.value.trim(),
            });
            showToast('تم حفظ التعديلات', 'success');
            close();
            renderCommunitiesPage(container, slug);
          } catch (err) {
            showError(err);
          }
        },
      },
    ],
  });
}
