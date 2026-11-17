import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChartColumn,
  ClipboardList,
  Database,
  Layers,
  Scale,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import SectionHeading from '../components/ui/SectionHeading'
import { ErrorState, Skeleton } from '../components/ui/States'
import GameMark from '../components/GameMark'
import Reveal from '../components/Reveal'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { GAME_ORDER, metaFor } from '../utils/games'
import { fmt, fmtInt } from '../utils/format'

const sortGames = (list) => [...list].sort((a, b) => GAME_ORDER.indexOf(a.key) - GAME_ORDER.indexOf(b.key))

export default function Landing() {
  const games = useApi(() => api.games(), [])
  const info = useApi(() => api.modelInfoAll(), [])

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-line-soft">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute -top-40 left-1/4 h-96 w-[36rem] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #8B5CF6, transparent)' }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <Reveal>
            <p className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-card/60 px-3 py-1.5 text-ink-2">
              <Sparkles className="size-3.5 text-cyan" aria-hidden />
              Four games · four independently trained models
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Gaming &amp; Esports
              <br />
              <span className="bg-gradient-to-r from-violet-hi to-cyan bg-clip-text text-transparent">Performance Predictor</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Enter the stats from a match and get a machine-learning estimate of how well you played, along with a
              breakdown of which stats moved the score up or down. Every number comes from a model trained on real
              public data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/games" size="lg" iconRight={ArrowRight}>
                Start predicting
              </Button>
              <Button to="/methodology" size="lg" variant="secondary" icon={BookOpen}>
                How it works
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ModelBoard state={games} />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ games */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <SectionHeading eyebrow="Supported games" title="One model per game, built for that game">
            Each game has its own dataset, cleaning steps, features, trained model and prediction form. Data from
            different games is never mixed.
          </SectionHeading>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_ORDER.map((key, i) => {
            const g = games.data?.find((x) => x.key === key)
            const meta = metaFor(key)
            return (
              <Reveal key={key} delay={i * 0.05}>
                <Link
                  to={`/predict/${key}`}
                  className="hover-pop spotlight group flex h-full flex-col rounded-2xl border border-line-soft bg-card p-5"
                  style={{ '--pop': meta.accent }}
                >
                  <div className="flex items-center justify-between">
                    <GameMark game={key} className="pop-icon" />
                    <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{meta.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{meta.blurb}</p>
                  <div className="mt-auto pt-5">
                    <p className="eyebrow">Predicts</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: meta.accent }}>
                      {g?.target_name || (games.loading ? '…' : 'Unavailable')}
                    </p>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ how it works */}
      <section className="border-y border-line-soft bg-bg-2/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading eyebrow="How it works" title="From a scoreboard to an explained prediction" />
          </Reveal>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              [ClipboardList, 'Choose a game', 'Pick CS:GO, PUBG, VALORANT or Dota 2. Each one has its own form with that game’s stats.'],
              [Layers, 'Enter your stats', 'Fill in values from your scoreboard. Inputs are checked for missing values, wrong types, impossible ranges and contradictions.'],
              [Brain, 'Model predicts', 'The backend builds the same features used in training and runs the best model for that game.'],
              [ChartColumn, 'See why', 'SHAP values show how much each stat pushed the prediction up or down, and how it compares with the dataset.'],
            ].map(([Icon, title, text], i) => (
              <Reveal key={title} delay={i * 0.05}>
                <li className="hover-pop spotlight relative h-full rounded-2xl border border-line-soft bg-card p-5">
                  <span className="num absolute right-5 top-5 text-xs text-faint">0{i + 1}</span>
                  <Icon className="size-5 text-violet-hi" aria-hidden />
                  <h3 className="mt-4 font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ model & analytics overview */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <Reveal>
            <SectionHeading eyebrow="Model & analytics overview" title="Evaluated on players and matches it never saw">
              Training and test data are split by player or by match, so the same player or match never appears in
              both. Each game compares five algorithms and keeps the one with the best test score. All figures below
              are loaded from the trained artifacts.
            </SectionHeading>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button to="/analytics" variant="secondary" icon={ChartColumn}>
                Open analytics
              </Button>
            </div>
            <div className="mt-8 rounded-2xl border border-warn/25 bg-warn/5 p-5">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <Scale className="size-4 text-warn" aria-hidden /> Honest targets, not fake MMR
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                None of the public datasets contain official matchmaking MMR, so the platform predicts what the data
                actually contains: professional performance ratings, placement percentile and win probability. Two
                experiments that tried to predict real ranks are documented on the{' '}
                <Link to="/methodology#why-not-mmr" className="font-semibold text-cyan underline-offset-2 hover:underline">
                  methodology page
                </Link>
                .
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="overflow-hidden">
              {info.loading ? (
                <div className="space-y-3 p-6">
                  <Skeleton className="h-10" /> <Skeleton className="h-10" /> <Skeleton className="h-10" />
                </div>
              ) : info.error ? (
                <ErrorState error={info.error} onRetry={info.reload} className="m-5" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-card-2 text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-semibold">Game</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Clean records</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Test rows</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Best model</th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">CV score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortGames(info.data).map((g) => (
                        <tr key={g.key} className="hover-row border-t border-line-soft" style={{ '--pop': metaFor(g.key).accent }}>
                          <td className="px-5 py-3.5">
                            <span className="flex items-center gap-3">
                              <GameMark game={g.key} size="sm" />
                              <span className="font-semibold text-ink">{g.name}</span>
                            </span>
                          </td>
                          {g.metrics ? (
                            <>
                              <td className="num px-3 text-right text-ink-2">{fmtInt(g.metrics.dataset.clean_rows)}</td>
                              <td className="num px-3 text-right text-ink-2">{fmtInt(g.metrics.dataset.test_rows)}</td>
                              <td className="px-3 text-ink-2">{g.metrics.selected_model}</td>
                              <td className="num px-5 text-right text-ink">
                                {g.metrics.cross_validation.metric === 'r2' ? 'R² ' : 'AUC '}
                                {fmt(g.metrics.cross_validation.mean, 3)}
                                <span className="text-faint"> ±{fmt(g.metrics.cross_validation.std, 4)}</span>
                              </td>
                            </>
                          ) : (
                            <td colSpan={4} className="px-3 text-sm text-muted">{g.reason}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="border-t border-line-soft px-5 py-3 text-xs text-muted">
                    CV = 3-fold group cross-validation of the selected algorithm on the training portion.
                  </p>
                </div>
              )}
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ technology */}
      <section className="border-t border-line-soft bg-bg-2/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading eyebrow="Technology" title="What it is built with" />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [Database, 'Data processing', 'Pandas · NumPy · PyArrow', 'Per-game cleaning that logs every row it removes.'],
              [Brain, 'Machine learning', 'scikit-learn · XGBoost', 'Linear, Decision Tree, Random Forest, Gradient Boosting and XGBoost compared for each game.'],
              [Sparkles, 'Explainability', 'SHAP', 'Exact feature contributions for both tree models and linear models.'],
              [Server, 'Backend API', 'FastAPI · Pydantic · Uvicorn', 'Validated inputs, models loaded once at startup, JSON responses.'],
              [Layers, 'Frontend', 'React · Vite · Tailwind CSS · Recharts', 'Each prediction form is generated from that game’s trained schema.'],
              [ShieldCheck, 'Storage & tests', 'SQLite · SQLAlchemy · Pytest · Vitest', 'Prediction history stored without personal data; automated test suites.'],
            ].map(([Icon, title, stack, text], i) => (
              <Reveal key={title} delay={i * 0.04}>
                <div className="hover-pop spotlight h-full rounded-2xl border border-line-soft bg-card p-5">
                  <Icon className="size-5 text-cyan" aria-hidden />
                  <h3 className="mt-3 font-bold text-ink">{title}</h3>
                  <p className="num mt-1 text-xs text-violet-hi">{stack}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

/** Hero panel: one row per game with its real target, model and test metric. */
function ModelBoard({ state }) {
  const { data, loading, error, reload } = state
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
        <div>
          <p className="eyebrow">Model board</p>
          <p className="mt-0.5 text-sm text-muted">Selected model and held-out test score for each game</p>
        </div>
        <ChartColumn className="size-5 text-faint" aria-hidden />
      </div>
      {loading ? (
        <div className="space-y-px p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="mb-3 h-14" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} className="m-5" />
      ) : (
        <ul>
          {sortGames(data).map((g) => (
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
                  <p className="text-xs text-muted">test {g.headline_metric.name}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
