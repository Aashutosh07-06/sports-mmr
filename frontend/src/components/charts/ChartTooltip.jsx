// rows: [{ label, value, color }]
export function TooltipBox({ title, rows }) {
  return (
    <div className="rounded-lg border border-line bg-bg-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {title && <p className="mb-1 font-semibold text-ink">{title}</p>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            {r.color && <span className="size-2 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="num text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
