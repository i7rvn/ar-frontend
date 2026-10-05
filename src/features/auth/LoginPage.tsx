import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useT } from '@/i18n/useT'
import { ApiError, api } from '@/lib/api'
import { tokens } from '@/lib/tokens'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { ApiEnvelope, AuthPayload } from '@/types/api'

interface LoginBody {
  identifier: string
  password: string
  totpCode?: string
  recoveryCode?: string
}

export function LoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const toast = useUiStore((s) => s.toast)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [needsTotp, setNeedsTotp] = useState(false)
  const [useRecovery, setUseRecovery] = useState(false)
  const [secondFactor, setSecondFactor] = useState('')
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; second?: string }>({})

  const login = useMutation({
    mutationFn: (body: LoginBody) => api.post<ApiEnvelope<AuthPayload>>('/auth/login', body, { auth: false }),
    onSuccess: (res) => {
      tokens.set(res.data.accessToken, res.data.refreshToken)
      setUser(res.data.user)
      toast(t('auth_welcome'), 'success')
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.requiresTOTP) {
        setNeedsTotp(true) // الخادم يطلب الخطوة الثانية (428)
        return
      }
      if (err instanceof ApiError && err.status === 423 && err.retryAfterSeconds) {
        const mins = Math.max(1, Math.ceil(err.retryAfterSeconds / 60))
        toast(`${t('auth_locked')} ${mins} ${t('auth_minutes')}`, 'error')
        return
      }
      toast(err.message, 'error')
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const idErr = identifier.trim().length < 3 ? t('err_required') : undefined
    const pwErr = !password ? t('err_required') : undefined
    const secErr = needsTotp && !secondFactor.trim() ? t('err_required') : undefined
    setErrors({ identifier: idErr, password: pwErr, second: secErr })
    if (idErr || pwErr || secErr) return

    const body: LoginBody = { identifier: identifier.trim(), password }
    if (needsTotp) {
      if (useRecovery) body.recoveryCode = secondFactor.trim()
      else body.totpCode = secondFactor.trim()
    }
    login.mutate(body)
  }

  return (
    <AuthLayout title={needsTotp ? t('auth_totp_title') : t('auth_login_title')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {!needsTotp ? (
          <>
            <Input
              label={t('auth_identifier')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={errors.identifier}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              dir="ltr"
              className="text-start"
              autoFocus
            />
            <Input
              label={t('auth_password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              dir="ltr"
              className="text-start"
            />
          </>
        ) : (
          <Input
            label={useRecovery ? t('auth_recovery_code') : t('auth_totp_code')}
            value={secondFactor}
            onChange={(e) => setSecondFactor(e.target.value)}
            error={errors.second}
            inputMode={useRecovery ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            dir="ltr"
            className="text-start tracking-widest"
            autoFocus
          />
        )}

        <Button type="submit" size="lg" fullWidth loading={login.isPending}>
          {needsTotp ? t('auth_totp_btn') : t('auth_login_btn')}
        </Button>

        {needsTotp && (
          <button
            type="button"
            onClick={() => {
              setUseRecovery((v) => !v)
              setSecondFactor('')
            }}
            className="text-sm font-medium text-brand hover:underline"
          >
            {useRecovery ? t('auth_totp_code') : t('auth_use_recovery')}
          </button>
        )}
      </form>

      {!needsTotp && (
        <p className="mt-8 text-center text-sm text-muted">
          {t('auth_no_account')}{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            {t('auth_register_title')}
          </Link>
        </p>
      )}
    </AuthLayout>
  )
}

