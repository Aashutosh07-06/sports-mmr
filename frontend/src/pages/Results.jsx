import { Link, useLocation, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ChartColumn, Info, RotateCcw, TriangleAlert, Grid2x2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingBlock } from '../components/ui/States'
import GameMark from '../components/GameMark'
import ContributionChart from '../components/charts/ContributionChart'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { metaFor } from '../utils/games'
import { fmt, fmtDate, fmtInput, fmtPrediction } from '../utils/format'

const BAND_TONE = {
  Exceptional: 'violet',
  Strong: 'cyan',
  'Above average': 'good',
  Average: 'neutral',
  'Below average': 'warn',
  Weak: 'bad',
  'Likely win': 'good',
  'Toss-up': 'neutral',
  'Likely loss': 'bad',
}

export default function Results() {
  const { id } = useParams()
  const { state } = useLocation()
  const fromNav = state?.result && String(state.result.id) === id ? state.result : null
  const fetched = useApi(() => (fromNav ? Promise.resolve(fromNav) : api.prediction(id)), [id])
  const result = fetched.data
  const info = useApi(() => (result ? api.modelInfo(result.game) : Promise.resolve(null)), [result?.game])

  if (fetched.loading) return <Page><LoadingBlock rows={4} /></Page>
  if (fetched.error)
    return (
      <Page>
        <ErrorState error={fetched.error} title={fetched.error.status === 404 ? 'Prediction not found' : undefined} onRetry={fetched.reload} />
      </Page>
    )

  const meta = metaFor(result.game)
  const isClf = result.task === 'classification'
  const fields = info.data?.schema?.inputs || []

  return (
    <Page>
      <Link to={`/predict/${result.game}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to {meta.title} form
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <GameMark game={result.game} size="lg" />
        <div>
          <p className="eyebrow">Step 3 of 3 · Prediction result</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {result.game_name} · {result.target_name}
          </h1>
        </div>
      </div>

      {/* ---------------------------------------------------------------- headline */}
      <Card className="mt-8 overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="border-b border-line-soft p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <p className="eyebrow">Predicted {result.target_name}</p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="num text-6xl font-semibold leading-none tracking-tight sm:text-7xl"
                style={{ color: meta.accent }}
                data-testid="prediction-value"
              >
                {fmtPrediction(result.task, result.prediction)}
              </motion.p>
              <Badge tone={BAND_TONE[result.interpretation.label] || 'neutral'} className="mb-2 text-sm">
                {result.interpretation.label}
              </Badge>
            </div>
            <p className="mt-5 max-w-xl leading-relaxed text-ink-2">{result.interpretation.summary}</p>
            <p className="mt-4 text-xs text-muted">
              Model: <span className="font-semibold text-ink-2">{result.model_name}</span> · Prediction #{result.id} ·{' '}
              {fmtDate(result.created_at)}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-6 p-6 sm:p-8">
            {isClf ? <ProbabilityScale value={result.prediction} /> : <PercentileScale result={result} />}
            <div className="flex gap-2 rounded-lg border border-warn/25 bg-warn/5 p-3 text-xs leading-relaxed text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <span>{result.not_mmr_note}</span>
            </div>
          </div>
        </div>
        {result.warnings?.length > 0 && (
          <div className="border-t border-line-soft bg-warn/5 px-6 py-4 sm:px-8" role="note">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <TriangleAlert className="size-4 text-warn" aria-hidden /> Read with care
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-6 text-sm text-ink-2">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* ---------------------------------------------------------------- explanation + inputs */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <ContributionChart explanation={result.explanation} isClassification={isClf} />
          <Card>
            <CardHeader eyebrow="Explanation" title="How to read this prediction" />
            <CardBody className="space-y-3 text-sm leading-relaxed text-ink-2">
              <p>
                The model starts from a baseline:{' '}
                <span className="num text-ink">{fmt(result.explanation.base_value, 3)}</span>, the{' '}
                {result.explanation.base_description}. Each of your stats then pushes the result up or down. The bars
                above add up exactly to the model’s output
                {isClf ? (
                  <>
                    {' '}(<span className="num text-ink">{fmt(result.explanation.model_output, 3)}</span> log-odds, which is{' '}
                    <span className="num text-ink">{fmtPrediction('classification', result.prediction)}</span> win probability).
                  </>
                ) : (
                  <>
                    {' '}(<span className="num text-ink">{fmt(result.explanation.model_output, 3)}</span>).
                  </>
                )}
              </p>
              {result.explanation.summary && <p>{result.explanation.summary}</p>}
              <p className="text-muted">
                Contributions show what the model has learned from the data. They show which stats are associated with
                the result, not what caused it.
              </p>
            </CardBody>
          </Card>
        </div>

        <Card as="aside" aria-label="Input summary">
          <CardHeader eyebrow="Input summary" title="What you entered" />
          <CardBody>
            <dl className="divide-y divide-line-soft">
              {Object.entries(result.inputs).map(([k, v]) => {
                const f = fields.find((x) => x.name === k)
                return (
                  <div key={k} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <dt className="text-muted">{f?.label || k}</dt>
                    <dd className={`num font-medium text-ink ${f?.dtype === 'category' ? 'capitalize' : ''}`}>{fmtInput(f, v)}</dd>
                  </div>
                )
              })}
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button to={`/predict/${result.game}`} icon={RotateCcw}>
          Make another prediction
        </Button>
        <Button to="/games" variant="secondary" icon={Grid2x2}>
          Choose another game
        </Button>
        <Button to={`/analytics?game=${result.game}`} variant="ghost" icon={ChartColumn}>
          Model analytics
        </Button>
      </div>
    </Page>
  )
}

function Page({ children }) {
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</div>
}

/** Where the prediction sits within the training distribution of the target. */
function PercentileScale({ result }) {
  const pct = result.interpretation.percentile ?? 0
  return (
    <div>
      <p className="eyebrow">Compared with the dataset</p>
      <p className="mt-1 text-sm text-ink-2">
        Higher than <span className="num font-semibold text-ink">{fmt(pct, 0)}%</span> of {result.game === 'pubg' ? 'player-matches' : 'professional player-maps'} in the training data
      </p>
      <div className="relative mt-5 h-2.5 rounded-full bg-gradient-to-r from-card-2 via-violet/50 to-violet" role="img" aria-label={`Percentile ${fmt(pct, 0)} of 100`}>
        {[20, 40, 60, 80].map((t) => (
          <span key={t} className="absolute top-0 h-full w-px bg-bg/70" style={{ left: `${t}%` }} aria-hidden />
        ))}
        <motion.span
          initial={{ left: '0%' }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg bg-ink shadow"
          aria-hidden
        />
      </div>
      <div className="num mt-2 flex justify-between text-[11px] text-faint">
        <span>0th</span>
        <span>50th</span>
        <span>100th percentile</span>
      </div>
    </div>
  )
}

function ProbabilityScale({ value }) {
  return (
    <div>
      <p className="eyebrow">Win probability</p>
      <div className="relative mt-5 h-2.5 rounded-full" style={{ background: 'linear-gradient(90deg,#E5484D55,#26324D 50%,#0EA5C477)' }} role="img" aria-label={`Win probability ${Math.round(value * 100)} percent`}>
        <span className="absolute left-1/2 top-[-4px] h-[18px] w-px bg-muted" aria-hidden />
        <motion.span
          initial={{ left: '50%' }}
          animate={{ left: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg bg-ink shadow"
          aria-hidden
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-faint">
        <span>Loss-like stat line</span>
        <span>50%</span>
        <span>Win-like stat line</span>
      </div>
    </div>
  )
}
