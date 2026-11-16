import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Info } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingBlock } from '../components/ui/States'
import GameMark from '../components/GameMark'
import PredictionForm from '../components/PredictionForm'
import { useApi } from '../hooks/useApi'
import { api, normalizeError } from '../services/api'
import { metaFor } from '../utils/games'
import { fmtMetric, METRIC_HELP, METRIC_LABELS } from '../utils/format'
import InfoTip from '../components/ui/InfoTip'

export default function Predict() {
  const { game } = useParams()
  const navigate = useNavigate()
  const meta = metaFor(game)
  const info = useApi(() => api.modelInfo(game), [game])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleSubmit = async (inputs) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await api.predict(game, inputs)
      navigate(`/results/${result.id}`, { state: { result } })
    } catch (e) {
      setSubmitError(normalizeError(e))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  // 422 = validation problem: shown inline in the form (per field + general messages)
  const serverErrors =
    submitError?.status === 422 ? { general: submitError.generalErrors, fields: submitError.fieldErrors } : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/games" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All games
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <GameMark game={game} size="lg" />
        <div>
          <p className="eyebrow">Step 2 of 3 · Enter match statistics</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{meta.title} prediction</h1>
        </div>
      </div>

      {info.loading && <LoadingBlock className="mt-8" rows={4} />}
      {info.error && (
        <ErrorState
          error={info.error}
          onRetry={info.reload}
          title={info.error.status === 404 ? 'Unknown game' : info.error.status === 503 ? 'Model unavailable' : undefined}
          className="mt-8"
        />
      )}

      {info.data && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <Card className="p-5 sm:p-7">
            {submitError && submitError.status !== 422 && <ErrorState error={submitError} className="mb-6" />}
            <PredictionForm
              key={game}
              schema={info.data.schema}
              onSubmit={handleSubmit}
              submitting={submitting}
              serverErrors={serverErrors}
            />
          </Card>
          <ModelPanel info={info.data} />
        </div>
      )}
    </div>
  )
}

function ModelPanel({ info }) {
  const { schema, metrics } = info
  const best = metrics.models.find((m) => m.selected)
  const keys = schema.task === 'regression' ? ['r2', 'mae', 'rmse'] : ['roc_auc', 'accuracy', 'f1']
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="About this model">
      <Card className="p-5">
        <p className="eyebrow">You are predicting</p>
        <p className="mt-1 text-xl font-extrabold" style={{ color: metaFor(schema.game).accent }}>
          {schema.target_name}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{schema.target_description}</p>
        <div className="mt-4 flex gap-2 rounded-lg border border-warn/25 bg-warn/5 p-3 text-xs leading-relaxed text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          {schema.not_mmr_note}
        </div>
      </Card>
      <Card className="p-5">
        <p className="eyebrow">Model</p>
        <p className="mt-1 font-bold text-ink">{schema.model_name}</p>
        <p className="text-xs text-muted">
          Selected from {metrics.models.length} algorithms by test {metrics.selection_metric.toUpperCase()}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <div key={k} className="rounded-lg bg-bg-2 px-2.5 py-2">
              <dt className="flex items-center gap-0.5 text-[11px] font-semibold text-muted">
                {METRIC_LABELS[k]}
                <InfoTip text={METRIC_HELP[k]} label={`About ${METRIC_LABELS[k]}`} />
              </dt>
              <dd className="num text-sm font-semibold text-ink">{fmtMetric(k, best.test[k])}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">Measured on held-out test data. {metrics.dataset.unit_of_analysis}.</p>
        <Link to={`/analytics?game=${schema.game}`} className="mt-3 inline-block text-sm font-semibold text-cyan hover:underline">
          See full evaluation →
        </Link>
      </Card>
    </aside>
  )
}
