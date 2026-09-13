// ═══════════════════════════════════════════════════════════════
// AR — النوافذ المنبثقة وإشعارات Toast (مكان واحد لكل المشروع)
// ═══════════════════════════════════════════════════════════════

import { escapeHTML, createEl } from './utils.js';
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
  const dialog = createEl('div', { class: 'modal-dialog', role: 'dialog', 'aria-modal': 'true' });

  const header = createEl('div', { class: 'modal-header' }, [
    createEl('h2', { class: 'modal-title' }, [escapeHTML(title)]),
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

  function close() {
    overlay.classList.remove('modal-overlay--visible');
    setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && dismissible) close();
  }

  if (dismissible) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKeydown);
  }

  modalRoot.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal-overlay--visible'));

  return close;
}

// ─── تأكيد إجراء (بديل confirm()) ────────────────────────────────
export function confirmAction({ title, message }) {
  return new Promise((resolve) => {
    const body = createEl('p', { class: 'modal-message' }, [escapeHTML(message)]);
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
