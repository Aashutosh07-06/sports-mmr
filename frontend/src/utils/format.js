export const METRIC_LABELS = {
  r2: 'R²',
  mae: 'MAE',
  mse: 'MSE',
  rmse: 'RMSE',
  accuracy: 'Accuracy',
  precision: 'Precision',
  recall: 'Recall',
  f1: 'F1 score',
  roc_auc: 'ROC-AUC',
}

export const METRIC_HELP = {
  r2: 'Share of the variation in the target explained by the model (1.0 = perfect, 0 = no better than the average).',
  mae: 'Mean Absolute Error — the average size of a prediction error, in the target’s own units. Lower is better.',
  mse: 'Mean Squared Error — average squared error; punishes large mistakes more. Lower is better.',
  rmse: 'Root Mean Squared Error — square root of MSE, back in the target’s units. Lower is better.',
  accuracy: 'Share of matches where the predicted outcome (win if probability ≥ 50%) was correct.',
  precision: 'Of the players predicted to win, the share that actually won.',
  recall: 'Of the players who actually won, the share the model identified.',
  f1: 'Harmonic mean of precision and recall.',
  roc_auc: 'Probability that a random winner gets a higher score than a random loser (0.5 = random, 1.0 = perfect).',
}

export const LOWER_IS_BETTER = new Set(['mae', 'mse', 'rmse'])

export function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export const fmtInt = (value) =>
  value === null || value === undefined ? '—' : Math.round(value).toLocaleString('en-US')

export const fmtPct = (value, digits = 1) =>
  value === null || value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`

export function fmtMetric(key, value) {
  if (['accuracy', 'precision', 'recall', 'f1'].includes(key)) return fmtPct(value)
  if (key === 'mse') return fmt(value, 4)
  if (['r2', 'roc_auc'].includes(key)) return fmt(value, 3)
  return fmt(value, 3)
}

/** Display a prediction in the right unit for its task. */
export function fmtPrediction(task, value) {
  if (task === 'classification') return fmtPct(value)
  return fmt(value, 2)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function fmtInput(field, value) {
  if (field?.dtype === 'category') return String(value)
  const n = Number(value)
  const s = field?.dtype === 'int' ? fmtInt(n) : fmt(n, Number.isInteger(n) ? 0 : 1)
  return field?.unit ? `${s} ${field.unit}` : s
}
