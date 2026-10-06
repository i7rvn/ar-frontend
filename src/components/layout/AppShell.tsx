import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PenSquare } from 'lucide-react'
import { SkipLink } from '@/components/layout/SkipLink'
import { Logo } from '@/components/ui/Logo'
import { Modal } from '@/components/ui/Modal'
import { UserMenu } from '@/components/layout/UserMenu'
import { MOBILE_NAV_KEYS, getNavItems } from '@/components/layout/navItems'
import { Composer } from '@/features/feed/Composer'
import { RightColumn } from '@/features/widgets/RightColumn'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'

/**
 * نقاط التحوّل (mobile-first):
 *  < md  (≤767)  : شريط علوي + محتوى + شريط سفلي + زر نشر عائم
 *  md–xl (768–1279): عمود أيقونات جانبي + محتوى
 *  ≥ xl  (≥1280) : شريط جانبي موسّع + محتوى (600px) + عمود يمين/يسار
 * الاتجاه (RTL/LTR) يتحكم به dir على <html>، وكل المحاذاة بخصائص منطقية.
 */
export function AppShell() {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const [composeOpen, setComposeOpen] = useState(false)
  const items = getNavItems(user?.username)
  const mobileItems = items.filter((i) => MOBILE_NAV_KEYS.includes(i.key))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[84rem] justify-center">
      <SkipLink />
      {/* ─── شريط جانبي (md+) ─── */}
      <header className="sticky top-0 hidden h-dvh shrink-0 flex-col justify-between border-e border-line px-2 py-4 md:flex xl:w-72 xl:px-4">
        <div className="flex flex-col gap-1">
          <NavLink to="/" aria-label="AR" className="mb-3 grid h-12 w-12 place-items-center rounded-full hover:bg-brand-soft xl:w-auto xl:place-items-start xl:ps-3">
            <Logo />
          </NavLink>

          <nav aria-label={t('nav_main')} className="flex flex-col gap-1">
            {items.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={key}
                to={to}
                end={to === '/'}
                title={t(key)}
                className={({ isActive }) =>
                  cn(
                    'press flex min-h-12 items-center gap-4 rounded-full px-3.5 text-lg transition-colors hover:bg-brand-soft',
                    isActive ? 'font-bold text-fg' : 'font-medium text-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={24} strokeWidth={isActive ? 2.6 : 2} aria-hidden="true" />
                    <span className="hidden xl:inline">{t(key)}</span>
                    {/* على الشاشات المتوسطة (أيقونات فقط) نبقي الاسم لقارئات الشاشة */}
                    <span className="sr-only xl:hidden">{t(key)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            aria-label={t('nav_post')}
            className="press mt-3 grid h-12 w-12 place-items-center rounded-full glass-fab xl:w-full xl:text-base xl:font-bold"
          >
            <PenSquare size={22} className="xl:hidden" aria-hidden="true" />
            <span className="hidden xl:inline">{t('nav_post')}</span>
          </button>
        </div>

        <div className="xl:w-full">
          <div className="hidden xl:block">
            <UserMenu variant="full" placement="up" />
          </div>
          <div className="grid place-items-center xl:hidden">
            <UserMenu variant="compact" placement="up" />
          </div>
        </div>
      </header>

      {/* ─── العمود الرئيسي ─── */}
      <div className="flex min-h-dvh w-full max-w-[38rem] flex-col border-e-0 md:border-e md:border-line">
        {/* شريط علوي للموبايل فقط */}
        {/* ارتفاع ثابت (3.25rem + المنطقة الآمنة) = نفس قيمة top اللزج للتبويبات */}
        <header className="glass pt-safe sticky top-0 z-30 flex h-[calc(3.25rem+env(safe-area-inset-top))] items-center justify-between border-b border-line px-4 md:hidden">
          <Logo />
          <UserMenu variant="compact" />
        </header>

        <main id="main" className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ─── عمود جانبي ثانوي (xl+): بحث + الرائج + اقتراحات ─── */}
      <RightColumn />

      {/* ─── شريط التنقل السفلي (موبايل) ─── */}
      <nav
        aria-label={t('nav_main')}
        className="glass pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line md:hidden"
      >
        {mobileItems.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'press grid min-h-14 place-items-center transition-colors',
                isActive ? 'text-brand' : 'text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.6 : 2} aria-hidden="true" />
                <span className="sr-only">{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* زر النشر العائم (موبايل) — فوق الشريط السفلي */}
      <button
        type="button"
        onClick={() => setComposeOpen(true)}
        aria-label={t('nav_post')}
        className="press fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] end-4 z-30 grid size-14 place-items-center rounded-full glass-fab md:hidden"
      >
        <PenSquare size={24} aria-hidden="true" />
      </button>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title={t('nav_post')}>
        {/* بلا autoFocus: Modal يركّز أول حقل بنفسه بعد حفظ العنصر السابق (وإلا يضيع إرجاع التركيز) */}
        <Composer onPosted={() => setComposeOpen(false)} />
      </Modal>
    </div>
  )
}
