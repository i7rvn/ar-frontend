import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import type { ApiEnvelope, Post } from '@/types/api'

export type FeedTab = 'for-you' | 'following'
const PAGE_SIZE = 20

interface FeedPage {
  posts: Post[]
  page: number
}
type FeedData = InfiniteData<FeedPage, number>

export function useFeed(tab: FeedTab) {
  return useInfiniteQuery({
    queryKey: ['feed', tab],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const res = await api.get<ApiEnvelope<{ posts: Post[]; page: number }>>(
        `/feed/${tab}?page=${pageParam}&limit=${PAGE_SIZE}`,
        { signal },
      )
      return { posts: res.data.posts ?? [], page: pageParam } satisfies FeedPage
    },
    // صفحة كاملة (20) = ممكن فيه صفحة تالية؛ أقل = وصلنا للآخر
    getNextPageParam: (last) => (last.posts.length === PAGE_SIZE ? last.page + 1 : undefined),
    staleTime: 30_000,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  const toast = useUiStore((s) => s.toast)
  return useMutation({
    mutationFn: (content: string) => api.post<ApiEnvelope<Post>>('/posts', { content }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })
}

/** إعجاب متفائل: الواجهة تتغير فوراً، وترجع لحالتها لو فشل الطلب */
export function useToggleLike() {
  const queryClient = useQueryClient()
  const toast = useUiStore((s) => s.toast)

  return useMutation({
    mutationFn: (postId: string) =>
      api.post<ApiEnvelope<{ liked: boolean }>>(`/posts/${postId}/like`),

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] })
      const snapshots = queryClient.getQueriesData<FeedData>({ queryKey: ['feed'] })

      queryClient.setQueriesData<FeedData>({ queryKey: ['feed'] }, (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            posts: p.posts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    liked_by_me: !post.liked_by_me,
                    likes_count: Math.max(0, post.likes_count + (post.liked_by_me ? -1 : 1)),
                  }
                : post,
            ),
          })),
        },
      )
      return { snapshots }
    },

    onError: (err: Error, _postId, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast(err.message, 'error')
    },
  })
}
