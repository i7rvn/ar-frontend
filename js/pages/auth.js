// ═══════════════════════════════════════════════════════════════
// AR — صفحة المصادقة: دخول، تسجيل (خطوتين)، OTP، نسيت كلمة المرور
// ═══════════════════════════════════════════════════════════════

import { CONFIG } from '../config.js';
import { api, setTokens, ApiError } from '../api.js';
import { store } from '../store.js';
import { t } from '../i18n.js';
import { navigate } from '../router.js';
import { createEl, escapeHTML, debounce } from '../utils.js';
import { showError, showToast, openModal } from '../modals.js';

// ─── حالة مؤقتة لتدفّق التسجيل بين الخطوات ──────────────────────
let registerState = {
  email: '', username: '', password: '', displayName: '', inviteCode: '',
  otpChannel: 'email', phoneNumber: '',
};
let otpResendTimer = null;

export function renderAuthPage(container, mode = 'login') {
  container.innerHTML = '';
  const wrapper = createEl('div', { class: 'auth-page' });

  if (mode === 'login') wrapper.appendChild(renderLoginForm());
  else if (mode === 'register') wrapper.appendChild(renderRegisterForm());
  else if (mode === 'forgot-password') wrapper.appendChild(renderForgotPasswordForm());
  else if (mode === 'reset-password') wrapper.appendChild(renderResetPasswordForm());

  container.appendChild(wrapper);
}

// ═══════════════════════════════════════════════════════════════
// نسيت كلمة المرور
// ═══════════════════════════════════════════════════════════════
function renderForgotPasswordForm() {
  const form = createEl('form', { class: 'auth-form', novalidate: 'true' });
  const title = createEl('h1', { class: 'auth-title' }, [t('auth_forgot_password')]);
  const subtitle = createEl('p', { class: 'auth-subtitle' }, ['أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين']);
  const emailField = buildField({ id: 'email', label: t('auth_email'), type: 'email', autocomplete: 'email' });
  const submitBtn = createEl('button', { type: 'submit', class: 'btn btn--primary btn--full' }, [t('common_confirm')]);
  const backLink = createEl('a', { href: '/login', 'data-link': true, class: 'link-btn' }, [t('auth_login_title')]);

  form.append(emailField.wrap, submitBtn, backLink);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(submitBtn, true);
    try {
      await api.post('/auth/forgot-password', { email: emailField.input.value.trim() }, { skipAuth: true });
      form.innerHTML = '';
      form.appendChild(createEl('p', { class: 'auth-subtitle' }, [
        'إذا كان بريدك مسجّلاً، ستصلك رسالة لإعادة تعيين كلمة المرور خلال دقائق.',
      ]));
      form.appendChild(backLink);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(submitBtn, false);
    }
  });

  return createEl('div', {}, [title, subtitle, form]);
}

// ═══════════════════════════════════════════════════════════════
// إعادة تعيين كلمة المرور (من رابط البريد)
// ═══════════════════════════════════════════════════════════════
function renderResetPasswordForm() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const form = createEl('form', { class: 'auth-form', novalidate: 'true' });
  const title = createEl('h1', { class: 'auth-title' }, ['إعادة تعيين كلمة المرور']);

  if (!token) {
    return createEl('div', {}, [title, createEl('p', { class: 'auth-subtitle' }, ['الرابط غير صالح'])]);
  }

  const passwordField = buildField({ id: 'newPassword', label: t('auth_password'), type: 'password', autocomplete: 'new-password' });
  const strengthMeter = buildPasswordStrengthMeter();
  passwordField.wrap.appendChild(strengthMeter.el);
  const confirmField = buildField({ id: 'confirmPassword', label: t('auth_confirm_password'), type: 'password', autocomplete: 'new-password' });
  const submitBtn = createEl('button', { type: 'submit', class: 'btn btn--primary btn--full' }, [t('common_confirm')]);

  const checkStrength = debounce(async (password) => {
    if (!password) { strengthMeter.reset(); return; }
    try {
      const res = await api.post('/auth/check-password-strength', { password }, { skipAuth: true });
      strengthMeter.update(res.score, res.label);
    } catch {
      strengthMeter.reset();
    }
  }, CONFIG.DEBOUNCE_MS);
  passwordField.input.addEventListener('input', (e) => checkStrength(e.target.value));

  form.append(passwordField.wrap, confirmField.wrap, submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    if (passwordField.input.value !== confirmField.input.value) {
      setFieldError(confirmField, 'كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(submitBtn, true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: passwordField.input.value }, { skipAuth: true });
      showToast('تم تغيير كلمة المرور، يمكنك الدخول الآن', 'success');
      navigate('/login');
    } catch (err) {
      showError(err);
    } finally {
      setLoading(submitBtn, false);
    }
  });

  return createEl('div', {}, [title, form]);
}

// ═══════════════════════════════════════════════════════════════
// تسجيل الدخول
// ═══════════════════════════════════════════════════════════════
function renderLoginForm() {
  const form = createEl('form', { class: 'auth-form', novalidate: 'true' });

  const title = createEl('h1', { class: 'auth-title' }, [t('auth_login_title')]);

  const identifierField = buildField({ id: 'identifier', label: t('auth_identifier'), type: 'text', autocomplete: 'username' });
  const passwordField = buildField({ id: 'password', label: t('auth_password'), type: 'password', autocomplete: 'current-password' });

  // حقول 2FA - تظهر فقط بعد رد الخادم بـ428
  const totpField = buildField({ id: 'totpCode', label: t('auth_totp_code'), type: 'text', autocomplete: 'one-time-code' });
  totpField.wrap.style.display = 'none';

  const useRecoveryLink = createEl('button', {
    type: 'button', class: 'link-btn', style: 'display:none',
  }, [t('auth_use_recovery')]);

  const submitBtn = createEl('button', { type: 'submit', class: 'btn btn--primary btn--full' }, [t('auth_login_btn')]);
  const forgotLink = createEl('a', {
    href: '/forgot-password', 'data-link': true, class: 'link-btn',
  }, [t('auth_forgot_password')]);
  const switchLink = createEl('a', { href: '/register', 'data-link': true, class: 'link-btn' }, [`${t('auth_no_account')} ${t('auth_register_title')}`]);

  let usingRecoveryCode = false;
  useRecoveryLink.addEventListener('click', () => {
    usingRecoveryCode = !usingRecoveryCode;
    totpField.wrap.querySelector('label').textContent = usingRecoveryCode
      ? 'كود الاسترجاع' : t('auth_totp_code');
    useRecoveryLink.textContent = usingRecoveryCode ? t('auth_totp_code') : t('auth_use_recovery');
  });

  form.append(title, identifierField.wrap, passwordField.wrap, totpField.wrap, useRecoveryLink, submitBtn, forgotLink, switchLink);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    setLoading(submitBtn, true);

    const payload = {
      identifier: identifierField.input.value.trim(),
      password: passwordField.input.value,
    };
    if (totpField.wrap.style.display !== 'none') {
      if (usingRecoveryCode) payload.recoveryCode = totpField.input.value.trim();
      else payload.totpCode = totpField.input.value.trim();
    }

    try {
      const res = await api.post('/auth/login', payload, { skipAuth: true });
      setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      store.setState({ user: res.data.user });
      showToast(`مرحباً بعودتك يا ${res.data.user.display_name}`, 'success');
      navigate('/');
    } catch (err) {
      if (err.status === 428 && err.requiresTOTP) {
        totpField.wrap.style.display = '';
        useRecoveryLink.style.display = '';
        totpField.input.focus();
        showToast(t('auth_totp_title'), 'info');
      } else if (err.status === 423) {
        const minutes = Math.ceil((err.retryAfterSeconds || 60) / 60);
        showToast(`${err.message}`, 'error');
        setFieldError(identifierField, `حسابك مقفل، حاول بعد ${minutes} دقيقة`);
      } else {
        setFieldError(passwordField, err.message);
      }
    } finally {
      setLoading(submitBtn, false);
    }
  });

  return form;
}

// ═══════════════════════════════════════════════════════════════
// التسجيل — الخطوة 1: النموذج
// ═══════════════════════════════════════════════════════════════
function renderRegisterForm() {
  const form = createEl('form', { class: 'auth-form', novalidate: 'true' });
  const title = createEl('h1', { class: 'auth-title' }, [t('auth_register_title')]);

  const nameField = buildField({ id: 'displayName', label: t('auth_display_name'), type: 'text', autocomplete: 'name' });
  const usernameField = buildField({ id: 'username', label: t('auth_username'), type: 'text', autocomplete: 'username' });
  const usernameStatus = createEl('div', { class: 'username-status' });
  usernameField.wrap.appendChild(usernameStatus);

  const emailField = buildField({ id: 'email', label: t('auth_email'), type: 'email', autocomplete: 'email' });

  // ─── اختيار قناة التحقق: بريد إلكتروني أو واتساب ───────────────
  const channelLabel = createEl('div', { class: 'field__label', style: 'margin-top:4px;margin-bottom:8px;' }, ['التحقق عبر']);
  const emailChannelBtn = createEl('button', { type: 'button', class: 'channel-btn channel-btn--active' }, ['📧 البريد الإلكتروني']);
  const whatsappChannelBtn = createEl('button', { type: 'button', class: 'channel-btn' }, ['💬 واتساب']);
  const channelRow = createEl('div', { class: 'channel-row' }, [emailChannelBtn, whatsappChannelBtn]);

  const phoneField = buildField({ id: 'phoneNumber', label: 'رقم الهاتف (صيغة دولية، مثال: +213555000000)', type: 'tel', autocomplete: 'tel' });
  phoneField.wrap.style.display = 'none';

  let selectedChannel = 'email';
  function setChannel(channel) {
    selectedChannel = channel;
    emailChannelBtn.classList.toggle('channel-btn--active', channel === 'email');
    whatsappChannelBtn.classList.toggle('channel-btn--active', channel === 'whatsapp');
    phoneField.wrap.style.display = channel === 'whatsapp' ? '' : 'none';
  }
  emailChannelBtn.addEventListener('click', () => setChannel('email'));
  whatsappChannelBtn.addEventListener('click', () => setChannel('whatsapp'));

  const passwordField = buildField({ id: 'password', label: t('auth_password'), type: 'password', autocomplete: 'new-password' });
  const strengthMeter = buildPasswordStrengthMeter();
  passwordField.wrap.appendChild(strengthMeter.el);

  const confirmField = buildField({ id: 'confirmPassword', label: t('auth_confirm_password'), type: 'password', autocomplete: 'new-password' });
  const inviteCodeField = buildField({
    id: 'invite_code',
    label: 'كود الدعوة (اختياري لغير المقيمين في الجزائر)',
    type: 'text',
    autocomplete: 'off',
  });
  inviteCodeField.input.maxLength = 16;

  // إذا وصلنا من رابط دعوة جاهز (مثلاً ?invite=xxxx من رابط بعثه
  // أدمن)، نعبّي الحقل تلقائياً — بلا حاجة يكتب/ينسخ الكود يدوياً
  const presetInvite = new URLSearchParams(window.location.search).get('invite');
  if (presetInvite) {
    inviteCodeField.input.value = presetInvite.trim().slice(0, 16);
  }

  const submitBtn = createEl('button', { type: 'submit', class: 'btn btn--primary btn--full' }, [t('auth_register_btn')]);
  const switchLink = createEl('a', { href: '/login', 'data-link': true, class: 'link-btn' }, [`${t('auth_have_account')} ${t('auth_login_title')}`]);

  // ─── فحص اسم المستخدم حياً (debounce) ─────────────────────────
  const checkUsername = debounce(async (value) => {
    if (value.length < 3) { usernameStatus.textContent = ''; return; }
    try {
      const res = await api.get(`/username/check/${encodeURIComponent(value)}`, { skipAuth: true });
      const statusMap = {
        available: { text: '✓ متاح', cls: 'username-status--ok' },
        taken: { text: '✕ مستخدم بالفعل', cls: 'username-status--error' },
        reserved: { text: '✕ محجوز', cls: 'username-status--error' },
        invalid: { text: '✕ صيغة غير صالحة', cls: 'username-status--error' },
      };
      const info = statusMap[res.status] || { text: '', cls: '' };
      usernameStatus.textContent = info.text;
      usernameStatus.className = `username-status ${info.cls}`;
    } catch {
      usernameStatus.textContent = '';
    }
  }, CONFIG.DEBOUNCE_MS);

  usernameField.input.addEventListener('input', (e) => checkUsername(e.target.value.trim()));

  // ─── فحص قوة كلمة المرور حياً (debounce) ───────────────────────
  const checkStrength = debounce(async (password) => {
    if (!password) { strengthMeter.reset(); return; }
    try {
      const res = await api.post('/auth/check-password-strength', {
        password,
        email: emailField.input.value.trim(),
        username: usernameField.input.value.trim(),
        displayName: nameField.input.value.trim(),
      }, { skipAuth: true });
      strengthMeter.update(res.score, res.label);
    } catch {
      strengthMeter.reset();
    }
  }, CONFIG.DEBOUNCE_MS);

  passwordField.input.addEventListener('input', (e) => checkStrength(e.target.value));

  form.append(
    nameField.wrap,
    usernameField.wrap,
    emailField.wrap,
    channelLabel,
    channelRow,
    phoneField.wrap,
    passwordField.wrap,
    confirmField.wrap,
    inviteCodeField.wrap,
    submitBtn,
    switchLink,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    if (passwordField.input.value !== confirmField.input.value) {
      setFieldError(confirmField, 'كلمتا المرور غير متطابقتين');
      return;
    }

    const phoneValue = phoneField.input.value.trim();
    if (selectedChannel === 'whatsapp' && !/^\+[1-9]\d{7,14}$/.test(phoneValue)) {
      setFieldError(phoneField, 'أدخل رقم هاتف صحيح بصيغة دولية (مثال: +213555000000)');
      return;
    }

    registerState = {
      displayName: nameField.input.value.trim(),
      username: usernameField.input.value.trim(),
      email: emailField.input.value.trim(),
      password: passwordField.input.value,
      inviteCode: inviteCodeField.input.value.trim(),
      otpChannel: selectedChannel,
      phoneNumber: selectedChannel === 'whatsapp' ? phoneValue : '',
    };

    const otpPayload = selectedChannel === 'whatsapp'
      ? { phone: registerState.phoneNumber, channel: 'whatsapp' }
      : { email: registerState.email, channel: 'email' };

    setLoading(submitBtn, true);

    // ⚠️ مسار طوارئ مؤقت (CONFIG.SKIP_OTP_STEP) — يتخطى send-otp/
    // verify-otp تماماً ويسجّل الحساب مباشرة. يُستعمل فقط أثناء
    // توثيق دومين البريد بـResend. رجّع SKIP_OTP_STEP لـfalse بعد
    // ما يخلص التوثيق — هذا المسار بلا أي تحقق من ملكية البريد/الرقم.
    if (CONFIG.SKIP_OTP_STEP) {
      try {
        const res = await api.post('/auth/register', {
          email: registerState.email,
          username: registerState.username,
          password: registerState.password,
          display_name: registerState.displayName,
          otp_channel: registerState.otpChannel,
          ...(selectedChannel === 'whatsapp' ? { phone_number: registerState.phoneNumber } : {}),
          ...(registerState.inviteCode ? { invite_code: registerState.inviteCode } : {}),
        }, { skipAuth: true });

        setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        store.setState({ user: res.data.user });
        showToast('تم إنشاء حسابك بنجاح', 'success');
        navigate('/');
        maybeShow2FAPrompt();
      } catch (err) {
        showError(err);
      } finally {
        setLoading(submitBtn, false);
      }
      return;
    }

    try {
      await api.post('/auth/send-otp', otpPayload, { skipAuth: true });
      renderOtpStep(form.closest('.auth-page') || form.parentElement);
    } catch (err) {
      if (err.code === 'EMAIL_ACCOUNT_LIMIT') {
        setFieldError(emailField, err.message);
      } else if (err.code === 'WHATSAPP_SEND_FAILED') {
        setFieldError(phoneField, err.message);
      } else {
        showError(err);
      }
    } finally {
      setLoading(submitBtn, false);
    }
  });

  const wrap = createEl('div', {}, [title, form]);
  return wrap;
}

// ═══════════════════════════════════════════════════════════════
// التسجيل — الخطوة 2: OTP (6 خانات منفصلة)
// ═══════════════════════════════════════════════════════════════
function renderOtpStep(container) {
  container.innerHTML = '';

  const isWhatsapp = registerState.otpChannel === 'whatsapp';
  const destination = isWhatsapp ? registerState.phoneNumber : registerState.email;

  const title = createEl('h1', { class: 'auth-title' }, [t('auth_otp_title')]);
  const subtitle = createEl('p', { class: 'auth-subtitle' }, [
    isWhatsapp ? `أرسلنا كود التحقق عبر واتساب إلى: ${escapeHTML(destination)}` : `${t('auth_otp_sent')}: ${escapeHTML(destination)}`,
  ]);

  const otpRow = createEl('div', { class: 'otp-row' });
  const digits = [];
  for (let i = 0; i < 6; i++) {
    const digit = createEl('input', {
      type: 'text', inputmode: 'numeric', maxlength: '1', class: 'otp-digit',
      'aria-label': `رقم ${i + 1}`,
    });
    digits.push(digit);
    otpRow.appendChild(digit);
  }

  digits.forEach((digit, i) => {
    digit.addEventListener('input', () => {
      digit.value = digit.value.replace(/\D/g, '').slice(0, 1);
      if (digit.value && i < 5) digits[i + 1].focus();
    });
    digit.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !digit.value && i > 0) digits[i - 1].focus();
    });
    digit.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, idx) => { if (digits[idx]) digits[idx].value = ch; });
      digits[Math.min(pasted.length, 5)].focus();
    });
  });

  const submitBtn = createEl('button', { class: 'btn btn--primary btn--full' }, [t('common_confirm')]);
  const resendBtn = createEl('button', { type: 'button', class: 'link-btn', disabled: true }, [
    `${t('auth_resend_otp_in')} ${CONFIG.OTP_RESEND_SECONDS}s`,
  ]);

  function startResendTimer() {
    let remaining = CONFIG.OTP_RESEND_SECONDS;
    resendBtn.disabled = true;
    clearInterval(otpResendTimer);
    otpResendTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(otpResendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = t('auth_resend_otp');
      } else {
        resendBtn.textContent = `${t('auth_resend_otp_in')} ${remaining}s`;
      }
    }, 1000);
  }
  startResendTimer();

  resendBtn.addEventListener('click', async () => {
    try {
      const otpPayload = isWhatsapp
        ? { phone: registerState.phoneNumber, channel: 'whatsapp' }
        : { email: registerState.email, channel: 'email' };
      await api.post('/auth/send-otp', otpPayload, { skipAuth: true });
      showToast('تم إرسال كود جديد', 'success');
      startResendTimer();
    } catch (err) {
      showError(err);
    }
  });

  async function submitOtp() {
    const code = digits.map((d) => d.value).join('');
    if (code.length !== 6) {
      showToast('أدخل الكود كاملاً', 'error');
      return;
    }
    setLoading(submitBtn, true);
    try {
      const verifyPayload = isWhatsapp
        ? { phone: registerState.phoneNumber, code, channel: 'whatsapp' }
        : { email: registerState.email, code, channel: 'email' };
      await api.post('/auth/verify-otp', verifyPayload, { skipAuth: true });
      const res = await api.post('/auth/register', {
        email: registerState.email,
        username: registerState.username,
        password: registerState.password,
        display_name: registerState.displayName,
        otp_channel: registerState.otpChannel,
        ...(isWhatsapp ? { phone_number: registerState.phoneNumber } : {}),
        ...(registerState.inviteCode ? { invite_code: registerState.inviteCode } : {}),
      }, { skipAuth: true });

      setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      store.setState({ user: res.data.user });
      clearInterval(otpResendTimer);
      showToast('تم إنشاء حسابك بنجاح', 'success');
      navigate('/');
      maybeShow2FAPrompt();
    } catch (err) {
      showError(err);
      digits.forEach((d) => { d.value = ''; });
      digits[0].focus();
    } finally {
      setLoading(submitBtn, false);
    }
  }

  submitBtn.addEventListener('click', submitOtp);
  digits[5].addEventListener('keydown', (e) => { if (e.key === 'Enter') submitOtp(); });

  container.append(title, subtitle, otpRow, submitBtn, resendBtn);
  digits[0].focus();
}

// ─── نافذة "احمِ حسابك بـ2FA" بعد أول دخول ─────────────────────
function maybeShow2FAPrompt() {
  const body = createEl('p', { class: 'modal-message' }, [t('auth_2fa_prompt_body')]);
  openModal({
    title: t('auth_2fa_prompt_title'),
    bodyEl: body,
    dismissible: false,
    actions: [
      { label: t('auth_2fa_later'), onClick: (close) => document.querySelector('.modal-overlay')?.remove() },
      { label: t('auth_2fa_continue'), variant: 'primary', onClick: () => { document.querySelector('.modal-overlay')?.remove(); navigate('/settings'); } },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// أدوات بناء مشتركة
// ═══════════════════════════════════════════════════════════════
function buildField({ id, label, type, autocomplete }) {
  const input = createEl('input', {
    id, type, class: 'field__input', autocomplete, name: id,
  });
  const labelEl = createEl('label', { for: id, class: 'field__label' }, [label]);
  const errorEl = createEl('div', { class: 'field__error' });
  const wrap = createEl('div', { class: 'field' }, [labelEl, input, errorEl]);
  return { wrap, input, errorEl };
}

function setFieldError(field, message) {
  field.input.classList.add('field__input--error');
  field.errorEl.textContent = message;
}

function clearFieldErrors(form) {
  form.querySelectorAll('.field__input--error').forEach((el) => el.classList.remove('field__input--error'));
  form.querySelectorAll('.field__error').forEach((el) => { el.textContent = ''; });
}

function setLoading(btn, isLoading) {
  btn.disabled = isLoading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = isLoading ? t('common_loading') : btn.dataset.originalText;
}

function buildPasswordStrengthMeter() {
  const bars = [1, 2, 3, 4].map(() => createEl('div', { class: 'password-strength__bar' }));
  const label = createEl('span', { class: 'field__hint' });
  const el = createEl('div', {}, [createEl('div', { class: 'password-strength' }, bars), label]);

  const levels = ['', 'password-strength--weak', 'password-strength--weak', 'password-strength--medium', 'password-strength--strong', 'password-strength--excellent'];
  const labels = { 0: t('password_weak'), 1: t('password_weak'), 2: t('password_medium'), 3: t('password_strong'), 4: t('password_excellent') };

  function update(score, text) {
    const bar = el.querySelector('.password-strength');
    bar.className = `password-strength ${levels[score] || ''}`;
    label.textContent = text || labels[score] || '';
  }
  function reset() {
    el.querySelector('.password-strength').className = 'password-strength';
    label.textContent = '';
  }

  return { el, update, reset };
}
