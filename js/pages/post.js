// ═══════════════════════════════════════════════════════════════
// AR — صفحة منشور واحد + الردود
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, relativeTime } from '../utils.js';
import { showError, showToast } from '../modals.js';
import { renderPostMenuButton } from '../postMenu.js';
import { renderPostCard, renderPostActions, renderPostMedia } from './feed.js';

export async function renderPostPage(container, postId) {
  container.innerHTML = '';
  container.appendChild(renderHeader('المنشور'));

  const skeleton = createEl('div', { class: 'post-detail' }, [
    createEl('div', { class: 'skeleton skeleton--text', style: 'width:60%' }),
    createEl('div', { class: 'skeleton skeleton--text', style: 'width:90%' }),
  ]);
  container.appendChild(skeleton);

  try {
    const res = await api.get(`/posts/${postId}`);
    const post = res.data;
    skeleton.remove();

    container.appendChild(renderPostDetail(post));
    container.appendChild(renderReplyBox(post, container));
    container.appendChild(createEl('div', { id: 'replies-list' }));

    loadReplies(postId);
  } catch (err) {
    skeleton.remove();
    container.appendChild(createEl('div', { class: 'empty-state' }, [
      createEl('div', { class: 'empty-state__title' }, [err.message || t('common_error')]),
    ]));
  }
}

function renderHeader(title) {
  return createEl('div', { class: 'page-header' }, [
    createEl('button', { class: 'page-header__back', onclick: () => history.back(), 'aria-label': 'رجوع' }, ['←']),
    createEl('span', { class: 'page-header__title' }, [title]),
  ]);
}

function renderPostDetail(post) {
  const wrap = createEl('article', { class: 'post-detail' });

  const header = createEl('div', { class: 'post-card__header' }, [
    createEl('img', { class: 'avatar avatar--sm', src: post.avatar_url || '/img/default-avatar.svg', alt: '' }),
    createEl('span', { class: 'post-card__name' }, [post.display_name]),
    createEl('span', { class: 'post-card__username' }, [`@${post.username}`]),
    createEl('div', { class: 'post-card__menu-slot' }, [
      renderPostMenuButton(post, { onDeleted: () => navigate('/'), onBlocked: () => navigate('/') }),
    ]),
  ]);

  const content = createEl('div', { class: 'post-card__content' }, [post.content]);
  const media = renderPostMedia(post);
  const time = createEl('div', { class: 'post-card__time', style: 'margin-top:8px' }, [
    new Date(post.created_at).toLocaleString(store.getState().lang === 'ar' ? 'ar-DZ' : store.getState().lang),
  ]);

  // نفس مكوّن الإجراءات المستعمل بالفيد بالضبط (إعجاب/رد/إعادة نشر/
  // مشاركة) — بلا نظام موازٍ منفصل لصفحة التفاصيل. زر "رد" هنا يركّز
  // على صندوق الرد أسفل الصفحة بدل التنقل لنفس الصفحة لي إحنا فيها
  const actions = renderPostActions(post, {
    onReplyClick: () => document.getElementById('post-detail-reply-input')?.focus(),
  });

  wrap.append(header, content, media, time, actions);
  return wrap;
}

function renderReplyBox(post) {
  const user = store.getState().user;
  const wrap = createEl('div', { class: 'compose-box' });
  const avatar = createEl('img', { class: 'avatar', src: user?.avatar_url || '/img/default-avatar.svg', alt: '' });
  const textarea = createEl('textarea', { id: 'post-detail-reply-input', class: 'compose-box__input', placeholder: t('feed_reply'), rows: '2' });
  const postBtn = createEl('button', { class: 'btn btn--primary btn--sm', disabled: true }, [t('feed_reply')]);

  textarea.addEventListener('input', () => { postBtn.disabled = textarea.value.trim().length === 0; });

  postBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) return;
    postBtn.disabled = true;
    try {
      await api.post('/posts', { content, replyToId: post.id });
      textarea.value = '';
      showToast('تم نشر ردك', 'success');
      loadReplies(post.id);
    } catch (err) {
      showError(err);
    } finally {
      postBtn.disabled = false;
    }
  });

  const toolbar = createEl('div', { class: 'compose-box__toolbar' }, [postBtn]);
  wrap.append(avatar, createEl('div', { class: 'compose-box__body' }, [textarea, toolbar]));
  return wrap;
}

async function loadReplies(postId) {
  const list = document.getElementById('replies-list');
  if (!list) return;
  list.innerHTML = '';

  try {
    const res = await api.get(`/posts/${postId}/replies`);
    const replies = res.data || [];
    if (replies.length === 0) {
      list.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['لا ردود بعد']),
      ]));
      return;
    }
    replies.forEach((reply) => list.appendChild(renderPostCard(reply)));
  } catch (err) {
    showError(err);
  }
}
