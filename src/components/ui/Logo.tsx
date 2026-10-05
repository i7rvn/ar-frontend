import { cn } from '@/lib/cn'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-2xl font-bold tracking-tight text-fg', className)} dir="ltr">
      A<span className="text-brand">R</span>
    </span>
  )
}
