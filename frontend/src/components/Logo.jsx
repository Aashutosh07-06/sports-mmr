export default function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#151E30" stroke="#26324D" />
        <path d="M7 22 L13 15 L18 19 L25 9" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="9" r="2.6" fill="#22D3EE" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-extrabold tracking-tight text-ink">Statline</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Esports predictor</span>
        </span>
      )}
    </span>
  )
}
