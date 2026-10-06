import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import type { ApiEnvelope, Post, PostVisibility } from '@/types/api'

export type FeedTab = 'for-you' | 'following'
const PAGE_SIZE = 20
interface FeedPage { posts: Post[]; page: number }
type FeedData = InfiniteData<FeedPage, number>
export function useFeed(tab: FeedTab) {
  return useInfiniteQuery({ queryKey: ['feed', tab], initialPageParam: 1, queryFn: async ({ pageParam, signal }) => {
    const res = await api.get<ApiEnvelope<{ posts: Post[]; page: number }>>(`/feed/${tab}?page=${pageParam}&limit=${PAGE_SIZE}`, { signal })
    return { posts: res.data.posts ?? [], page: pageParam } satisfies FeedPage
  }, getNextPageParam: (last) => last.posts.length === PAGE_SIZE ? last.page + 1 : undefined, staleTime: 30_000 })
}

export interface CreatePostInput { content: string; mediaUrls?: string[]; mediaTypes?: string[]; isSensitive?: boolean; sensitiveWarning?: string; visibility?: PostVisibility; poll?: { options: string[]; durationSeconds: number } }
export function useCreatePost() {
  const qc = useQueryClient(); const toast = useUiStore((s) => s.toast)
  return useMutation({ mutationFn: (input: CreatePostInput) => api.post<ApiEnvelope<Post>>('/posts', input), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['feed'] }) }, onError: (err: Error) => toast(err.message, 'error') })
}

export function useToggleLike() {
  const qc = useQueryClient(); const toast = useUiStore((s) => s.toast)
  return useMutation({ mutationFn: (postId: string) => api.post<ApiEnvelope<{ liked: boolean }>>(`/posts/${postId}/like`), onMutate: async (postId) => { await qc.cancelQueries({ queryKey: ['feed'] }); const snapshots = qc.getQueriesData<FeedData>({ queryKey: ['feed'] }); qc.setQueriesData<FeedData>({ queryKey: ['feed'] }, (data) => data && ({ ...data, pages: data.pages.map((p) => ({ ...p, posts: p.posts.map((post) => post.id === postId ? { ...post, liked_by_me: !post.liked_by_me, likes_count: Math.max(0, post.likes_count + (post.liked_by_me ? -1 : 1)) } : post) })) })); return { snapshots } }, onError: (err: Error, _id, ctx) => { ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data)); toast(err.message, 'error') } })
}

export function useVotePoll() {
  const qc = useQueryClient(); const toast = useUiStore((s) => s.toast)
  return useMutation({ mutationFn: ({ postId, optionId }: { postId: string; optionId: string }) => api.post<ApiEnvelope<unknown>>(`/posts/${postId}/poll/vote`, { optionId }), onSuccess: (_data, vars) => { void qc.invalidateQueries({ queryKey: ['feed'] }); void qc.invalidateQueries({ queryKey: ['post', vars.postId] }) }, onError: (err: Error) => toast(err.message, 'error') })
}

export function useLinkPreview(url: string | null) {
  return useInfiniteQuery({ queryKey: ['link-preview', url], enabled: Boolean(url), initialPageParam: 1, queryFn: async () => api.get<ApiEnvelope<{ url: string; title: string | null; description: string | null; image: string | null }>>(`/link-preview?url=${encodeURIComponent(url!)}`), getNextPageParam: () => undefined, staleTime: 60 * 60 * 1000 })
}
