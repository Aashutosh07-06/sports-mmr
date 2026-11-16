import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Games from './pages/Games'
import Predict from './pages/Predict'
import NotFound from './pages/NotFound'

// Chart-heavy pages are code-split so the landing page loads fast (Suspense lives in AppLayout).
const Results = lazy(() => import('./pages/Results'))
const Analytics = lazy(() => import('./pages/Analytics'))
const History = lazy(() => import('./pages/History'))
const Methodology = lazy(() => import('./pages/Methodology'))


export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Landing />} />
        <Route path="games" element={<Games />} />
        <Route path="predict/:game" element={<Predict />} />
        <Route path="results/:id" element={<Results />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="history" element={<History />} />
        <Route path="methodology" element={<Methodology />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
