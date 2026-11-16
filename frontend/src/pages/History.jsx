import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { History as HistoryIcon, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import SectionHeading from '../components/ui/SectionHeading'
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/States'
import GameMark from '../components/GameMark'
import { useApi } from '../hooks/useApi'
import { api, normalizeError } from '../services/api'
import { GAME_ORDER, metaFor } from '../utils/games'
import { fmtDate, fmtPrediction } from '../utils/format'

export default function History() {
  const [game, setGame] = useState('')
  const [clearError, setClearError] = useState(null)
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApi(() => api.history({ limit: 100, ...(game ? { game } : {}) }), [game])

  const clear = async () => {
    if (!window.confirm('Delete all saved predictions? This cannot be undone.')) return
    try {
      await api.clearHistory()
      reload()
    } catch (e) {
      setClearError(normalizeError(e))
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading as="h1" eyebrow="History" title="Saved predictions">
          Every prediction is saved in the local SQLite database with its inputs and result. No personal data is stored.
        </SectionHeading>
        {data?.length > 0 && (
          <Button variant="danger" size="sm" icon={Trash2} onClick={clear}>
            Clear history
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by game">
        {['', ...GAME_ORDER].map((g) => (
          <button
            key={g || 'all'}
            type="button"
            aria-pressed={game === g}
            onClick={() => setGame(g)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              game === g ? 'border-line bg-card-2 text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {g ? metaFor(g).title : 'All games'}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {clearError && <ErrorState error={clearError} className="mb-4" />}
        {loading ? (
          <LoadingBlock rows={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="No predictions yet" action={<Button to="/games">Make a prediction</Button>}>
            Predictions you make will appear here.
          </EmptyState>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-card-2 text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Game</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Target</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Prediction</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Assessment</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Model</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-t border-line-soft hover:bg-card-2/60"
                      onClick={() => navigate(`/results/${r.id}`)}
                    >
                      <td className="px-5 py-3">
                        <Link to={`/results/${r.id}`} className="flex items-center gap-3 font-semibold text-ink" onClick={(e) => e.stopPropagation()}>
                          <GameMark game={r.game} size="sm" />
                          {metaFor(r.game).title}
                        </Link>
                      </td>
                      <td className="px-3 text-ink-2">{r.target_name}</td>
                      <td className="num px-3 text-right font-semibold text-ink">
                        {fmtPrediction(r.game === 'dota2' ? 'classification' : 'regression', r.prediction)}
                      </td>
                      <td className="px-3 text-ink-2">{r.label || '—'}</td>
                      <td className="px-3 text-muted">{r.model_name}</td>
                      <td className="px-5 text-right text-muted">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
