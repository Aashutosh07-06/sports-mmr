import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState, Skeleton } from '../components/ui/States'
import GameMark from '../components/GameMark'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { GAME_ORDER, metaFor } from '../utils/games'
import { fmt, fmtInt } from '../utils/format'

const byGameOrder = (list) => [...list].sort((a, b) => GAME_ORDER.indexOf(a.key) - GAME_ORDER.indexOf(b.key))

const STEPS = [
  ['Pick a game', 'CS:GO, PUBG, VALORANT or Dota 2.'],
  ['Enter your stats', 'Copy the numbers from the end-of-match scoreboard.'],
  ['Get a prediction', 'The model trained for that game scores your match.'],
  ['See what mattered', 'A chart shows which stats pushed the result up or down.'],
]

const STACK = [
  ['Machine learning', 'pandas, scikit-learn, XGBoost, SHAP'],
  ['Backend', 'FastAPI, Pydantic, SQLite'],
  ['Frontend', 'React, Vite, Tailwind CSS, Recharts'],
  ['Testing', 'pytest, Vitest, Playwright'],
]

export default function Landing() {
  const games = useApi(() => api.games(), [])
  const info = useApi(() => api.modelInfoAll(), [])

  return (
    <>
      <section className="border-b border-line-soft">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
              Gaming &amp; Esports Performance Predictor
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Enter your stats from a CS:GO, PUBG, VALORANT or Dota 2 match and get a performance estimate from a
              model trained on that game, along with the stats that affected it most.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/games" size="lg" iconRight={ArrowRight}>
                Start predicting
              </Button>
              <Button to="/methodology" size="lg" variant="secondary">
                How it works
              </Button>
            </div>
          </div>
          <ModelBoard state={games} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-ink">Supported games</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_ORDER.map((key) => {
            const g = games.data?.find((x) => x.key === key)
            const meta = metaFor(key)
            return (
              <Link
                key={key}
                to={`/predict/${key}`}
                className="hover-pop spotlight group flex h-full flex-col rounded-2xl border border-line-soft bg-card p-5"
                style={{ '--pop': meta.accent }}
              >
                <div className="flex items-center justify-between">
                  <GameMark game={key} className="pop-icon" />
                  <ArrowRight className="size-4 text-faint group-hover:text-ink-2" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{meta.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{meta.blurb}</p>
                <p className="mt-auto pt-5 text-sm text-muted">
                  Predicts{' '}
                  <span className="font-semibold" style={{ color: meta.accent }}>
                    {g?.target_name || (games.loading ? '…' : 'unavailable')}
                  </span>
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="border-y border-line-soft bg-bg-2/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-card-2 text-sm text-ink-2">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink">Model results</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Scores on test data from players and matches that were kept out of training.
            </p>
          </div>
          <Link to="/analytics" className="text-sm font-semibold text-cyan hover:underline">
            Full analytics →
          </Link>
        </div>
        <Card className="mt-6 overflow-hidden">
          {info.loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10" /> <Skeleton className="h-10" /> <Skeleton className="h-10" />
            </div>
          ) : info.error ? (
            <ErrorState error={info.error} onRetry={info.reload} className="m-5" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-card-2 text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Game</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Predicts</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Model</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Records</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Cross-validation</th>
                  </tr>
                </thead>
                <tbody>
                  {byGameOrder(info.data).map((g) => (
                    <tr key={g.key} className="hover-row border-t border-line-soft" style={{ '--pop': metaFor(g.key).accent }}>
                      <td className="px-5 py-3.5 font-semibold text-ink">{g.name}</td>
                      {g.metrics ? (
                        <>
                          <td className="px-3 text-ink-2">{g.target_name}</td>
                          <td className="px-3 text-ink-2">{g.metrics.selected_model}</td>
                          <td className="num px-3 text-right text-ink-2">{fmtInt(g.metrics.dataset.clean_rows)}</td>
                          <td className="num px-5 text-right text-ink">
                            {g.metrics.cross_validation.metric === 'r2' ? 'R² ' : 'AUC '}
                            {fmt(g.metrics.cross_validation.mean, 3)}
                            <span className="text-faint"> ±{fmt(g.metrics.cross_validation.std, 4)}</span>
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-3 text-muted">{g.reason}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section className="border-t border-line-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">Built with</h2>
          <dl className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {STACK.map(([area, tools]) => (
              <div key={area} className="flex gap-4 border-b border-line-soft pb-3">
                <dt className="w-36 shrink-0 text-sm font-semibold text-ink">{area}</dt>
                <dd className="text-sm text-muted">{tools}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  )
}

function ModelBoard({ state }) {
  const { data, loading, error, reload } = state
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-soft px-5 py-4">
        <p className="font-semibold text-ink">Trained models</p>
        <p className="text-sm text-muted">Best model per game and its test score</p>
      </div>
      {loading ? (
        <div className="p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="mb-3 h-14" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} className="m-5" />
      ) : (
        <ul>
          {byGameOrder(data).map((g) => (
            <li
              key={g.key}
              className="hover-row flex items-center gap-4 border-b border-line-soft px-5 py-4 last:border-0"
              style={{ '--pop': metaFor(g.key).accent }}
            >
              <GameMark game={g.key} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{g.name}</p>
                <p className="truncate text-sm text-muted">
                  {g.status === 'ready' ? `${g.target_name} · ${g.model_name}` : 'Model unavailable'}
                </p>
              </div>
              {g.headline_metric && (
                <div className="text-right">
                  <p className="num text-xl font-semibold text-ink">{fmt(g.headline_metric.value, 3)}</p>
                  <p className="text-xs text-muted">{g.headline_metric.name}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
