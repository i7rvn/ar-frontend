import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { tokens } from '@/lib/tokens'
import { useAuthStore } from '@/stores/auth'
import type { ApiEnvelope, User } from '@/types/api'

/** عند الإقلاع: إذا فيه توكن محفوظ نتحقق منه عبر /auth/me */
export function useBootstrapSession() {
  const status = useAuthStore((s) => s.status)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    if (status !== 'loading') return
    const controller = new AbortController()
    api
      .get<ApiEnvelope<{ user: User }>>('/auth/me', { signal: controller.signal })
      .then((res) => setUser(res.data.user))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        // فشل التحقق (توكن منتهٍ/محذوف): api.ts يمسح الجلسة بنفسه عند 401؛
        // لأخطاء الشبكة نعتبره زائر (يقدر يعيد المحاولة بتسجيل الدخول)
        useAuthStore.getState().clear()
      })
    return () => controller.abort()
  }, [status, setUser])
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokens.getRefresh()
      // نبلاكليست التوكنين بالخادم. لو فشل الطلب (شبكة) نكمل مسح الجلسة محلياً
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {}).catch(() => undefined)
    },
    onSettled: () => {
      useAuthStore.getState().clear()
      queryClient.clear() // لا نترك بيانات المستخدم السابق بالكاش
    },
  })
}
