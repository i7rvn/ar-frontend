import type { Lang } from '@/stores/ui'

// u-nu-latn: أرقام لاتينية حتى بالعربية (المعتاد بالجزائر)
const locales: Record<Lang, string> = { ar: 'ar-u-nu-latn', fr: 'fr', en: 'en' }

export function formatCount(n: number, lang: Lang): string {
  if (!n) return '0'
  return new Intl.NumberFormat(locales[lang], { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function relativeTime(iso: string, lang: Lang): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  // narrow بالإنجليزية فقط ("17m ago")؛ بالفرنسية narrow يعطي "-17 min" بلا "il y a"
  const rtf = new Intl.RelativeTimeFormat(locales[lang], { numeric: 'auto', style: lang === 'en' ? 'narrow' : 'short' })
  const abs = Math.abs(seconds)
  for (const [unit, size] of STEPS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'second') // "الآن" / "now" / "maintenant"
}

export function fullDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
