# Gaming & Esports Performance and MMR Predictor

**A Project Report submitted in partial fulfilment of the requirements for the degree of
Bachelor of Technology in Computer Science & Engineering (Artificial Intelligence & Machine Learning)**

| | |
|---|---|
| Submitted by | [STUDENT NAME(S)] · [ROLL / ENROLMENT NUMBER(S)] |
| Under the guidance of | [GUIDE NAME], [DESIGNATION] |
| Department | Department of Computer Science & Engineering, ITM University Gwalior |
| Session | [ACADEMIC SESSION] · Semester [SEMESTER] |

> Placeholders in [SQUARE BRACKETS] must be completed by the student. No names, approvals or certificates have
> been invented. Add the institute's certificate, declaration and acknowledgement pages in the format your
> department prescribes.

---

## Project Synopsis

| Item | Description |
|---|---|
| Title | Gaming & Esports Performance and MMR Predictor |
| Domain | Machine learning, sports analytics, full-stack web development |
| Problem | Win/loss-based rating systems ignore individual performance. Players lack an explained, data-driven estimate of how well they played |
| Solution | Four independent supervised-learning pipelines (CS:GO, PUBG, VALORANT, Dota 2) served through a FastAPI backend and a React web application, with SHAP explanations |
| Data | Four public datasets (Kaggle, HLTV, vlr.gg, YASP/OpenDota): 2.5 million cleaned records in total |
| Techniques | Data cleaning, feature engineering, group-based validation; Linear/Logistic Regression, Decision Tree, Random Forest, Gradient Boosting, XGBoost; SHAP |
| Outcome | Working web application. Best test scores: R² 0.978 (CS:GO), 0.833 (PUBG), 0.954 (VALORANT), ROC-AUC 0.980 (Dota 2) |
| Key finding | None of the public datasets supports genuine MMR prediction. This was demonstrated with two experiments, and the project predicts honest performance-related targets instead |

## Abstract

Competitive online games rank players with rating systems such as Elo, TrueSkill or proprietary matchmaking
ratings (MMR). These systems are driven mainly by wins and losses and say little about an individual's
contribution to a match. This project develops a multi-game platform that estimates performance-related
targets from a player's match statistics and explains each estimate. Four independent pipelines were built.
Professional CS:GO statistics (HLTV) predict the HLTV Performance Rating of a map. PUBG statistics (Kaggle)
predict the team's finishing placement percentile. Professional VALORANT statistics (vlr.gg) predict the VLR
Performance Rating of a map. Dota 2 statistics (YASP/OpenDota) predict the probability that a stat line belongs
to the winning team. Each pipeline cleans its data, engineers per-round or per-minute features, excludes leaking
variables, and compares five algorithms. Evaluation uses a group-based train/test split, so the same player or
match never appears in both sets. The selected models achieved R² = 0.978 (XGBoost), R² = 0.833 (Gradient
Boosting), R² = 0.954 (Linear Regression) and ROC-AUC = 0.980 (XGBoost) on held-out data. Two feasibility
experiments showed that the datasets do not support genuine MMR or rank prediction. Gameplay statistics explained
almost none of the variance of Dota 2 TrueSkill (R² ≤ 0.022), and VALORANT rank tier was predicted only 0.7
percentage points better than a majority-class baseline. The models are served by a validated FastAPI service and
a React interface that shows predictions, SHAP feature contributions and model analytics.

**Keywords:** esports analytics, performance rating, XGBoost, SHAP, data leakage, FastAPI, React

## 1. Introduction

Esports titles record detailed statistics for every player and match: kills, damage, objectives, economy and
movement. Ranking systems, however, compress a player's skill into a single number that is updated mostly from
match results. A player who performs well in a lost match may still lose rating, while a weak player on a strong
team may gain it. Machine learning can relate detailed match statistics to performance outcomes. Explainable-AI
methods can then show *why* a given estimate was produced.

This project started from a single-game "MMR digit prediction" proposal (see the original presentation). It was
extended into a multi-game platform. During development the datasets were inspected carefully, and the work was
redirected to targets that the data genuinely supports.

## 2. Problem Statement

To design and implement a system that takes a player's statistics from one match of a supported game and
returns:
- a data-driven estimate of a performance-related target,
- an interpretation of that estimate relative to real data,
- an explanation of which statistics influenced it.

The system must avoid misrepresenting the target (for example, calling a professional rating "MMR") and must be
evaluated without data leakage.

## 3. Objectives

1. Inspect four candidate datasets and identify a valid supervised target for each game.
2. Clean the data and record every removal step.
3. Engineer meaningful features: per-round and per-minute rates, ratios, encodings.
4. Train and compare Linear/Logistic Regression, Decision Tree, Random Forest, Gradient Boosting and XGBoost for each game.
5. Evaluate on held-out players or matches with appropriate metrics and cross-validation.
6. Explain predictions with SHAP.
7. Deploy the models through a REST API with input validation and prediction history.
8. Build a responsive web interface with prediction forms, results, analytics and methodology pages.
9. Test the ML pipeline, the API, the UI and their integration.

## 4. Literature Review

| Work | Contribution | Relevance |
|---|---|---|
| Elo, A. (1978). *The Rating of Chessplayers, Past and Present* | Pairwise rating updated from game results | The classic win/loss rating this project contrasts with |
| Herbrich, R., Minka, T., & Graepel, T. (2007). TrueSkill: A Bayesian Skill Rating System. *NeurIPS* | Bayesian skill (μ) and uncertainty (σ) for team games | The rating in the Dota 2 dataset, tested as a target in Experiment 1 |
| Breiman, L. (2001). Random Forests. *Machine Learning*, 45(1) | Bagged decision-tree ensembles | Random Forest model |
| Friedman, J. H. (2001). Greedy Function Approximation: A Gradient Boosting Machine. *Annals of Statistics*, 29(5) | Gradient boosting | Gradient Boosting model |
| Chen, T., & Guestrin, C. (2016). XGBoost: A Scalable Tree Boosting System. *Proc. 22nd ACM SIGKDD* | Regularised, scalable gradient boosting | XGBoost model |
| Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. *JMLR*, 12 | ML library | Implementation |
| Lundberg, S. M., & Lee, S.-I. (2017). A Unified Approach to Interpreting Model Predictions. *NeurIPS* | SHAP values | Explainability |
| Lundberg, S. M., et al. (2020). From local explanations to global understanding with explainable AI for trees. *Nature Machine Intelligence*, 2 | TreeExplainer | Exact SHAP for tree models |
| Hodge, V. J., et al. (2019). Win Prediction in Multi-Player Esports: Live Professional Match Prediction. *IEEE Transactions on Games* | Match-outcome prediction from in-game data | Related to the Dota 2 win-probability task |

**Research gap addressed.** Rating systems and win-prediction studies operate at the level of the match or the
team. Public tools seldom give an individual, *explained* estimate across several games. The literature also
warns that public datasets may lack the labels needed for "MMR prediction". This project tests that assumption
empirically instead of assuming the label exists.

> Before submission, verify each citation against the original publication and format it in the style your
> department requires.

## 5. Dataset Description

Full details are in `docs/dataset_documentation.md`.

| Game | Source | Raw records | Clean records | Target | Task |
|---|---|---:|---:|---|---|
| CS:GO | Kaggle *CS:GO Professional Matches* (HLTV) | 383,317 player-series | 439,078 player-maps | HLTV Performance Rating | Regression |
| PUBG | Kaggle *PUBG Finish Placement Prediction* | 4,446,966 player-matches | 1,402,311 (15,000 matches) | Placement percentile | Regression |
| VALORANT | Kaggle *Valorant Pro Matches since April 2021* (vlr.gg) | 249,710 player-maps | 248,348 | VLR Performance Rating | Regression |
| Dota 2 | Kaggle *Dota 2 Matches* (YASP/OpenDota) | 500,000 player-matches | 410,270 | Win (→ probability) | Classification |

## 6. System Requirements

**Hardware (development machine):** a Windows laptop with 8 GB+ RAM (16 GB recommended for PUBG preprocessing)
and about 3 GB of free disk space.
**Software:** Windows 10/11, Python 3.12, Node.js 20+ (developed with 24), a modern browser.
**Python libraries:** pandas, NumPy, PyArrow, scikit-learn, XGBoost, SHAP, joblib, Matplotlib, FastAPI, Pydantic,
Uvicorn, SQLAlchemy, pytest, httpx, Playwright.
**JavaScript libraries:** React 19, React Router, Vite, Tailwind CSS 4, Recharts, Framer Motion, Lucide icons, Axios,
Vitest, Testing Library.

## 7. Proposed Methodology

1. **Inspection:** schema, missing values, duplicates, target availability, leakage risks, and feasibility checks (Phase 1 report).
2. **Preprocessing:** reshape to one row per player per map or match, join related tables, remove missing, duplicate and impossible rows, apply scope filters.
3. **Feature engineering:** per-round and per-minute rates, ratios, one-hot encoding, removal of duplicate information.
4. **Modelling:** five algorithms per game on a group-based 80/20 split.
5. **Evaluation and selection:** RMSE or ROC-AUC on the test set, plus 3-fold GroupKFold cross-validation.
6. **Explainability:** SHAP.
7. **Deployment:** FastAPI + SQLite + React.
8. **Testing:** unit, API, UI and end-to-end.

## 8. System Architecture

See `docs/architecture/architecture.md`, §1. A React single-page app calls a FastAPI service over JSON. At
startup the service loads the trained artifacts of each game into a model registry. Each prediction request is
validated, turned into features by the *same* `build_features()` function used in training, scored, explained
with SHAP and stored in SQLite. Training is a separate offline pipeline that writes the model, schema, metrics
and analytics files the service reads.

## 9. Data Flow Diagram

See `docs/architecture/architecture.md`, §2 (Level 0 and Level 1).

## 10. Use Case Diagram

See `docs/architecture/architecture.md`, §3.

## 11. Activity Diagram

See `docs/architecture/architecture.md`, §4.

## 12. ER Diagram

See `docs/architecture/architecture.md`, §6. One table, `PREDICTIONS`, with columns id, game, target_name,
model_name, inputs (JSON), prediction, result (JSON) and created_at. No personal data is stored.

## 13. Machine Learning Methodology

See `docs/methodology.md` §3 for the protocol and hyper-parameters. The essentials:
- **Group-based split:** GroupShuffleSplit by player (CS:GO, VALORANT) or match (PUBG, Dota 2).
- **Selection:** best test RMSE or ROC-AUC.
- **Stability:** GroupKFold cross-validation of the selected model.
- **Size caps:** 300k training and 100k test rows, so training runs on a laptop.

## 14. Feature Engineering

| Game | Engineered features | Excluded for leakage or redundancy |
|---|---|---|
| CS:GO | kills/deaths/assists per round, K/D, headshot %, opening-duel diff. per round | CT/T ratings (target components), kills−deaths difference |
| PUBG | duo/squad indicators, total distance, headshot rate | killPlace, maxPlace, numGroups, rank/kill/win points |
| VALORANT | per-round K/D/A, K/D, first kills/deaths per round, agent role one-hot | T/CT ratings and splits, K−D differences |
| Dota 2 | KDA, kills/deaths/last hits/hero damage/tower damage per minute | TrueSkill, total wins, total matches, hero ID |

## 15. Model Comparison

Full tables are in `docs/methodology.md` §4. These are the test-set results of the selected model and the linear
baseline for each game:

| Game | Linear baseline | Selected model | Selected score | CV (3-fold, group) |
|---|---|---|---|---|
| CS:GO | R² 0.9748 / RMSE 0.0536 | XGBoost | R² 0.9781 / RMSE 0.0500 | 0.9775 ± 0.0001 |
| PUBG | R² 0.7629 / RMSE 0.1497 | Gradient Boosting | R² 0.8331 / RMSE 0.1256 | 0.8292 ± 0.0011 |
| VALORANT | R² 0.9538 / RMSE 0.0691 | Linear Regression | (same) | 0.9538 ± 0.0003 |
| Dota 2 | AUC 0.9617 / acc. 89.8% | XGBoost | AUC 0.9797 / acc. 92.2% | 0.9799 ± 0.0006 |

## 16. Results and Discussion

### 16.1 Expected results (from the original proposal)

The original presentation expected an XGBoost model to predict "exact MMR digits" (1000–3500) from about 50,000
records with R² > 0.85, and expected ensembles to clearly beat a linear baseline.

### 16.2 Actual experimental results

1. **No dataset contains genuine MMR.** Experiment 1 found that Dota 2 TrueSkill μ cannot be predicted from
   gameplay statistics (R² from −0.024 to 0.022). Experiment 2 found that VALORANT rank tier is predicted
   only 0.7 percentage points better than always guessing the most common tier, because 99.9% of the players
   are in the top four tiers. The original MMR objective was therefore replaced with honest targets.
2. **The professional ratings are highly predictable** (CS:GO R² 0.978, VALORANT R² 0.954) because HLTV and VLR
   ratings are formulas of the same statistics. Linear models already reach R² ≥ 0.95. For VALORANT the linear
   model is the best and is selected, which contradicts the expectation that XGBoost always wins.
3. **PUBG placement is genuinely non-linear.** Tree ensembles improve RMSE by 16% over the linear baseline.
   Distance walked (a survival proxy) dominates the SHAP importance.
4. **Dota 2 end-of-match statistics separate winners and losers well** (AUC 0.980). GPM, last hits per minute and
   KDA are the most important features. These statistics partly reflect the win itself.
5. **Overfitting is limited.** For the selected models, train and test scores differ by at most 0.005. Random
   Forests show the largest gaps: up to 0.032 in R² (PUBG) and 0.015 in AUC (Dota 2).
6. **Feature-design lesson.** Removing duplicate raw counts left accuracy unchanged and made the SHAP
   explanations clearer.

## 17. Screenshots of the Application

Captured from the running application by `scripts/e2e_check.py` (files in `docs/screenshots/`):

| Figure | File |
|---|---|
| Landing page with live model board | `01_landing.png` |
| Game selection | `02_games.png` |
| CS:GO prediction form | `03_predict_csgo.png` |
| Form validation errors | `03b_validation_errors.png` |
| Results with SHAP explanation (CS:GO, PUBG, VALORANT, Dota 2) | `04_result_*.png` |
| Analytics dashboard (CS:GO regression, Dota 2 classification) | `06_analytics_csgo.png`, `07_analytics_dota2.png` |
| Prediction history | `08_history.png` |
| Methodology page | `09_methodology.png` |
| Mobile layouts | `m01_landing.png`, `m02_predict_pubg.png`, `m03_analytics_pubg.png` |

Static training plots (model comparison, SHAP importance, actual vs. predicted, residuals, ROC) are in
`ml/artifacts/<game>/plots/`.

## 18. Testing

See `docs/testing_report.md`. Summary: 54 pytest tests (ML + API), 19 Vitest UI tests and 16 browser end-to-end
checks were executed, and all passed. The saved models reproduce their reported metrics after reloading.

## 19. Limitations

- The predictions are not official MMR or rank. They are estimates of professional ratings, placement or match outcome.
- The CS:GO data predates CS2 and mixes HLTV Rating 1.0 and 2.0. About 31% of player-maps lacked a round count and were dropped.
- The CS:GO and VALORANT targets are formulas of the inputs, so a high R² mostly reflects learning the formula.
- PUBG and Dota 2 use end-of-match statistics that partly encode the outcome (survival time, gold). They describe a match after the fact; they do not forecast it.
- The professional datasets (CS:GO, VALORANT) may not represent casual players.
- Hyper-parameters are fixed defaults (not tuned). There are no uncertainty intervals.
- Licences: the CS:GO data is CC BY-NC-SA 4.0 (non-commercial) and the Dota 2 data is CC BY-SA 4.0; both VALORANT datasets are CC0. The PUBG data is governed by the Kaggle competition rules. The project is academic and non-commercial.

## 20. Future Scope

- Import statistics automatically through official APIs (Riot, OpenDota/Steam, PUBG) where their terms allow.
- Use CS2-era data and support more titles.
- Per-player history and rating trends; team-level analytics.
- Anti-smurfing research once real ranked labels are available.
- Hyper-parameter tuning, prediction intervals, drift monitoring.
- Cloud deployment with authentication.

*None of these items are implemented in the current version.*

## 21. Conclusion

The project delivers a working, tested, multi-game prediction platform. It covers data cleaning, feature
engineering, a five-algorithm comparison per game, explainable predictions and a polished web interface. Its
most important result is methodological: by checking the datasets before modelling, it showed that the original
"exact MMR" goal is not achievable with these public data. It then replaced that goal with targets that are
valid and honestly named. The evaluation (group-based splits, cross-validation, leakage exclusion and a
documented negative result) makes the reported scores trustworthy and easy to defend.

## 22. References

1. Elo, A. E. (1978). *The Rating of Chessplayers, Past and Present*. Arco Publishing.
2. Herbrich, R., Minka, T., & Graepel, T. (2007). TrueSkill™: A Bayesian Skill Rating System. *Advances in Neural Information Processing Systems 19*.
3. Breiman, L. (2001). Random Forests. *Machine Learning*, 45(1), 5–32.
4. Friedman, J. H. (2001). Greedy Function Approximation: A Gradient Boosting Machine. *Annals of Statistics*, 29(5), 1189–1232.
5. Chen, T., & Guestrin, C. (2016). XGBoost: A Scalable Tree Boosting System. *Proc. 22nd ACM SIGKDD*, 785–794.
6. Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. *JMLR*, 12, 2825–2830.
7. Lundberg, S. M., & Lee, S.-I. (2017). A Unified Approach to Interpreting Model Predictions. *Advances in Neural Information Processing Systems 30*.
8. Lundberg, S. M., et al. (2020). From local explanations to global understanding with explainable AI for trees. *Nature Machine Intelligence*, 2, 56–67.
9. Hodge, V. J., et al. (2019). Win Prediction in Multi-Player Esports: Live Professional Match Prediction. *IEEE Transactions on Games*.
10. Machado, M. D. *CS:GO Professional Matches* [dataset, CC BY-NC-SA 4.0]. Kaggle. https://www.kaggle.com/datasets/mateusdmachado/csgo-professional-matches
11. Kaggle / PUBG Corporation. *PUBG Finish Placement Prediction* [competition data]. https://www.kaggle.com/competitions/pubg-finish-placement-prediction
12. devinanzelmo (Kaggle user). *Dota 2 Matches* [dataset, CC BY-SA 4.0]. Kaggle. https://www.kaggle.com/datasets/devinanzelmo/dota-2-matches
13. qualidea1217 (Kaggle user). *Valorant Pro Matches since April 2021* [dataset, CC0]. Kaggle. https://www.kaggle.com/datasets/qualidea1217/valorant-pro-matches-since-april-2021
14. Ibrahim, A. *Valorant Stats* [dataset, CC0]. Kaggle. https://www.kaggle.com/datasets/aliibrahim10/valorant-stats
15. FastAPI documentation. https://fastapi.tiangolo.com · React documentation. https://react.dev

> Check page numbers, volumes and author lists against the original sources, and format the list to the
> department's citation style.
