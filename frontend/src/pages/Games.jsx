import { ArrowRight, CircleAlert } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import SectionHeading from '../components/ui/SectionHeading'
import { ErrorState, Skeleton } from '../components/ui/States'
import GameMark from '../components/GameMark'
import Reveal from '../components/Reveal'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { GAME_ORDER, metaFor } from '../utils/games'
import { fmt } from '../utils/format'

export default function Games() {
  const { data, loading, error, reload } = useApi(() => api.games(), [])
  const games = data ? [...data].sort((a, b) => GAME_ORDER.indexOf(a.key) - GAME_ORDER.indexOf(b.key)) : []

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHeading as="h1" eyebrow="Step 1 of 3" title="Choose a game">
        Each game has its own form and model, trained on that game’s data. A game only shows as available when
        its trained model has loaded on the server.
      </SectionHeading>

      {error && <ErrorState error={error} onRetry={reload} className="mt-10" />}

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {loading &&
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        {games.map((g, i) => {
          const meta = metaFor(g.key)
          const ready = g.status === 'ready'
          return (
            <Reveal key={g.key} delay={i * 0.05}>
              <article
                className="hover-pop spotlight relative flex h-full flex-col overflow-hidden rounded-2xl border border-line-soft bg-card p-6"
                style={{ '--pop': meta.accent }}
                aria-labelledby={`game-${g.key}`}
              >
                <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: meta.accent }} aria-hidden />
                <div className="flex items-start gap-4">
                  <GameMark game={g.key} size="lg" className="pop-icon" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id={`game-${g.key}`} className="text-xl font-extrabold text-ink">
                        {meta.title}
                      </h2>
                      {ready ? <Badge tone="good">Model ready</Badge> : <Badge tone="warn" icon={CircleAlert}>Unavailable</Badge>}
                    </div>
                    <p className="text-sm text-muted">{meta.subtitle}</p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-ink-2">{meta.blurb}</p>

                <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-line-soft bg-bg-2/60 p-4 text-sm">
                  <div>
                    <dt className="eyebrow">Prediction task</dt>
                    <dd className="mt-1 font-semibold" style={{ color: meta.accent }}>
                      {g.target_name || '—'}
                    </dd>
                    <dd className="text-xs text-muted">{g.task === 'classification' ? 'Classification' : 'Regression'}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Model · test score</dt>
                    <dd className="mt-1 font-semibold text-ink">{g.model_name || '—'}</dd>
                    {g.headline_metric && (
                      <dd className="num text-xs text-muted">
                        {g.headline_metric.name} {fmt(g.headline_metric.value, 3)} · {g.n_inputs} inputs
                      </dd>
                    )}
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-relaxed text-muted">{ready ? meta.scope : g.reason}</p>

                <div className="mt-6 flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-faint">{ready ? 'Not an official rating or MMR' : ''}</p>
                  <Button
                    to={ready ? `/predict/${g.key}` : undefined}
                    disabled={!ready}
                    iconRight={ArrowRight}
                    aria-label={`Select ${meta.title}`}
                  >
                    Select game
                  </Button>
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
