import { Link } from 'react-router-dom'
import { useT } from '@/i18n/useT'

export function NotFound() {
  const t = useT()
  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div>
        <p className="font-display text-6xl font-bold text-brand" dir="ltr">404</p>
        <h1 className="mt-3 text-xl font-bold">{t('not_found_title')}</h1>
        <Link to="/" className="mt-5 inline-block font-semibold text-brand hover:underline">
          {t('not_found_back')}
        </Link>
      </div>
    </div>
  )
}
