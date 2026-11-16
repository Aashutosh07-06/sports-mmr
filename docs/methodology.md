# Machine Learning Methodology & Results

Every number in this document comes from `ml/artifacts/<game>/metrics.json`, produced by `python -m ml.train_all`
(random seed 42). Re-running the training reproduces the same numbers.

## 1. Pipeline overview

```
raw CSV ─► preprocessing.py ─► cleaned rows ─► build_features() ─► group split ─► 5 algorithms
        (clean + log)                          (same code as API)   (player/match)      │
                                                                                         ▼
       model.joblib, schema.json, metrics.json, analytics.json ◄── select best ◄── evaluate on test
                                                                 + GroupKFold CV + SHAP
```

The same `GameSpec` object (`ml/<game>/feature_engineering.py`) defines:
- the raw inputs the user types in,
- `build_features()`,
- the input-validation rules,
- the honest target name.

The trainer and the API both use it, so training and serving cannot drift apart.

## 2. Feature engineering principles

1. **Normalise by exposure.** Counts depend on match length, so they are converted to per-round or per-minute
   rates: KPR, DPR, APR, deaths/min, last hits/min, and so on.
2. **Ratios that players already understand:** K/D, KDA, headshot %.
3. **One-hot encoding** for categories (PUBG mode, VALORANT agent role).
4. **No duplicate information.** Early versions gave the model both raw counts and their per-round rates. SHAP
   then split credit between near-identical features, which produced confusing explanations. The raw counts
   were removed. Accuracy did not change (e.g. CS:GO R² 0.9783 → 0.9781), which confirms the counts added no
   information.
5. **Leakage control.** Any column that is computed from the target, or only known after comparing with other
   players, is excluded. Example: PUBG `killPlace`.

## 3. Training protocol

| Setting | Value |
|---|---|
| Split | `GroupShuffleSplit`, 80/20, grouped by player (CS:GO, VALORANT) or match (PUBG, Dota 2) |
| Size cap | max 300,000 training rows and 100,000 test rows per game (laptop-friendly) |
| Selection | lowest test RMSE (regression) / highest test ROC-AUC (classification) |
| Stability | 3-fold `GroupKFold` cross-validation of the selected algorithm on up to 150k training rows |
| Explainability | SHAP TreeExplainer (tree models) or exact linear contributions (linear models), on 1,500 test rows |

**Hyper-parameters.** These are fixed, documented defaults, not tuned on the test set:

| Model | Settings |
|---|---|
| Linear Regression / Logistic Regression | `StandardScaler` + model |
| Decision Tree | `max_depth = 12`, `min_samples_leaf = 20` |
| Random Forest | 100 trees, `max_depth = 16`, `min_samples_leaf = 5`, `max_samples = 0.5` |
| Gradient Boosting | `HistGradientBoosting`, 300 iterations, learning rate 0.08 |
| XGBoost | 600 trees for regression / 500 for classification; learning rate 0.05; depth 7 / 6; subsample 0.8; colsample 0.8 |

## 4. Results (held-out test set)

### CS:GO: HLTV Performance Rating (train 300,000 / test 93,538 player-maps)

| Model | R² | MAE | MSE | RMSE | Train R² |
|---|---:|---:|---:|---:|---:|
| Linear Regression | 0.9748 | 0.0418 | 0.0029 | 0.0536 | 0.9745 |
| Decision Tree | 0.9710 | 0.0452 | 0.0033 | 0.0576 | 0.9752 |
| Random Forest | 0.9774 | 0.0399 | 0.0026 | 0.0508 | 0.9842 |
| Gradient Boosting | 0.9778 | 0.0394 | 0.0025 | 0.0503 | 0.9784 |
| **XGBoost (selected)** | **0.9781** | **0.0391** | **0.0025** | **0.0500** | 0.9805 |

CV R² = 0.9775 ± 0.0001. The top SHAP features are K/D ratio (47% of importance), ADR (17%), kills per round
(11%) and KAST (10%). Linear Regression already reaches R² 0.975 because HLTV Rating is close to a linear formula of
per-round statistics.

### PUBG: Placement Percentile (train 300,000 / test 100,000 player-matches)

| Model | R² | MAE | MSE | RMSE | Train R² |
|---|---:|---:|---:|---:|---:|
| Linear Regression | 0.7629 | 0.1135 | 0.0224 | 0.1497 | 0.7595 |
| Decision Tree | 0.8208 | 0.0937 | 0.0169 | 0.1301 | 0.8324 |
| Random Forest | 0.8298 | 0.0907 | 0.0161 | 0.1268 | 0.8615 |
| **Gradient Boosting (selected)** | **0.8331** | 0.0897 | 0.0158 | **0.1256** | 0.8318 |
| XGBoost | 0.8330 | 0.0896 | 0.0158 | 0.1256 | 0.8426 |

CV R² = 0.8292 ± 0.0011. Gradient Boosting and XGBoost are practically tied: Gradient Boosting has the lower
RMSE in the 5th decimal place. The top SHAP features are walk distance (43%), total distance (14%), match duration
(11%) and squad mode (9%). The large gap between Linear Regression (0.763) and the tree models shows that the
relationship is non-linear.

### VALORANT: VLR Performance Rating (train 199,932 / test 48,416 player-maps)

| Model | R² | MAE | MSE | RMSE | Train R² |
|---|---:|---:|---:|---:|---:|
| **Linear Regression (selected)** | **0.9538** | **0.0546** | **0.0048** | **0.0691** | 0.9517 |
| Decision Tree | 0.9440 | 0.0602 | 0.0058 | 0.0761 | 0.9509 |
| Random Forest | 0.9521 | 0.0556 | 0.0050 | 0.0704 | 0.9658 |
| Gradient Boosting | 0.9535 | 0.0548 | 0.0048 | 0.0693 | 0.9532 |
| XGBoost | 0.9537 | 0.0548 | 0.0048 | 0.0692 | 0.9583 |

CV R² = 0.9538 ± 0.0003. The simplest model wins: VLR's rating is essentially linear in per-round statistics.
Random Forest has the largest train–test gap (0.966 vs 0.952), which is mild overfitting.

### Dota 2: Win Probability (train 300,000 / test 82,060 player-matches)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC | Train AUC |
|---|---:|---:|---:|---:|---:|---:|
| Logistic Regression | 0.8979 | 0.9023 | 0.8923 | 0.8973 | 0.9617 | 0.9610 |
| Decision Tree | 0.8896 | 0.8848 | 0.8957 | 0.8902 | 0.9553 | 0.9727 |
| Random Forest | 0.9077 | 0.9101 | 0.9049 | 0.9075 | 0.9724 | 0.9875 |
| Gradient Boosting | 0.9217 | 0.9190 | 0.9249 | 0.9219 | 0.9792 | 0.9826 |
| **XGBoost (selected)** | **0.9223** | 0.9189 | **0.9264** | **0.9227** | **0.9797** | 0.9838 |

CV ROC-AUC = 0.9799 ± 0.0006. The top SHAP features are GPM (27%), last hits/min (16%), KDA (15%) and tower
damage/min (14%).

## 5. Explainability

For each prediction the API returns `base_value + Σ contributions = model output`. This additivity is verified by
automated tests for all four models. For Dota 2 the units are log-odds, which convert to probability via
`p = 1 / (1 + e^(−x))`. With correlated features (for example K/D ratio and deaths per round), SHAP can give a
small positive share to a feature you might expect to be negative. This happens when the model has already
penalised the same information through the other feature. Contributions describe associations the model learned,
not causes.

## 6. Why not MMR? Feasibility experiments

**Dota 2 TrueSkill (`ml/experiments/dota2_trueskill_feasibility.py`).** Per-player averages of gameplay statistics
were used to predict TrueSkill μ (players with ≥ 10 rated matches):

| Min. games/player | Players | Linear R² | XGBoost R² | XGBoost MAE | MAE of predicting the mean |
|---|---:|---:|---:|---:|---:|
| ≥ 1 | 60,172 | 0.004 | 0.003 | 3.10 | 3.10 |
| ≥ 3 | 20,587 | 0.013 | −0.009 | 2.95 | 2.93 |
| ≥ 5 | 9,474 | 0.022 | −0.024 | 2.78 | 2.73 |

Conclusion: the statistics have essentially no relationship with TrueSkill μ in this data. Even the win rate in this
sample correlates only about 0.01–0.02 with μ, because the ratings come from a much larger match history.

**VALORANT ranked tier (`ml/experiments/valorant_ranked_feasibility.py`).**

| Model | Accuracy | Macro-F1 |
|---|---:|---:|
| Majority-class baseline | 59.8% | 0.19 |
| Logistic Regression | 60.5% | 0.29 |
| XGBoost | 60.4% | 0.33 |

Conclusion: 99.9% of players are Immortal 1–3 or Radiant, and the stats barely separate the tiers (+0.7 percentage points).

## 7. Expected vs. actual results

| Item | Expected (original presentation) | Actual (this project) |
|---|---|---|
| Target | continuous MMR, 1000–3500 | No MMR available. Performance rating / placement percentile / win probability instead |
| Dataset | "50,000 Kaggle player records" | 439,078 / 1,402,311 / 248,348 / 410,270 cleaned records (CS:GO / PUBG / VALORANT / Dota 2) |
| Best model | XGBoost, R² 0.92 | XGBoost (CS:GO, Dota 2), Gradient Boosting (PUBG), **Linear Regression (VALORANT)** |
| XGBoost vs. Linear | "55% lower error" | CS:GO −6.7% RMSE; PUBG −16.1% RMSE; VALORANT +0.1% (linear is better); Dota 2 +0.018 AUC |
