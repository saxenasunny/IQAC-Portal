import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-navy-900 text-white hover:bg-navy-800',
        variant === 'secondary' && 'bg-navy-100 text-navy-900 hover:bg-navy-200',
        variant === 'ghost' && 'text-navy-700 hover:bg-navy-50',
        variant === 'outline' && 'border border-navy-200 bg-white text-navy-800 hover:bg-navy-50',
        variant === 'danger' && 'bg-red-700 text-white hover:bg-red-800',
        className,
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('h-10 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-900 placeholder:text-navy-400', className)}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('h-10 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-900', className)}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn('w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900', className)}
      {...props}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-xl border border-navy-100 bg-white shadow-card', className)}>{children}</div>
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'gold'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-navy-100 text-navy-700',
        tone === 'green' && 'bg-emerald-50 text-emerald-800',
        tone === 'amber' && 'bg-amber-50 text-amber-800',
        tone === 'red' && 'bg-red-50 text-red-800',
        tone === 'blue' && 'bg-sky-50 text-sky-800',
        tone === 'gold' && 'bg-yellow-50 text-yellow-800',
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-navy-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 bg-white px-6 py-16 text-center">
      <p className="text-base font-medium text-navy-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-navy-500">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-navy-100', className)} />
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-navy-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-navy-400">{hint}</span> : null}
    </label>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4 pt-16">
      <div className={cn('w-full rounded-xl bg-white shadow-xl', wide ? 'max-w-4xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700">
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-navy-100">
      <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function MetricHint({
  source,
  filters,
  calculation,
  lastUpdated,
  verifiedBy,
}: {
  source: string
  filters: Record<string, string>
  calculation: string
  lastUpdated: string
  verifiedBy?: string
}) {
  return (
    <div className="mt-3 space-y-1 border-t border-navy-50 pt-3 text-[11px] leading-relaxed text-navy-500">
      <p>Source: {source}</p>
      <p>Filters: {Object.entries(filters).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}</p>
      <p>Calculation: {calculation}</p>
      <p>Last updated: {lastUpdated}</p>
      {verifiedBy ? <p>Verified by: {verifiedBy}</p> : null}
    </div>
  )
}

export const statusTone = (status: string) => {
  const s = status.toLowerCase()
  if (['active', 'approved', 'verified', 'done', 'committed'].includes(s)) return 'green' as const
  if (['submitted', 'under_review', 'data_collection', 'in_progress', 'open'].includes(s)) return 'blue' as const
  if (['needs_revision', 'change_requested', 'draft', 'not_started', 'expired'].includes(s)) return 'amber' as const
  if (['rejected', 'failed', 'inactive', 'suspended'].includes(s)) return 'red' as const
  return 'neutral' as const
}
