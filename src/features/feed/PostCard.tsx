import { memo } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { BadgeCheck, Heart, MessageCircle, Pin, Repeat2, Share2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { formatCount, fullDate, relativeTime } from '@/lib/format'
import { useUiStore } from '@/stores/ui'
import { useToggleLike } from '@/features/feed/queries'
import type { Post } from '@/types/api'

function PostMedia({ post }: { post: Post }) {
  const urls = post.media_urls ?? []
  if (!urls.length) return null

  return (
    <div
      className={cn(
        'mt-3 grid gap-1 overflow-hidden rounded-surface border border-line',
        urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
      )}
    >
      {urls.map((url, i) =>
        post.media_types?.[i] === 'video' ? (
          <video key={url} src={url} controls preload="metadata" className="max-h-[32rem] w-full bg-black object-contain" />
        ) : (
          <img
            key={url}
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn('w-full object-cover', urls.length > 1 ? 'aspect-square' : 'max-h-[32rem]')}
          />
        ),
      )}
    </div>
  )
}

function PostCardBase({ post }: { post: Post }) {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const toast = useUiStore((s) => s.toast)
  const like = useToggleLike()

  async function share() {
    const url = `${window.location.origin}/post/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast(t('common_confirm'), 'success')
    } catch {
      toast(url, 'info') // المتصفح منع الحافظة: نعرض الرابط ينسخه المستخدم
    }
  }

  const profilePath = `/profile/${post.username}`

  return (
    // content-visibility: المتصفح يتخطى رسم البطاقات خارج الشاشة (تحسين أداء
    // فعلي للقوائم الطويلة بلا تعقيد مكتبة virtualization)
    <article className="flex gap-3 border-b border-line px-4 py-3.5 [contain-intrinsic-size:auto_9rem] [content-visibility:auto] sm:px-5">
      <Link to={profilePath} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <Avatar src={post.avatar_url} name={post.display_name} size="md" />
      </Link>

      <div className="min-w-0 flex-1">
        {post.is_pinned && (
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-sand">
            <Pin size={13} aria-hidden="true" />
            {t('post_pinned')}
          </p>
        )}

        <header className="flex flex-wrap items-baseline gap-x-1.5 leading-tight">
          <Link to={profilePath} className="flex items-center gap-1 font-semibold hover:underline">
            <span className="truncate" dir="auto">{post.display_name}</span>
            {post.is_verified && (
              <>
                <BadgeCheck size={16} className="shrink-0 text-sand" aria-hidden="true" />
                <span className="sr-only">{t('post_verified')}</span>
              </>
            )}
          </Link>
          <span className="truncate text-sm text-subtle" dir="ltr">
            @{post.username}
          </span>
          <span aria-hidden="true" className="text-subtle">·</span>
          <time dateTime={post.created_at} title={fullDate(post.created_at, lang)} className="text-sm text-subtle">
            {relativeTime(post.created_at, lang)}
          </time>
        </header>

        {/* dir="auto": كل منشور يتّجه حسب لغته (عربي RTL / لاتيني LTR) فتبقى علامات الترقيم والإيموجي بمكانها الصحيح */}
        <p dir="auto" className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{post.content}</p>
        <PostMedia post={post} />

        <div className="-ms-2 mt-2 flex max-w-md items-center justify-between text-sm text-subtle">
          <span className="flex min-h-9 items-center gap-1.5 px-2" title={t('feed_reply')}>
            <MessageCircle size={18} aria-hidden="true" />
            <span className="sr-only">{t('feed_reply')}</span>
            {formatCount(post.replies_count, lang)}
          </span>

          <span className="flex min-h-9 items-center gap-1.5 px-2" title={t('feed_repost')}>
            <Repeat2 size={19} aria-hidden="true" />
            <span className="sr-only">{t('feed_repost')}</span>
            {formatCount(post.reposts_count, lang)}
          </span>

          <button
            type="button"
            onClick={() => like.mutate(post.id)}
            aria-pressed={post.liked_by_me}
            aria-label={t('feed_like')}
            className={cn(
              'press flex min-h-9 items-center gap-1.5 rounded-full px-2 transition-colors hover:bg-danger-soft hover:text-danger',
              post.liked_by_me && 'text-danger',
            )}
          >
            {/* "قفزة" القلب عند الإعجاب: ردّ مباشر على فعل المستخدم */}
            <m.span
              key={String(post.liked_by_me)}
              initial={post.liked_by_me ? { scale: 0.6 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 12 }}
              className="grid"
            >
              <Heart size={18} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden="true" />
            </m.span>
            {formatCount(post.likes_count, lang)}
          </button>

          <button
            type="button"
            onClick={share}
            aria-label={t('feed_share')}
            className="press grid size-9 place-items-center rounded-full transition-colors hover:bg-brand-soft hover:text-brand"
          >
            <Share2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

// memo: تحديث إعجاب منشور واحد ما يعيدش رسم باقي المنشورات
export const PostCard = memo(PostCardBase)
