import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PredictionForm, { validateField } from '../components/PredictionForm'
import { fmtMetric, fmtPrediction } from '../utils/format'
import { csgoSchema, games, metrics, predictionResult, pubgModeField } from './fixtures'

// Mock the API layer but keep the real error normaliser.
vi.mock('../services/api', async (orig) => {
  const real = await orig()
  return {
    ...real,
    api: {
      health: vi.fn(),
      games: vi.fn(),
      modelInfo: vi.fn(),
      modelInfoAll: vi.fn(),
      predict: vi.fn(),
      prediction: vi.fn(),
      history: vi.fn(),
      analytics: vi.fn(),
      experiments: vi.fn(),
      clearHistory: vi.fn(),
    },
  }
})
const { api } = await import('../services/api')
const { default: App } = await import('../App')

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  api.health.mockResolvedValue({ status: 'ok', games: { csgo: 'ready', pubg: 'unavailable' } })
  api.games.mockResolvedValue(games)
  api.modelInfoAll.mockResolvedValue([])
  api.modelInfo.mockResolvedValue({ schema: csgoSchema, metrics })
})

// ------------------------------------------------------------------ utilities
describe('formatting', () => {
  it('formats predictions by task', () => {
    expect(fmtPrediction('classification', 0.6812)).toBe('68.1%')
    expect(fmtPrediction('regression', 1.234)).toBe('1.23')
  })
  it('formats metrics', () => {
    expect(fmtMetric('accuracy', 0.9218)).toBe('92.2%')
    expect(fmtMetric('r2', 0.97812)).toBe('0.978')
  })
})

describe('validateField', () => {
  const kills = csgoSchema.inputs[1]
  it('requires a value', () => expect(validateField(kills, '')).toBe('Required'))
  it('rejects decimals for integer fields', () => expect(validateField(kills, '2.5')).toMatch(/whole number/))
  it('enforces hard limits', () => {
    expect(validateField(kills, '-1')).toMatch(/at least 0/)
    expect(validateField(kills, '500')).toMatch(/at most 120/)
  })
  it('accepts valid values', () => expect(validateField(kills, '12')).toBeNull())
  it('validates categories', () => {
    expect(validateField(pubgModeField, 'squad')).toBeNull()
    expect(validateField(pubgModeField, 'octo')).toMatch(/Choose/)
  })
})

// ------------------------------------------------------------------ prediction form
describe('PredictionForm', () => {
  it('renders one input per schema field with tooltips and typical ranges', () => {
    render(<PredictionForm schema={csgoSchema} onSubmit={() => {}} />)
    expect(screen.getByLabelText('Kills')).toBeInTheDocument()
    expect(screen.getByLabelText('KAST')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'About Kills' })).toBeInTheDocument()
    expect(screen.getByText(/Typical 5 to 35/)).toBeInTheDocument()
  })

  it('blocks submission when fields are empty', async () => {
    const onSubmit = vi.fn()
    render(<PredictionForm schema={csgoSchema} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /Submit prediction/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByText('Required')).toHaveLength(3)
  })

  it('submits numeric payload after filling medians', async () => {
    const onSubmit = vi.fn()
    render(<PredictionForm schema={csgoSchema} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /Fill with dataset medians/ }))
    await userEvent.clear(screen.getByLabelText('Kills'))
    await userEvent.type(screen.getByLabelText('Kills'), '22')
    await userEvent.click(screen.getByRole('button', { name: /Submit prediction/ }))
    expect(onSubmit).toHaveBeenCalledWith({ rounds: 26, kills: 22, kast: 70 })
  })

  it('shows out-of-range errors inline', async () => {
    render(<PredictionForm schema={csgoSchema} onSubmit={() => {}} />)
    const kast = screen.getByLabelText('KAST')
    await userEvent.type(kast, '140')
    await userEvent.tab()
    expect(screen.getByText('Must be at most 100')).toBeInTheDocument()
    expect(kast).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows server-side errors', () => {
    render(
      <PredictionForm schema={csgoSchema} onSubmit={() => {}} serverErrors={{ general: ['Headshot kills cannot exceed total kills.'], fields: {} }} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Headshot kills cannot exceed total kills.')
  })

  it('renders category inputs as a radio group', async () => {
    const schema = { ...csgoSchema, inputs: [pubgModeField] }
    const onSubmit = vi.fn()
    render(<PredictionForm schema={schema} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('radio', { name: 'duo' }))
    await userEvent.click(screen.getByRole('button', { name: /Submit prediction/ }))
    expect(onSubmit).toHaveBeenCalledWith({ match_type: 'duo' })
  })
})

// ------------------------------------------------------------------ pages
describe('pages', () => {
  it('game selection shows ready and unavailable games honestly', async () => {
    renderAt('/games')
    const csgo = await screen.findByRole('article', { name: 'CS:GO' })
    expect(within(csgo).getByText('Model ready')).toBeInTheDocument()
    const pubg = screen.getByRole('article', { name: 'PUBG' })
    expect(within(pubg).getByText('Unavailable')).toBeInTheDocument()
    expect(within(pubg).getByText(/Model not trained yet/)).toBeInTheDocument()
  })

  it('predict page submits to the API and navigates to results', async () => {
    api.predict.mockResolvedValue(predictionResult)
    renderAt('/predict/csgo')
    await userEvent.click(await screen.findByRole('button', { name: /Fill with dataset medians/ }))
    await userEvent.click(screen.getByRole('button', { name: /Submit prediction/ }))
    await waitFor(() => expect(api.predict).toHaveBeenCalledWith('csgo', { rounds: 26, kills: 17, kast: 70 }))
    expect(await screen.findByTestId('prediction-value')).toHaveTextContent('1.23')
    expect(screen.getByText('This is not Valve matchmaking MMR.')).toBeInTheDocument()
    expect(screen.getByText('What drove this prediction')).toBeInTheDocument()
  })

  it('predict page shows a clear error when the backend is offline', async () => {
    api.modelInfo.mockRejectedValue(new Error('Network Error'))
    renderAt('/predict/csgo')
    expect(await screen.findByText('Backend not reachable')).toBeInTheDocument()
  })

  it('results page loads a saved prediction by id', async () => {
    api.prediction.mockResolvedValue(predictionResult)
    renderAt('/results/7')
    expect(await screen.findByTestId('prediction-value')).toHaveTextContent('1.23')
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(api.prediction).toHaveBeenCalledWith('7')
  })

  it('navigation links work', async () => {
    api.experiments.mockResolvedValue({})
    renderAt('/')
    await userEvent.click(screen.getAllByRole('link', { name: 'Methodology' })[0])
    expect(await screen.findByRole('heading', { name: 'How the predictor was built' })).toBeInTheDocument()
  })

  it('unknown routes show the 404 page', () => {
    renderAt('/nope')
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })
})
