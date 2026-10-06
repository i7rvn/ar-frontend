import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useT } from '@/i18n/useT'
import { ApiError, api } from '@/lib/api'
import { tokens } from '@/lib/tokens'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { clearLoginChallenge, getLoginChallenge } from '@/features/auth/loginChallenge'
import type { ApiEnvelope, AuthPayload } from '@/types/api'

export function TwoFactorLoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const challenge = getLoginChallenge()
  const setUser = useAuthStore((s) => s.setUser)
  const toast = useUiStore((s) => s.toast)
  const [useRecovery, setUseRecovery] = useState(false)
  const [secondFactor, setSecondFactor] = useState('')
  const [error, setError] = useState<string>()

  const login = useMutation({
    mutationFn: () => {
      if (!challenge) throw new Error('انتهت محاولة تسجيل الدخول، ابدئي من جديد')
      return api.post<ApiEnvelope<AuthPayload>>('/auth/login', {
        identifier: challenge.identifier,
        password: challenge.password,
        ...(useRecovery ? { recoveryCode: secondFactor.trim() } : { totpCode: secondFactor.trim() }),
      }, { auth: false })
    },
    onSuccess: (res) => {
      clearLoginChallenge()
      tokens.set(res.data.accessToken)
      setUser(res.data.user)
      toast(t('auth_welcome'), 'success')
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' && from !== '/login/2fa' ? from : '/', { replace: true })
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 423 && err.retryAfterSeconds) {
        const mins = Math.max(1, Math.ceil(err.retryAfterSeconds / 60))
        toast(`${t('auth_locked')} ${mins} ${t('auth_minutes')}`, 'error')
        return
      }
      setError(err.message)
    },
  })

  if (!challenge) return <Navigate to="/login" replace />

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!secondFactor.trim()) {
      setError(t('err_required'))
      return
    }
    setError(undefined)
    login.mutate()
  }

  function returnToLogin() {
    clearLoginChallenge()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout title={t('auth_totp_title')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={useRecovery ? t('auth_recovery_code') : t('auth_totp_code')}
          value={secondFactor}
          onChange={(event) => {
            setSecondFactor(event.target.value)
            setError(undefined)
          }}
          error={error}
          inputMode={useRecovery ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          dir="ltr"
          className="text-start tracking-widest"
          autoFocus
        />
        <Button type="submit" size="lg" fullWidth loading={login.isPending}>
          {t('auth_totp_btn')}
        </Button>
        <button
          type="button"
          onClick={() => {
            setUseRecovery((current) => !current)
            setSecondFactor('')
            setError(undefined)
          }}
          className="text-sm font-medium text-brand hover:underline"
        >
          {useRecovery ? t('auth_totp_code') : t('auth_use_recovery')}
        </button>
        <button
          type="button"
          onClick={returnToLogin}
          className="text-sm text-muted hover:underline"
        >
          {t('auth_login_title')}
        </button>
      </form>
    </AuthLayout>
  )
}
