import { AnimatePresence, m } from 'framer-motion'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useUiStore } from '@/stores/ui'
import { cn } from '@/lib/cn'

const icons = { success: CheckCircle2, error: XCircle, info: Info } as const
const tones = { success: 'text-brand', error: 'text-danger', info: 'text-muted' } as const

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)

  return (
    // فوق الشريط السفلي بالموبايل، وأسفل الشاشة على الأكبر
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone]
          return (
            <m.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="glass pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-surface border border-line px-4 py-3 text-sm shadow-float"
            >
              <Icon size={18} className={cn('shrink-0', tones[t.tone])} aria-hidden="true" />
              <button type="button" onClick={() => dismiss(t.id)} className="text-start">
                {t.message}
              </button>
            </m.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
