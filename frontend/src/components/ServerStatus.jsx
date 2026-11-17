import { useApi } from '../hooks/useApi'
import { api } from '../services/api'

export default function ServerStatus() {
  const { data, loading, error } = useApi(() => api.health(), [])
  const ready = data ? Object.values(data.games).filter((s) => s === 'ready').length : 0
  const total = data ? Object.keys(data.games).length : 0
  const state = loading ? 'checking' : error ? 'offline' : ready === total ? 'ok' : 'partial'
  const color = { checking: '#6B7A93', offline: '#E5484D', ok: '#22C55E', partial: '#FAB219' }[state]
  const text = {
    checking: 'Checking API…',
    offline: 'API offline',
    ok: `API online · ${ready}/${total} models`,
    partial: `API online · ${ready}/${total} models`,
  }[state]
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted" role="status">
      <span className="relative flex size-2">
        {state === 'ok' && <span className="absolute inline-flex size-full animate-ping rounded-full opacity-40" style={{ background: color }} />}
        <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
      </span>
      {text}
    </span>
  )
}
