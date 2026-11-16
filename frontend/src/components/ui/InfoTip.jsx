import { useId, useState } from 'react'
import { Info } from 'lucide-react'

/** Accessible tooltip: opens on hover AND keyboard focus, described by aria-describedby. */
export default function InfoTip({ text, label = 'More information', className = '' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className="inline-flex size-5 items-center justify-center rounded text-faint hover:text-ink-2 focus-visible:text-ink-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-lg border border-line bg-bg-2 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  )
}
