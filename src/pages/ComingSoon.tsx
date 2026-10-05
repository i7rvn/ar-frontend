import { Hammer } from 'lucide-react'
import { useT } from '@/i18n/useT'

// صفحات لم تُنقل بعد للنسخة الجديدة — الموقع الحالي يبقى هو الفعّال حتى تكتمل
export function ComingSoon() {
  const t = useT()
  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Hammer size={32} className="text-sand" aria-hidden="true" />
        <h1 className="text-xl font-bold">{t('soon_title')}</h1>
        <p className="max-w-xs text-muted">{t('soon_body')}</p>
      </div>
    </div>
  )
}
