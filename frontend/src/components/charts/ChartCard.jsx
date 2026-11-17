import { useState } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'

// chart card with a chart/table toggle
export default function ChartCard({ title, description, table, children, className = '', height = 280, legend, footer }) {
  const [view, setView] = useState('chart')
  const toggle = table && (
    <div className="inline-flex rounded-lg border border-line p-0.5" role="group" aria-label={`${title} view`}>
      {[
        ['chart', ChartColumn, 'Chart'],
        ['table', Table2, 'Table'],
      ].map(([key, Icon, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          aria-pressed={view === key}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
            view === key ? 'bg-card-2 text-ink' : 'text-muted hover:text-ink-2'
          }`}
        >
          <Icon className="size-3.5" aria-hidden /> {label}
        </button>
      ))}
    </div>
  )
  return (
    <Card className={`card-glow ${className}`}>
      <CardHeader title={title} description={description} action={toggle} />
      <CardBody>
        {legend && view === 'chart' && <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-2">{legend}</div>}
        {view === 'chart' ? (
          <div style={{ height }} className="w-full">
            {children}
          </div>
        ) : (
          <DataTable {...table} maxHeight={height + 40} />
        )}
        {footer && view === 'chart' && <p className="mt-3 text-xs text-muted">{footer}</p>}
      </CardBody>
    </Card>
  )
}

export function LegendDot({ color, children, shape = 'square' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={shape === 'line' ? 'h-0.5 w-4 rounded' : 'size-2.5 rounded-sm'}
        style={{ background: color }}
        aria-hidden
      />
      {children}
    </span>
  )
}

export function DataTable({ columns, rows, maxHeight = 320 }) {
  return (
    <div className="overflow-auto rounded-lg border border-line-soft" style={{ maxHeight }}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-card-2 text-xs text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-3 py-2 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line-soft">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-1.5 text-ink-2 ${c.align === 'right' ? 'num text-right' : ''}`}>
                  {c.format ? c.format(r[c.key], r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
