import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import ChartCard, { LegendDot } from './ChartCard'
import { TooltipBox } from './ChartTooltip'
import { C, axisProps } from './theme'
import { fmt, fmtInt, fmtMetric, fmtPct, METRIC_LABELS } from '../../utils/format'

const tooltip = (render) => ({ active, payload }) => (active && payload?.length ? render(payload[0].payload, payload) : null)

// feature importance (SHAP)
export function ImportanceChart({ items, labels, top = 12 }) {
  const data = items.slice(0, top).map((d) => ({ ...d, name: labels[d.feature] || d.feature, pct: d.share * 100 }))
  return (
    <ChartCard
      title="Feature importance (SHAP)"
      description="Mean absolute SHAP value on held-out test rows, as a share of the total. Higher = the model relies on it more."
      height={Math.max(240, data.length * 28 + 30)}
      table={{
        columns: [
          { key: 'name', label: 'Feature' },
          { key: 'mean_abs_shap', label: 'Mean |SHAP|', align: 'right', format: (v) => fmt(v, 4) },
          { key: 'share', label: 'Share', align: 'right', format: (v) => fmtPct(v) },
        ],
        rows: items.map((d) => ({ ...d, name: labels[d.feature] || d.feature })),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={C.grid} />
          <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v.toFixed(0)}%`} />
          <YAxis type="category" dataKey="name" width={160} {...axisProps} tick={{ fill: C.ink2, fontSize: 12 }} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.06)' }}
            content={tooltip((d) => (
              <TooltipBox title={d.name} rows={[{ label: 'Share of importance', value: `${d.pct.toFixed(1)}%`, color: C.series1 }]} />
            ))}
          />
          <Bar dataKey="pct" fill={C.series1} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// model comparison
export function ModelComparisonChart({ models, metric }) {
  const data = models.map((m) => ({ name: m.model, value: m.test[metric], selected: m.selected }))
  const min = Math.min(0, ...data.map((d) => d.value))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke={C.grid} />
        <XAxis type="number" domain={[min, 'auto']} {...axisProps} tickFormatter={(v) => fmt(v, 2)} />
        <YAxis type="category" dataKey="name" width={130} {...axisProps} tick={{ fill: C.ink2, fontSize: 12 }} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.06)' }}
          content={tooltip((d) => (
            <TooltipBox
              title={`${d.name}${d.selected ? ' (selected)' : ''}`}
              rows={[{ label: METRIC_LABELS[metric], value: fmtMetric(metric, d.value), color: d.selected ? C.series1 : C.muted }]}
            />
          ))}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          label={{ position: 'right', fill: C.ink2, fontSize: 11, formatter: (v) => fmtMetric(metric, v) }}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.selected ? C.series1 : C.muted} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// regression diagnostics
export function ActualVsPredictedChart({ points, targetName }) {
  const vals = points.flatMap((p) => [p.actual, p.predicted])
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  return (
    <ChartCard
      title="Actual vs predicted"
      description={`${fmtInt(points.length)} random held-out test rows. Points on the diagonal are perfect predictions.`}
      height={300}
      table={{
        columns: [
          { key: 'actual', label: `Actual ${targetName}`, align: 'right', format: (v) => fmt(v, 3) },
          { key: 'predicted', label: 'Predicted', align: 'right', format: (v) => fmt(v, 3) },
        ],
        rows: points.slice(0, 200),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
          <CartesianGrid stroke={C.grid} />
          <XAxis
            type="number" dataKey="actual" name="Actual" domain={[lo, hi]} {...axisProps}
            tickFormatter={(v) => fmt(v, 1)}
            label={{ value: 'Actual', position: 'insideBottom', offset: -10, fill: C.axis, fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="predicted" name="Predicted" domain={[lo, hi]} width={44} {...axisProps}
            tickFormatter={(v) => fmt(v, 1)}
          />
          <ZAxis range={[14, 14]} />
          <ReferenceLine segment={[{ x: lo, y: lo }, { x: hi, y: hi }]} stroke={C.ink2} strokeOpacity={0.6} />
          <Tooltip
            content={tooltip((d) => (
              <TooltipBox rows={[{ label: 'Actual', value: fmt(d.actual, 3) }, { label: 'Predicted', value: fmt(d.predicted, 3), color: C.series1 }]} />
            ))}
          />
          <Scatter data={points} fill={C.series1} fillOpacity={0.45} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function HistogramChart({ bins, title, description, xLabel }) {
  const data = bins.map((b) => ({ ...b, mid: (b.start + b.end) / 2 }))
  return (
    <ChartCard
      title={title}
      description={description}
      height={260}
      table={{
        columns: [
          { key: 'start', label: 'From', align: 'right', format: (v) => fmt(v, 3) },
          { key: 'end', label: 'To', align: 'right', format: (v) => fmt(v, 3) },
          { key: 'count', label: 'Rows', align: 'right', format: fmtInt },
        ],
        rows: bins,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 18, left: 0 }} barCategoryGap={1}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis
            dataKey="mid" {...axisProps} tickFormatter={(v) => fmt(v, 2)} interval="preserveStartEnd" minTickGap={24}
            label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: C.axis, fontSize: 11 }}
          />
          <YAxis width={52} {...axisProps} tickFormatter={fmtInt} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.06)' }}
            content={tooltip((d) => (
              <TooltipBox title={`${fmt(d.start, 3)} to ${fmt(d.end, 3)}`} rows={[{ label: 'Rows', value: fmtInt(d.count), color: C.series1 }]} />
            ))}
          />
          <Bar dataKey="count" fill={C.series1} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function DistributionCompareChart({ bins, labels, title, description, xFormat = (v) => fmt(v, 2) }) {
  const data = bins.map((b) => ({ ...b, mid: (b.start + b.end) / 2 }))
  return (
    <ChartCard
      title={title}
      description={description}
      height={260}
      legend={
        <>
          <LegendDot color={C.series1}>{labels.actual}</LegendDot>
          <LegendDot color={C.series2}>{labels.predicted}</LegendDot>
        </>
      }
      table={{
        columns: [
          { key: 'start', label: 'From', align: 'right', format: xFormat },
          { key: 'end', label: 'To', align: 'right', format: xFormat },
          { key: 'actual', label: labels.actual, align: 'right', format: fmtInt },
          { key: 'predicted', label: labels.predicted, align: 'right', format: fmtInt },
        ],
        rows: bins,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap={2} barGap={1}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="mid" {...axisProps} tickFormatter={xFormat} interval="preserveStartEnd" minTickGap={24} />
          <YAxis width={52} {...axisProps} tickFormatter={fmtInt} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.06)' }}
            content={tooltip((d) => (
              <TooltipBox
                title={`${xFormat(d.start)} to ${xFormat(d.end)}`}
                rows={[
                  { label: labels.actual, value: fmtInt(d.actual), color: C.series1 },
                  { label: labels.predicted, value: fmtInt(d.predicted), color: C.series2 },
                ]}
              />
            ))}
          />
          <Bar dataKey="actual" fill={C.series1} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="predicted" fill={C.series2} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ErrorByDecileChart({ rows, targetName }) {
  return (
    <ChartCard
      title="Mean absolute error by target range"
      description={`Test rows split into 10 equal-size groups by their actual ${targetName}.`}
      height={260}
      table={{
        columns: [
          { key: 'range', label: `Actual ${targetName}` },
          { key: 'mae', label: 'MAE', align: 'right', format: (v) => fmt(v, 4) },
        ],
        rows,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap={4}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="range" {...axisProps} interval={0} angle={-30} textAnchor="end" height={56} tick={{ fill: C.axis, fontSize: 10 }} />
          <YAxis width={52} {...axisProps} tickFormatter={(v) => fmt(v, 2)} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.06)' }}
            content={tooltip((d) => <TooltipBox title={d.range} rows={[{ label: 'MAE', value: fmt(d.mae, 4), color: C.series1 }]} />)}
          />
          <Bar dataKey="mae" fill={C.series1} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// classification diagnostics
export function RocChart({ points, auc }) {
  return (
    <ChartCard
      title={`ROC curve (AUC ${fmt(auc, 3)})`}
      description="Trade-off between catching wins (true positive rate) and false alarms at every threshold. The diagonal is random guessing."
      height={300}
      table={{
        columns: [
          { key: 'fpr', label: 'False positive rate', align: 'right', format: (v) => fmt(v, 3) },
          { key: 'tpr', label: 'True positive rate', align: 'right', format: (v) => fmt(v, 3) },
        ],
        rows: points,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
          <CartesianGrid stroke={C.grid} />
          <XAxis
            type="number" dataKey="fpr" domain={[0, 1]} {...axisProps} tickFormatter={(v) => fmt(v, 1)}
            label={{ value: 'False positive rate', position: 'insideBottom', offset: -10, fill: C.axis, fontSize: 11 }}
          />
          <YAxis type="number" domain={[0, 1]} width={40} {...axisProps} tickFormatter={(v) => fmt(v, 1)} />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={C.axis} />
          <Tooltip
            content={tooltip((d) => (
              <TooltipBox rows={[{ label: 'False positive rate', value: fmt(d.fpr, 3) }, { label: 'True positive rate', value: fmt(d.tpr, 3), color: C.series1 }]} />
            ))}
          />
          <Line type="linear" dataKey="tpr" stroke={C.series1} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function CalibrationChart({ rows }) {
  return (
    <ChartCard
      title="Calibration"
      description="When the model says 70%, do ~70% of those players actually win? Points near the diagonal = well calibrated."
      height={300}
      table={{
        columns: [
          { key: 'mean_predicted', label: 'Mean predicted', align: 'right', format: (v) => fmtPct(v) },
          { key: 'observed_rate', label: 'Observed win rate', align: 'right', format: (v) => fmtPct(v) },
          { key: 'n', label: 'Rows', align: 'right', format: fmtInt },
        ],
        rows,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 18, left: 0 }}>
          <CartesianGrid stroke={C.grid} />
          <XAxis
            type="number" dataKey="mean_predicted" domain={[0, 1]} {...axisProps} tickFormatter={(v) => `${Math.round(v * 100)}%`}
            label={{ value: 'Predicted win probability', position: 'insideBottom', offset: -10, fill: C.axis, fontSize: 11 }}
          />
          <YAxis type="number" domain={[0, 1]} width={44} {...axisProps} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={C.axis} />
          <Tooltip
            content={tooltip((d) => (
              <TooltipBox
                rows={[
                  { label: 'Predicted', value: fmtPct(d.mean_predicted) },
                  { label: 'Observed', value: fmtPct(d.observed_rate), color: C.series1 },
                  { label: 'Rows', value: fmtInt(d.n) },
                ]}
              />
            ))}
          />
          <Line type="linear" dataKey="observed_rate" stroke={C.series1} strokeWidth={2} dot={{ r: 4, fill: C.series1, stroke: C.surface, strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ConfusionMatrix({ data }) {
  const { labels, matrix } = data
  const total = matrix.flat().reduce((a, b) => a + b, 0)
  const max = Math.max(...matrix.flat())
  return (
    <div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-sm" role="table" aria-label="Confusion matrix">
        <div role="row" className="contents">
          <div />
          {labels.map((l) => (
            <div key={l} role="columnheader" className="pb-1 text-center text-xs font-semibold text-muted">
              Predicted {l.toLowerCase()}
            </div>
          ))}
        </div>
        {matrix.map((row, i) => (
          <div role="row" key={labels[i]} className="contents">
            <div role="rowheader" className="flex items-center pr-2 text-xs font-semibold text-muted">
              Actual {labels[i].toLowerCase()}
            </div>
            {row.map((v, j) => {
              const strength = 0.12 + 0.6 * (v / max)
              return (
                <div
                  role="cell"
                  key={j}
                  className="rounded-lg border border-line-soft px-3 py-4 text-center"
                  style={{ background: `rgba(139, 92, 246, ${strength})` }}
                >
                  <p className="num text-lg font-semibold text-ink">{fmtInt(v)}</p>
                  <p className="text-xs text-ink-2">
                    {fmtPct(v / total)} · {i === j ? 'correct' : 'error'}
                  </p>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Threshold 50%. Rows: actual outcome; columns: model prediction.</p>
    </div>
  )
}
