import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { cn } from '@/lib/cn'

interface PopoverProps {
  /** الزر الذي يفتح القائمة؛ يستلم دالة التبديل وحالة الفتح */
  trigger: (props: { toggle: () => void; open: boolean }) => ReactNode
  children: (close: () => void) => ReactNode
  /** اتجاه الفتح: للأعلى (من أسفل الشريط الجانبي) أو للأسفل */
  placement?: 'up' | 'down'
  align?: 'start' | 'end'
  className?: string
}

export function Popover({ trigger, children, placement = 'down', align = 'end', className }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      {trigger({ toggle: () => setOpen((v) => !v), open })}
      <AnimatePresence>
        {open && (
          <m.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: placement === 'up' ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className={cn(
              'glass absolute z-40 min-w-56 rounded-surface border border-line p-1.5 shadow-float',
              placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
              align === 'end' ? 'end-0' : 'start-0',
              className,
            )}
          >
            {children(() => setOpen(false))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
