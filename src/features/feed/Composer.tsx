import { useState } from 'react'
import { AlertTriangle, BarChart3, Globe2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { MediaPicker, type UploadedMedia } from '@/features/feed/MediaPicker'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { api } from '@/lib/api'
import { useCreatePost, type CreatePostInput } from '@/features/feed/queries'
import type { PostVisibility } from '@/types/api'

const MAX = 280
interface ComposerProps { onPosted?: () => void; autoFocus?: boolean; className?: string }

export function Composer({ onPosted, autoFocus, className }: ComposerProps) {
  const t = useT(); const user = useAuthStore((s) => s.user); const toast = useUiStore((s) => s.toast); const create = useCreatePost()
  const [text, setText] = useState(''); const [files, setFiles] = useState<File[]>([]); const [sensitive, setSensitive] = useState(false); const [visibility, setVisibility] = useState<PostVisibility>('public'); const [pollOpen, setPollOpen] = useState(false); const [pollOptions, setPollOptions] = useState(['', '']); const [duration, setDuration] = useState(86400)
  if (!user) return null
  const empty = !text.trim() && files.length === 0; const over = text.length > MAX

  async function uploadFiles(): Promise<UploadedMedia[]> {
    if (!files.length) return []
    const form = new FormData(); files.forEach((file) => form.append('media', file))
    const res = await api.upload<{ success: boolean; data: { files: UploadedMedia[] } }>('/media/upload', form)
    return res.data.files
  }

  async function submit() {
    if (empty || over || create.isPending) return
    if (pollOpen && pollOptions.filter((option) => option.trim()).length < 2) { toast('أضف خيارين على الأقل للاستطلاع', 'error'); return }
    try {
      const uploaded = await uploadFiles()
      const payload: CreatePostInput = {
        content: text.trim(), mediaUrls: uploaded.map((media) => media.url), mediaTypes: uploaded.map((media) => media.type),
        isSensitive: sensitive, visibility,
        ...(pollOpen ? { poll: { options: pollOptions.map((option) => option.trim()).filter(Boolean), durationSeconds: duration } } : {}),
      }
      create.mutate(payload, { onSuccess: () => { setText(''); setFiles([]); setSensitive(false); setPollOpen(false); setPollOptions(['', '']); toast(t('feed_posted'), 'success'); onPosted?.() } })
    } catch (error) { toast(error instanceof Error ? error.message : 'فشل رفع الوسائط', 'error') }
  }

  return <div className={cn('flex gap-3', className)}>
    <Avatar src={user.avatar_url} name={user.display_name} />
    <div className='min-w-0 flex-1'>
      <textarea id='composer-input' value={text} autoFocus={autoFocus} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submit() }} placeholder={t('feed_compose_placeholder')} rows={3} className='w-full resize-none bg-transparent py-2 text-lg leading-snug placeholder:text-subtle focus:outline-none' />
      <MediaPicker value={files} onChange={setFiles} />
      <div className='mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3'>
        <button type='button' onClick={() => setSensitive((value) => !value)} className={cn('rounded-full px-2 py-1 text-xs', sensitive ? 'bg-sand-soft text-sand' : 'text-muted hover:bg-brand-soft')}><AlertTriangle size={15} className='me-1 inline'/>تحذير</button>
        <label className='flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted'><Globe2 size={15}/><select value={visibility} onChange={(e) => setVisibility(e.target.value as PostVisibility)} className='bg-transparent outline-none'><option value='public'>عام</option><option value='unlisted'>غير مُدرج</option><option value='followers'>المتابَعون</option><option value='mentioned'>إشارة فقط</option></select></label>
        <button type='button' onClick={() => setPollOpen((value) => !value)} className={cn('rounded-full px-2 py-1 text-xs', pollOpen ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-brand-soft')}><BarChart3 size={15} className='me-1 inline'/>استطلاع</button>
        <span className='ms-auto text-sm tabular-nums text-subtle'>{text.length > MAX - 40 ? MAX - text.length : ''}</span>
        <Button onClick={() => void submit()} loading={create.isPending} disabled={empty || over}>{t('feed_post_btn')}</Button>
      </div>
      {pollOpen && <div className='mt-3 rounded-surface border border-line bg-raised p-3'>{pollOptions.map((option, index) => <input key={index} value={option} onChange={(e) => setPollOptions((items) => items.map((item, i) => i === index ? e.target.value : item))} maxLength={100} placeholder={'الخيار ' + (index + 1)} className='mb-2 block w-full rounded-control border border-line bg-transparent px-3 py-2 outline-none focus:border-brand' />)}{pollOptions.length < 10 && <button type='button' onClick={() => setPollOptions((items) => [...items, ''])} className='text-sm text-brand'>+ إضافة خيار</button>}<label className='mt-2 block text-sm text-muted'>المدة <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className='ms-2 rounded-control border border-line bg-transparent px-2 py-1'><option value='3600'>ساعة</option><option value='86400'>يوم</option><option value='604800'>7 أيام</option><option value='2592000'>30 يوم</option></select></label></div>}
    </div>
  </div>
}