import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFollow, useSuggestions, useTrending } from '@/features/widgets/queries'
import { useT } from '@/i18n/useT'
import { formatCount } from '@/lib/format'
import { useUiStore } from '@/stores/ui'
import type { User } from '@/types/api'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-surface border border-line bg-surface">
      <h2 className="px-4 pb-1 pt-3.5 font-display text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}

function SearchBox() {
  const t = useT()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative">
      <label htmlFor="side-search" className="sr-only">
        {t('nav_search')}
      </label>
      <Search size={18} aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-subtle" />
      <input
        id="side-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('nav_search')}
        dir={q ? 'auto' : undefined}
        className="min-h-11 w-full rounded-full border border-transparent bg-surface ps-11 pe-4 text-[0.9375rem] placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
    </form>
  )
}

function Trending() {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const { data, isPending } = useTrending()

  // ويدجت ثانوي: لو فشل الطلب أو لا نتائج، نخفيه بهدوء (الصفحة تكمل بدونه)
  if (!isPending && !data?.length) return null

  return (
    <Card title={t('widgets_trending')}>
      {isPending ? (
        <div className="space-y-3 p-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-4/5" />
          ))}
        </div>
      ) : (
        <ul className="pb-2">
          {data?.map((h) => (
            <li key={h.tag}>
              <Link to={`/hashtag/${encodeURIComponent(h.tag)}`} className="block px-4 py-2 transition-colors hover:bg-brand-soft">
                <span className="block font-semibold">
                  #<bdi>{h.tag}</bdi>
                </span>
                <span className="text-sm text-subtle">
                  {formatCount(h.recent_posts ?? h.posts_count, lang)} {t('widgets_posts')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function SuggestionRow({ user }: { user: User }) {
  const t = useT()
  const follow = useFollow()
  const [done, setDone] = useState(false)

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Link to={`/profile/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={user.avatar_url} name={user.display_name} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-semibold hover:underline">
            <bdi>{user.display_name}</bdi>
          </span>
          <span className="block truncate text-sm text-subtle" dir="ltr">
            @{user.username}
          </span>
        </span>
      </Link>
      <Button
        size="sm"
        variant={done ? 'secondary' : 'primary'}
        disabled={done}
        loading={follow.isPending}
        onClick={() => follow.mutate(user.id, { onSuccess: () => setDone(true) })}
      >
        {done ? t('common_following') : t('common_follow')}
      </Button>
    </li>
  )
}

function Suggestions() {
  const t = useT()
  const { data, isPending } = useSuggestions()
  if (!isPending && !data?.length) return null

  return (
    <Card title={t('widgets_suggestions')}>
      {isPending ? (
        <div className="space-y-3 p-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul className="pb-2">
          {data?.map((u) => (
            <SuggestionRow key={u.id} user={u} />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function RightColumn() {
  return (
    <aside className="hidden w-80 shrink-0 px-6 py-3 xl:block">
      <div className="sticky top-3 flex flex-col gap-4">
        <SearchBox />
        <Trending />
        <Suggestions />
      </div>
    </aside>
  )
}
