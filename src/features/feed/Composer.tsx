import { useState } from 'react'
import { AlertTriangle, BarChart3, Globe2, Users2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCreatePost } from '@/features/feed/queries'
import type { PostVisibility } from '@/types/api'

const MAX = 280

interface ComposerProps { onPosted?: () => void; autoFocus?: boolean; className?: string }

export function Composer({ onPosted, autoFocus, className }: ComposerProps) {
  const t = useT(); const user = useAuthStore((s) => s.user); const toast = useUiStore((s) => s.toast); const create = useCreatePost()
  const [text, setText] = useState(''); const [sensitive, setSensitive] = useState(false); const [visibility, setVisibility] = useState<PostVisibility>('public'); const [pollOpen, setPollOpen] = useState(false); const [pollOptions, setPollOptions] = useState(['', '']); const [duration, setDuration] = useState('86400')
  if (!user) return null
  const empty = text.trim().length === 0; const over = text.length > MAX
  function submit() {
    if (empty || over || create.isPending) return
    const payload = { content: text.trim(), isSensitive: sensitive, visibility, ...(pollOpen ? { poll: { options: pollOptions.map((x) => x.trim()).filter(Boolean), durationSeconds: Number(duration) } } : {}) }
    if (pollOpen && (payload.poll?.options.length ?? 0) < 2) { toast('أضف خيارين على الأقل للاستطلاع', 'error'); return }
    create.mutate(payload, { onSuccess: () => { setText(''); setSensitive(false); setPollOpen(false); setPollOptions(['', '']); toast(t('feed_posted'), 'success'); onPosted?.() } })
  }
  return <div className={cn('flex gap-3', className)}>
    <Avatar src={user.avatar_url} name={user.display_name} />
    <div className='min-w-0 flex-1'>
      <textarea id='composer-input' value={text} autoFocus={autoFocus} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }} placeholder={t('feed_compose_placeholder')} rows={3} dir={text ? 'auto' : undefined} className='w-full resize-none bg-transparent py-2 text-lg leading-snug placeholder:text-subtle focus:outline-none' />
      <div className='flex flex-wrap items-center gap-2 border-t border-line pt-3'>
        <button type='button' onClick={() => setSensitive((v) => !v)} className={cn('press flex items-center gap-1 rounded-full px-2 py-1 text-xs', sensitive ? 'bg-sand-soft text-sand' : 'text-muted hover:bg-brand-soft')}><AlertTriangle size={15}/>تحذير المحتوى</button>
        <label className='flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted'><Globe2 size={15}/><select value={visibility} onChange={(e) => setVisibility(e.target.value as PostVisibility)} className='bg-transparent outline-none'><option value='public'>عام</option><option value='unlisted'>غير مُدرج</option><option value='followers'>المتابَعون</option><option value='mentioned'>إشارة فقط</option></select></label>
        <button type='button' onClick={() => setPollOpen((v) => !v)} className={cn('press flex items-center gap-1 rounded-full px-2 py-1 text-xs', pollOpen ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-brand-soft')}><BarChart3 size={15}/>استطلاع</button>
        <span className='ms-auto text-sm tabular-nums text-subtle'>{text.length > MAX - 40 ? MAX - text.length : ''}</span>
        <Button size='md' onClick={submit} loading={create.isPending} disabled={empty || over}>{t('feed_post_btn')}</Button>
      </div>
      {sensitive && <div className='mt-3 rounded-control border border-sand/30 bg-sand-soft p-3 text-sm text-sand'>يمكن للمتابع رؤية منشورك مطوياً مع تحذير قبل العرض.</div>}
      {pollOpen && <div className='mt-3 rounded-surface border border-line bg-raised p-3'><div className='mb-2 flex items-center gap-2 text-sm font-semibold'><BarChart3 size={16}/>استطلاع</div>{pollOptions.map((value, i) => <input key={i} value={value} onChange={(e) => setPollOptions((xs) => xs.map((x, j) => j === i ? e.target.value : x))} maxLength={100} placeholder={'الخيار ' + (i + 1)} className='mb-2 w-full rounded-control border border-line bg-transparent px-3 py-2 outline-none focus:border-brand' />)}{pollOptions.length < 10 && <button type='button' onClick={() => setPollOptions((xs) => [...xs, ''])} className='text-sm font-medium text-brand'>+ إضافة خيار</button>}<label className='mt-3 flex items-center gap-2 text-sm text-muted'><Users2 size={15}/>مدة<select value={duration} onChange={(e) => setDuration(e.target.value)} className='rounded-control border border-line bg-transparent px-2 py-1'><option value='3600'>ساعة</option><option value='86400'>يوم</option><option value='604800'>7 أيام</option><option value='2592000'>30 يوم</option></select></label></div>}
    </div>
  </div>
}