import { useT } from '@/i18n/useT'

/** رابط "تخطي إلى المحتوى" لمستعملي الكيبورد/قارئات الشاشة — يظهر عند التركيز فقط */
export function SkipLink() {
  const t = useT()
  return (
    <a
      href="#main"
      className="sr-only z-[70] rounded-control bg-brand px-4 py-2 font-semibold text-on-brand focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
    >
      {t('skip_to_content')}
    </a>
  )
}
