# Testing Report

**Run date:** 16 November 2026 · **Environment:** Windows 11, Python 3.12.10, Node 24.22.1, Chromium (Playwright headless)

Every result below was produced by actually running the commands shown. Nothing is a projected result.

| Suite | Command | Result |
|---|---|---|
| ML + backend (pytest) | `python -m pytest -q` | **54 passed**, 0 failed (6.2 s) |
| Frontend (Vitest + Testing Library) | `cd frontend && npm test` | **19 passed**, 0 failed |
| Browser end-to-end (Playwright) | `python scripts/e2e_check.py` | **16/16 checks passed** |
| Production build | `cd frontend && npx vite build` | Success |
| Saved-model re-evaluation | `python -m ml.<game>.evaluate` | Reproduces the reported metrics (see §4) |

## 1. ML tests: `ml/tests/test_ml.py` (27 tests)

| Area | Tests | What is verified |
|---|---|---|
| Dataset loading & preprocessing | `test_preprocessing_on_real_sample[csgo, pubg, valorant, dota2]`, `test_csgo_cleaning_rules_hold` | The real CSV files load. The full cleaning pipeline runs on a sample and yields complete rows with all inputs, the target and the group column. The cleaning log never increases the row count |
| Feature engineering | `test_csgo_features`, `test_zero_deaths_and_zero_kills_safe`, `test_pubg_mode_encoding`, `test_valorant_role_one_hot`, `test_feature_order_matches_trained_schema[×4]` | Correct formulas (KPR, K/D, HS%). No division by zero. One-hot encoding. API features match the trained column order |
| Invalid input rules | `test_cross_field_rules` | Headshots > kills, revives in solo and FK > kills are rejected; median inputs are accepted |
| Model training | `test_train_game_end_to_end` | The full trainer runs on synthetic data with a known signal: 5 models, R² > 0.9, all artifacts written |
| Saving & loading | `test_saved_model_reproduces_reported_metrics[×4]` | Reloaded `model.joblib` reproduces the stored test metric within 0.01 |
| Prediction quality | `test_selected_model_beats_baseline[×4]` | R² > 0.5 / AUC > 0.7 |
| Explainability | `test_explainer_additivity[×4]` | base value + Σ SHAP = model output (|error| < 0.001) |

## 2. Backend API tests: `backend/tests/test_api.py` (27 tests)

| Area | Tests | Expected → actual |
|---|---|---|
| Health | `test_health` | 200, all 4 games listed → ✓ |
| Game list | `test_games_list_has_honest_targets` | 4 ready games, no target named "MMR", each has a not-MMR note → ✓ |
| Model info | `test_model_info[×4]` | Schema + metrics returned → ✓ |
| Prediction | `test_predict_returns_real_prediction_and_explanation[×4]` | 200, prediction in range, one contribution per feature, additivity holds, id saved → ✓ |
| Sanity of model behaviour | `test_better_stats_give_higher_csgo_rating`, `test_dota_probability_bounds` | Stronger stats → higher rating; probability in [0, 1] → ✓ |
| Explain endpoint | `test_explain_endpoint_does_not_store_history` | Explanation returned, history unchanged → ✓ |
| Invalid game | `test_unknown_game_404` | 404 → ✓ |
| Missing feature | `test_missing_feature_422` | 422 with `field = kills` → ✓ |
| Incorrect type | `test_wrong_type_422` | 422 → ✓ |
| Out of range / bad category | `test_out_of_range_and_bad_category_422` | 422 → ✓ |
| Unknown field | `test_unknown_field_rejected` | 422 (e.g. sending `mmr`) → ✓ |
| Cross-field rule | `test_cross_field_validation` | 422 "Headshot kills cannot exceed…" → ✓ |
| Malformed body | `test_malformed_body_422` | 422 → ✓ |
| History | `test_history_and_detail` | Newest first; detail by id; 404 for missing id → ✓ |
| Analytics | `test_analytics[×4]` | Importance, comparison, diagnostics present → ✓ |
| Experiments | `test_experiments` | Both experiment results served → ✓ |
| Model unavailable | `test_model_unavailable_returns_503` | Empty artifacts dir → game "unavailable", predict returns 503 with reason → ✓ |

The tests use a temporary SQLite database, so the real history is never touched.

## 3. Frontend tests: `frontend/src/test/app.test.jsx` (19 tests)

| Area | Tests |
|---|---|
| Formatting | prediction formatting per task; metric formatting |
| Input validation | required; integer-only; hard min/max; valid values; category options |
| Prediction form | one input per schema field + tooltips + typical range; empty submit blocked; numeric payload after "Fill with dataset medians"; inline out-of-range error with `aria-invalid`; server errors shown; category radio group |
| Pages & navigation | game selection shows ready and unavailable games honestly; predict → API call → navigation to results with value, not-MMR note and chart; offline backend shows "Backend not reachable"; results page loads by id; navigation links; 404 page |

The API layer is mocked in these tests. Real integration is covered in §4.

## 4. Integration / end-to-end: `scripts/e2e_check.py`

The script drives the real React app in headless Chromium against the running FastAPI server and the real models.

```
[PASS] page / renders
[PASS] page /games renders
[PASS] page /analytics?game=csgo renders
[PASS] page /analytics?game=dota2 renders
[PASS] page /methodology renders
[PASS] empty form blocked client-side
[PASS] server cross-field error displayed
[PASS] csgo: predict -> results value=1.01 bars=9
[PASS] pubg: predict -> results value=0.40 bars=10
[PASS] valorant: predict -> results value=0.95 bars=10
[PASS] dota2: predict -> results value=68.0% bars=10
[PASS] history lists saved predictions
[PASS] unknown route shows 404 page
[PASS] mobile / no horizontal overflow overflow=0px
[PASS] mobile /predict/pubg no horizontal overflow overflow=0px
[PASS] mobile /analytics?game=pubg no horizontal overflow overflow=0px
16/16 checks passed
```

"Renders" means the page reached its key content with **no browser console errors**. The six integration
requirements are covered as follows:
1. The frontend sends the correct data: medians are filled in and submitted.
2. The backend receives it: the server-side cross-field error is displayed.
3. The correct game model is selected: each game returns a value in its own unit.
4. A prediction is generated.
5. The result is returned.
6. The UI displays the prediction and the SHAP chart: 9–10 bars rendered.

**Saved-model re-evaluation** (`python -m ml.<game>.evaluate`, on the first 20,000 saved test rows):

| Game | Model | Metric (saved test sample) |
|---|---|---|
| CS:GO | XGBoost | R² 0.978 |
| PUBG | Gradient Boosting | R² 0.833 |
| VALORANT | Linear Regression | R² 0.951 |
| Dota 2 | XGBoost | ROC-AUC 0.978 |

## 5. Visual inspection

Screenshots in `docs/screenshots/` were captured by the e2e script at 1440×900 (desktop) and 390×844 (mobile) and
reviewed. Issues found and fixed during review:

| Issue | Fix |
|---|---|
| Sections below the fold invisible in full-page captures (scroll-triggered animation) | The capture script now scrolls through the page; real users are unaffected |
| SHAP bars sorted smallest-first | Order corrected (Recharts draws the first row at the top) |
| Footnote overflowing the chart card | Moved into a card footer slot |
| Confusing explanations ("deaths per round raises rating") caused by duplicate raw + per-round features | Raw counts removed from model features; models retrained with essentially unchanged accuracy |
| CV standard deviation shown as "±0.000" | Shown with 4 decimals |
| "Min" unit wrongly capitalised; "Typical -6–6" hard to read | Fixed |
| Lone half-width chart on the Analytics page | Spans the full row |

**Not tested:** screen-reader walkthroughs, browsers other than Chromium, and performance under concurrent load.

## 6. Re-running the tests

```bat
scripts\run_tests.bat
REM e2e (backend + frontend running):
python -m playwright install chromium
python scripts\e2e_check.py
```
