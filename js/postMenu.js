// ═══════════════════════════════════════════════════════════════
// AR — قائمة "..." على المنشور (reusable — تُستعمل من feed.js وpost.js)
// منشورك: نسخ رابط + حذف. منشور غيرك: نسخ رابط + إبلاغ + حظر.
// ═══════════════════════════════════════════════════════════════

import { api } from './api.js';
import { store } from './store.js';
import { createEl, copyToClipboard } from './utils.js';
import { showError, showToast, confirmAction, openModal } from './modals.js';
import { openDropdown } from './dropdown.js';

// نفس القيم الحقيقية المقبولة بالباك اند (src/modules/reports/reports.routes.js)
// — لا تخترع فئات، هاذي فقط لي السيرفر يفهمها فعلاً
const REPORT_REASONS = [
  { value: 'spam', label: 'سبام' },
  { value: 'harassment', label: 'مضايقة' },
  { value: 'hate_speech', label: 'خطاب كراهية' },
  { value: 'violence', label: 'عنف' },
  { value: 'nudity', label: 'محتوى جنسي/عاري' },
  { value: 'impersonation', label: 'انتحال شخصية' },
  { value: 'other', label: 'أخرى' },
];


// card: عنصر DOM لبطاقة المنشور بالفيد — يُحذف من الـDOM مباشرة عند
// نجاح الحذف بلا reload. مرّرها null إذا كنت بصفحة تفاصيل المنشور
// (يومها الاستدعاء يتكفّل بالتنقل بدل الحذف من مكانه)
export function renderPostMenuButton(post, { card = null, onDeleted = null, onBlocked = null, onPinChanged = null } = {}) {
  const currentUser = store.getState().user;
  const isOwn = currentUser && currentUser.id === post.user_id;

  const btn = createEl('button', {
    class: 'post-menu-btn', 'aria-label': 'خيارات المنشور', type: 'button',
  }, ['⋯']);

  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // ما نطلقش onclick متاع البطاقة (navigate لتفاصيل المنشور)
    toggleMenu(btn, post, isOwn, { card, onDeleted, onBlocked, onPinChanged });
  });

  return btn;
}

function toggleMenu(anchorBtn, post, isOwn, { card, onDeleted, onBlocked, onPinChanged }) {
  const postUrl = `${window.location.origin}/post/${post.id}`;
  const items = [{ label: 'نسخ رابط المنشور', onClick: () => copyToClipboard(postUrl, 'تم نسخ الرابط') }];

  if (isOwn) {
    items.push({
      label: post.is_pinned ? 'إلغاء التثبيت' : 'تثبيت المنشور',
      onClick: () => handlePinToggle(post, onPinChanged),
    });
    items.push({ label: 'حذف', danger: true, onClick: () => handleDelete(post, card, onDeleted) });
  } else {
    items.push({ label: 'إبلاغ', onClick: () => openReportModal({ reportedPostId: post.id }) });
    items.push({ label: `كتم @${post.username}`, onClick: () => handleMute(post) });
    items.push({ label: `تقييد @${post.username}`, onClick: () => handleRestrict(post) });
    items.push({ label: `حظر @${post.username}`, danger: true, onClick: () => handleBlock(post, card, onBlocked) });
  }

  openDropdown(anchorBtn, items);
}

async function handleDelete(post, card, onDeleted) {
  const ok = await confirmAction({
    title: 'حذف المنشور', message: 'هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟',
  });
  if (!ok) return;

  try {
    await api.delete(`/posts/${post.id}`);
    showToast('تم حذف المنشور', 'success');
    if (card) card.remove(); // إزالة فورية من الفيد بلا reload
    if (onDeleted) onDeleted(post.id); // لصفحة تفاصيل المنشور: تتكفّل بالتنقل
  } catch (err) {
    showError(err);
  }
}

async function handlePinToggle(post, onPinChanged) {
  const pinning = !post.is_pinned;
  try {
    await api.post(`/posts/${post.id}/${pinning ? 'pin' : 'unpin'}`, {});
    showToast(pinning ? 'تم تثبيت المنشور' : 'تم إلغاء التثبيت', 'success');
    post.is_pinned = pinning; // نحدّث الكائن المحلي — القائمة الجاية تعرض الخيار الصحيح
    if (onPinChanged) onPinChanged(post.id, pinning);
  } catch (err) {
    showError(err);
  }
}

// كتم/تقييد: بلا تأكيد (إجراء هادئ وقابل للتراجع بسهولة من الإعدادات،
// ماشي كالحظر المدمّر). إلغاؤهما فقط من صفحة الإعدادات حالياً — نفس
// نمط "إلغاء الحظر" الموجود، تناسقاً عبر القائمة كلها
async function handleMute(post) {
  try {
    await api.post(`/blocks/mute/${post.username}`, {});
    showToast(`تم كتم @${post.username}`, 'success');
  } catch (err) {
    showError(err);
  }
}

async function handleRestrict(post) {
  try {
    await api.post(`/blocks/restrict/${post.username}`, {});
    showToast(`تم تقييد @${post.username}`, 'success');
  } catch (err) {
    showError(err);
  }
}

async function handleBlock(post, card, onBlocked) {
  const ok = await confirmAction({
    title: `حظر @${post.username}`,
    message: 'لن يتمكّن من متابعتك أو التفاعل معك بعد الحظر، ولن تشاهد منشوراته بعد الآن. هل تريد المتابعة؟',
  });
  if (!ok) return;

  try {
    await api.post(`/blocks/block/${post.username}`, {});
    showToast('تم حظر المستخدم', 'success');
    // إخفاء فوري لكل منشوراته من الفيد الحالي بلا انتظار reload —
    // الباك اند نفسه يستثنيه من أي تحميل جديد للفيد بعد الحظر
    if (card) {
      document.querySelectorAll(`[data-author-username="${CSS.escape(post.username)}"]`)
        .forEach((el) => el.remove());
    }
    if (onBlocked) onBlocked(); // لصفحة تفاصيل المنشور: تتكفّل بالتنقل بعيداً
  } catch (err) {
    showError(err);
  }
}

// target: { reportedPostId } أو { reportedUserId } — نافذة إبلاغ واحدة للحالتين
export function openReportModal(target) {
  const form = createEl('div', { class: 'report-modal' });
  let selectedReason = null;

  const reasonList = createEl('div', { class: 'report-reasons' });
  REPORT_REASONS.forEach((r) => {
    const radio = createEl('label', { class: 'report-reason-row' }, [
      createEl('input', {
        type: 'radio', name: 'report-reason', value: r.value,
        onchange: () => { selectedReason = r.value; },
      }),
      r.label,
    ]);
    reasonList.appendChild(radio);
  });

  const details = createEl('textarea', {
    class: 'field__input', placeholder: 'تفاصيل إضافية (اختياري)', rows: '3', maxlength: '500',
  });

  form.append(reasonList, createEl('div', { class: 'field', style: 'margin-top:12px' }, [details]));

  const close = openModal({
    title: target.reportedUserId ? 'الإبلاغ عن مستخدم' : 'الإبلاغ عن منشور',
    bodyEl: form,
    actions: [
      { label: 'إلغاء', onClick: () => close() },
      {
        label: 'إرسال البلاغ', variant: 'primary',
        onClick: async () => {
          if (!selectedReason) { showToast('اختر سبب البلاغ أولاً', 'error'); return; }
          try {
            await api.post('/reports', {
              ...target,
              reason: selectedReason,
              details: details.value.trim() || undefined,
            });
            showToast('تم إرسال البلاغ، شكراً لك', 'success');
            close();
          } catch (err) {
            showError(err);
          }
        },
      },
    ],
  });
}
