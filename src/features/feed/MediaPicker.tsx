import { useMemo, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
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
  const [uploading, setUploading] = useState(false)
  const previews = useMemo(() => value.map((file) => ({ file, url: URL.createObjectURL(file) })), [value])

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const selected = Array.from(incoming)
    const allowed = selected.filter((file) => /^(image\/(jpeg|png|gif|webp)|video\/mp4)$/i.test(file.type) && file.size <= maxSizeMb * 1024 * 1024)
    if (allowed.length !== selected.length) toast('بعض الملفات غير مدعومة أو تتجاوز 20MB', 'error')
    onChange(Array.from(new Map([...value, ...allowed].map((file) => [file.name + file.lastModified, file])).values()).slice(0, maxFiles))
  }

  function remove(index: number) { onChange(value.filter((_, i) => i !== index)) }

  async function upload(): Promise<UploadedMedia[]> {
    if (!value.length) return []
    setUploading(true)
    try {
      const form = new FormData()
      value.forEach((file) => form.append('media', file))
      const res = await api.upload<{ success: boolean; data: { files: UploadedMedia[] } }>('/media/upload', form)
      return res.data.files
    } finally { setUploading(false) }
  }

  return <div className={cn('space-y-3', className)}>
    <div className='flex flex-wrap gap-2'>{previews.map(({ file, url }, index) => <div key={`${file.name}-${file.lastModified}`} className='group relative overflow-hidden rounded-control border border-line bg-raised'><button type='button' onClick={() => remove(index)} className='absolute end-1 top-1 z-10 grid size-7 place-items-center rounded-full bg-black/60 text-white' aria-label='حذف الملف'><X size={16}/></button>{file.type.startsWith('video/') ? <video src={url} muted className='h-28 w-28 object-cover'/> : <img src={url} alt='' className='h-28 w-28 object-cover'/>}</div>)}</div>
    <div className='flex items-center gap-2'>
      <input ref={inputRef} type='file' accept='image/jpeg,image/png,image/gif,image/webp,video/mp4' multiple className='hidden' onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />
      <Button type='button' variant='ghost' size='sm' onClick={() => inputRef.current?.click()} disabled={value.length >= maxFiles}><ImagePlus size={17}/>وسائط</Button>
      <span className='text-xs text-muted'>{value.length}/{maxFiles}</span>
    </div>
    {uploading && <p className='text-xs text-muted'>جاري رفع الوسائط…</p>}
  </div>

export function useMediaUpload() {
  const pickerUploadRef = useRef<(() => Promise<UploadedMedia[]>) | null>(null)
  return pickerUploadRef
}