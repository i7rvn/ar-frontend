import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n/useT'
import { useUiStore, type Lang } from '@/stores/ui'

const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'ar', label: 'ع' },
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
]

export function PreferencesControls({ className }: { className?: string }) {
  const t = useT()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const lang = useUiStore((s) => s.lang)
  const setLang = useUiStore((s) => s.setLang)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div role="group" aria-label={t('common_language')} className="flex rounded-full border border-line p-0.5">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            className={cn(
              'min-w-9 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors',
              lang === l.code ? 'bg-brand text-on-brand' : 'text-muted hover:text-fg',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={t('common_theme')}
        className="press grid size-10 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-fg"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )
}
