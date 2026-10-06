import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { ApiEnvelope, User } from '@/types/api'

/** عند الإقلاع: استعمل refresh cookie للحصول على access token في الذاكرة ثم /auth/me */
export function useBootstrapSession() {
  const status = useAuthStore((s) => s.status)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    if (status !== 'loading') return
    const controller = new AbortController()
    api
      .post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh-token', {}, { auth: false })
      .then((refresh) => {
        const { tokens } = require('@/lib/tokens') as typeof import('@/lib/tokens')
        tokens.set(refresh.data.accessToken)
        return api.get<ApiEnvelope<{ user: User }>>('/auth/me', { signal: controller.signal })
      })
      .then((res) => setUser(res.data.user))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        useAuthStore.getState().clear()
      })
    return () => controller.abort()
  }, [status, setUser])
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', {}).catch(() => undefined)
    },
    onSettled: () => {
      useAuthStore.getState().clear()
      queryClient.clear() // لا نترك بيانات المستخدم السابق بالكاش
    },
  })
}
