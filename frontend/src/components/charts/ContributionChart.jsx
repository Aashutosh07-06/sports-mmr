import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard, { LegendDot } from './ChartCard'
import { TooltipBox } from './ChartTooltip'
import { C, axisProps } from './theme'
import { fmt } from '../../utils/format'

/**
 * Diverging bar chart of per-feature contributions (SHAP values) for ONE prediction.
 * Cyan pushes the prediction up, red pushes it down.
 */
export default function ContributionChart({ explanation, top = 10, isClassification }) {
  const items = explanation.contributions.slice(0, top)
  const rest = explanation.contributions.slice(top)
  const restSum = rest.reduce((s, c) => s + c.contribution, 0)
  const data = items
    .map((c) => ({
      name: c.label,
      featureValue: c.value,
      contribution: c.contribution,
      up: c.contribution > 0 ? c.contribution : 0,
      down: c.contribution < 0 ? c.contribution : 0,
    })) // Recharts' vertical layout draws the first row at the top -> largest first

  const unit = isClassification ? 'log-odds' : explanation.units
  const height = Math.max(220, data.length * 30 + 40)

  return (
    <ChartCard
      eyebrow="Explainability"
      title="What drove this prediction"
      description={`${explanation.method}. Bars show how much each stat moved the result away from the average (${unit}).`}
      height={height}
      footer={
        rest.length > 0
          ? `${rest.length} smaller contributions not shown (combined ${restSum >= 0 ? '+' : ''}${fmt(restSum, 4)}). Switch to Table to see all.`
          : null
      }
      legend={
        <>
          <LegendDot color={C.pos}>{isClassification ? 'Raises win probability' : 'Raises the prediction'}</LegendDot>
          <LegendDot color={C.neg}>{isClassification ? 'Lowers win probability' : 'Lowers the prediction'}</LegendDot>
        </>
      }
      table={{
        columns: [
          { key: 'label', label: 'Feature' },
          { key: 'value', label: 'Value', align: 'right', format: (v) => fmt(v, 2) },
          { key: 'contribution', label: `Contribution (${unit})`, align: 'right', format: (v) => (v > 0 ? '+' : '') + fmt(v, 4) },
        ],
        rows: explanation.contributions,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" stackOffset="sign" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={C.grid} />
          <XAxis type="number" {...axisProps} tickFormatter={(v) => fmt(v, Math.abs(v) < 0.1 ? 3 : 2)} />
          <YAxis type="category" dataKey="name" width={150} {...axisProps} tick={{ fill: C.ink2, fontSize: 12 }} axisLine={false} />
          <ReferenceLine x={0} stroke={C.axis} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.06)' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={payload[0].payload.name}
                  rows={[
                    { label: 'Your value', value: fmt(payload[0].payload.featureValue, 2) },
                    {
                      label: 'Contribution',
                      value: (payload[0].payload.contribution > 0 ? '+' : '') + fmt(payload[0].payload.contribution, 4),
                      color: payload[0].payload.contribution >= 0 ? C.pos : C.neg,
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="up" stackId="c" fill={C.pos} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          <Bar dataKey="down" stackId="c" fill={C.neg} radius={[4, 0, 0, 4]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
