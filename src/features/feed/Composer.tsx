import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCreatePost } from '@/features/feed/queries'

const MAX = 280 // نفس حد الباك اند الحالي للمنشور

interface ComposerProps {
  onPosted?: () => void
  autoFocus?: boolean
  className?: string
}

export function Composer({ onPosted, autoFocus, className }: ComposerProps) {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const toast = useUiStore((s) => s.toast)
  const create = useCreatePost()
  const [text, setText] = useState('')

  if (!user) return null
  const length = text.length
  const empty = text.trim().length === 0
  const over = length > MAX
  const nearLimit = length > MAX - 40

  function submit() {
    if (empty || over || create.isPending) return
    create.mutate(text.trim(), {
      onSuccess: () => {
        setText('')
        toast(t('feed_posted'), 'success')
        onPosted?.()
      },
    })
  }

  return (
    <div className={cn('flex gap-3', className)}>
      <Avatar src={user.avatar_url} name={user.display_name} />
      <div className="min-w-0 flex-1">
        <label htmlFor="composer-input" className="sr-only">
          {t('feed_compose_placeholder')}
        </label>
        <textarea
          id="composer-input"
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          // Ctrl/Cmd + Enter للنشر السريع
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
          }}
          placeholder={t('feed_compose_placeholder')}
          rows={2}
          dir={text ? 'auto' : undefined}
          className="w-full resize-none bg-transparent py-2 text-lg leading-snug placeholder:text-subtle focus:outline-none"
        />
        <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
          <span
            className={cn('text-sm tabular-nums text-subtle', nearLimit && 'text-sand', over && 'text-danger')}
            aria-live="polite"
          >
            {nearLimit ? MAX - length : ''}
          </span>
          <Button size="md" onClick={submit} loading={create.isPending} disabled={empty || over}>
            {t('feed_post_btn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
