import { cn } from '@/lib/cn'

// نبضة opacity فقط (رخيصة على الـGPU، ما تسبّبش reflow)
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-control bg-line', className)} />
}
