import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useT } from '@/i18n/useT'
import { ApiError, api } from '@/lib/api'
import { setLoginChallenge } from '@/features/auth/loginChallenge'
import { tokens } from '@/lib/tokens'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { ApiEnvelope, AuthPayload } from '@/types/api'

interface LoginBody {
  identifier: string
  password: string
}

export function LoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const toast = useUiStore((s) => s.toast)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})

  const login = useMutation({
    mutationFn: (body: LoginBody) => api.post<ApiEnvelope<AuthPayload>>('/auth/login', body, { auth: false }),
    onSuccess: (res) => {
      tokens.set(res.data.accessToken)
      setUser(res.data.user)
      toast(t('auth_welcome'), 'success')
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    },
    onError: (err: Error, credentials) => {
      if (err instanceof ApiError && err.requiresTOTP) {
        setLoginChallenge(credentials)
        navigate('/login/2fa', { replace: true, state: location.state })
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

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const normalizedIdentifier = identifier.trim()
    const identifierError = normalizedIdentifier.length < 3 ? t('err_required') : undefined
    const passwordError = !password ? t('err_required') : undefined
    setErrors({ identifier: identifierError, password: passwordError })
    if (identifierError || passwordError) return
    login.mutate({ identifier: normalizedIdentifier, password })
  }

  return (
    <AuthLayout title={t('auth_login_title')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t('auth_identifier')}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
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
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          autoComplete="current-password"
          dir="ltr"
          className="text-start"
        />
        <Button type="submit" size="lg" fullWidth loading={login.isPending}>
          {t('auth_login_btn')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {t('auth_no_account')}{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline">
          {t('auth_register_title')}
        </Link>
      </p>
    </AuthLayout>
  )
}
