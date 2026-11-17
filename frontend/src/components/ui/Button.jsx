import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-violet text-white hover:bg-violet-lo shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-12px_rgba(139,92,246,0.8)]',
  secondary: 'bg-card-2 text-ink border border-line hover:border-violet/60 hover:bg-card',
  ghost: 'text-ink-2 hover:text-ink hover:bg-card-2',
  danger: 'bg-transparent text-bad border border-bad/40 hover:bg-bad/10',
}
const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

// renders a <Link> when `to` is passed
export default function Button({
  to,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  children,
  ...props
}) {
  const cls = `btn-pop inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150
    disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  const content = (
    <>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className="size-4" aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="size-4" aria-hidden />}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  )
}
