// دمج أسماء الأصناف مع تجاهل القيم الفارغة
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
