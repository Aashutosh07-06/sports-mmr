# Corrections for "Gaming & Esports MMR Predictor.pptx"

The original slides contain numbers that no dataset in this project supports. Below is replacement content
for each slide, using the actual results. The `.pptx` file itself has **not** been modified.

| Slide | Current content | Problem | Replace with |
|---|---|---|---|
| Title / all | "MMR Predictor" | No dataset has real MMR | "Gaming & Esports **Performance** Predictor", or keep the project title and add the subtitle "Performance ratings, placement & win probability (not official MMR)" |
| 1 | "Predict exact numerical MMR digits" | Not possible with the data | "Predict performance-related targets from match statistics: HLTV rating (CS:GO), placement percentile (PUBG), VLR rating (VALORANT), win probability (Dota 2), with SHAP explanations" |
| 2 | Objective 04 "live Streamlit web app" | The app is React + FastAPI | "Full-stack deployment: FastAPI backend + React frontend with prediction history" |
| 3 | Hodge et al. 2019 summarised as "telemetry predicts skill faster than match history" | The paper is about live *win prediction* | "Hodge et al. (2019): win prediction in professional esports from in-game data". Research gap: "few tools give an *individual, explained* estimate across games; public data rarely contains genuine MMR" |
| 4 | "50,000 Kaggle player records", "6 engineered inputs", "1000–3500 continuous MMR target" | Not from any dataset here | Four datasets: CS:GO 439,078 player-maps · PUBG 1,402,311 player-matches · VALORANT 248,348 player-maps · Dota 2 410,270 player-matches. Inputs: 8 / 16 / 11 / 12 per game |
| 5 | Phase 3 "80/20 split"; Phase 5 "Streamlit UI" | Incomplete / outdated | "Group-based 80/20 split (by player or match) + 3-fold GroupKFold CV"; "React + FastAPI UI with SHAP explanations" |
| 6 | Linear 0.74 / DT 0.81 / RF 0.89 / XGBoost 0.92, MAE 64.1 MMR … | **These results were never produced** | Use the real table below |
| 7 | Feature importance (empty) | – | Use the SHAP plots in `ml/artifacts/<game>/plots/shap_importance.png` |
| 8 | "XGBoost … R² > 0.85" (expected) | Label it clearly as *expected* | Keep it under the heading "Expected outcomes (proposal)" and add a slide "Actual results" |
| 9 | Mock UI "2,485 MMR, K/D 1.45 …" | Illustrative, not real | Replace with screenshots from `docs/screenshots/` (e.g. `04_result_csgo.png`) |
| 10 | "XGBoost reduces error by 55%" | Unsupported | "RMSE reduction of the best model vs. linear: CS:GO 6.7%, PUBG 16.1%, VALORANT 0% (linear is best), Dota 2 +0.018 AUC" |
| 11 | "Kaggle Esports Telemetry Dataset (2024)" | Not used in this project | Replace with the four dataset references (see `docs/academic_report.md` §22) and add Lundberg & Lee (2017) for SHAP |

## Real results table for slide 6

| Game (target) | Linear | Decision Tree | Random Forest | Gradient Boosting | XGBoost | Selected |
|---|---:|---:|---:|---:|---:|---|
| CS:GO (HLTV rating), R² | 0.975 | 0.971 | 0.977 | 0.978 | **0.978** | XGBoost |
| PUBG (placement), R² | 0.763 | 0.821 | 0.830 | **0.833** | 0.833 | Gradient Boosting |
| VALORANT (VLR rating), R² | **0.954** | 0.944 | 0.952 | 0.954 | 0.954 | Linear Regression |
| Dota 2 (win), ROC-AUC | 0.962 | 0.955 | 0.972 | 0.979 | **0.980** | XGBoost |

## Suggested new slide: "Why not MMR?"

- Dota 2 TrueSkill μ predicted from gameplay stats: R² = 0.00–0.02 (no better than guessing the mean).
- VALORANT rank tier from ranked stats: 60.5% accuracy vs 59.8% baseline (99.9% of players in the top 4 tiers).
- → Honest targets were chosen instead. Strong viva point: *validate the data before modelling.*
