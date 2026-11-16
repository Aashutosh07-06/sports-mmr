# Phase 1 — Project & Dataset Suitability Report

**Project:** Gaming & Esports Performance and MMR Predictor
**Date of inspection:** 2026-11-16
**Status:** Inspection complete. Decisions in §8 were resolved (see §9). This report records the *initial* inspection; final figures are in `docs/methodology.md`.

All numbers in this report were computed from the files in this folder. Any results labelled *quick check* come from a single, untuned random 80/20 split. They are only a feasibility signal, not final experimental results.

---

## 1. Existing PowerPoint review (`Gaming & Esports MMR Predictor.pptx`)

**What to keep:** the problem statement (win/loss-only rating systems ignore individual performance), the objectives (preprocessing → feature engineering → model benchmarking → deployment), the regression approach, the model set (Linear, Decision Tree, Random Forest, XGBoost), the R²/MAE/RMSE metrics, the future scope (live APIs, anti-smurfing, multi-title support), and the references to Elo, TrueSkill, XGBoost and scikit-learn.

**What can't be supported by the data in this folder.** These items must be replaced before evaluation:

| Slide | Claim | Problem |
|---|---|---|
| 4 | "50,000 Kaggle Player Records", "1000–3500 Continuous MMR Target" | None of the four datasets contains a continuous 1000–3500 MMR label, and none has 50,000 player records. |
| 6 | Linear R² 0.74 / DT 0.81 / RF 0.89 / XGBoost 0.92, MAE 64.1 MMR, … | No dataset or training run matches these numbers. They must be replaced with the real results from Phase 3. |
| 9 | "2,485 MMR" sample output | Illustrative only; it is not a real model output. |
| 10 | "XGBoost reduces error by 55% over linear baseline" | Derived from the slide-6 numbers, so it is also unsupported. |
| 11 | "Kaggle Esports Telemetry Dataset (2024)" | This dataset is not in the project. Replace it with the real dataset citations in §7. |
| 3 | Hodge et al. (2019) summarised as "telemetry predicts player skill faster than match history" | The paper is about **live win prediction** in pro matches. Its summary needs rewording. |

Slide 2 and slide 8 mention a Streamlit app. The new build uses React + FastAPI, so these slides need updating as well.

---

## 2. Files actually present

| Folder | Game | Files used | Size |
|---|---|---|---|
| `archive/` | CS:GO | players.csv (383,317 rows × 101 cols), results.csv (45,773 × 19), economy.csv, picks.csv | 158 MB |
| `pubg-finish-placement-prediction/` | PUBG | train_V2.csv (4,446,966 × 29), test_V2.csv (no target), sample_submission_V2.csv | 921 MB |
| `archive (1)/` | Dota 2 | players.csv (500,000 × 73), player_ratings.csv (834,226 × 5), match.csv (50,000 × 13), plus 15 other files | 1.4 GB |
| `archive (2)/` | VALORANT (ranked) | val_stats.csv (85,678 × 38) | 14 MB |
| `archive (3)/` | VALORANT (pro) | data-since-april-2021.csv (249,710 × 47), scraper.py (vlr.gg scraper) | 49 MB |

⚠ **The VALORANT data here is not from the GitHub repo in the brief** (`mohitgaikwad897-tech/Valorant-Esports-Data-Analysis`). There are two different datasets instead:
- `val_stats.csv`: aggregated career stats for **ranked-ladder players**, with a real rank-tier label (`rating`).
- `data-since-april-2021.csv`: per-map stats for **professional players**, scraped from vlr.gg (Oct 2021 – Apr 2023), with VLR's own performance `rating`.

---

## 3. Per-game findings

### 3.1 CS:GO — HLTV professional matches

- **Schema:** each row is one player in one match (series), with series totals and per-map blocks (`m1_*`, `m2_*`, `m3_*`): kills, assists, deaths, hs (headshot kills), flash_assists, kast, kddiff, adr, fkdiff, rating, plus CT/T splits.
- **Coverage:** 2015-10-07 to 2020-02-27; 12,295 players; 38,375 matches; 0 duplicate rows.
- **Missing values:** kast/adr 4.4%, flash_assists 28.6% (older matches), m2 49%, m3 82% (Bo1 and Bo3 series that didn't go the distance), CT/T splits 32%.
- **Best target:** **HLTV Performance Rating per map.** This is a professional performance rating, *not matchmaking MMR*.
- **Unit of analysis:** unpivot m1/m2/m3 into one row per player per map (about 600k rows). Join rounds played from `results.csv` (result_1 + result_2) so stats can be expressed per round (KPR, DPR, APR, ADR).
- **Features:** kills, deaths, assists, headshot kills (→ HS%), KAST, ADR, first-kill differential, flash assists, rounds played; engineered K/D, KPR, DPR.
- **Exclude (leakage):** `rating_ct` / `rating_t` (components of the target); series-level `rating` when predicting map rating; `kddiff` (just kills − deaths; redundant, not harmful); player/team names and IDs.
- **Quick check:** XGBoost on map stats gives R² 0.976 and MAE 0.042. The score is high because HLTV Rating is a formula of these same stats, so the model is mostly learning HLTV's formula. That's a legitimate project result, but it has to be explained that way in the report and the viva.
- **Split:** GroupShuffleSplit by `player_id`, so the same player never appears in both train and test.
- **MMR?** No. Use the name **"Performance Rating (HLTV-style)"**.

### 3.2 PUBG — Finish Placement Prediction (Kaggle competition)

- **Schema:** each row is one player in one match, with 24 stats plus `winPlacePerc` (0 = last place, 1 = winner). There are 47,965 matches and 2,026,745 groups.
- **Missing values:** a single missing target row (drop it). `rankPoints == -1` in 38% of rows; `killPoints`/`winPoints == 0` in 60%.
- **Best target:** **`winPlacePerc` → "Placement Percentile Prediction"**. This is a valid supervised regression task.
- **Features:** kills, damageDealt, assists, headshotKills, DBNOs, revives, walkDistance, rideDistance, swimDistance, heals, boosts, weaponsAcquired, killStreaks, longestKill, matchDuration, matchType (grouped into solo/duo/squad); engineered total distance, heals + boosts, headshot rate.
- **Exclude (leakage or unusable):**
  - `killPlace` (r = −0.72): a within-match ranking computed from *other players'* kills. A user can't know it, and it leaks match outcome.
  - `maxPlace`, `numGroups`: post-match lobby information.
  - `rankPoints`, `killPoints`, `winPoints`: Kaggle documents them as inconsistent/deprecated, and they are mostly missing.
  - `Id`, `groupId`, `matchId`.
- **Caveat:** `walkDistance` (r = 0.81) is a proxy for survival time. It isn't leakage in the strict sense, because it's the player's own end-of-match stat, but the report must say that it largely encodes "how long you stayed alive".
- **Cleaning:** drop rows that fail basic sanity checks (1,535 rows with kills > 0 but zero movement; extreme kill counts) and drop custom modes (crash/flare/normal-*).
- **Split:** GroupShuffleSplit by `matchId`. Train on a match-grouped sample of about 500k–1M rows so it runs on a laptop.
- **MMR?** No. Use the name **"Placement Percentile Prediction"**.

### 3.3 VALORANT

**(a) Pro matches: `data-since-april-2021.csv` (recommended)**
- **Schema:** one row per player per map, with rating, ACS, K/D/A, KAST, ADR, HS%, FK, FD and their T/CT splits. 249,710 rows; 9,061 players; 220 duplicates.
- **Corrupt rows:** rating up to 289, KAST up to 182, negative deaths and assists, and 30–1,800 NaNs per column. These need sanity filters: rating < 4, 0 ≤ KAST ≤ 1, 0 ≤ HS ≤ 1, D ≥ 0.
- **Best target:** **VLR.gg Performance Rating per map** (a professional performance rating, *not ranked MMR*).
- **Features:** K, D, A, ACS, ADR, KAST, HS%, FK, FD, rounds played (team1-score + team2-score), agent (one-hot by role); engineered KPR, K/D.
- **Exclude:** `rating-t`/`rating-ct` (target components), the T/CT stat splits, `tkmd`/`fkmd` (redundant differences), names and teams.
- **Split:** group by player.

**(b) Ranked ladder: `val_stats.csv` (not recommended as a model; useful as a documented negative result)**
- This file has the only *genuine ranked label* in the whole project (`rating` = rank tier). However, 99.9% of rows are Immortal 1/2/3 or Radiant (corrected from 99.6%, an arithmetic slip in the first version of this report): Immortal 1 has 51,315 rows and Gold 1 has 5.
- **Quick check:** a 4-class XGBoost scored accuracy 0.595 vs. a majority-class baseline of 0.598 (macro-F1 0.338). In the final experiment, after duplicate removal, the best model reached 0.605 vs. 0.598 (+0.7 percentage points); see `ml/artifacts/experiments/valorant_ranked.json`. **The stats don't separate rank tiers in this top-of-ladder sample.**
- Recommendation: don't deploy it. Document it as an experiment showing why rank/MMR can't be inferred from these aggregates.

### 3.4 Dota 2 — `devinanzelmo/dota-2-matches`

- **Schema:** `players.csv` has per-match stats for 50,000 ranked matches (K/D/A, GPM, XPM, last hits, denies, hero/tower damage, healing, level, …). `player_ratings.csv` has TrueSkill μ/σ, total_wins and total_matches for 834,226 accounts, of which 582,939 have anonymised account_id ≤ 0. In `players.csv`, 181,169 rows are anonymous (account_id = 0).
- **TrueSkill vs. MMR:** TrueSkill (Microsoft Research) is a Bayesian rating computed *only from win/loss outcomes*. μ is the skill estimate and σ is its uncertainty. Valve's ranked MMR is a separate, proprietary system. The dataset author computed these TrueSkill values; they are not Valve's numbers.
- **Quick check, Skill Estimate:** I aggregated each player's per-match stats and regressed TrueSkill μ on them:
  - ≥1 game: 60,172 players, R² = 0.003 (MAE 3.10 vs. 3.10 for always predicting the mean)
  - ≥3 games: R² = −0.009
  - ≥5 games: R² = −0.024
  - Even the player's own win rate in this sample correlates only 0.01 with μ.
  - **Conclusion:** TrueSkill μ can't be predicted from the gameplay stats available here. The ratings come from a different match pool (`match_outcomes.csv`, 1.8M matches) for which per-player stats don't exist.
- **Viable alternative target: "Match Win Probability"** (classification) from a player's end-of-match stat line, with the label taken from `match.csv` radiant_win and player_slot.
  - Quick check: AUC 0.978.
  - Caveat: these are post-match stats. Gold and tower damage partly *reflect* winning, so this model measures "how strongly this stat line is associated with a win", not a pre-game forecast.
  - Features: kills, deaths, assists, GPM, XPM, last hits, denies, hero damage, hero healing, tower damage, level, duration; engineered KDA. Exclude total_wins/total_matches/TrueSkill (the rating is derived from outcomes) and IDs.
  - Split: group by `match_id`, because all 10 players in a match share the outcome.
- **MMR?** No. Use the name **"Win Probability"**, and document TrueSkill as a negative result.

---

## 4. Summary table

| Game | Dataset | Task | Target (honest name) | Group split by | Rows (approx.) | Genuine MMR? |
|---|---|---|---|---|---|---|
| CS:GO | HLTV pro matches | Regression | Performance Rating (HLTV) per map | player_id | ~600k player-maps | No |
| PUBG | Kaggle competition | Regression | Placement Percentile (winPlacePerc) | matchId | 4.4M (sampled) | No |
| VALORANT | vlr.gg pro data | Regression | Performance Rating (VLR) per map | player | ~248k | No |
| Dota 2 | devinanzelmo | Classification | Win Probability | match_id | ~500k player-matches | No (TrueSkill shown unpredictable) |

**Algorithms:**
- Regression games: Linear Regression (Ridge), Decision Tree, Random Forest, XGBoost; Gradient Boosting (HistGradientBoosting) where useful.
- Dota 2: Logistic Regression, Decision Tree, Random Forest, XGBoost.
- Metrics: R²/MAE/MSE/RMSE for regression; Accuracy/Precision/Recall/F1/ROC-AUC/Confusion Matrix for classification.
- Explainability: SHAP (TreeExplainer) for global importance and per-prediction contributions.

## 5. Licensing (to verify on each Kaggle page before submission)

| Dataset | Source | License status |
|---|---|---|
| CS:GO Professional Matches | kaggle.com/datasets/mateusdmachado/csgo-professional-matches (scraped from HLTV.org) | A third-party report cites CC BY-NC-SA 4.0. **Verify on Kaggle.** Non-commercial academic use. |
| PUBG Finish Placement Prediction | kaggle.com/competitions/pubg-finish-placement-prediction | Governed by the Kaggle competition rules. Academic, non-commercial use. |
| Dota 2 Matches | kaggle.com/datasets/devinanzelmo/dota-2-matches | Not confirmed. **Verify on Kaggle.** TrueSkill values were computed by the dataset author, not Valve. |
| VALORANT pro (vlr.gg) | Origin to be confirmed by the student. The included scraper.py targets vlr.gg. | **Unknown**: the student must provide the source page. |
| VALORANT ranked (val_stats) | Origin to be confirmed by the student | **Unknown** |

## 6. Architecture

```
React (Vite, Tailwind, Recharts, Framer Motion)
        │  HTTP/JSON (Axios)
        ▼
FastAPI  ── /api/health, /api/games, /api/model-info[/{game}],
        │   /api/predict/{game}, /api/explain/{game}, /api/analytics/{game},
        │   /api/predictions/history
        ├── Model registry: loads ml/artifacts/<game>/{model.joblib, schema.json, metrics.json, shap_*.json} at startup
        ├── Per-game Pydantic schemas generated from each schema.json (feature names, types, min/max from data)
        └── SQLite (SQLAlchemy) → prediction_history table
        ▲
Offline ML pipeline (ml/<game>/train.py) → writes artifacts + evaluation JSON + plots
```

Folder layout (inside `sports mmr/`): `frontend/`, `backend/`, `ml/{common,csgo,pubg,valorant,dota2,artifacts}`, `data/raw/<game>/` (git-ignored), `docs/`, `scripts/` (Windows `.bat`/`.ps1` setup and run helpers). The schema in the brief will be followed, with one addition: `data/raw/`.

## 7. Roadmap

| Phase | Deliverable |
|---|---|
| 2 | Move raw data into `data/raw/<game>/`; per-game cleaning + EDA scripts; processed Parquet files; dataset documentation |
| 3 | Per-game training with group splits; model comparison; best model + schema + SHAP saved; metrics JSON |
| 4 | FastAPI + model registry + SQLite history + pytest suite |
| 5 | React design system; Landing, Games, per-game Predict forms (driven by the schema), Results, Analytics, Methodology pages |
| 6–7 | Integration, end-to-end tests, browser inspection (if available) and visual polish |
| 8–9 | Academic report, diagrams, viva pack, README, Windows run guide, testing report with real outputs |

## 8. Decisions needed from the student

1. **Dota 2 target:** "Win Probability" classifier (recommended), with TrueSkill documented as a negative result?
2. **VALORANT dataset:** vlr.gg pro data (recommended), with val_stats documented as a negative result?
3. **Dataset sources:** where did `archive (2)` and `archive (3)` come from (links), for citation?
4. **Moving the raw folders** into `data/raw/<game>/`: OK? (This is a same-disk move; nothing is deleted.)

## 9. Decisions taken (16 Nov 2026)

The student asked for the recommended options:

1. **Dota 2:** Win Probability classifier. The TrueSkill negative result is documented as Experiment 1.
2. **VALORANT:** vlr.gg pro data (`data/raw/valorant_pro`). The ranked file is documented as Experiment 2.
3. **Sources** of the two VALORANT files were provided by the student: pro data = https://www.kaggle.com/datasets/qualidea1217/valorant-pro-matches-since-april-2021; ranked data = https://www.kaggle.com/datasets/aliibrahim10/valorant-stats. Licences for all Kaggle datasets were then read from Kaggle metadata (see `docs/dataset_documentation.md` §5).
4. **Raw folders** were moved: `archive` → `data/raw/csgo`, `archive (1)` → `data/raw/dota2`,
   `archive (2)` → `data/raw/valorant_ranked`, `archive (3)` → `data/raw/valorant_pro`,
   `pubg-finish-placement-prediction` → `data/raw/pubg`.

Changes made after this inspection:
- PUBG was sampled by match (15,000 matches) for laptop-friendly training.
- Raw count features were replaced by per-round and per-minute rates, which gave clearer SHAP explanations.
