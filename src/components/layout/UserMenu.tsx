import { Link } from 'react-router-dom'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Popover } from '@/components/ui/Popover'
import { PreferencesControls } from '@/components/layout/PreferencesControls'
import { useLogout } from '@/features/auth/useSession'
import { useT } from '@/i18n/useT'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/cn'

// بلا لون هنا عمداً: تعارض text-fg/text-danger يُحسم بترتيب CSS ماشي بترتيب الكتابة
const itemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors hover:bg-brand-soft'

interface UserMenuProps {
  /** مظهر الزر: مصغّر (أفاتار فقط) أو موسّع (أفاتار + اسم) */
  variant: 'compact' | 'full'
  placement?: 'up' | 'down'
}

export function UserMenu({ variant, placement = 'down' }: UserMenuProps) {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  if (!user) return null

  return (
    <Popover
      placement={placement}
      align={variant === 'full' ? 'start' : 'end'}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={user.display_name}
          className={cn(
            'press flex items-center gap-3 rounded-full transition-colors hover:bg-brand-soft',
            variant === 'full' ? 'w-full p-2' : 'p-0.5',
          )}
        >
          <Avatar src={user.avatar_url} name={user.display_name} size={variant === 'full' ? 'md' : 'sm'} />
          {variant === 'full' && (
            <span className="min-w-0 text-start leading-tight">
              <span className="block truncate text-sm font-semibold">{user.display_name}</span>
              <span className="block truncate text-xs text-subtle" dir="ltr">
                @{user.username}
              </span>
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <Link to={`/profile/${user.username}`} onClick={close} role="menuitem" className={cn(itemClass, 'text-fg')}>
            <UserIcon size={18} aria-hidden="true" />
            {t('nav_profile')}
          </Link>
          <Link to="/settings" onClick={close} role="menuitem" className={cn(itemClass, 'text-fg')}>
            <Settings size={18} aria-hidden="true" />
            {t('nav_settings')}
          </Link>
          <div className="my-1 border-t border-line" />
          <div className="px-2 py-1.5">
            <PreferencesControls />
          </div>
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close()
              logout.mutate()
            }}
            className={cn(itemClass, 'text-danger')}
          >
            <LogOut size={18} aria-hidden="true" />
            {t('nav_logout')}
          </button>
        </>
      )}
    </Popover>
  )
}
