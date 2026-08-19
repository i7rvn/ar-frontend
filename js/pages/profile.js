// ═══════════════════════════════════════════════════════════════
// AR — الملف الشخصي
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { createEl, escapeHTML, sanitizeURL, formatCount } from '../utils.js';
import { showError, showToast, openModal } from '../modals.js';
import { renderPostCard } from './feed.js';

const REPUTATION_LABELS = {
  newcomer: 'وافد جديد', rising: 'صاعد', active: 'نشيط', expert: 'خبير', legendary: 'أسطوري',
};

let activeProfileTab = 'posts';

export async function renderProfilePage(container, username) {
  container.innerHTML = '';
  activeProfileTab = 'posts';

  const skeleton = renderProfileSkeleton();
  container.appendChild(skeleton);

  try {
    const res = await api.get(`/users/${encodeURIComponent(username)}`);
    const profile = res.data;
    skeleton.remove();

    container.appendChild(renderProfileHeader(profile));
    container.appendChild(renderProfileTabs(profile));
    container.appendChild(createEl('div', { id: 'profile-posts-list' }));

    if (profile.canViewPosts) {
      loadProfilePosts(profile);
    } else {
      document.getElementById('profile-posts-list').appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['هذا الحساب خاص']),
        createEl('div', {}, ['تابِعه لترى منشوراته']),
      ]));
    }
  } catch (err) {
    skeleton.remove();
    container.appendChild(createEl('div', { class: 'empty-state' }, [
      createEl('div', { class: 'empty-state__title' }, [err.message || t('common_error')]),
    ]));
  }
}

function renderProfileSkeleton() {
  return createEl('div', { class: 'profile-skeleton' }, [
    createEl('div', { class: 'skeleton', style: 'height:150px' }),
    createEl('div', { class: 'skeleton skeleton--avatar', style: 'width:96px;height:96px;margin-top:-48px;margin-right:16px' }),
  ]);
}

function renderProfileHeader(profile) {
  const currentUser = store.getState().user;
  const isOwnProfile = currentUser && currentUser.id === profile.id;

  const wrap = createEl('div', { class: 'profile-header' });
  const banner = createEl('div', {
    class: 'profile-banner',
    style: profile.banner_url ? `background-image:url(${sanitizeURL(profile.banner_url)})` : '',
  });

  const avatarRow = createEl('div', { class: 'profile-avatar-row' }, [
    createEl('img', { class: 'avatar avatar--lg', src: profile.avatar_url || '/img/default-avatar.svg', alt: '' }),
  ]);

  const actionArea = createEl('div', { class: 'profile-actions' });
  if (isOwnProfile) {
    actionArea.appendChild(createEl('button', {
      class: 'btn btn--glass', onclick: () => openEditProfileModal(profile),
    }, ['تعديل الملف']));
  } else {
    actionArea.appendChild(renderFollowButton(profile));
  }
  avatarRow.appendChild(actionArea);

  const nameBlock = createEl('div', { class: 'profile-name-block' }, [
    createEl('div', { class: 'profile-display-name' }, [
      escapeHTML(profile.display_name),
      profile.is_verified ? createEl('span', { 'aria-label': 'موثّق' }, [' ✓']) : null,
      profile.is_private ? createEl('span', { class: 'profile-private-badge', title: 'حساب خاص' }, [' 🔒']) : null,
    ]),
    createEl('div', { class: 'profile-username' }, [`@${escapeHTML(profile.username)}`]),
    profile.reputation_level ? createEl('span', { class: `reputation-badge reputation-badge--${profile.reputation_level}` }, [
      REPUTATION_LABELS[profile.reputation_level] || profile.reputation_level,
    ]) : null,
  ]);

  const bio = profile.bio ? createEl('div', { class: 'profile-bio' }, [escapeHTML(profile.bio)]) : null;

  const metaRow = createEl('div', { class: 'profile-meta-row' }, [
    profile.location ? createEl('span', {}, [`📍 ${escapeHTML(profile.location)}`]) : null,
    profile.website ? createEl('a', { href: sanitizeURL(profile.website), target: '_blank', rel: 'noopener noreferrer nofollow' }, [`🔗 ${escapeHTML(profile.website)}`]) : null,
    createEl('span', {}, [`انضم ${new Date(profile.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long' })}`]),
  ].filter(Boolean));

  const statsRow = createEl('div', { class: 'profile-stats-row' }, [
    createEl('button', { class: 'profile-stat', onclick: () => openFollowListModal(profile.username, 'following') }, [
      createEl('strong', {}, [formatCount(profile.following_count)]), ' متابَعون',
    ]),
    createEl('button', { class: 'profile-stat', onclick: () => openFollowListModal(profile.username, 'followers') }, [
      createEl('strong', {}, [formatCount(profile.followers_count)]), ' متابِعون',
    ]),
  ]);

  wrap.append(banner, avatarRow, nameBlock, bio, metaRow, statsRow);
  return wrap;
}

function renderFollowButton(profile) {
  let isFollowing = profile.isFollowing;
  const btn = createEl('button', { class: `btn ${isFollowing ? 'btn--glass' : 'btn--primary'}` }, [
    isFollowing ? t('common_following') : t('common_follow'),
  ]);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const wasFollowing = isFollowing;
    try {
      await api.post(`/follows/${profile.id}`, {});
      isFollowing = !wasFollowing;
      btn.textContent = isFollowing ? t('common_following') : t('common_follow');
      btn.className = `btn ${isFollowing ? 'btn--glass' : 'btn--primary'}`;
    } catch (err) {
      showError(err);
    } finally {
      btn.disabled = false;
    }
  });

  return btn;
}

function renderProfileTabs(profile) {
  const tabs = [
    { id: 'posts', label: 'المنشورات' },
    { id: 'replies', label: 'الردود' },
    { id: 'likes', label: 'الإعجابات' },
  ];
  const wrap = createEl('div', { class: 'tabs' });

  tabs.forEach((tab) => {
    const el = createEl('button', {
      class: `tab${activeProfileTab === tab.id ? ' tab--active' : ''}`,
      onclick: () => {
        activeProfileTab = tab.id;
        wrap.querySelectorAll('.tab').forEach((t2) => t2.classList.remove('tab--active'));
        el.classList.add('tab--active');
        if (profile.canViewPosts) loadProfilePosts(profile);
      },
    }, [tab.label]);
    wrap.appendChild(el);
  });

  return wrap;
}

async function loadProfilePosts(profile) {
  const list = document.getElementById('profile-posts-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    list.appendChild(createEl('div', { class: 'skeleton skeleton--text', style: 'margin:16px' }));
  }

  try {
    const res = await api.get(`/feed/user/${profile.id}?type=${activeProfileTab}`);
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

// ─── نافذة تعديل الملف الشخصي ───────────────────────────────────
function openEditProfileModal(profile) {
  const form = createEl('form', {});
  const nameInput = createEl('input', { class: 'field__input', value: profile.display_name, maxlength: '100' });
  const bioInput = createEl('textarea', { class: 'field__input', maxlength: '160', rows: '3' }, [profile.bio || '']);
  const locationInput = createEl('input', { class: 'field__input', value: profile.location || '', maxlength: '100' });
  const websiteInput = createEl('input', { class: 'field__input', value: profile.website || '', type: 'url' });

  form.append(
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, [t('auth_display_name')]), nameInput]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['النبذة']), bioInput]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['الموقع الجغرافي']), locationInput]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['رابط الموقع']), websiteInput]),
  );

  const close = openModal({
    title: 'تعديل الملف',
    bodyEl: form,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: t('common_save'), variant: 'primary',
        onClick: async () => {
          try {
            await api.put('/users/profile', {
              display_name: nameInput.value.trim(),
              bio: bioInput.value.trim(),
              location: locationInput.value.trim(),
              website: websiteInput.value.trim(),
            });
            showToast('تم حفظ التعديلات', 'success');
            close();
            renderProfilePage(document.getElementById('content-column'), profile.username);
          } catch (err) {
            showError(err);
          }
        },
      },
    ],
  });
}

// ─── نافذة قائمة المتابِعين/المتابَعين ──────────────────────────
async function openFollowListModal(username, type) {
  const body = createEl('div', { class: 'follow-list' }, [createEl('div', { class: 'spinner' })]);
  openModal({ title: type === 'followers' ? 'المتابِعون' : 'المتابَعون', bodyEl: body, actions: [] });

  try {
    const profileRes = await api.get(`/users/${encodeURIComponent(username)}`);
    const res = await api.get(`/follows/${profileRes.data.id}/${type}`);
    const users = res.data || [];
    body.innerHTML = '';

    if (users.length === 0) {
      body.appendChild(createEl('p', {}, ['لا يوجد أحد هنا']));
      return;
    }

    users.forEach((u) => {
      body.appendChild(createEl('a', {
        href: `/profile/${u.username}`, 'data-link': true, class: 'follow-list__item',
      }, [
        createEl('img', { class: 'avatar avatar--sm', src: u.avatar_url || '/img/default-avatar.svg', alt: '' }),
        createEl('div', {}, [
          createEl('div', { class: 'post-card__name' }, [escapeHTML(u.display_name)]),
          createEl('div', { class: 'post-card__username' }, [`@${escapeHTML(u.username)}`]),
        ]),
      ]));
    });
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}
