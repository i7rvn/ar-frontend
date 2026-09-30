// ═══════════════════════════════════════════════════════════════
// AR — النوافذ المنبثقة وإشعارات Toast (مكان واحد لكل المشروع)
// ═══════════════════════════════════════════════════════════════

import { createEl } from './utils.js';
import { t } from './i18n.js';

let toastContainer = null;
let modalRoot = null;

function ensureContainers() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
  }
  if (!modalRoot) {
    modalRoot = document.getElementById('modal-root');
  }
}

// ─── Toast (نجاح/خطأ/معلومة) ────────────────────────────────────
export function showToast(message, type = 'info', duration = 4000) {
  ensureContainers();
  if (!toastContainer) return;

  const toast = createEl('div', { class: `toast toast--${type}`, role: 'status' }, [
    document.createTextNode(message),
  ]);
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

export function showError(err) {
  const message = err?.message || t('common_error');
  showToast(message, 'error');
}

// ─── نافذة عامة (محتوى HTML مُعقَّم مسبقاً من المستدعي) ─────────
export function openModal({ title, bodyEl, actions = [], dismissible = true }) {
  ensureContainers();
  if (!modalRoot) return () => {};

  const overlay = createEl('div', { class: 'modal-overlay' });
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;
  const dialog = createEl('div', { class: 'modal-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId });
  const previouslyFocused = document.activeElement; // نرجّع له التركيز عند الإغلاق

  const header = createEl('div', { class: 'modal-header' }, [
    createEl('h2', { class: 'modal-title', id: titleId }, [title]),
  ]);

  if (dismissible) {
    const closeBtn = createEl('button', {
      class: 'modal-close', 'aria-label': t('common_cancel'),
      onclick: () => close(),
    }, ['×']);
    header.appendChild(closeBtn);
  }

  const body = createEl('div', { class: 'modal-body' }, [bodyEl]);
  const footer = createEl('div', { class: 'modal-footer' });

  for (const action of actions) {
    footer.appendChild(createEl('button', {
      class: `btn ${action.variant === 'primary' ? 'btn--primary' : 'btn--glass'}`,
      onclick: action.onClick,
    }, [action.label]));
  }

  dialog.append(header, body, footer);
  overlay.appendChild(dialog);

  let closed = false;
  function close() {
    if (closed) return; // منع الإغلاق المزدوج (مثلاً Escape + زر بنفس اللحظة)
    closed = true;
    overlay.classList.remove('modal-overlay--visible');
    setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', onKeydown);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
  }

  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

  function onKeydown(e) {
    if (e.key === 'Escape' && dismissible) { close(); return; }
    if (e.key !== 'Tab') return;
    // حبس التنقّل بالـTab داخل النافذة (إتاحة الوصول للكيبورد)
    const focusables = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // نسمع Tab دايماً (حتى لو النافذة غير قابلة للإغلاق) — Escape فقط مشروط
  document.addEventListener('keydown', onKeydown);
  if (dismissible) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  modalRoot.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.add('modal-overlay--visible');
    // تركيز أولي: أول حقل إدخال بالمحتوى، وإلا أول زر بالتذييل (دايماً
    // "إلغاء" بنوافذنا) — أأمن للتأكيدات المدمِّرة: Enter بالغلط ما يحذفش/يحظرش
    const initial = body.querySelector('input:not([type="hidden"]):not([type="file"]), textarea, select')
      || footer.querySelector('button');
    initial?.focus();
  });

  return close;
}

// ─── تأكيد إجراء (بديل confirm()) ────────────────────────────────
export function confirmAction({ title, message }) {
  return new Promise((resolve) => {
    const body = createEl('p', { class: 'modal-message' }, [message]);
    const close = openModal({
      title,
      bodyEl: body,
      actions: [
        { label: t('common_cancel'), onClick: () => { close(); resolve(false); } },
        { label: t('common_confirm'), variant: 'primary', onClick: () => { close(); resolve(true); } },
      ],
    });
  });
}
