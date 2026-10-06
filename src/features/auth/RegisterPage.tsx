import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { rules } from '@/features/auth/validation'
import type { TranslationKey } from '@/i18n/dictionary'
import { useT } from '@/i18n/useT'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { config } from '@/lib/config'
import { tokens } from '@/lib/tokens'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { ApiEnvelope, AuthPayload } from '@/types/api'

type Channel = 'email' | 'whatsapp'
type Step = 'form' | 'otp'
type FieldErrors = Partial<Record<'email' | 'username' | 'displayName' | 'password' | 'confirm' | 'invite' | 'phone' | 'otp', string>>

const RESEND_SECONDS = 60

export function RegisterPage() {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)
  const toast = useUiStore((s) => s.toast)

  const [step, setStep] = useState<Step>('form')
  const [channel, setChannel] = useState<Channel>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // رابط دعوة جاهز (?invite=CODE) يعبّي الحقل ويفتحه تلقائياً
  const [invite, setInvite] = useState(() => (params.get('invite') ?? '').trim().slice(0, 16))
  const [inviteOpen, setInviteOpen] = useState(() => !!params.get('invite'))
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [resendIn])

  const channelPayload = channel === 'whatsapp' ? { phone, channel } : { email, channel }

  const sendOtp = useMutation({
    mutationFn: () => api.post('/auth/send-otp', channelPayload, { auth: false }),
    onSuccess: () => {
      setStep('otp')
      setResendIn(RESEND_SECONDS)
    },
    onError: handleServerError,
  })

  const register = useMutation({
    mutationFn: () =>
      api.post<ApiEnvelope<AuthPayload>>(
        '/auth/register',
        {
          email,
          username,
          password,
          display_name: displayName.trim(),
          otp_channel: channel,
          ...(channel === 'whatsapp' ? { phone_number: phone } : {}),
          ...(invite.trim() ? { invite_code: invite.trim() } : {}),
        },
        { auth: false },
      ),
    onSuccess: (res) => {
      tokens.set(res.data.accessToken)
      setUser(res.data.user)
      toast(t('auth_welcome'), 'success')
      navigate('/', { replace: true })
    },
    onError: handleServerError,
  })

  const verifyAndRegister = useMutation({
    mutationFn: async () => {
      await api.post('/auth/verify-otp', { ...channelPayload, code: otp }, { auth: false })
      return register.mutateAsync()
    },
    onError: handleServerError,
  })

  function handleServerError(err: Error) {
    // أخطاء مرتبطة بحقل محدد نعرضها تحته؛ والباقي toast
    if (err instanceof ApiError) {
      if (err.code === 'EMAIL_ACCOUNT_LIMIT') {
        setStep('form')
        setErrors((e) => ({ ...e, email: err.message }))
        return
      }
      if (err.code === 'WHATSAPP_SEND_FAILED') {
        setErrors((e) => ({ ...e, phone: err.message }))
        return
      }
    }
    toast(err.message, 'error')
  }

  function validateForm(): boolean {
    const tr = (k: TranslationKey | null) => (k ? t(k) : undefined)
    const next: FieldErrors = {
      email: channel === 'email' ? tr(rules.email(email.trim())) : undefined,
      phone: channel === 'whatsapp' ? tr(rules.phone(phone.trim())) : undefined,
      username: tr(rules.username(username)),
      displayName: tr(rules.displayName(displayName)),
      password: tr(rules.password(password)),
      confirm: confirm !== password ? t('auth_password_mismatch') : undefined,
      invite: tr(rules.inviteCode(invite)),
    }
    setErrors(next)
    return !Object.values(next).some(Boolean)
  }

  function onSubmitForm(e: FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    // مفتاح الطوارئ: تخطي OTP (يتطلب نفس الإعداد بالباك اند)
    if (config.skipOtpStep) register.mutate()
    else sendOtp.mutate()
  }

  function onSubmitOtp(e: FormEvent) {
    e.preventDefault()
    const err = rules.otp(otp)
    setErrors({ otp: err ? t(err) : undefined })
    if (!err) verifyAndRegister.mutate()
  }

  const busy = sendOtp.isPending || register.isPending || verifyAndRegister.isPending

  // ─── خطوة الكود ───
  if (step === 'otp') {
    return (
      <AuthLayout title={t('auth_otp_title')}>
        <form onSubmit={onSubmitOtp} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {t('auth_otp_sent')} <bdi className="font-medium text-fg" dir="ltr">{channel === 'email' ? email : phone}</bdi>
          </p>
          <Input
            label={t('auth_otp_code')}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={errors.otp}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            dir="ltr"
            className="text-center text-2xl tracking-[0.5em]"
            autoFocus
          />
          <Button type="submit" size="lg" fullWidth loading={busy}>
            {t('auth_otp_verify')}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => setStep('form')} className="font-medium text-muted hover:text-fg">
              {t('auth_back')}
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || sendOtp.isPending}
              onClick={() => sendOtp.mutate()}
              className="font-medium text-brand hover:underline disabled:text-subtle disabled:no-underline"
            >
              {resendIn > 0 ? `${t('auth_resend_otp_in')} ${resendIn}` : t('auth_resend_otp')}
            </button>
          </div>
        </form>
      </AuthLayout>
    )
  }

  // ─── خطوة النموذج ───
  return (
    <AuthLayout title={t('auth_register_title')}>
      <form onSubmit={onSubmitForm} noValidate className="flex flex-col gap-4">
        <Input
          label={t('auth_display_name')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={errors.displayName}
          autoComplete="name"
          maxLength={100}
          autoFocus
        />
        <Input
          label={t('auth_username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={50}
          dir="ltr"
          className="text-start"
        />

        {/* قناة التحقق: بريد أو واتساب */}
        <div role="group" aria-label="OTP channel" className="grid grid-cols-2 gap-1 rounded-control border border-line p-1">
          {(['email', 'whatsapp'] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={channel === c}
              onClick={() => setChannel(c)}
              className={cn(
                'min-h-9 rounded-[0.45rem] text-sm font-medium transition-colors',
                channel === c ? 'bg-brand text-on-brand' : 'text-muted hover:text-fg',
              )}
            >
              {c === 'email' ? t('auth_channel_email') : t('auth_channel_whatsapp')}
            </button>
          ))}
        </div>

        {channel === 'email' ? (
          <Input
            label={t('auth_email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            dir="ltr"
            className="text-start"
          />
        ) : (
          <Input
            label={t('auth_phone')}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            autoComplete="tel"
            placeholder="+213555000000"
            dir="ltr"
            className="text-start"
          />
        )}
        {/* واتساب يحتاج بريد أيضاً (هوية الحساب تبقى البريد) */}
        {channel === 'whatsapp' && (
          <Input
            label={t('auth_email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            dir="ltr"
            className="text-start"
          />
        )}

        <Input
          label={t('auth_password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={!errors.password ? t('err_password') : undefined}
          autoComplete="new-password"
          dir="ltr"
          className="text-start"
        />
        <Input
          label={t('auth_confirm_password')}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
          dir="ltr"
          className="text-start"
        />

        {inviteOpen ? (
          <Input
            label={t('auth_invite_code')}
            value={invite}
            onChange={(e) => setInvite(e.target.value.slice(0, 16))}
            error={errors.invite}
            maxLength={16}
            autoCapitalize="none"
            spellCheck={false}
            dir="ltr"
            className="text-start font-mono"
          />
        ) : (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="self-start text-sm font-medium text-brand hover:underline"
          >
            {t('auth_invite_toggle')}
          </button>
        )}

        <Button type="submit" size="lg" fullWidth loading={busy} className="mt-2">
          {t('auth_register_btn')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {t('auth_have_account')}{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          {t('auth_login_title')}
        </Link>
      </p>
    </AuthLayout>
  )
}
