import { useEffect, useRef } from 'react'

/** يستدعي callback لما يظهر العنصر (sentinel) بالشاشة — للتمرير اللانهائي */
export function useInView<T extends HTMLElement>(onVisible: () => void, enabled: boolean) {
  const ref = useRef<T>(null)
  const cb = useRef(onVisible)

  // تحديث المرجع داخل effect (ماشي أثناء الرسم) — يضمن آخر نسخة من الدالة
  useEffect(() => {
    cb.current = onVisible
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) cb.current()
      },
      { rootMargin: '600px 0px' }, // نحمّل مسبقاً قبل الوصول للآخر بـ600px
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled])

  return ref
}
