import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import ChartCard, { DataTable } from '../components/charts/ChartCard'
import {
  ActualVsPredictedChart,
  CalibrationChart,
  ConfusionMatrix,
  DistributionCompareChart,
  ErrorByDecileChart,
  HistogramChart,
  ImportanceChart,
  ModelComparisonChart,
  RocChart,
} from '../components/charts/AnalyticsCharts'
import SectionHeading from '../components/ui/SectionHeading'
import StatTile from '../components/ui/StatTile'
import Badge from '../components/ui/Badge'
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/States'
import GameMark from '../components/GameMark'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { GAME_ORDER, metaFor } from '../utils/games'
import { fmt, fmtDate, fmtInt, fmtMetric, fmtPct, LOWER_IS_BETTER, METRIC_HELP, METRIC_LABELS } from '../utils/format'
import InfoTip from '../components/ui/InfoTip'

export default function Analytics() {
  const [params, setParams] = useSearchParams()
  const game = GAME_ORDER.includes(params.get('game')) ? params.get('game') : 'csgo'
  const overview = useApi(() => api.modelInfoAll(), [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeading as="h1" eyebrow="Analytics" title="Model & dataset analytics">
        All figures come from training runs on held-out test data. Nothing on this page is typed in by hand.
      </SectionHeading>

      <Overview state={overview} />

      <div className="mt-12" role="tablist" aria-label="Select game">
        <div className="flex flex-wrap gap-2 border-b border-line-soft pb-3">
          {GAME_ORDER.map((g) => {
            const active = g === game
            return (
              <button
                key={g}
                role="tab"
                aria-selected={active}
                aria-controls="game-panel"
                onClick={() => setParams({ game: g })}
                style={{ '--pop': metaFor(g).accent }}
                className={`hover-chip inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  active ? 'border-line bg-card-2 text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <GameMark game={g} size="sm" />
                {metaFor(g).title}
              </button>
            )
          })}
        </div>
      </div>

      <div id="game-panel" role="tabpanel" className="mt-8">
        <GamePanel key={game} game={game} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- overview across games */
function Overview({ state }) {
  if (state.loading) return <LoadingBlock className="mt-8" rows={2} />
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} className="mt-8" />
  const rows = [...state.data].sort((a, b) => GAME_ORDER.indexOf(a.key) - GAME_ORDER.indexOf(b.key))
  return (
    <Card className="mt-8 overflow-hidden">
      <CardHeader eyebrow="Model performance by game" title="Selected model per game" description="Regression games are scored with R²/MAE, Dota 2 (classification) with ROC-AUC/accuracy." />
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-line-soft">
                <th scope="col" className="py-2 pr-3 font-semibold">Game</th>
                <th scope="col" className="px-3 py-2 font-semibold">Target</th>
                <th scope="col" className="px-3 py-2 font-semibold">Task</th>
                <th scope="col" className="px-3 py-2 font-semibold">Model</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Primary</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Secondary</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Clean records</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.key} className="hover-row border-b border-line-soft last:border-0" style={{ '--pop': metaFor(g.key).accent }}>
                  <td className="py-3 pr-3 font-semibold text-ink">{g.name}</td>
                  <td className="px-3 text-ink-2">{g.target_name}</td>
                  <td className="px-3 text-muted">{g.task}</td>
                  <td className="px-3 text-ink-2">{g.model_name || '—'}</td>
                  <td className="num px-3 text-right text-ink">
                    {g.headline_metric ? `${g.headline_metric.name} ${fmt(g.headline_metric.value, 3)}` : '—'}
                  </td>
                  <td className="num px-3 text-right text-ink-2">
                    {g.headline_metric
                      ? `${g.headline_metric.secondary_name} ${g.task === 'classification' ? fmtPct(g.headline_metric.secondary_value) : fmt(g.headline_metric.secondary_value, 3)}`
                      : '—'}
                  </td>
                  <td className="num py-3 pl-3 text-right text-ink-2">{g.metrics ? fmtInt(g.metrics.dataset.clean_rows) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
}

/* -------------------------------------------------------------- per-game panel */
function GamePanel({ game }) {
  const { data: a, loading, error, reload } = useApi(() => api.analytics(game), [game])
  if (loading) return <LoadingBlock rows={5} />
  if (error)
    return error.status === 503 ? (
      <EmptyState title="No analytics yet">{error.message}</EmptyState>
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )

  const isReg = a.task === 'regression'
  const d = a.dataset
  const best = a.model_comparison.find((m) => m.selected)
  const labels = a.feature_labels || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-extrabold text-ink">{a.name}</h2>
        <Badge tone="violet">{a.target_name}</Badge>
        <Badge>{isReg ? 'Regression' : 'Binary classification'}</Badge>
        <span className="text-xs text-muted">Trained {fmtDate(a.trained_at)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Raw records" value={fmtInt(d.raw_rows)} hint={d.cleaning_log[0]?.step} />

        <StatTile label="After cleaning" value={fmtInt(d.clean_rows)} hint={`${fmtInt(d.n_groups)} ${d.group_column === 'match_id' || d.group_column === 'matchId' ? 'matches' : 'players'}`} />
        <StatTile label="Train / test" value={`${fmtInt(d.train_rows / 1000)}k / ${fmtInt(d.test_rows / 1000)}k`} hint={`Split by ${d.group_column}`} />
        <StatTile label="Features" value={`${d.n_input_fields} → ${d.n_model_features}`} hint="Inputs → model features" />
        <StatTile
          label={isReg ? 'Test R²' : 'Test ROC-AUC'}
          value={fmt(isReg ? best.test.r2 : best.test.roc_auc, 3)}
          hint={a.selected_model}
          help={METRIC_HELP[isReg ? 'r2' : 'roc_auc']}
        />
        <StatTile
          label={`CV ${a.cross_validation.metric === 'r2' ? 'R²' : 'AUC'}`}
          value={fmt(a.cross_validation.mean, 3)}
          hint={`± ${fmt(a.cross_validation.std, 4)} over ${a.cross_validation.folds} group folds`}
        />
      </div>

      <ModelComparison models={a.model_comparison} task={a.task} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ImportanceChart items={a.feature_importance} labels={labels} />
        {isReg ? (
          <ActualVsPredictedChart points={a.actual_vs_predicted} targetName={a.target_name} />
        ) : (
          <RocChart points={a.roc_curve} auc={best.test.roc_auc} />
        )}
      </div>

      {isReg ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <HistogramChart
            eyebrow="Residual analysis"
            title="Residuals (actual − predicted)"
            description={`Centred near zero = no systematic bias. Mean ${fmt(a.residual_summary.mean, 4)}, standard deviation ${fmt(a.residual_summary.std, 4)}.`}
            bins={a.residual_histogram}
            xLabel="Residual"
          />
          <DistributionCompareChart
            title="Prediction distribution"
            description="Does the model reproduce the spread of real values? Regression models usually predict a narrower spread than reality."
            bins={a.prediction_distribution}
            labels={{ actual: 'Actual', predicted: 'Predicted' }}
          />
          <div className="xl:col-span-2">
            <ErrorByDecileChart rows={a.error_by_target_decile} targetName={a.target_name} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <DistributionCompareChart
            title="Predicted probability by actual outcome"
            description="Good separation = losses pile up near 0%, wins near 100%."
            bins={a.prediction_distribution}
            labels={a.prediction_distribution_labels}
            xFormat={(v) => `${Math.round(v * 100)}%`}
          />
          <CalibrationChart rows={a.calibration} />
          <Card>
            <CardHeader eyebrow="Classification diagnostics" title="Confusion matrix" description={`${fmtInt(d.test_rows)} test player-matches.`} />
            <CardBody>
              <ConfusionMatrix data={a.confusion_matrix} />
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader eyebrow="Data preparation" title="Cleaning log" description="Every cleaning step and how many rows it removed, recorded during training." />
        <CardBody>
          <DataTable
            columns={[
              { key: 'step', label: 'Step' },
              { key: 'rows_before', label: 'Before', align: 'right', format: fmtInt },
              { key: 'removed', label: 'Removed', align: 'right', format: (v) => (v ? `−${fmtInt(v)}` : '0') },
              { key: 'rows_after', label: 'After', align: 'right', format: fmtInt },
            ]}
            rows={d.cleaning_log}
            maxHeight={420}
          />
          <p className="mt-3 text-xs text-muted">
            Source: <span className="text-ink-2">{d.name}</span>
            {d.url?.startsWith('http') && (
              <>
                {' '}·{' '}
                <a href={d.url} target="_blank" rel="noreferrer" className="text-cyan hover:underline">
                  dataset page
                </a>
              </>
            )}
          </p>
        </CardBody>
      </Card>
    </div>
  )
}

function ModelComparison({ models, task }) {
  const keys = task === 'regression' ? ['r2', 'mae', 'mse', 'rmse'] : ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
  const [metric, setMetric] = useState(keys[0] === 'r2' ? 'r2' : 'roc_auc')
  const bestOf = (k) => {
    const vals = models.map((m) => m.test[k])
    return LOWER_IS_BETTER.has(k) ? Math.min(...vals) : Math.max(...vals)
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <ChartCard
        eyebrow="Model comparison"
        title={`Test ${METRIC_LABELS[metric]} by algorithm`}
        description={`${LOWER_IS_BETTER.has(metric) ? 'Lower' : 'Higher'} is better. Highlighted = selected model.`}
        height={240}
      >
        <div className="flex h-full flex-col">
          <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Metric">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={metric === k}
                onClick={() => setMetric(k)}
                className={`hover-chip rounded-md px-2 py-1 text-xs font-semibold ${metric === k ? 'bg-card-2 text-ink' : 'text-muted hover:text-ink-2'}`}
              >
                {METRIC_LABELS[k]}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            <ModelComparisonChart models={models} metric={metric} />
          </div>
        </div>
      </ChartCard>
      <Card>
        <CardHeader eyebrow="Comparison table" title="All algorithms on the same test set" description="Train scores (first 50k training rows) help spot overfitting: a big train–test gap means the model memorised." />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr className="border-b border-line-soft">
                  <th scope="col" className="py-2 pr-2 text-left font-semibold">Model</th>
                  {keys.map((k) => (
                    <th key={k} scope="col" className="px-2 py-2 text-right font-semibold">
                      <span className="inline-flex items-center gap-0.5">
                        {METRIC_LABELS[k]} <InfoTip text={METRIC_HELP[k]} label={`About ${METRIC_LABELS[k]}`} />
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Train {task === 'regression' ? 'R²' : 'AUC'}</th>
                  <th scope="col" className="py-2 pl-2 text-right font-semibold">Fit time</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.model} className={`hover-row border-b border-line-soft last:border-0 ${m.selected ? 'bg-violet/8' : ''}`}>
                    <td className="py-2.5 pr-2 font-semibold text-ink">
                      {m.model} {m.selected && <Badge tone="violet" className="ml-1">selected</Badge>}
                    </td>
                    {keys.map((k) => (
                      <td key={k} className={`num px-2 text-right ${m.test[k] === bestOf(k) ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                        {fmtMetric(k, m.test[k])}
                      </td>
                    ))}
                    <td className="num px-2 text-right text-muted">{fmt(task === 'regression' ? m.train.r2 : m.train.roc_auc, 3)}</td>
                    <td className="num py-2.5 pl-2 text-right text-muted">{fmt(m.fit_seconds, 1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">Bold = best value in each column.</p>
        </CardBody>
      </Card>
    </div>
  )
}
