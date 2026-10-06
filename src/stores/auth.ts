import { create } from 'zustand'
import { tokens } from '@/lib/tokens'
import type { User } from '@/types/api'

// loading = لسه نتحقق من الجلسة عند الإقلاع (نتفادى وميض صفحة الدخول)
type Status = 'loading' | 'authed' | 'guest'

interface AuthState {
  user: User | null
  status: Status
  setUser: (user: User) => void
  /** يمسح الجلسة بالكامل (تسجيل خروج أو انتهاء الجلسة) */
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  setUser: (user) => set({ user, status: 'authed' }),
  clear: () => {
    tokens.clear()
    set({ user: null, status: 'guest' })
  },
}))
