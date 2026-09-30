// ═══════════════════════════════════════════════════════════════
// AR — قائمة منسدلة عامة (تُستعمل من قائمة المنشور وقائمة البروفايل)
// قائمة واحدة مفتوحة فقط بنفس اللحظة عبر الصفحة كلها. تُغلق بالضغط
// خارجها أو Escape، وتدعم التنقل بأسهم الكيبورد (إتاحة الوصول).
// ═══════════════════════════════════════════════════════════════

import { createEl } from './utils.js';

let openMenuCleanup = null;

export function isDropdownOpen() { return openMenuCleanup !== null; }
export function closeDropdown() { if (openMenuCleanup) openMenuCleanup(); }

// items: [{ label, onClick, danger? }]
export function openDropdown(anchorBtn, items) {
  // ضغطة ثانية على نفس الزر تغلق القائمة المفتوحة (toggle)
  if (openMenuCleanup) { openMenuCleanup(); return; }

  const menu = createEl('div', { class: 'post-menu-dropdown', role: 'menu' });

  items.forEach((item) => {
    menu.appendChild(createEl('button', {
      class: `post-menu-item${item.danger ? ' post-menu-item--danger' : ''}`,
      role: 'menuitem', type: 'button',
      onclick: (e) => {
        e.stopPropagation();
        if (openMenuCleanup) openMenuCleanup();
        item.onClick();
      },
    }, [item.label]));
  });

  anchorBtn.setAttribute('aria-haspopup', 'menu');
  anchorBtn.setAttribute('aria-expanded', 'true');
  anchorBtn.parentElement.style.position = 'relative';
  anchorBtn.parentElement.appendChild(menu);

  const closeOnOutsideClick = (e) => {
    if (!menu.contains(e.target) && e.target !== anchorBtn) close();
  };
  const onKeydown = (e) => {
    if (e.key === 'Escape') { close(); anchorBtn.focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const buttons = [...menu.querySelectorAll('button')];
    const idx = buttons.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
    buttons[next].focus();
  };

  function close() {
    anchorBtn.setAttribute('aria-expanded', 'false');
    menu.remove();
    document.removeEventListener('click', closeOnOutsideClick);
    document.removeEventListener('keydown', onKeydown);
    openMenuCleanup = null;
  }

  // setTimeout(0): نفس حدث الضغط الحالي يوصل لـdocument بعد قليل — بلا
  // هذا التأخير الإغلاق يطلق فوراً على نفس الضغطة لي فتحت القائمة
  setTimeout(() => {
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', onKeydown);
  }, 0);

  openMenuCleanup = close;
  menu.querySelector('button')?.focus();
}
