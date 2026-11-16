import { CircleAlert, Inbox, RotateCcw, ServerOff } from 'lucide-react'
import Button from './Button'

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-card-2 ${className}`} aria-hidden />
}

export function LoadingBlock({ label = 'Loading…', rows = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={i === 0 ? 'h-24' : 'h-12'} />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry, title, className = '' }) {
  const offline = error?.status === 0
  const Icon = offline ? ServerOff : CircleAlert
  return (
    <div role="alert" className={`flex flex-col items-start gap-3 rounded-2xl border border-bad/30 bg-bad/5 p-5 ${className}`}>
      <div className="flex items-center gap-2 font-semibold text-ink">
        <Icon className="size-5 text-bad" aria-hidden />
        {title || (offline ? 'Backend not reachable' : 'Something went wrong')}
      </div>
      <p className="text-sm text-ink-2">{error?.message || 'Unknown error.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, children, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center ${className}`}>
      <Icon className="size-7 text-faint" aria-hidden />
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
