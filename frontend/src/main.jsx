import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './styles/index.css'
import App from './App'

// Cursor spotlight: one passive listener writes the pointer position into the hovered
// .spotlight element as CSS variables (--mx / --my); the glow itself is pure CSS.
document.addEventListener(
  'pointermove',
  (e) => {
    const el = e.target instanceof Element ? e.target.closest('.spotlight') : null
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  },
  { passive: true },
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* reducedMotion="user" respects the OS "reduce motion" setting */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)
