import { useUiStore } from '@/stores/ui'
import { dictionaries, type TranslationKey } from '@/i18n/dictionary'

/** hook للترجمة: يعيد الرسم تلقائياً عند تبديل اللغة */
export function useT() {
  const lang = useUiStore((s) => s.lang)
  return (key: TranslationKey) => dictionaries[lang][key]
}
