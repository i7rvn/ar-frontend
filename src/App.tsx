import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { Toaster } from '@/components/ui/Toaster'
import { AppShell } from '@/components/layout/AppShell'
import { GuestOnly, RequireAuth } from '@/components/layout/RouteGuards'
import { useBootstrapSession } from '@/features/auth/useSession'
import { NotFound } from '@/pages/NotFound'

// تقسيم الكود: كل صفحة تُحمَّل عند أول زيارة فقط (يخفّف الحمولة الأولى)
const FeedPage = lazy(() => import('@/features/feed/FeedPage').then((m) => ({ default: m.FeedPage })))
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ComingSoon = lazy(() => import('@/pages/ComingSoon').then((m) => ({ default: m.ComingSoon })))

const PageLoader = () => (
  <div className="grid min-h-[40dvh] place-items-center text-brand">
    <Spinner className="size-6" />
  </div>
)

export default function App() {
  useBootstrapSession()

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<FeedPage />} />
              {/* صفحات قيد النقل — نفس مسارات الموقع الحالي */}
              {['search', 'notifications', 'messages', 'messages/:id', 'communities', 'communities/:slug', 'settings', 'stats', 'profile/:username', 'post/:id', 'hashtag/:tag'].map(
                (path) => (
                  <Route key={path} path={path} element={<ComingSoon />} />
                ),
              )}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>

      <Toaster />
    </>
  )
}
