import { useState, type KeyboardEvent } from 'react'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Composer } from '@/features/feed/Composer'
import { PostCard } from '@/features/feed/PostCard'
import { useFeed, type FeedTab } from '@/features/feed/queries'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { useInView } from '@/lib/useInView'
import { ApiError } from '@/lib/api'

function PostSkeleton() {
  return (
    <div className="flex gap-3 border-b border-line px-4 py-4 sm:px-5" aria-hidden="true">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    </div>
  )
}

export function FeedPage() {
  const t = useT()
  const [tab, setTab] = useState<FeedTab>('for-you')
  const feed = useFeed(tab)

  const tabs: Array<{ id: FeedTab; label: string }> = [
    { id: 'for-you', label: t('feed_tab_foryou') },
    { id: 'following', label: t('feed_tab_following') },
  ]

  const sentinel = useInView<HTMLDivElement>(
    () => void feed.fetchNextPage(),
    !!feed.hasNextPage && !feed.isFetchingNextPage,
  )

  // أسهم الكيبورد تبدّل التبويب (نمط ARIA tabs)
  function onTabKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      setTab((c) => (c === 'for-you' ? 'following' : 'for-you'))
    }
  }

  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? []

  return (
    <>
      <h1 className="sr-only">{t('nav_home')}</h1>
      <div className="glass sticky top-[calc(3.25rem+env(safe-area-inset-top))] z-20 border-b border-line md:top-0">
        <div role="tablist" aria-label={t('nav_home')} onKeyDown={onTabKey} className="relative grid grid-cols-2">
          {/* مؤشر واحد ينزلق بـtransform (CSS فقط): يمين/يسار حسب اتجاه الصفحة */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute bottom-0 start-0 h-1 w-1/2 px-[18%] transition-transform duration-200 ease-out',
              tab === 'following' && 'ltr:translate-x-full rtl:-translate-x-full',
            )}
          >
            <span className="block h-full rounded-full bg-brand" />
          </span>
          {tabs.map((x) => {
            const active = tab === x.id
            return (
              <button
                key={x.id}
                role="tab"
                type="button"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(x.id)}
                className={cn(
                  'relative min-h-12 text-[0.9375rem] transition-colors hover:bg-brand-soft',
                  active ? 'font-bold text-fg' : 'font-medium text-muted',
                )}
              >
                {x.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* على الموبايل النشر عبر الزر العائم؛ هنا مؤلّف مدمج لـmd+ */}
      <div className="hidden border-b border-line px-5 py-4 md:block">
        <Composer />
      </div>

      <section aria-label={t('nav_home')} aria-busy={feed.isPending}>
        {feed.isPending && Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)}

        {feed.isError && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <WifiOff size={32} className="text-subtle" aria-hidden="true" />
            <p className="text-muted">
              {feed.error instanceof ApiError && feed.error.status === 0
                ? t('common_network_error')
                : t('common_error')}
            </p>
            <Button variant="secondary" onClick={() => void feed.refetch()}>
              {t('common_retry')}
            </Button>
          </div>
        )}

        {feed.isSuccess && posts.length === 0 && (
          <p className="px-6 py-16 text-center text-muted">{t('feed_empty')}</p>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {feed.isFetchingNextPage && <PostSkeleton />}

        {/* sentinel للتمرير اللانهائي + زر بديل لمستعملي الكيبورد */}
        {feed.hasNextPage && (
          <div ref={sentinel} className="grid place-items-center py-6">
            <Button variant="ghost" onClick={() => void feed.fetchNextPage()} loading={feed.isFetchingNextPage}>
              {t('feed_load_more')}
            </Button>
          </div>
        )}

        {feed.isSuccess && posts.length > 0 && !feed.hasNextPage && (
          <p className="px-6 py-10 text-center text-sm text-subtle">{t('feed_end')}</p>
        )}
      </section>
    </>
  )
}
