import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import Button from '../components/ui/Button'
import Logo from '../components/Logo'
import ServerStatus from '../components/ServerStatus'
import { LoadingBlock } from '../components/ui/States'

const NAV = [
  { to: '/games', label: 'Predict' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/history', label: 'History' },
  { to: '/methodology', label: 'Methodology' },
]

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  const linkCls = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive ? 'text-ink bg-card-2' : 'text-muted hover:text-ink'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-violet focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line-soft bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="shrink-0" aria-label="Statline home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={linkCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-4 md:flex">
            <ServerStatus />
            <Button to="/games" size="sm" iconRight={ArrowRight}>
              Start predicting
            </Button>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-card-2 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-line-soft px-4 pb-4 pt-2 md:hidden" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={linkCls}>
                  {n.label}
                </NavLink>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <ServerStatus />
              <Button to="/games" size="sm" iconRight={ArrowRight}>
                Start predicting
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
              <LoadingBlock rows={4} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Gaming &amp; Esports Performance Predictor — a B.Tech CSE (AI &amp; ML) project, ITM University Gwalior.
              Predictions are statistical estimates from public datasets, not official ratings or MMR.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="text-ink-2 hover:text-ink">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Data sources</p>
            <ul className="space-y-2 text-sm text-ink-2">
              <li>HLTV.org via Kaggle (CS:GO)</li>
              <li>Kaggle PUBG competition</li>
              <li>vlr.gg (VALORANT)</li>
              <li>YASP / OpenDota via Kaggle (Dota 2)</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line-soft">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-faint sm:px-6">
            Not affiliated with Valve, KRAFTON, Riot Games, HLTV or vlr.gg. Game names are trademarks of their owners.
          </p>
        </div>
      </footer>
    </div>
  )
}
