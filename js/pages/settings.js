// ═══════════════════════════════════════════════════════════════
// AR — الإعدادات (كل الأقسام)
// ═══════════════════════════════════════════════════════════════

import { api, clearTokens } from '../api.js';
import { store } from '../store.js';
import { t, setLang } from '../i18n.js';
import { navigate } from '../router.js';
import { setTheme } from '../app.js';
import { createEl, escapeHTML, debounce, relativeTime } from '../utils.js';
import { showError, showToast, openModal, confirmAction } from '../modals.js';
import { disconnectWS } from '../ws.js';

export function renderSettingsPage(container) {
  container.innerHTML = '';

  const header = createEl('div', { class: 'page-header' }, [
    createEl('span', { class: 'page-header__title' }, [t('nav_settings')]),
  ]);
  container.appendChild(header);

  container.appendChild(renderAppearanceSection());
  container.appendChild(renderAccountSecuritySection());
  container.appendChild(render2FASection());
  container.appendChild(renderDevicesSection());
  container.appendChild(renderSecurityLogSection());
  container.appendChild(renderNotificationsSection());
  container.appendChild(renderPrivacySection());
  container.appendChild(renderDangerZoneSection());

  const logoutBtn = createEl('button', { class: 'btn btn--glass btn--full', style: 'margin:16px' }, [t('nav_logout')]);
  logoutBtn.addEventListener('click', async () => {
    try { await api.post('/auth/logout', {}); } catch { /* نكمل رغم الفشل */ }
    clearTokens();
    disconnectWS();
    store.setState({ user: null });
    navigate('/login');
  });
  container.appendChild(logoutBtn);
}

function section(title, ...children) {
  return createEl('div', { class: 'settings-section' }, [
    createEl('h2', { class: 'settings-section__title' }, [title]),
    ...children,
  ]);
}

function toggleRow(label, desc, checked, onChange) {
  const input = createEl('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked, input));

  return createEl('div', { class: 'settings-row' }, [
    createEl('div', {}, [
      createEl('div', { class: 'settings-row__label' }, [label]),
      desc ? createEl('div', { class: 'settings-row__desc' }, [desc]) : null,
    ]),
    createEl('label', { class: 'toggle' }, [
      input,
      createEl('span', { class: 'toggle__track' }, [createEl('span', { class: 'toggle__thumb' })]),
    ]),
  ]);
}

// ═══════════════════════════════════════════════════════════════
// المظهر
// ═══════════════════════════════════════════════════════════════
function renderAppearanceSection() {
  const isDark = store.getState().theme === 'dark';
  const darkRow = toggleRow(t('settings_dark_mode'), null, isDark, (checked) => {
    setTheme(checked ? 'dark' : 'light');
  });

  const langSelect = createEl('select', { class: 'field__input' }, [
    createEl('option', { value: 'ar' }, ['العربية']),
    createEl('option', { value: 'en' }, ['English']),
    createEl('option', { value: 'fr' }, ['Français']),
  ]);
  langSelect.value = store.getState().lang;
  langSelect.addEventListener('change', () => {
    setLang(langSelect.value);
    navigate('/settings', { replace: true });
  });

  const langRow = createEl('div', { class: 'settings-row' }, [
    createEl('div', { class: 'settings-row__label' }, [t('settings_language')]),
    langSelect,
  ]);

  return section(t('settings_appearance'), darkRow, langRow);
}

// ═══════════════════════════════════════════════════════════════
// الحساب والأمان
// ═══════════════════════════════════════════════════════════════
function renderAccountSecuritySection() {
  const rows = createEl('div', {});

  const changePasswordRow = createEl('button', { class: 'settings-row settings-row--clickable', onclick: openChangePasswordModal }, [
    createEl('span', { class: 'settings-row__label' }, [t('settings_change_password')]),
    createEl('span', {}, ['\u203a']),
  ]);
  const changeEmailRow = createEl('button', { class: 'settings-row settings-row--clickable', onclick: openChangeEmailModal }, [
    createEl('span', { class: 'settings-row__label' }, [t('settings_change_email')]),
    createEl('span', {}, ['\u203a']),
  ]);
  const changeUsernameRow = createEl('button', { class: 'settings-row settings-row--clickable', onclick: openChangeUsernameModal }, [
    createEl('span', { class: 'settings-row__label' }, ['تغيير اسم المستخدم']),
    createEl('span', {}, ['\u203a']),
  ]);
  const linkedAccountsRow = createEl('button', { class: 'settings-row settings-row--clickable', onclick: openLinkedAccountsModal }, [
    createEl('span', { class: 'settings-row__label' }, ['الحسابات المرتبطة']),
    createEl('span', {}, ['\u203a']),
  ]);

  rows.append(changePasswordRow, changeEmailRow, changeUsernameRow, linkedAccountsRow);
  return section(t('settings_account_security'), rows);
}

function openChangePasswordModal() {
  const current = createEl('input', { type: 'password', class: 'field__input', autocomplete: 'current-password' });
  const next = createEl('input', { type: 'password', class: 'field__input', autocomplete: 'new-password' });
  const totp = createEl('input', { type: 'text', class: 'field__input', placeholder: 'إذا كان التحقق بخطوتين مفعّلاً' });
  const logoutAll = createEl('input', { type: 'checkbox' });

  const form = createEl('div', {}, [
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['كلمة المرور الحالية']), current]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['كلمة المرور الجديدة']), next]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['كود التحقق (2FA)']), totp]),
    createEl('label', { class: 'settings-row' }, [logoutAll, ' تسجيل الخروج من كل الأجهزة الأخرى']),
  ]);

  const close = openModal({
    title: t('settings_change_password'),
    bodyEl: form,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: t('common_save'), variant: 'primary',
        onClick: async () => {
          try {
            await api.put('/account/password', {
              currentPassword: current.value, newPassword: next.value,
              totpCode: totp.value, logoutAllDevices: logoutAll.checked,
            });
            showToast('تم تغيير كلمة المرور', 'success');
            close();
          } catch (err) { showError(err); }
        },
      },
    ],
  });
}

function openChangeEmailModal() {
  const newEmail = createEl('input', { type: 'email', class: 'field__input' });
  const step1 = createEl('div', {}, [
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['البريد الجديد']), newEmail]),
    createEl('p', { class: 'field__hint' }, ['سنرسل كودين تحقق: واحد لبريدك الحالي وواحد للجديد']),
  ]);

  const close = openModal({
    title: t('settings_change_email'),
    bodyEl: step1,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: 'إرسال الأكواد', variant: 'primary',
        onClick: async () => {
          try {
            await api.post('/account/email/request-change', { newEmail: newEmail.value.trim() });
            close();
            openConfirmEmailChangeModal();
          } catch (err) { showError(err); }
        },
      },
    ],
  });
}

function openConfirmEmailChangeModal() {
  const oldCode = createEl('input', { type: 'text', class: 'field__input', maxlength: '6' });
  const newCode = createEl('input', { type: 'text', class: 'field__input', maxlength: '6' });
  const form = createEl('div', {}, [
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['كود البريد القديم']), oldCode]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['كود البريد الجديد']), newCode]),
  ]);

  const close = openModal({
    title: 'تأكيد تغيير البريد',
    bodyEl: form,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: t('common_confirm'), variant: 'primary',
        onClick: async () => {
          try {
            await api.post('/account/email/confirm-change', { oldEmailCode: oldCode.value.trim(), newEmailCode: newCode.value.trim() });
            showToast('تم تغيير البريد الإلكتروني', 'success');
            close();
          } catch (err) { showError(err); }
        },
      },
    ],
  });
}

function openChangeUsernameModal() {
  const input = createEl('input', { type: 'text', class: 'field__input' });
  const status = createEl('div', { class: 'username-status' });
  const check = debounce(async (value) => {
    if (value.length < 3) { status.textContent = ''; return; }
    try {
      const res = await api.get(`/username/check/${encodeURIComponent(value)}`);
      const map = { available: '\u2713 متاح', taken: '\u2715 مستخدم', reserved: '\u2715 محجوز', invalid: '\u2715 صيغة غير صالحة' };
      status.textContent = map[res.status] || '';
    } catch { status.textContent = ''; }
  }, 300);
  input.addEventListener('input', (e) => check(e.target.value.trim()));

  const form = createEl('div', {}, [
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, ['اسم المستخدم الجديد']), input, status]),
  ]);

  const close = openModal({
    title: 'تغيير اسم المستخدم',
    bodyEl: form,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: t('common_save'), variant: 'primary',
        onClick: async () => {
          try {
            await api.put('/username', { newUsername: input.value.trim() });
            showToast('تم تغيير اسم المستخدم', 'success');
            close();
          } catch (err) {
            showError(err);
          }
        },
      },
    ],
  });
}

async function openLinkedAccountsModal() {
  const body = createEl('div', { class: 'follow-list' }, [createEl('div', { class: 'spinner' })]);
  openModal({ title: 'الحسابات المرتبطة', bodyEl: body, actions: [] });

  try {
    const res = await api.get('/account/linked-accounts');
    body.innerHTML = '';
    const accounts = res.accounts || [];
    if (accounts.length === 0) {
      body.appendChild(createEl('p', {}, ['لا حسابات أخرى مرتبطة بنفس البريد']));
      return;
    }
    accounts.forEach((acc) => {
      body.appendChild(createEl('a', {
        href: `/profile/${acc.username}`, 'data-link': true, class: 'follow-list__item',
      }, [
        createEl('img', { class: 'avatar avatar--sm', src: acc.avatar_url || '/img/default-avatar.svg', alt: '' }),
        createEl('div', {}, [
          createEl('div', { class: 'post-card__name' }, [escapeHTML(acc.display_name)]),
          createEl('div', { class: 'post-card__username' }, [`@${escapeHTML(acc.username)}`]),
        ]),
      ]));
    });
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// التحقق بخطوتين
// ═══════════════════════════════════════════════════════════════
function render2FASection() {
  const body = createEl('div', { id: '2fa-body' }, [createEl('div', { class: 'spinner' })]);
  load2FAStatus(body);
  return section(t('settings_2fa'), body);
}

async function load2FAStatus(body) {
  try {
    const res = await api.get('/2fa/status');
    body.innerHTML = '';

    if (res.enabled) {
      body.append(
        createEl('div', { class: 'settings-row' }, [
          createEl('div', {}, [
            createEl('div', { class: 'settings-row__label' }, ['التحقق بخطوتين مفعّل']),
            createEl('div', { class: 'settings-row__desc' }, [`${res.remainingRecoveryCodes} كود استرجاع متبقٍ`]),
          ]),
        ]),
        createEl('button', { class: 'btn btn--glass btn--sm', onclick: regenerateRecoveryCodes }, ['توليد أكواد جديدة']),
        createEl('button', { class: 'btn btn--danger btn--sm', style: 'margin-top:8px', onclick: openDisable2FAModal }, ['تعطيل']),
      );
    } else {
      body.appendChild(createEl('button', { class: 'btn btn--primary', onclick: openSetup2FAModal }, ['تفعيل التحقق الثنائي']));
    }
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

async function openSetup2FAModal() {
  const body = createEl('div', {}, [createEl('div', { class: 'spinner' })]);
  const close = openModal({ title: 'تفعيل التحقق الثنائي', bodyEl: body, actions: [] });

  try {
    const res = await api.post('/2fa/setup', {});
    body.innerHTML = '';
    body.append(
      createEl('img', { src: res.qrCode, alt: 'QR Code', style: 'width:200px;height:200px;margin:0 auto;display:block' }),
      createEl('p', { class: 'field__hint', style: 'text-align:center;word-break:break-all' }, [`أو أدخل يدوياً: ${res.secret}`]),
    );
    const codeInput = createEl('input', { class: 'field__input', placeholder: 'أدخل الكود من التطبيق', style: 'margin-top:12px' });
    body.appendChild(codeInput);

    const confirmBtn = createEl('button', { class: 'btn btn--primary btn--full', style: 'margin-top:12px' }, [t('common_confirm')]);
    confirmBtn.addEventListener('click', async () => {
      try {
        const confirmRes = await api.post('/2fa/confirm', { token: codeInput.value.trim() });
        close();
        showRecoveryCodesModal(confirmRes.recoveryCodes);
        renderSettingsPage(document.getElementById('content-column'));
      } catch (err) {
        showError(err);
      }
    });
    body.appendChild(confirmBtn);
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

function showRecoveryCodesModal(codes) {
  const list = createEl('div', { class: 'recovery-codes-list' }, codes.map((c) => createEl('code', {}, [c])));
  const warning = createEl('p', { class: 'field__error' }, ['احفظ هذه الأكواد الآن، لن تظهر مجدداً']);

  const downloadBtn = createEl('button', { class: 'btn btn--glass btn--full', style: 'margin-top:12px' }, ['تحميل كملف نصي']);
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = createEl('a', { href: url, download: 'ar-recovery-codes.txt' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const body = createEl('div', {}, [warning, list, downloadBtn]);
  const close = openModal({
    title: 'أكواد الاسترجاع',
    bodyEl: body,
    dismissible: false,
    actions: [{ label: t('common_confirm'), variant: 'primary', onClick: () => close() }],
  });
}

async function regenerateRecoveryCodes() {
  const confirmed = await confirmAction({ title: 'توليد أكواد جديدة', message: 'هذا يُبطل كل الأكواد القديمة. متأكد؟' });
  if (!confirmed) return;
  try {
    const res = await api.post('/2fa/recovery-codes/regenerate', {});
    showRecoveryCodesModal(res.recoveryCodes);
  } catch (err) { showError(err); }
}

function openDisable2FAModal() {
  const password = createEl('input', { type: 'password', class: 'field__input' });
  const totp = createEl('input', { type: 'text', class: 'field__input' });
  const form = createEl('div', {}, [
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, [t('auth_password')]), password]),
    createEl('div', { class: 'field' }, [createEl('label', { class: 'field__label' }, [t('auth_totp_code')]), totp]),
  ]);

  const close = openModal({
    title: 'تعطيل التحقق الثنائي',
    bodyEl: form,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: 'تعطيل', variant: 'primary',
        onClick: async () => {
          try {
            await api.post('/2fa/disable', { password: password.value, totpCode: totp.value.trim() });
            showToast('تم تعطيل التحقق الثنائي', 'success');
            close();
            renderSettingsPage(document.getElementById('content-column'));
          } catch (err) { showError(err); }
        },
      },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// الأجهزة والجلسات
// ═══════════════════════════════════════════════════════════════
function renderDevicesSection() {
  const body = createEl('div', { id: 'devices-body' }, [createEl('div', { class: 'spinner' })]);
  loadDevices(body);
  return section(t('settings_devices'), body);
}

async function loadDevices(body) {
  try {
    const res = await api.get('/sessions');
    body.innerHTML = '';
    const devices = res.devices || [];

    devices.forEach((device) => {
      const row = createEl('div', { class: 'settings-row' }, [
        createEl('div', {}, [
          createEl('div', { class: 'settings-row__label' }, [
            escapeHTML(device.device_name), device.is_current ? ' (هذا الجهاز)' : '',
          ]),
          createEl('div', { class: 'settings-row__desc' }, [
            `آخر نشاط: ${relativeTime(device.last_seen_at, store.getState().lang)}`,
          ]),
        ]),
        !device.is_current ? createEl('button', {
          class: 'btn btn--glass btn--sm',
          onclick: async () => {
            try {
              await api.delete(`/sessions/${device.id}`);
              loadDevices(body);
            } catch (err) { showError(err); }
          },
        }, [t('nav_logout')]) : null,
      ]);
      body.appendChild(row);
    });

    const revokeAllBtn = createEl('button', { class: 'btn btn--danger btn--sm', style: 'margin-top:12px' }, ['تسجيل الخروج من جميع الأجهزة الأخرى']);
    revokeAllBtn.addEventListener('click', async () => {
      const confirmed = await confirmAction({ title: 'تأكيد', message: 'سيتم تسجيل الخروج من كل الأجهزة الأخرى' });
      if (!confirmed) return;
      try {
        await api.post('/sessions/revoke-all', {});
        showToast('تم', 'success');
        loadDevices(body);
      } catch (err) { showError(err); }
    });
    body.appendChild(revokeAllBtn);
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// السجل الأمني
// ═══════════════════════════════════════════════════════════════
function renderSecurityLogSection() {
  const body = createEl('div', { id: 'security-log-body' }, [createEl('div', { class: 'spinner' })]);
  loadSecurityLog(body);
  return section(t('settings_security_log'), body);
}

async function loadSecurityLog(body) {
  try {
    const res = await api.get('/account/security-log');
    body.innerHTML = '';
    const log = res.log || [];
    if (log.length === 0) {
      body.appendChild(createEl('p', { class: 'field__hint' }, ['لا سجلات بعد']));
      return;
    }
    log.slice(0, 10).forEach((entry) => {
      body.appendChild(createEl('div', { class: 'settings-row' }, [
        createEl('div', {}, [
          createEl('div', { class: 'settings-row__label' }, [entry.event_type]),
          createEl('div', { class: 'settings-row__desc' }, [
            `${entry.ip_address || ''} · ${relativeTime(entry.created_at, store.getState().lang)}`,
          ]),
        ]),
      ]));
    });
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// تفضيلات الإشعارات
// ═══════════════════════════════════════════════════════════════
function renderNotificationsSection() {
  const body = createEl('div', { id: 'notif-prefs-body' }, [createEl('div', { class: 'spinner' })]);
  loadNotificationPreferences(body);
  return section(t('settings_notifications'), body);
}

async function loadNotificationPreferences(body) {
  const labels = { likes: 'الإعجابات', follows: 'المتابعات', replies: 'الردود', reposts: 'إعادة النشر', messages: 'الرسائل', community_posts: 'منشورات المجتمعات' };
  try {
    const res = await api.get('/notifications/preferences');
    body.innerHTML = '';
    Object.entries(labels).forEach(([key, label]) => {
      body.appendChild(toggleRow(label, null, res.preferences[key], async (checked) => {
        try {
          await api.put('/notifications/preferences', { [key]: checked });
        } catch (err) { showError(err); }
      }));
    });
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// الخصوصية
// ═══════════════════════════════════════════════════════════════
function renderPrivacySection() {
  const body = createEl('div', { id: 'privacy-body' }, [createEl('div', { class: 'spinner' })]);
  loadPrivacy(body);
  return section(t('settings_privacy'), body);
}

async function loadPrivacy(body) {
  try {
    const res = await api.get('/account/privacy');
    body.innerHTML = '';

    const privateToggle = toggleRow('حساب خاص', 'فقط المتابِعون يرون منشوراتك', res.privacy.is_private, async (checked) => {
      try { await api.put('/account/privacy', { isPrivate: checked }); } catch (err) { showError(err); }
    });

    const select = createEl('select', { class: 'field__input' }, [
      createEl('option', { value: 'everyone' }, ['الجميع']),
      createEl('option', { value: 'followers' }, ['المتابَعون فقط']),
    ]);
    select.value = res.privacy.who_can_message;
    select.addEventListener('change', async () => {
      try { await api.put('/account/privacy', { whoCanMessage: select.value }); } catch (err) { showError(err); }
    });

    const messageRow = createEl('div', { class: 'settings-row' }, [
      createEl('div', { class: 'settings-row__label' }, ['من يقدر يراسلني']),
      select,
    ]);

    body.append(privateToggle, messageRow);
  } catch (err) {
    body.innerHTML = '';
    showError(err);
  }
}

// ═══════════════════════════════════════════════════════════════
// منطقة الخطر
// ═══════════════════════════════════════════════════════════════
function renderDangerZoneSection() {
  const zone = createEl('div', { class: 'danger-zone' }, [
    createEl('div', { class: 'danger-zone__title' }, [t('settings_danger_zone')]),
  ]);

  const body = createEl('div', { id: 'danger-zone-body' });
  zone.appendChild(body);
  checkDeletionStatus(body);

  return createEl('div', { class: 'settings-section' }, [zone]);
}

async function checkDeletionStatus(body) {
  body.innerHTML = '';
  const deleteBtn = createEl('button', { class: 'btn btn--danger', onclick: openDeleteAccountModal }, [t('settings_delete_account')]);
  body.appendChild(deleteBtn);
}

function openDeleteAccountModal() {
  const form = createEl('div', {}, [
    createEl('p', { class: 'modal-message' }, [
      'سيُخفى حسابك فوراً، ويُحذف نهائياً خلال المدة المحدَّدة بالنظام. لو سجّلت دخولك خلال هذه المدة، يُلغى الحذف تلقائياً.',
    ]),
  ]);

  const close = openModal({
    title: t('settings_delete_account'),
    bodyEl: form,
    actions: [
      { label: t('common_cancel'), onClick: () => close() },
      {
        label: t('common_delete'), variant: 'primary',
        onClick: async () => {
          try {
            await api.post('/account/delete-request', {});
            showToast('تم استلام طلب الحذف', 'success');
            close();
          } catch (err) { showError(err); }
        },
      },
    ],
  });
}
