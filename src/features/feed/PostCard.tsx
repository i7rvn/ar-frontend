import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { BadgeCheck, Heart, Link2, MessageCircle, Pin, Repeat2, Share2, TriangleAlert } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { formatCount, fullDate, relativeTime } from '@/lib/format'
import { useUiStore } from '@/stores/ui'
import { useToggleLike } from '@/features/feed/queries'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApiEnvelope, Post } from '@/types/api'
import { PollCard } from '@/features/feed/PollCard'

const urlPattern = /https?:\\/\\/[^\\s]+/i

function PostMedia({ post }: { post: Post }) { const urls = post.media_urls ?? []; if (!urls.length) return null; return <div className={cn('mt-3 grid gap-1 overflow-hidden rounded-surface border border-line', urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>{urls.map((url, i) => post.media_types?.[i] === 'video' ? <video key={url} src={url} controls preload='metadata' className='max-h-[32rem] w-full bg-black object-contain' /> : <img key={url} src={url} alt='' loading='lazy' decoding='async' className={cn('w-full object-cover', urls.length > 1 ? 'aspect-square' : 'max-h-[32rem]')} />)}</div> }

function LinkPreview({ post }: { post: Post }) {
  const url = post.content.match(urlPattern)?.[0] ?? null
  const q = useQuery({ queryKey: ['link-preview', url], enabled: Boolean(url), queryFn: () => api.get<ApiEnvelope<{ url:string; title:string|null; description:string|null; image:string|null }>>('/link-preview?url=' + encodeURIComponent(url!)), staleTime: 60 * 60 * 1000 })
  const p = q.data?.data; if (!url || !p) return null
  return <a href={p.url} target='_blank' rel='noreferrer noopener' className='mt-3 block overflow-hidden rounded-surface border border-line bg-raised hover:border-brand'>{p.image && <img src={p.image} alt='' loading='lazy' className='max-h-64 w-full object-cover' />}<div className='p-3'><div className='flex items-center gap-2 text-xs text-muted'><Link2 size={13}/>{new URL(p.url).hostname}</div>{p.title && <p className='mt-1 font-bold'>{p.title}</p>}{p.description && <p className='mt-1 line-clamp-2 text-sm text-muted'>{p.description}</p>}</div></a>
}

function PostCardBase({ post }: { post: Post }) {
  const t = useT(); const lang = useUiStore((s) => s.lang); const toast = useUiStore((s) => s.toast); const like = useToggleLike(); const [revealed, setRevealed] = useState(!post.is_sensitive)
  async function share() { const url = window.location.origin + '/post/' + post.id; try { await navigator.clipboard.writeText(url); toast(t('common_confirm'), 'success') } catch { toast(url, 'info') } }
  const profilePath = '/profile/' + post.username
  return <article className='flex gap-3 border-b border-line px-4 py-3.5 sm:px-5'><Link to={profilePath} className='shrink-0' tabIndex={-1} aria-hidden='true'><Avatar src={post.avatar_url} name={post.display_name} size='md' /></Link><div className='min-w-0 flex-1'>{post.is_pinned && <p className='mb-1 flex items-center gap-1.5 text-xs font-medium text-sand'><Pin size={13}/> {t('post_pinned')}</p>}<header className='flex flex-wrap items-baseline gap-x-1.5 leading-tight'><Link to={profilePath} className='flex items-center gap-1 font-semibold hover:underline'><span className='truncate' dir='auto'>{post.display_name}</span>{post.is_verified && <BadgeCheck size={16} className='shrink-0 text-sand'/>}</Link><span className='truncate text-sm text-subtle' dir='ltr'>@{post.username}</span><span className='text-subtle'>·</span><time dateTime={post.created_at} title={fullDate(post.created_at, lang)} className='text-sm text-subtle'>{relativeTime(post.created_at, lang)}</time></header>
    {post.is_sensitive && !revealed ? <button type='button' onClick={() => setRevealed(true)} className='mt-3 w-full rounded-surface border border-sand/30 bg-sand-soft p-5 text-start'><div className='flex items-center gap-2 font-bold text-sand'><TriangleAlert size={18}/>{post.sensitive_warning || 'قد يحتوي هذا المنشور على محتوى حساس.'}</div><span className='mt-2 block text-sm text-muted'>اضغط لعرض المحتوى</span></button> : <><p dir='auto' className='mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed'>{post.content}</p><LinkPreview post={post}/><PostMedia post={post}/>{post.poll && <PollCard poll={post.poll} postId={post.id}/>}</>}
    <div className='-ms-2 mt-2 flex max-w-md items-center justify-between text-sm text-subtle'><span className='flex min-h-9 items-center gap-1.5 px-2'><MessageCircle size={18}/>{formatCount(post.replies_count, lang)}</span><span className='flex min-h-9 items-center gap-1.5 px-2'><Repeat2 size={19}/>{formatCount(post.reposts_count, lang)}</span><button type='button' onClick={() => like.mutate(post.id)} aria-pressed={post.liked_by_me} aria-label={t('feed_like')} className={cn('press flex min-h-9 items-center gap-1.5 rounded-full px-2 hover:bg-danger-soft hover:text-danger', post.liked_by_me && 'text-danger')}><m.span key={String(post.liked_by_me)} initial={post.liked_by_me ? { scale: 0.6 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 12 }} className='grid'><Heart size={18} fill={post.liked_by_me ? 'currentColor' : 'none'}/></m.span>{formatCount(post.likes_count, lang)}</button><button type='button' onClick={share} aria-label={t('feed_share')} className='press grid size-9 place-items-center rounded-full hover:bg-brand-soft hover:text-brand'><Share2 size={18}/></button></div>
  </div></article>
}
export const PostCard = memo(PostCardBase)