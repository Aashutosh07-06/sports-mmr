import InfoTip from './InfoTip'

export default function StatTile({ label, value, hint, help, className = '' }) {
  return (
    <div className={`rounded-xl border border-line-soft bg-card px-4 py-3.5 ${className}`}>
      <div className="flex items-center gap-1">
        <p className="eyebrow">{label}</p>
        {help && <InfoTip text={help} label={`About ${label}`} />}
      </div>
      <p className="num mt-1.5 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}
