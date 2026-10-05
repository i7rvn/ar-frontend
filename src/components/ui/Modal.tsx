import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'framer-motion'
import { X } from 'lucide-react'
import { useT } from '@/i18n/useT'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * موبايل: ورقة سفلية (bottom sheet) تملأ العرض. شاشة أكبر: نافذة وسطية.
 * إتاحة الوصول: حبس التركيز داخلها، Escape للإغلاق، إرجاع التركيز لما كان
 * قبلها، وقفل تمرير الصفحة خلفها.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const t = useT()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = 'modal-title'

  // onClose بـref: لو الأب مرّر دالة جديدة كل رسم، ما نعيد تشغيل التأثير (وإلا
  // يضيع العنصر الأصلي لإرجاع التركيز، ويتكرر قفل التمرير/حبس التركيز)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    // نركّز أول حقل إدخال، وإلا أول عنصر قابل للتركيز
    const first =
      panel?.querySelector<HTMLElement>('input, textarea, select') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <m.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="glass relative flex max-h-[92dvh] w-full flex-col rounded-t-surface border border-line shadow-float md:max-w-lg md:rounded-surface"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16, transition: { duration: 0.12, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 id={titleId} className="font-display text-base font-bold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common_close')}
                className="press grid size-9 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
