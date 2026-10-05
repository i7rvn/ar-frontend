import { config } from '@/lib/config'

// وحدة مستقلة بلا اعتماديات — يستوردها api.ts وstores/auth.ts معاً
// (فصلها يمنع الاستيراد الدائري بينهما)
const { access, refresh } = config.storageKeys

export const tokens = {
  getAccess: () => localStorage.getItem(access),
  getRefresh: () => localStorage.getItem(refresh),
  set(a?: string, r?: string) {
    if (a) localStorage.setItem(access, a)
    if (r) localStorage.setItem(refresh, r)
  },
  clear() {
    localStorage.removeItem(access)
    localStorage.removeItem(refresh)
  },
}
