import { useEffect, useMemo, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/ui'

export interface UploadedMedia { id: string; url: string; type: 'image' | 'video' }
interface MediaPickerProps {
  value: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  maxSizeMb?: number
  className?: string
}

export function MediaPicker({ value, onChange, maxFiles = 4, maxSizeMb = 20, className }: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useUiStore((s) => s.toast)
  const previews = useMemo(() => value.map((file) => ({ file, url: URL.createObjectURL(file) })), [value])

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews])

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const selected = Array.from(incoming)
    const allowed = selected.filter((file) => /^(image\/(jpeg|png|gif|webp)|video\/mp4)$/i.test(file.type) && file.size <= maxSizeMb * 1024 * 1024)
    if (allowed.length !== selected.length) toast(`الملفات يجب أن تكون صورة/MP4 وأقل من ${maxSizeMb}MB`, 'error')
    const deduped = new Map([...value, ...allowed].map((file) => [file.name + file.lastModified, file]))
    onChange(Array.from(deduped.values()).slice(0, maxFiles))
  }

  return <div className={cn('space-y-3', className)}>
    {value.length > 0 && <div className='flex flex-wrap gap-2'>{previews.map(({ file, url }, index) => <div key={`${file.name}-${file.lastModified}`} className='relative overflow-hidden rounded-control border border-line bg-raised'><button type='button' onClick={() => onChange(value.filter((_, i) => i !== index))} className='absolute end-1 top-1 z-10 grid size-7 place-items-center rounded-full bg-black/60 text-white' aria-label='حذف الملف'><X size={16}/></button>{file.type.startsWith('video/') ? <video src={url} muted playsInline className='h-28 w-28 object-cover'/> : <img src={url} alt='' className='h-28 w-28 object-cover'/>}</div>)}</div>}
    <div className='flex items-center gap-2'>
      <input ref={inputRef} type='file' accept='image/jpeg,image/png,image/gif,image/webp,video/mp4' multiple className='hidden' onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />
      <Button type='button' variant='ghost' size='sm' onClick={() => inputRef.current?.click()} disabled={value.length >= maxFiles}><ImagePlus size={17}/>وسائط</Button>
      <span className='text-xs text-muted'>{value.length}/{maxFiles}</span>
    </div>
  </div>
}