import type { ReactNode } from 'react'
import { SkipLink } from '@/components/layout/SkipLink'
import { Logo } from '@/components/ui/Logo'
import { PreferencesControls } from '@/components/layout/PreferencesControls'
import { useT } from '@/i18n/useT'

/**
 * موبايل: نموذج بعرض كامل تحته نجمة الزليج بخفوت.
 * ≥ lg: لوحة جانبية للهوية (نجمة الزليج) + عمود النموذج.
 */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  const t = useT()
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <SkipLink />
      <aside className="relative hidden overflow-hidden border-e border-line bg-surface lg:block">
        <div className="zellige absolute inset-0 [mask-position:center]" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" aria-hidden="true" />
        <div className="relative flex h-full flex-col items-start justify-between p-12">
          <Logo className="text-4xl" />
          <div>
            <p className="font-display text-4xl font-bold leading-snug">{t('auth_tagline')}</p>
          </div>
        </div>
      </aside>

      <main id="main" className="relative flex flex-col px-5 pb-10 pt-safe sm:px-10">
        <div className="flex items-center justify-between py-4">
          <Logo className="lg:invisible" />
          <PreferencesControls />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-6">
          <h1 className="mb-7 font-display text-3xl font-bold">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  )
}
