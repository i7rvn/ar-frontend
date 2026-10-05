import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import type { ApiEnvelope, User } from '@/types/api'

export interface TrendingTag {
  tag: string
  posts_count: number
  recent_posts?: number
}

export function useTrending() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: async ({ signal }) =>
      (await api.get<ApiEnvelope<TrendingTag[]>>('/hashtags/trending', { signal })).data.slice(0, 5),
    staleTime: 5 * 60_000, // الخادم نفسه يخزّنها 5 دقائق
  })
}

export function useSuggestions() {
  return useQuery({
    queryKey: ['suggestions'],
    queryFn: async ({ signal }) =>
      (await api.get<ApiEnvelope<User[]>>('/users/suggestions?limit=3', { signal })).data,
    staleTime: 2 * 60_000,
  })
}

/** ملاحظة: POST /follows/:id يبدّل (متابعة/إلغاء) — الواجهة تعطّل الزر بعد النجاح */
export function useFollow() {
  const toast = useUiStore((s) => s.toast)
  return useMutation({
    mutationFn: (userId: string) => api.post(`/follows/${userId}`),
    onError: (err: Error) => toast(err.message, 'error'),
  })
}
