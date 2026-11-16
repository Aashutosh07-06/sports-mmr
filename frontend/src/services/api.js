/**
 * Thin API client for the FastAPI backend. Every number the UI shows comes through here.
 */
import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const http = axios.create({ baseURL: API_BASE, timeout: 30000 })

/**
 * Normalise any axios error into { message, status, fieldErrors, generalErrors }.
 * fieldErrors: { inputName: message } for inline form errors (422 responses).
 */
export function normalizeError(err) {
  if (!err?.response) {
    return {
      status: 0,
      message: `Cannot reach the prediction server at ${API_BASE}. Make sure the backend is running (see README → "Run the backend").`,
      fieldErrors: {},
      generalErrors: [],
    }
  }
  const { status, data } = err.response
  const fieldErrors = {}
  const generalErrors = []
  for (const e of data?.errors || []) {
    if (e.field) fieldErrors[e.field] = e.message
    else generalErrors.push(e.message)
  }
  let message = typeof data?.detail === 'string' ? data.detail : `Request failed (HTTP ${status})`
  if (status === 422) message = 'Some inputs need attention.'
  if (status === 503) message = data?.detail || 'This model is not available yet.'
  return { status, message, fieldErrors, generalErrors }
}

const get = (url, config) => http.get(url, config).then((r) => r.data)

export const api = {
  health: () => get('/health'),
  games: () => get('/games'),
  modelInfoAll: () => get('/model-info'),
  modelInfo: (game) => get(`/model-info/${game}`),
  analytics: (game) => get(`/analytics/${game}`),
  experiments: () => get('/experiments'),
  predict: (game, inputs) => http.post(`/predict/${game}`, { inputs }).then((r) => r.data),
  prediction: (id) => get(`/predictions/${id}`),
  history: (params = {}) => get('/predictions/history', { params }),
  clearHistory: () => http.delete('/predictions/history').then((r) => r.data),
}
