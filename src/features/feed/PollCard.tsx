import { Clock3, Vote } from 'lucide-react'
import { useVotePoll } from '@/features/feed/queries'
import type { Poll } from '@/types/api'
import { cn } from '@/lib/cn'

export function PollCard({ poll, postId }: { poll: Poll; postId: string }) {
  const vote = useVotePoll()
  const total = Math.max(poll.totalVotes, 1)
  return <div className='mt-3 rounded-surface border border-line bg-raised p-3'>
    <div className='mb-3 flex items-center gap-2 text-sm text-muted'><Vote size={16}/><span>{poll.totalVotes} صوت</span><span className='ms-auto flex items-center gap-1'><Clock3 size={14}/>{poll.hasEnded ? 'انتهى الاستطلاع' : 'مفتوح'}</span></div>
    <div className='space-y-2'>{poll.options.map((option) => { const percent = poll.totalVotes ? Math.round(option.vote_count / total * 100) : 0; const selected = poll.myOptionId === option.id; return <button key={option.id} type='button' disabled={poll.hasEnded || poll.votedByMe || vote.isPending} onClick={() => vote.mutate({ postId, optionId: option.id })} className={cn('relative w-full overflow-hidden rounded-control border border-line p-3 text-start', selected && 'border-brand')}><span className='relative z-10 flex justify-between gap-3'><span>{option.option_text}</span><span className='tabular-nums'>{percent}%</span></span><span className='absolute inset-y-0 start-0 bg-brand-soft' style={{ width: `${percent}%` }}/></button> })}</div>
  </div>
}