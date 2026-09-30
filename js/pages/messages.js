// ═══════════════════════════════════════════════════════════════
// AR — الرسائل (قائمة محادثات + دردشة فورية)
//
// ملاحظة: الرسائل نص عادٍ حالياً (Backend لا يوفّر تشفير طرف لطرف
// حقيقي بعد رغم وجود جداول المفاتيح). لا نعرض أي إيحاء بصري بتشفير
// (قفل، أيقونة أمان) تفادياً لإعطاء إحساس أمان زائف.
// ═══════════════════════════════════════════════════════════════

import { api, uploadWithProgress } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, relativeTime, debounce } from '../utils.js';
import { showError, showToast, openModal } from '../modals.js';
import { wsOn, wsSend } from '../ws.js';

let currentConversationId = null;
let typingTimeout = null;
let wsCleanups = [];

export async function renderMessagesPage(container, conversationId = null) {
  container.innerHTML = '';
  currentConversationId = conversationId;
  cleanupListeners();

  const layout = createEl('div', { class: 'messages-layout' });
  const listPane = createEl('div', { class: `messages-list-pane${conversationId ? ' messages-list-pane--hidden-mobile' : ''}` });
  const listHeader = createEl('div', { class: 'page-header' }, [
    createEl('span', { class: 'page-header__title' }, [t('nav_messages')]),
    createEl('button', { class: 'btn btn--glass btn--sm', onclick: openNewConversationModal }, ['+ جديدة']),
  ]);
  const listBody = createEl('div', { id: 'conversations-list-body' });
  listPane.append(listHeader, listBody);
  const chatPane = createEl('div', { class: `messages-chat-pane${!conversationId ? ' messages-chat-pane--hidden-mobile' : ''}`, id: 'chat-pane' });

  layout.append(listPane, chatPane);
  container.appendChild(layout);

  await loadConversationsList(listBody);

  if (conversationId) {
    await loadConversation(conversationId, chatPane);
  } else {
    chatPane.appendChild(createEl('div', { class: 'empty-state' }, [
      createEl('div', { class: 'empty-state__title' }, ['اختر محادثة']),
    ]));
  }

  setupWebSocketListeners(chatPane);
}

function cleanupListeners() {
  wsCleanups.forEach((fn) => fn());
  wsCleanups = [];
}

// ─── نافذة "محادثة جديدة" (مباشرة أو مجموعة) ─────────────────────
function openNewConversationModal() {
  let mode = 'direct'; // 'direct' | 'group'
  const selectedUsers = new Map(); // id -> user object، لوضع المجموعة فقط

  const modeRow = createEl('div', { style: 'display:flex; gap:8px; margin-bottom:12px;' });
  const directBtn = createEl('button', { type: 'button', class: 'btn btn--glass btn--sm' }, ['محادثة مباشرة']);
  const groupBtn = createEl('button', { type: 'button', class: 'btn btn--glass btn--sm' }, ['مجموعة جديدة']);
  modeRow.append(directBtn, groupBtn);

  const groupNameInput = createEl('input', {
    class: 'field__input', placeholder: 'اسم المجموعة', style: 'display:none; margin-bottom:12px;',
  });
  const chipsRow = createEl('div', { style: 'display:none; flex-wrap:wrap; gap:6px; margin-bottom:12px;' });

  const searchInput = createEl('input', { class: 'field__input', placeholder: 'ابحث عن مستخدم...' });
  const resultsList = createEl('div', { style: 'max-height:240px; overflow-y:auto; margin-top:8px;' });

  let createBtn = null; // زر "إنشاء المجموعة" — يُربط بعد فتح النافذة
  function refreshModeUI() {
    directBtn.classList.toggle('btn--primary', mode === 'direct');
    groupBtn.classList.toggle('btn--primary', mode === 'group');
    groupNameInput.style.display = mode === 'group' ? '' : 'none';
    chipsRow.style.display = mode === 'group' ? 'flex' : 'none';
    // بالمحادثة المباشرة، اختيار المستخدم نفسه ينشئ المحادثة — الزر بلا معنى
    if (createBtn) createBtn.style.display = mode === 'group' ? '' : 'none';
  }
  directBtn.addEventListener('click', () => { mode = 'direct'; refreshModeUI(); });
  groupBtn.addEventListener('click', () => { mode = 'group'; refreshModeUI(); });
  refreshModeUI();

  function renderChips() {
    chipsRow.innerHTML = '';
    selectedUsers.forEach((u) => {
      chipsRow.appendChild(createEl('span', { class: 'badge badge--neutral' }, [
        `@${u.username} `,
        createEl('button', {
          type: 'button', style: 'background:none;border:none;cursor:pointer;color:inherit;',
          onclick: () => { selectedUsers.delete(u.id); renderChips(); },
        }, ['×']),
      ]));
    });
  }

  const doSearch = debounce(async (q) => {
    if (q.trim().length < 2) { resultsList.innerHTML = ''; return; }
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
      resultsList.innerHTML = '';
      (res.data || []).forEach((u) => {
        if (u.id === store.getState().user.id) return; // ما نعرضش نفسي بالنتائج
        const row = createEl('div', {
          class: 'suggestion-row', style: 'cursor:pointer;',
          onclick: () => handlePick(u),
        }, [
          createEl('img', { class: 'avatar avatar--sm', src: u.avatar_url || '/img/default-avatar.svg', alt: '' }),
          createEl('div', {}, [
            createEl('div', {}, [u.display_name]),
            createEl('div', { style: 'color:var(--text-tertiary); font-size:13px;' }, [`@${u.username}`]),
          ]),
        ]);
        resultsList.appendChild(row);
      });
    } catch (err) {
      showError(err);
    }
  }, 300);
  searchInput.addEventListener('input', (e) => doSearch(e.target.value));

  async function handlePick(u) {
    if (mode === 'direct') {
      close();
      try {
        const res = await api.post('/messages/conversations/direct', { userId: u.id });
        navigate(`/messages/${res.data.conversationId}`);
      } catch (err) {
        showError(err);
      }
    } else {
      selectedUsers.set(u.id, u);
      renderChips();
      searchInput.value = '';
      resultsList.innerHTML = '';
    }
  }

  const body = createEl('div', {}, [modeRow, groupNameInput, chipsRow, searchInput, resultsList]);

  const close = openModal({
    title: 'محادثة جديدة',
    bodyEl: body,
    actions: [
      { label: 'إلغاء', onClick: () => close() },
      {
        label: 'إنشاء المجموعة', variant: 'primary',
        onClick: async () => {
          const name = groupNameInput.value.trim();
          if (!name) { showToast('اكتب اسم المجموعة', 'error'); return; }
          // الخادم يشترط عضوين على الأقل (غير المنشئ) — نفس القاعدة هنا
          if (selectedUsers.size < 2) { showToast('أضف عضوين على الأقل', 'error'); return; }
          try {
            const res = await api.post('/messages/conversations/group', {
              name, memberIds: [...selectedUsers.keys()],
            });
            close();
            navigate(`/messages/${res.data.conversationId}`);
          } catch (err) {
            showError(err);
          }
        },
      },
    ],
  });

  // آخر نافذة مفتوحة هي نافذتنا — نلتقط زرها الرئيسي لإخفائه بوضع المباشر
  const overlays = document.querySelectorAll('.modal-overlay');
  createBtn = overlays[overlays.length - 1]?.querySelector('.modal-footer .btn--primary') || null;
  refreshModeUI();
}

// ─── قائمة المحادثات ────────────────────────────────────────────
async function loadConversationsList(listPane) {
  listPane.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    listPane.appendChild(createEl('div', { class: 'conversation-item' }, [
      createEl('div', { class: 'skeleton skeleton--avatar' }),
      createEl('div', { class: 'skeleton skeleton--text', style: 'flex:1' }),
    ]));
  }

  try {
    const res = await api.get('/messages/conversations');
    const conversations = res.data || [];
    listPane.innerHTML = '';

    if (conversations.length === 0) {
      listPane.appendChild(createEl('div', { class: 'empty-state' }, [
        createEl('div', { class: 'empty-state__title' }, ['لا محادثات بعد']),
      ]));
      return;
    }

    conversations.forEach((conv) => {
      const item = createEl('a', {
        href: `/messages/${conv.id}`, 'data-link': true,
        class: `conversation-item${conv.id === currentConversationId ? ' conversation-item--active' : ''}`,
      }, [
        createEl('img', { class: 'avatar', src: conv.display_avatar || '/img/default-avatar.svg', alt: '' }),
        createEl('div', { class: 'conversation-item__body' }, [
          createEl('div', { class: 'conversation-item__name' }, [(conv.display_name || 'محادثة')]),
          createEl('div', { class: 'conversation-item__preview' }, [(conv.last_msg_text || '')]),
        ]),
        conv.unread_count > 0 ? createEl('span', { class: 'unread-badge' }, [String(conv.unread_count)]) : null,
      ]);
      listPane.appendChild(item);
    });
  } catch (err) {
    listPane.innerHTML = '';
    showError(err);
  }
}

// ─── منطقة الدردشة ──────────────────────────────────────────────
async function loadConversation(conversationId, chatPane) {
  chatPane.innerHTML = '';
  chatPane.appendChild(createEl('div', { class: 'spinner', style: 'margin:40px auto' }));

  try {
    const res = await api.get(`/messages/conversations/${conversationId}/messages`);
    const messages = res.data || [];
    chatPane.innerHTML = '';

    const header = createEl('div', { class: 'page-header' }, [
      createEl('button', {
        class: 'page-header__back', onclick: () => navigate('/messages'), 'aria-label': 'رجوع',
      }, ['←']),
    ]);

    const messagesList = createEl('div', { class: 'chat-messages', id: 'chat-messages' });
    const typingIndicator = createEl('div', { class: 'typing-indicator', id: 'typing-indicator', style: 'display:none' }, ['يكتب الآن...']);

    const currentUserId = store.getState().user.id;
    messages.forEach((msg) => messagesList.appendChild(renderMessageBubble(msg, currentUserId)));

    const inputBar = renderMessageInput(conversationId, messagesList);

    chatPane.append(header, messagesList, typingIndicator, inputBar);
    messagesList.scrollTop = messagesList.scrollHeight;

    wsSend('join:room', { conversationId });

    // إعلام الطرف الآخر بأن الرسائل وصلت (تسليم)
    messages.forEach((msg) => {
      if (msg.sender_id !== currentUserId) {
        wsSend('message:delivered', { conversationId, messageId: msg.id });
      }
    });
    wsSend('message:read', { conversationId });
  } catch (err) {
    chatPane.innerHTML = '';
    chatPane.appendChild(createEl('div', { class: 'empty-state' }, [
      createEl('div', { class: 'empty-state__title' }, [err.message || t('common_error')]),
    ]));
  }
}

function renderMessageBubble(msg, currentUserId) {
  const isMine = msg.sender_id === currentUserId;
  const bubble = createEl('div', { class: `chat-bubble${isMine ? ' chat-bubble--mine' : ''}` });

  if (msg.is_deleted) {
    bubble.appendChild(createEl('div', { class: 'chat-bubble__text chat-bubble__text--deleted' }, ['[رسالة محذوفة]']));
  } else {
    if (msg.media_url) {
      const mediaEl = msg.msg_type === 'video'
        ? createEl('video', { src: msg.media_url, controls: true, class: 'chat-bubble__media' })
        : createEl('img', { src: msg.media_url, alt: '', loading: 'lazy', class: 'chat-bubble__media' });
      bubble.appendChild(mediaEl);
    }
    // الرسائل بوسائط بلا تعليق تُخزَّن بعلامة نصية بسيطة (📷/🎥) بدل
    // نص فارغ — الباك اند يتطلب encryptedContent غير فارغ دائماً.
    // ما نعرضهاش كنص مكرر إذا كانت هي فعلاً مجرد تلك العلامة
    const isMediaPlaceholder = ['📷 صورة', '🎥 فيديو'].includes(msg.encrypted_content);
    if (msg.encrypted_content && !isMediaPlaceholder) {
      bubble.appendChild(createEl('div', { class: 'chat-bubble__text' }, [msg.encrypted_content]));
    }
  }

  const meta = createEl('div', { class: 'chat-bubble__meta' }, [
    createEl('span', {}, [new Date(msg.created_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })]),
  ]);

  if (isMine && !msg.is_deleted) {
    meta.appendChild(renderStatusTicks(msg));
  }

  bubble.appendChild(meta);
  return bubble;
}

function renderStatusTicks(msg) {
  let status = 'sent';
  if (msg.read_count > 0) status = 'read';
  else if (msg.delivered_count > 0) status = 'delivered';

  const ticks = { sent: '✓', delivered: '✓✓', read: '✓✓' };
  return createEl('span', { class: `msg-status msg-status--${status}` }, [ticks[status]]);
}

function renderMessageInput(conversationId, messagesList) {
  const wrap = createEl('div', { class: 'chat-input-bar' });
  const textarea = createEl('textarea', { class: 'chat-input', placeholder: 'اكتب رسالة...', rows: '1' });
  const sendBtn = createEl('button', { class: 'btn btn--primary btn--sm', disabled: true }, ['إرسال']);

  // ─── مرفق (صورة/فيديو) ─────────────────────────────────────────
  const attachInput = createEl('input', { type: 'file', accept: 'image/*,video/*', style: 'display:none' });
  const attachBtn = createEl('button', {
    type: 'button', class: 'btn btn--glass btn--sm', title: 'إرفاق صورة/فيديو',
    onclick: () => attachInput.click(),
  }, ['📎']);
  const attachPreviewWrap = createEl('div', { class: 'chat-attach-preview', style: 'display:none' });
  let pendingMedia = null; // { url, type } بعد نجاح الرفع — null يعني بلا مرفق

  attachInput.addEventListener('change', async () => {
    const file = attachInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('اختر صورة أو فيديو فقط', 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast('الحجم كبير جداً (الحد 50 ميغابايت)', 'error');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    attachPreviewWrap.style.display = 'flex';
    attachPreviewWrap.innerHTML = '';
    const progressLabel = createEl('span', {}, ['جارِ الرفع… 0%']);
    const cancelBtn = createEl('button', {
      type: 'button', style: 'background:none;border:none;cursor:pointer;',
      onclick: () => { pendingMedia = null; attachPreviewWrap.style.display = 'none'; attachInput.value = ''; },
    }, ['✕']);
    attachPreviewWrap.append(createEl('span', {}, [isVideo ? '🎥' : '🖼️']), progressLabel, cancelBtn);

    const formData = new FormData();
    formData.append('media', file);

    try {
      const res = await uploadWithProgress('/media/upload', formData, (percent) => {
        progressLabel.textContent = `جارِ الرفع… ${percent}%`;
      });
      const uploaded = res.data.files[0];
      pendingMedia = { url: uploaded.url, type: isVideo ? 'video' : 'image' };
      progressLabel.textContent = 'جاهز للإرسال ✓';
      sendBtn.disabled = false;
    } catch (err) {
      showError(err);
      attachPreviewWrap.style.display = 'none';
    }
  });

  const notifyTyping = debounce(() => {
    wsSend('typing:start', { conversationId });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => wsSend('typing:stop', { conversationId }), 2000);
  }, 300);

  textarea.addEventListener('input', () => {
    sendBtn.disabled = textarea.value.trim().length === 0 && !pendingMedia;
    if (textarea.value.trim()) notifyTyping();
  });

  async function send() {
    const content = textarea.value.trim();
    if (!content && !pendingMedia) return;
    sendBtn.disabled = true;

    // بلا تشفير حقيقي حالياً - nonce قيمة رمزية فقط لمطابقة عقد الخادم
    const nonce = crypto.randomUUID();
    // الباك اند يرفض encryptedContent فارغ حتى لرسالة وسائط بلا تعليق —
    // نستعمل علامة نصية بسيطة، ونخفيها بالعرض (renderMessageBubble)
    const encryptedContent = content || (pendingMedia?.type === 'video' ? '🎥 فيديو' : '📷 صورة');

    const payload = { conversationId, encryptedContent, nonce };
    if (pendingMedia) {
      payload.mediaUrl = pendingMedia.url;
      payload.msgType = pendingMedia.type;
    }

    try {
      const res = await api.post('/messages/send', payload);
      messagesList.appendChild(renderMessageBubble(res.data, store.getState().user.id));
      messagesList.scrollTop = messagesList.scrollHeight;
      textarea.value = '';
      pendingMedia = null;
      attachPreviewWrap.style.display = 'none';
      attachInput.value = '';
      wsSend('typing:stop', { conversationId });
    } catch (err) {
      showError(err);
    } finally {
      sendBtn.disabled = textarea.value.trim().length === 0 && !pendingMedia;
    }
  }

  sendBtn.addEventListener('click', send);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  wrap.append(attachInput, attachBtn, textarea, sendBtn);
  return createEl('div', {}, [attachPreviewWrap, wrap]);
}

// ─── أحداث WebSocket الفورية ─────────────────────────────────────
function setupWebSocketListeners(chatPane) {
  wsCleanups.push(wsOn('typing:start', (payload) => {
    if (payload.conversationId !== currentConversationId) return;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.style.display = '';
  }));

  wsCleanups.push(wsOn('typing:stop', (payload) => {
    if (payload.conversationId !== currentConversationId) return;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.style.display = 'none';
  }));

  wsCleanups.push(wsOn('message:new', (payload) => {
    if (payload.conversationId !== currentConversationId) {
      showToast('رسالة جديدة', 'info');
      return;
    }
    const messagesList = document.getElementById('chat-messages');
    if (messagesList) {
      messagesList.appendChild(renderMessageBubble(payload, store.getState().user.id));
      messagesList.scrollTop = messagesList.scrollHeight;
      wsSend('message:delivered', { conversationId: currentConversationId, messageId: payload.id });
      wsSend('message:read', { conversationId: currentConversationId });
    }
  }));

  wsCleanups.push(wsOn('message:read', () => {
    // إعادة تحميل خفيفة لتحديث علامات ✓✓ عند قراءة الطرف الآخر
    if (currentConversationId) {
      api.get(`/messages/conversations/${currentConversationId}/messages`).then((res) => {
        const messagesList = document.getElementById('chat-messages');
        if (!messagesList) return;
        messagesList.innerHTML = '';
        res.data.forEach((msg) => messagesList.appendChild(renderMessageBubble(msg, store.getState().user.id)));
      }).catch(() => {});
    }
  }));
}
