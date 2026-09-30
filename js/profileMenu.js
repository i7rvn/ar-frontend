// ═══════════════════════════════════════════════════════════════
// AR — قائمة "..." بصفحة الملف الشخصي
// ملفي: نسخ الرابط + QR. ملف غيري: + حظر/إلغاء الحظر + إبلاغ.
// ═══════════════════════════════════════════════════════════════

import { api, fetchImageAsDataURL } from './api.js';
import { store } from './store.js';
import { createEl, copyToClipboard } from './utils.js';
import { showError, showToast, confirmAction, openModal } from './modals.js';
import { openDropdown, isDropdownOpen, closeDropdown } from './dropdown.js';
import { openReportModal } from './postMenu.js';

// onBlockChanged(blockedNow): يُستدعى بعد نجاح حظر/إلغاء حظر ليتصرف الملف
// الشخصي (مثلاً يخرج منه بعد الحظر أو يعيد تحميل نفسه بعد إلغائه)
export function renderProfileMenuButton(profile, { onBlockChanged = null } = {}) {
  const currentUser = store.getState().user;
  const isOwn = currentUser && currentUser.id === profile.id;
  const profileUrl = `${window.location.origin}/profile/${profile.username}`;

  const slot = createEl('div', { class: 'profile-menu-slot' });
  const btn = createEl('button', {
    class: 'post-menu-btn', 'aria-label': 'خيارات الملف', type: 'button',
  }, ['⋯']);
  slot.appendChild(btn);

  let busy = false; // يمنع فتح قائمتين لو ضغط مرتين بسرعة أثناء جلب حالة الحظر

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (busy) return;
    if (isDropdownOpen()) { closeDropdown(); return; } // ضغطة ثانية = إغلاق

    const items = [
      { label: 'نسخ رابط الملف', onClick: () => copyToClipboard(profileUrl, 'تم نسخ الرابط') },
      { label: 'رمز QR', onClick: () => openQrModal(profile, profileUrl) },
    ];

    if (!isOwn) {
      // حالة الحظر الحالية مش موجودة بكائن البروفايل — نسأل الخادم
      // مباشرة بدل التخمين، باش نعرض "حظر" أو "إلغاء الحظر" الصحيح
      busy = true;
      let isBlocked = false;
      try {
        const res = await api.get('/blocks/blocked');
        isBlocked = (res.blocked || []).some((u) => u.username === profile.username);
      } catch (err) {
        busy = false;
        showError(err);
        return;
      }
      busy = false;

      items.push({ label: 'إبلاغ', onClick: () => openReportModal({ reportedUserId: profile.id }) });
      items.push(isBlocked
        ? { label: `إلغاء حظر @${profile.username}`, onClick: () => handleUnblock(profile, onBlockChanged) }
        : { label: `حظر @${profile.username}`, danger: true, onClick: () => handleBlock(profile, onBlockChanged) });
    }

    openDropdown(btn, items);
  });

  return slot;
}

async function handleBlock(profile, onBlockChanged) {
  const ok = await confirmAction({
    title: `حظر @${profile.username}`,
    message: 'لن يتمكّن من متابعتك أو التفاعل معك بعد الحظر، ولن تشاهد منشوراته بعد الآن. هل تريد المتابعة؟',
  });
  if (!ok) return;
  try {
    await api.post(`/blocks/block/${profile.username}`, {});
    showToast('تم حظر المستخدم', 'success');
    if (onBlockChanged) onBlockChanged(true);
  } catch (err) {
    showError(err);
  }
}

async function handleUnblock(profile, onBlockChanged) {
  try {
    await api.delete(`/blocks/block/${profile.username}`);
    showToast('تم إلغاء الحظر', 'success');
    if (onBlockChanged) onBlockChanged(false);
  } catch (err) {
    showError(err);
  }
}

// ─── نافذة QR ────────────────────────────────────────────────────
async function openQrModal(profile, profileUrl) {
  const body = createEl('div', { class: 'qr-modal' }, [createEl('div', { class: 'spinner' })]);

  const close = openModal({
    title: 'رمز QR للملف',
    bodyEl: body,
    actions: [
      { label: 'إغلاق', onClick: () => close() },
      { label: 'نسخ الرابط', variant: 'primary', onClick: () => copyToClipboard(profileUrl, 'تم نسخ الرابط') },
    ],
  });

  try {
    const dataUrl = await fetchImageAsDataURL(`/users/${encodeURIComponent(profile.username)}/qr`);
    body.innerHTML = '';
    body.append(
      createEl('img', { class: 'qr-modal__img', src: dataUrl, alt: `رمز QR لملف @${profile.username}` }),
      createEl('div', { class: 'qr-modal__username' }, [`@${profile.username}`]),
      createEl('a', {
        class: 'btn btn--glass btn--sm', href: dataUrl, download: `qr-${profile.username}.png`,
      }, ['تحميل الصورة']),
    );
  } catch (err) {
    body.innerHTML = '';
    body.appendChild(createEl('div', { class: 'settings-row__desc' }, [err.message || 'تعذّر توليد الرمز']));
  }
}
