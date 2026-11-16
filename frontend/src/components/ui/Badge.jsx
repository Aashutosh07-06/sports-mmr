const TONES = {
  neutral: 'bg-card-2 text-ink-2 border-line',
  violet: 'bg-violet/12 text-violet-hi border-violet/30',
  cyan: 'bg-cyan/10 text-cyan border-cyan/25',
  good: 'bg-good/10 text-good border-good/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
  bad: 'bg-bad/10 text-bad border-bad/30',
}

export default function Badge({ tone = 'neutral', icon: Icon, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  )
}
