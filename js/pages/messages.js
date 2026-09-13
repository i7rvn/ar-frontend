// ═══════════════════════════════════════════════════════════════
// AR — الرسائل (قائمة محادثات + دردشة فورية)
//
// ملاحظة: الرسائل نص عادٍ حالياً (Backend لا يوفّر تشفير طرف لطرف
// حقيقي بعد رغم وجود جداول المفاتيح). لا نعرض أي إيحاء بصري بتشفير
// (قفل، أيقونة أمان) تفادياً لإعطاء إحساس أمان زائف.
// ═══════════════════════════════════════════════════════════════

import { api } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, escapeHTML, relativeTime, debounce } from '../utils.js';
import { showError, showToast } from '../modals.js';
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
  const chatPane = createEl('div', { class: `messages-chat-pane${!conversationId ? ' messages-chat-pane--hidden-mobile' : ''}`, id: 'chat-pane' });

  layout.append(listPane, chatPane);
  container.appendChild(layout);

  await loadConversationsList(listPane);

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
          createEl('div', { class: 'conversation-item__name' }, [escapeHTML(conv.display_name || 'محادثة')]),
          createEl('div', { class: 'conversation-item__preview' }, [escapeHTML(conv.last_msg_text || '')]),
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
    bubble.appendChild(createEl('div', { class: 'chat-bubble__text' }, [escapeHTML(msg.encrypted_content)]));
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

  const notifyTyping = debounce(() => {
    wsSend('typing:start', { conversationId });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => wsSend('typing:stop', { conversationId }), 2000);
  }, 300);

  textarea.addEventListener('input', () => {
    sendBtn.disabled = textarea.value.trim().length === 0;
    if (textarea.value.trim()) notifyTyping();
  });

  async function send() {
    const content = textarea.value.trim();
    if (!content) return;
    sendBtn.disabled = true;

    // بلا تشفير حقيقي حالياً - nonce قيمة رمزية فقط لمطابقة عقد الخادم
    const nonce = crypto.randomUUID();

    try {
      const res = await api.post('/messages/send', { conversationId, encryptedContent: content, nonce });
      messagesList.appendChild(renderMessageBubble(res.data, store.getState().user.id));
      messagesList.scrollTop = messagesList.scrollHeight;
      textarea.value = '';
      wsSend('typing:stop', { conversationId });
    } catch (err) {
      showError(err);
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', send);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  wrap.append(textarea, sendBtn);
  return wrap;
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
