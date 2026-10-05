import { Bell, Home, Mail, Search, Settings, User, Users, type LucideIcon } from 'lucide-react'
import type { TranslationKey } from '@/i18n/dictionary'

export interface NavItem {
  to: string
  key: TranslationKey
  icon: LucideIcon
}

// نفس مسارات الموقع الحالي، فروابط المنشورات والبروفايلات المحفوظة تبقى صالحة
export function getNavItems(username: string | undefined): NavItem[] {
  return [
    { to: '/', key: 'nav_home', icon: Home },
    { to: '/search', key: 'nav_search', icon: Search },
    { to: '/notifications', key: 'nav_notifications', icon: Bell },
    { to: '/messages', key: 'nav_messages', icon: Mail },
    { to: '/communities', key: 'nav_communities', icon: Users },
    { to: username ? `/profile/${username}` : '/', key: 'nav_profile', icon: User },
    { to: '/settings', key: 'nav_settings', icon: Settings },
  ]
}

// شريط الموبايل السفلي: 5 فقط (الباقي بقائمة المستخدم)
export const MOBILE_NAV_KEYS: TranslationKey[] = [
  'nav_home',
  'nav_search',
  'nav_communities',
  'nav_notifications',
  'nav_messages',
]
