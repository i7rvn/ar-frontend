import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/auth'

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center text-brand">
      <Spinner className="size-7" />
    </div>
  )
}

/** صفحات تتطلب تسجيل دخول: الزائر يُحوَّل لـ/login ونتذكّر وجهته */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status)
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** صفحات للزوّار فقط (دخول/تسجيل): المسجَّل يُحوَّل للرئيسية */
export function GuestOnly() {
  const status = useAuthStore((s) => s.status)
  if (status === 'loading') return <Splash />
  if (status === 'authed') return <Navigate to="/" replace />
  return <Outlet />
}
