// ═══════════════════════════════════════════════════════════════
// AR — الفيد الرئيسي
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, escapeHTML, relativeTime, formatCount } from '../utils.js';
import { showError, showToast } from '../modals.js';

const MAX_POST_LENGTH = 280; // حد افتراضي بالواجهة فقط، الخادم هو الفيصل الحقيقي
let activeTab = 'for-you';
let currentPage = 1;
let isLoadingMore = false;
let hasMore = true;
let scrollHandlerAttached = false;

export function renderFeedPage(container) {
  container.innerHTML = '';
  currentPage = 1;
  hasMore = true;

  const page = createEl('div', { class: 'feed-page' });
  page.appendChild(renderComposeBox());
  page.appendChild(renderTabs());
  page.appendChild(createEl('div', { id: 'feed-list', class: 'feed-list' }));

  container.appendChild(page);
  loadFeed(activeTab, true);
  attachInfiniteScroll();
}

// ─── صندوق النشر ────────────────────────────────────────────────
function renderComposeBox() {
  const user = store.getState().user;
  const wrap = createEl('div', { class: 'compose-box' });

  const avatar = createEl('img', {
    class: 'avatar', src: user?.avatar_url || '/img/default-avatar.svg', alt: '',
  });

  const textarea = createEl('textarea', {
    class: 'compose-box__input', placeholder: t('feed_compose_placeholder'), rows: '2',
  });

  const mediaPreview = createEl('div', { class: 'compose-box__media-preview' });
  let selectedFiles = [];

  const ring = buildCharRing();
  const fileInput = createEl('input', { type: 'file', accept: 'image/*,video/*', multiple: true, style: 'display:none' });
  const mediaBtn = createEl('button', { type: 'button', class: 'compose-box__icon-btn', 'aria-label': 'إضافة صورة' }, ['🖼']);
  const postBtn = createEl('button', { type: 'button', class: 'btn btn--primary btn--sm', disabled: true }, [t('feed_post_btn')]);

  mediaBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    selectedFiles = Array.from(fileInput.files).slice(0, 4);
    renderMediaPreview();
  });

  function renderMediaPreview() {
    mediaPreview.innerHTML = '';
    selectedFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const item = createEl('div', { class: 'compose-box__media-item' }, [
        createEl('img', { src: url, alt: '' }),
        createEl('button', {
          type: 'button', class: 'compose-box__media-remove',
          onclick: () => { selectedFiles.splice(idx, 1); renderMediaPreview(); },
        }, ['×']),
      ]);
      mediaPreview.appendChild(item);
    });
  }

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    ring.update(len, MAX_POST_LENGTH);
    postBtn.disabled = len === 0 || len > MAX_POST_LENGTH;
  });

  postBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content && selectedFiles.length === 0) return;

    postBtn.disabled = true;
    try {
      let mediaUrls = [];
      let mediaTypes = [];
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append('media', f));
        const uploadRes = await api.upload('/media/upload', formData);
        mediaUrls = uploadRes.data.files.map((f) => f.url);
        mediaTypes = uploadRes.data.files.map((f) => f.type || 'image');
      }

      await api.post('/posts', { content, mediaUrls, mediaTypes });
      textarea.value = '';
      selectedFiles = [];
      renderMediaPreview();
      ring.update(0, MAX_POST_LENGTH);
      showToast(t('feed_post_btn') + ' ✓', 'success');
      loadFeed(activeTab, true);
    } catch (err) {
      showError(err);
    } finally {
      postBtn.disabled = false;
    }
  });

  const toolbar = createEl('div', { class: 'compose-box__toolbar' }, [mediaBtn, fileInput, ring.svg, postBtn]);
  wrap.append(avatar, createEl('div', { class: 'compose-box__body' }, [textarea, mediaPreview, toolbar]));
  return wrap;
}

function buildCharRing() {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 28 28');
  svg.setAttribute('class', 'char-ring');

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', '14'); bg.setAttribute('cy', '14'); bg.setAttribute('r', String(radius));
  bg.setAttribute('class', 'char-ring__bg');

  const progress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progress.setAttribute('cx', '14'); progress.setAttribute('cy', '14'); progress.setAttribute('r', String(radius));
  progress.setAttribute('class', 'char-ring__progress');
  progress.setAttribute('stroke-dasharray', String(circumference));
  progress.setAttribute('stroke-dashoffset', String(circumference));

  svg.append(bg, progress);

  function update(len, max) {
    const ratio = Math.min(len / max, 1);
    progress.setAttribute('stroke-dashoffset', String(circumference * (1 - ratio)));
    progress.classList.remove('char-ring__progress--warn', 'char-ring__progress--danger');
    if (len > max) progress.classList.add('char-ring__progress--danger');
    else if (ratio > 0.85) progress.classList.add('char-ring__progress--warn');
  }

  return { svg, update };
}

// ─── التبويبات ───────────────────────────────────────────────────
function renderTabs() {
  const tabs = [
    { id: 'for-you', label: t('feed_tab_foryou') },
    { id: 'following', label: t('feed_tab_following') },
    { id: 'trending', label: t('feed_tab_trending') },
  ];
  const wrap = createEl('div', { class: 'tabs' });

  tabs.forEach((tab) => {
    const el = createEl('button', {
      class: `tab${activeTab === tab.id ? ' tab--active' : ''}`,
      onclick: () => {
        activeTab = tab.id;
        currentPage = 1;
        hasMore = true;
        wrap.querySelectorAll('.tab').forEach((t2) => t2.classList.remove('tab--active'));
        el.classList.add('tab--active');
        loadFeed(activeTab, true);
      },
    }, [tab.label]);
    wrap.appendChild(el);
  });

  return wrap;
}

// ─── تحميل الفيد ─────────────────────────────────────────────────
async function loadFeed(tab, replace) {
  const list = document.getElementById('feed-list');
  if (!list) return;

  if (replace) {
    list.innerHTML = '';
    renderSkeletons(list);
  }
  isLoadingMore = true;

  try {
    const res = await api.get(`/feed/${tab}?page=${currentPage}&limit=20`);
    const posts = res.data.posts || [];

    if (replace) list.innerHTML = '';

    if (posts.length === 0 && currentPage === 1) {
      list.appendChild(renderEmptyState());
      hasMore = false;
      return;
    }

    posts.forEach((post) => list.appendChild(renderPostCard(post)));
    hasMore = posts.length === 20;
  } catch (err) {
    if (replace) list.innerHTML = '';
    list.appendChild(renderErrorState(err, () => loadFeed(tab, true)));
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
    if (nearBottom && document.getElementById('feed-list')) {
      currentPage += 1;
      loadFeed(activeTab, false);
    }
  });
}

// ─── بطاقة منشور ─────────────────────────────────────────────────
export function renderPostCard(post) {
  const card = createEl('article', { class: 'post-card' });
  const avatar = createEl('img', {
    class: 'avatar', src: post.avatar_url || '/img/default-avatar.svg', alt: '',
    onclick: () => navigate(`/profile/${post.username}`),
  });

  const header = createEl('div', { class: 'post-card__header' }, [
    createEl('span', { class: 'post-card__name' }, [escapeHTML(post.display_name)]),
    post.is_verified ? createEl('span', { 'aria-label': 'موثّق' }, ['✓']) : null,
    createEl('span', { class: 'post-card__username' }, [`@${escapeHTML(post.username)}`]),
    createEl('span', { class: 'post-card__time' }, [`· ${relativeTime(post.created_at, store.getState().lang)}`]),
  ]);

  const content = createEl('div', {
    class: 'post-card__content', onclick: () => navigate(`/post/${post.id}`),
  }, [escapeHTML(post.content)]);

  const media = renderPostMedia(post);
  const actions = renderPostActions(post);

  const body = createEl('div', { class: 'post-card__body' }, [header, content, media, actions]);
  card.append(avatar, body);
  return card;
}

function renderPostMedia(post) {
  if (!post.media_urls || post.media_urls.length === 0) return null;
  const grid = createEl('div', { class: 'post-media-grid' });
  post.media_urls.forEach((url) => {
    grid.appendChild(createEl('img', { src: url, alt: '', loading: 'lazy', class: 'post-media-item' }));
  });
  return grid;
}

function renderPostActions(post) {
  const state = { liked: post.liked_by_me || false, likesCount: post.likes_count || 0, repostsCount: post.reposts_count || 0 };

  const likeBtn = createEl('button', {
    class: `post-action${state.liked ? ' post-action--liked' : ''}`,
  }, [`♡ ${formatCount(state.likesCount)}`]);

  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    // Optimistic UI: نبدّل الشكل فوراً قبل رد الخادم
    const wasLiked = state.liked;
    state.liked = !wasLiked;
    state.likesCount += wasLiked ? -1 : 1;
    renderLikeBtn();

    try {
      await api.post(`/posts/${post.id}/like`, {});
    } catch (err) {
      state.liked = wasLiked;
      state.likesCount += wasLiked ? 1 : -1;
      renderLikeBtn();
      showError(err);
    }
  });

  function renderLikeBtn() {
    likeBtn.className = `post-action${state.liked ? ' post-action--liked' : ''}`;
    likeBtn.textContent = `${state.liked ? '♥' : '♡'} ${formatCount(state.likesCount)}`;
  }
  renderLikeBtn();

  const replyBtn = createEl('button', {
    class: 'post-action', onclick: (e) => { e.stopPropagation(); navigate(`/post/${post.id}`); },
  }, [`↩ ${formatCount(post.replies_count || 0)}`]);

  const repostBtn = createEl('button', { class: 'post-action' }, [`⇄ ${formatCount(state.repostsCount)}`]);
  repostBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    repostBtn.disabled = true;
    try {
      await api.post('/posts', { repostOfId: post.id });
      state.repostsCount += 1;
      repostBtn.classList.add('post-action--reposted');
      repostBtn.textContent = `⇄ ${formatCount(state.repostsCount)}`;
      showToast(t('feed_repost') + ' ✓', 'success');
    } catch (err) {
      showError(err);
    } finally {
      repostBtn.disabled = false;
    }
  });

  const shareBtn = createEl('button', {
    class: 'post-action',
    onclick: async (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}/post/${post.id}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast('تم نسخ الرابط', 'success');
      } catch {
        showToast(url, 'info');
      }
    },
  }, ['↗']);

  return createEl('div', { class: 'post-card__actions' }, [replyBtn, repostBtn, likeBtn, shareBtn]);
}

// ─── حالات مساعدة ───────────────────────────────────────────────
function renderSkeletons(container) {
  for (let i = 0; i < 4; i++) {
    container.appendChild(createEl('div', { class: 'post-card' }, [
      createEl('div', { class: 'skeleton skeleton--avatar' }),
      createEl('div', { class: 'post-card__body' }, [
        createEl('div', { class: 'skeleton skeleton--text', style: 'width:40%' }),
        createEl('div', { class: 'skeleton skeleton--text', style: 'width:90%' }),
        createEl('div', { class: 'skeleton skeleton--text', style: 'width:60%' }),
      ]),
    ]));
  }
}

function renderEmptyState() {
  return createEl('div', { class: 'empty-state' }, [
    createEl('div', { class: 'empty-state__title' }, [t('feed_empty')]),
  ]);
}

function renderErrorState(err, onRetry) {
  return createEl('div', { class: 'empty-state' }, [
    createEl('div', { class: 'empty-state__title' }, [err.status === 0 ? t('common_network_error') : t('common_error')]),
    createEl('button', { class: 'btn btn--glass', onclick: onRetry }, [t('common_retry')]),
  ]);
}
