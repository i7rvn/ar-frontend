import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n/useT'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  /** عنصر يظهر بنهاية الحقل (مثلاً أيقونة) */
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, trailing, className, type = 'text', id, dir, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined
  const t = useT()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-muted">
        {label}
      </label>
      {/* dir على الغلاف والحقل معاً: خصائص end-* المنطقية (زر العين) تتبع نفس الاتجاه */}
      <div className="relative" dir={dir}>
        <input
          dir={dir}
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-11 w-full rounded-control border bg-surface px-3.5 text-base text-fg placeholder:text-subtle',
            'transition-colors duration-150 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25',
            error ? 'border-danger' : 'border-line hover:border-subtle',
            (isPassword || !!trailing) && 'pe-11',
            className,
          )}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? t('auth_hide_password') : t('auth_show_password')}
            aria-pressed={revealed}
            className="absolute inset-y-0 end-0 grid w-11 place-items-center text-subtle hover:text-fg"
          >
            {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : (
          trailing && <span className="absolute inset-y-0 end-0 grid w-11 place-items-center text-subtle">{trailing}</span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
