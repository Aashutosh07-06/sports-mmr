/** Small, hand-made API payloads shaped like the real backend responses (used only in tests). */
export const csgoSchema = {
  game: 'csgo',
  name: 'CS:GO',
  task: 'regression',
  target_name: 'HLTV Performance Rating',
  target_short: 'Rating',
  target_description: 'Per-map performance rating.',
  not_mmr_note: 'This is not Valve matchmaking MMR.',
  model_name: 'XGBoost',
  model_features: ['rounds', 'kpr'],
  feature_labels: { rounds: 'Rounds played', kpr: 'Kills per round' },
  inputs: [
    { name: 'rounds', label: 'Rounds played', description: 'Rounds on the map', dtype: 'int', hard_min: 16, hard_max: 80, typical_min: 17, typical_max: 42, default: 26, group: 'Match context', unit: '' },
    { name: 'kills', label: 'Kills', description: 'Enemies eliminated', dtype: 'int', hard_min: 0, hard_max: 120, typical_min: 5, typical_max: 35, default: 17, group: 'Performance', unit: '' },
    { name: 'kast', label: 'KAST', description: 'KAST %', dtype: 'float', hard_min: 0, hard_max: 100, typical_min: 37.5, typical_max: 95, default: 70, group: 'Performance', unit: '%' },
  ],
}

export const pubgModeField = {
  name: 'match_type', label: 'Match mode', description: 'Team size', dtype: 'category', options: ['solo', 'duo', 'squad'], default: 'squad', group: 'Match context',
}

export const metrics = {
  selection_metric: 'rmse',
  dataset: { unit_of_analysis: 'One player on one map' },
  models: [
    { model: 'Linear Regression', selected: false, test: { r2: 0.97, mae: 0.04, mse: 0.003, rmse: 0.054 }, train: { r2: 0.97 } },
    { model: 'XGBoost', selected: true, test: { r2: 0.978, mae: 0.039, mse: 0.0025, rmse: 0.05 }, train: { r2: 0.98 } },
  ],
}

export const games = [
  { key: 'csgo', name: 'CS:GO', status: 'ready', task: 'regression', target_name: 'HLTV Performance Rating', model_name: 'XGBoost', headline_metric: { name: 'R²', value: 0.978 }, n_inputs: 8 },
  { key: 'pubg', name: 'PUBG', status: 'unavailable', reason: 'Model not trained yet. Run: python -m ml.pubg.train', task: 'regression', target_name: 'Placement Percentile' },
]

export const predictionResult = {
  id: 7,
  game: 'csgo',
  game_name: 'CS:GO',
  task: 'regression',
  target_name: 'HLTV Performance Rating',
  target_description: 'Per-map performance rating.',
  not_mmr_note: 'This is not Valve matchmaking MMR.',
  model_name: 'XGBoost',
  prediction: 1.23,
  inputs: { rounds: 26, kills: 22, kast: 75 },
  interpretation: { label: 'Strong', percentile: 84, summary: 'Higher than about 84% of performances.' },
  explanation: {
    method: 'SHAP (TreeExplainer)',
    units: 'Rating',
    base_value: 1.05,
    base_description: 'average prediction before looking at your stats',
    model_output: 1.23,
    contributions: [
      { feature: 'kpr', label: 'Kills per round', value: 0.85, contribution: 0.2 },
      { feature: 'rounds', label: 'Rounds played', value: 26, contribution: -0.02 },
    ],
    top_positive: ['Kills per round'],
    top_negative: ['Rounds played'],
    summary: 'Biggest boosts: Kills per round. Biggest drags: Rounds played.',
  },
  warnings: [],
  created_at: '2026-11-16T09:00:00+00:00',
  status: 'success',
}
