# Statline: Gaming & Esports Performance Predictor

> **Live demo:** _add your Render link here after deploying (see `docs/deployment.md`)_

A full-stack machine-learning web application. You pick a game, enter your match statistics and get an
**explained** prediction of a performance-related target.

| Game | Dataset | Prediction (honest target name) | Best model | Test score |
|---|---|---|---|---|
| CS:GO | HLTV professional matches 2015–2020 (Kaggle) | **HLTV Performance Rating** per map | XGBoost | R² 0.978, MAE 0.039 |
| PUBG | Kaggle *Finish Placement Prediction* | **Placement Percentile** (`winPlacePerc`) | Gradient Boosting | R² 0.833, MAE 0.090 |
| VALORANT | *Valorant Pro Matches since April 2021* (vlr.gg, Kaggle) | **VLR Performance Rating** per map | Linear Regression | R² 0.954, MAE 0.055 |
| Dota 2 | YASP/OpenDota 50k-match sample (Kaggle) | **Win Probability** (classification) | XGBoost | ROC-AUC 0.980, accuracy 92.2% |

Scores are measured on held-out **players or matches** (group-based split). They are produced by
`python -m ml.train_all` and stored in `ml/artifacts/<game>/metrics.json`.

> **None of these targets is official matchmaking MMR.** No public dataset in this project contains real MMR.
> Two experiments tried to predict something MMR-like: Dota 2 TrueSkill, and VALORANT rank tier from ranked
> stats. Both failed (R² ≈ 0 and +0.7 percentage points over a majority-class baseline). See
> `docs/methodology.md` §6.

---

## Features

- **Four independent ML pipelines.** Each game has its own cleaning, feature engineering, five-algorithm comparison, model selection and cross-validation.
- **Leakage control.** Train/test splits are grouped by player or match. Leaking columns are excluded, for example PUBG `killPlace`.
- **Explainability.** SHAP values for every prediction, plus SHAP feature importance on the test set.
- **FastAPI backend.** Validated inputs (types, ranges, categories, cross-field rules such as headshots ≤ kills). Models load once at startup. Prediction history is kept in SQLite.
- **React frontend.** Landing page, game selection, schema-generated prediction forms, results with SHAP chart, analytics dashboard, history, methodology.
- **Tests.** Pytest (ML + API), Vitest (UI) and a Playwright browser end-to-end check. See `docs/testing_report.md`.

## Project structure

```
sports mmr/
├── data/raw/               # Kaggle/vlr.gg CSV files (git-ignored), one folder per dataset
├── ml/
│   ├── common/             # shared: spec, trainer, SHAP explainer, evaluation, cleaning log
│   ├── csgo/ pubg/ valorant/ dota2/
│   │   ├── preprocessing.py        # load + clean (every removed row is logged)
│   │   ├── feature_engineering.py  # user inputs, engineered features, target spec, validation rules
│   │   ├── train.py / evaluate.py
│   ├── experiments/        # TrueSkill + VALORANT-rank feasibility experiments
│   ├── tests/              # ML pytest suite
│   ├── artifacts/          # trained models, schema/metrics/analytics JSON, plots
│   └── train_all.py
├── backend/
│   ├── app/{api,core,schemas,services,models}/ + main.py
│   └── tests/              # API pytest suite
├── frontend/               # React + Vite + Tailwind + Recharts
│   └── src/{pages,components,layouts,hooks,services,utils,styles,test}/
├── docs/                   # report, methodology, datasets, testing, user guide, viva, diagrams, screenshots
├── scripts/                # Windows .bat helpers, Desktop shortcut, e2e_check.py
├── run.bat                 # ONE-CLICK START (serves the whole app on http://localhost:8000)
├── requirements.txt  .env.example  .gitignore
└── Gaming & Esports MMR Predictor.pptx   # original presentation
```

## Requirements

- Windows 10/11 (also works on macOS/Linux)
- **Python 3.11 or 3.12**
- **Node.js 20+** (developed with Node 24)
- About 3 GB of free disk space for the datasets

## Quick start (Windows): one click

**Double-click `run.bat`** in the project folder (or type `run` in a terminal there).

- On the first run on a computer it installs everything (a few minutes).
- After that it builds the website, starts the server and opens **http://localhost:8000** in your browser.
- Keep the black window open while you use the app; close it to stop.

For a Desktop icon, run `scripts\create_shortcut.bat` once. It creates **Statline** on your Desktop.

In this mode, FastAPI serves both the API and the built React app from one address, so Node is only needed to
build the site. The two-terminal setup below is for development, with live reload on port 5173.

## Development setup (Windows)

```bat
REM 1. one-time setup (virtual environment + Python and npm packages)
scripts\setup.bat

REM 2. train the models (skip if ml\artifacts\<game>\model.joblib already exist), about 3-5 minutes
scripts\train_all.bat

REM 3. start the backend (terminal 1)  ->  http://localhost:8000/docs
scripts\run_backend.bat

REM 4. start the frontend (terminal 2) ->  http://localhost:5173
scripts\run_frontend.bat
```

### Manual commands (any OS)

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt

python -m ml.train_all            # or a single game: python -m ml.csgo.train
python -m ml.csgo.evaluate        # re-check the saved model on its saved test sample

cd backend && python -m uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```

## Dataset setup

The raw files are not committed. Download them and place them like this:

| Folder | Download | Files needed |
|---|---|---|
| `data/raw/csgo/` | https://www.kaggle.com/datasets/mateusdmachado/csgo-professional-matches | `players.csv`, `results.csv` |
| `data/raw/pubg/` | https://www.kaggle.com/competitions/pubg-finish-placement-prediction/data (accept the competition rules) | `train_V2.csv` |
| `data/raw/valorant_pro/` | https://www.kaggle.com/datasets/qualidea1217/valorant-pro-matches-since-april-2021 | `data-since-april-2021.csv` |
| `data/raw/dota2/` | https://www.kaggle.com/datasets/devinanzelmo/dota-2-matches | `players.csv`, `match.csv`, `player_ratings.csv` |
| `data/raw/valorant_ranked/` | https://www.kaggle.com/datasets/aliibrahim10/valorant-stats (used only by an experiment) | `val_stats.csv` |

## Testing

```bat
scripts\run_tests.bat                    REM pytest (ML + API) and vitest (UI)
python scripts\e2e_check.py              REM browser end-to-end (backend + frontend must be running)
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Server status and model status for each game |
| GET | `/api/games` | Games with target, model and headline metric |
| GET | `/api/model-info`, `/api/model-info/{game}` | Input schema and full evaluation metrics |
| POST | `/api/predict/{game}` | `{"inputs": {...}}` → prediction, interpretation and SHAP explanation (saved to history) |
| POST | `/api/explain/{game}` | Same as predict, without saving to history |
| GET | `/api/analytics/{game}` | Dashboard data (comparison, SHAP, residuals, ROC, cleaning log …) |
| GET | `/api/experiments` | Results of the "why not MMR" experiments |
| GET/DELETE | `/api/predictions/history`, GET `/api/predictions/{id}` | Prediction history |

Interactive documentation: http://localhost:8000/docs

## Troubleshooting

| Problem | Fix |
|---|---|
| `run.bat` says port 8000 is busy | Statline is already open in another window; double-clicking again just opens the browser |
| UI shows **"Backend not reachable"** | Start the backend (`scripts\run_backend.bat`) and check http://localhost:8000/api/health |
| A game shows **Unavailable** | Its model is not trained: `python -m ml.<game>.train`, then restart the backend |
| `ModuleNotFoundError: ml` | Run training commands from the **project root**; start uvicorn from **backend/** |
| Port 8000 or 5173 already in use | `python -m uvicorn app.main:app --port 8001` and set `VITE_API_URL=http://localhost:8001/api` in `frontend/.env` (also add the new origin to `CORS_ORIGINS`) |
| PowerShell blocks `activate` | Use `cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Training runs out of memory | Lower `N_MATCHES` in `ml/pubg/preprocessing.py` or `max_train_rows` in the game spec |
| Changes to models are not picked up | The backend loads models once at startup, so restart it after retraining |

## Documentation

- `docs/academic_report.md`: full project report (placeholders for names and details only the student can provide)
- `docs/dataset_documentation.md`: datasets, schemas, cleaning, limitations, licences
- `docs/methodology.md`: ML methodology and results
- `docs/architecture/architecture.md`: architecture, DFD, use-case, activity, ER and sequence diagrams (Mermaid)
- `docs/testing_report.md`: actual test results
- `docs/user_guide.md`: how to use the application
- `docs/viva_preparation.md`: explanations, scripts and 30 viva questions
- `docs/deployment.md`: how to get a public live link (Render / Hugging Face)
- `docs/ppt_corrections.md`: slide-by-slide fixes for the original presentation
- `docs/phase1_dataset_suitability_report.md`: initial dataset inspection
