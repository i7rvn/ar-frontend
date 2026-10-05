import { create } from 'zustand'
import { config } from '@/lib/config'

export type Theme = 'light' | 'dark'
export type Lang = 'ar' | 'fr' | 'en'

const { theme: themeKey, lang: langKey } = config.storageKeys

function readTheme(): Theme {
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'light' ? 'light' : 'dark'
}
function readLang(): Lang {
  const l = localStorage.getItem(langKey)
  return l === 'fr' || l === 'en' ? l : 'ar'
}

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

interface UiState {
  theme: Theme
  lang: Lang
  toasts: Toast[]
  toggleTheme: () => void
  setLang: (lang: Lang) => void
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

let toastSeq = 0

export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  lang: readLang(),
  toasts: [],

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(themeKey, next)
    document.documentElement.setAttribute('data-theme', next)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#0B1622' : '#F4F6F8')
    set({ theme: next })
  },

  setLang: (lang) => {
    localStorage.setItem(langKey, lang)
    const el = document.documentElement
    el.setAttribute('lang', lang)
    el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    set({ lang })
  },

  toast: (message, tone = 'info') => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone }] })) // حد أقصى 3 ظاهرة
    window.setTimeout(() => get().dismissToast(id), 4000)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
