# Viva & Presentation Preparation

This document is written so you can explain the project in your own words. The numbers come from the trained
models: if you retrain, check `docs/methodology.md` again.

---

## Part A: Concepts explained simply

**Project in one line.** You type in your match stats; a model trained on real data for that specific game
estimates how well you played and shows which stats pushed the estimate up or down.

**Why this project.** Ranking systems (Elo, TrueSkill, MMR) mostly move with wins and losses. A player can play
brilliantly and still lose rating. I wanted a measure that looks at what the player actually did, and explains it.

**What problem it solves.** It gives an *individual, explained, data-based* estimate of performance for four games.
It also shows honestly what public data can and cannot tell us.

**Why multiple games.** Different genres have completely different statistics. Tactical shooters have kills,
ADR and KAST; battle royale has placement, distance and items; a MOBA has gold, XP and towers. One model cannot use
all of them, so each game gets its own dataset, features and model. That also shows the method is general.

**Why the target is not MMR.** The original plan predicted "exact MMR digits". When I inspected the four datasets,
none of them had real MMR:
- CS:GO has HLTV's professional rating;
- PUBG has placement percentile;
- VALORANT pro data has vlr.gg's rating;
- Dota 2 has TrueSkill, which a dataset author calculated and which is not Valve's MMR.

I tested the two closest options. TrueSkill could not be predicted from stats at all (R² ≈ 0). VALORANT rank tier
was predicted only 0.7 percentage points better than guessing. So I used targets that genuinely exist and named
them honestly.

**Datasets.**
- CS:GO: 439k player-maps from HLTV pro matches.
- PUBG: 1.4M player-matches from the Kaggle competition (15,000 matches sampled).
- VALORANT: 248k pro player-maps from vlr.gg.
- Dota 2: 410k player-matches from 50,000 ranked matches.

**Data preprocessing.**
- Reshape to one row per player per map or match.
- Drop missing rows (enough data remains, so no imputation).
- Remove duplicates.
- Remove impossible values: more deaths than rounds, more headshots than kills, KAST over 100%, PUBG cheaters
  with kills but no movement, VALORANT rows with shifted columns.
- Keep comparable data only: standard PUBG modes, ranked Dota 2 games with no abandons.

Every step is logged with the number of rows removed.

**Feature engineering.** I turn raw counts into rates and ratios: kills per round, deaths per round, K/D, KDA,
headshot %, GPM, last hits per minute. Rates are fair across short and long matches. I deliberately removed
duplicate information. Feeding both "kills" and "kills per round" did not improve accuracy and made the
explanations confusing.

**Regression vs. classification.** Regression predicts a number (a rating such as 1.15, a percentile such as
0.72). Classification predicts a category: here, win or loss, given as a probability. CS:GO, PUBG and VALORANT
are regression; Dota 2 is classification.

**The metrics.**
- **MAE:** the average size of a mistake. CS:GO MAE 0.039 means the predicted rating is off by about 0.04 on average.
- **MSE:** the average of squared mistakes, so big mistakes count much more.
- **RMSE:** the square root of MSE, back in the original units. I select regression models by RMSE.
- **R²:** the fraction of the variation the model explains. 1 is perfect; 0 means no better than always predicting the average.
- **Accuracy, precision, recall, F1, ROC-AUC** for Dota 2. AUC 0.98 means that if I pick a random winner and a random loser, the model gives the winner the higher score 98% of the time.

**Overfitting and underfitting.** Overfitting means memorising the training data and failing on new data: train
score high, test score low. Underfitting means the model is too simple to capture the pattern. I report train and
test scores side by side. The selected models differ by less than 0.005, so they do not overfit. A single deep
Decision Tree or a Random Forest shows bigger gaps.

**Train-test split.** 80% of the data trains the model and 20% is hidden and used only for the final score. My
split is **grouped**: all rows of one player (or one match) go to the same side. Otherwise the model could
recognise a player it has already seen and look better than it really is.

**Data leakage.** Leakage means using information that would not be available at prediction time, or that
contains the answer. Examples I removed:
- PUBG `killPlace` ranks your kills against everyone else after the match;
- CS:GO CT-side and T-side ratings are pieces of the final rating;
- Dota 2 TrueSkill and total wins are computed from match results.

**Random Forest.** Many decision trees, each trained on a random sample of rows and features. Their average is
more stable than one tree.

**Gradient Boosting / XGBoost.** Trees are added one after another, each fixing the mistakes of the previous ones.
XGBoost adds regularisation and subsampling, and it is very strong on tabular data. In my project it won for
CS:GO and Dota 2, HistGradientBoosting won for PUBG (by a tiny margin), and plain Linear Regression won for
VALORANT. I let the test score decide; I did not just assume XGBoost is best.

**SHAP.** It comes from game theory (Shapley values): the prediction is "shared out" fairly among the features.
`average prediction + all contributions = this prediction`, exactly. The cyan bars pushed the prediction up and the
red bars pushed it down. My tests check that this sum is exact for all four models.

**FastAPI.** A Python web framework. It turns functions into HTTP endpoints, validates the input with Pydantic, and
generates interactive documentation at `/docs`. The models load once at startup, never per request.

**React.** A JavaScript library for building the interface out of components. Each game's form is *generated from
the trained model's schema*, so the form always has exactly the inputs the model needs.

**Frontend–backend communication.** The browser sends a JSON `POST /api/predict/csgo` with the stats. FastAPI
validates them, builds features, predicts, explains, saves to SQLite and returns JSON. React then draws the
result and the chart.

**Model deployment.** Training is done offline. It saves `model.joblib` plus `schema.json`, `metrics.json` and
`analytics.json`. The API loads those files at startup. Retraining means running `python -m ml.train_all` and
restarting the backend.

**Limitations.** Not real MMR. The pro ratings are formulas of the inputs, hence the very high R². PUBG and Dota 2
stats describe a finished match; they do not forecast it. The CS:GO data is pre-CS2. Pro-player data may not fit
casual players.

**Future improvements.** Official game APIs, CS2 data, player history and trends, team analytics, anti-smurfing
research (which needs real rank labels), tuning, uncertainty ranges, cloud hosting.

---

## Part B: 2-minute explanation

> "My project is a Gaming and Esports Performance Predictor. Rating systems like Elo or MMR mostly look at whether
> you won, not at how you played. My platform takes a player's match statistics for CS:GO, PUBG, VALORANT or
> Dota 2 and uses machine learning to estimate their performance. It also explains which stats mattered.
>
> Each game has its own public dataset, cleaning steps, features and model, because their statistics are
> completely different. When I inspected the data I found that none of the datasets contain real MMR. So I
> predict what genuinely exists: the HLTV performance rating for CS:GO, the placement percentile for PUBG, the
> VLR rating for VALORANT and the win probability for Dota 2. I also ran two experiments that show MMR-like
> targets cannot be predicted from these data.
>
> For every game I compared five algorithms on players or matches the model had never seen. The best models
> reach an R² of 0.978, 0.833 and 0.954, and a ROC-AUC of 0.980. SHAP shows how each stat moved the prediction.
> Everything runs as a FastAPI backend with a React frontend, and it is covered by about 90 automated tests."

## Part C: 5-minute presentation script

1. **(0:00) Hook.** "If you top-frag and still lose, your rank drops. Rankings mostly ignore *how* you played."
2. **(0:30) Goal.** An explained, data-driven estimate of an individual's performance, for several games.
3. **(1:00) Data and the honesty point.** Show the four datasets. "My first plan was MMR prediction. Inspecting
   the data showed there is no MMR label." Show the two experiments (TrueSkill R² ≈ 0; VALORANT ranks +0.7 pp).
   "So each game predicts a target that really exists, and the target is named honestly."
4. **(2:00) Method.** Cleaning (logged), per-round and per-minute features, leakage exclusions (`killPlace`),
   group split, five algorithms, cross-validation, SHAP.
5. **(3:00) Results.** Show the analytics page. CS:GO and VALORANT are about 0.95–0.98 because those ratings are
   formulas, and the linear model even wins for VALORANT. PUBG is 0.83 and really needs tree models. Dota 2 AUC
   is 0.98.
6. **(4:00) System.** React → FastAPI → model → SHAP → SQLite. Validation, error handling, tests (54 + 19 + 16).
7. **(4:40) Close.** Limitations (not MMR; after-match stats), future work (official APIs, CS2, history).

## Part D: 10-minute demonstration sequence

| Time | Action | What to say |
|---|---|---|
| 0:00 | Open the **landing page** | Model board numbers come live from the API; nothing is hardcoded |
| 1:00 | **Predict → Games** | Each card shows the real target and test score; unavailable games would say why |
| 2:00 | **CS:GO form** → hover over ⓘ on KAST | Form generated from the trained schema; tooltips; typical ranges |
| 2:30 | Click Submit on the empty form | Client-side validation |
| 3:00 | Fill medians, set headshots 9 > kills 3, submit | Server-side cross-field validation |
| 3:30 | Fix it, set kills 30, deaths 12, ADR 110 → submit | Rating about 1.72; percentile bar; not-MMR note |
| 4:30 | Explain the **SHAP chart**, toggle **Table** | Base value + contributions = prediction |
| 5:30 | **Dota 2** with GPM 650 and tower damage 6000 | Classification → probability; log-odds explanation |
| 6:30 | **Analytics → PUBG** | Model comparison (linear 0.76 vs trees 0.83), SHAP: walk distance, residuals, cleaning log |
| 7:30 | **Analytics → Dota 2** | ROC, calibration, confusion matrix |
| 8:15 | **Methodology → Why not MMR?** | The two experiments |
| 9:00 | **History** | SQLite history, no personal data |
| 9:30 | Show `http://localhost:8000/docs` and run the tests (`scripts\run_tests.bat`) | API documentation and passing tests |

**Before the demo:** start both servers, open the pages once, and clear the history if you want a clean list.
Test the laptop **offline** too: fonts and all data are local, so no internet connection is needed.

---

## Part E: 30 likely viva questions

1. **What is your project in one sentence?** A multi-game web app that predicts a performance-related score from a player's match statistics using a separate trained model for each game, and explains each prediction with SHAP.
2. **Why didn't you predict MMR as in your original slides?** None of the datasets contain real MMR. I tested the two closest labels: Dota 2 TrueSkill gave R² ≈ 0, and VALORANT rank tier was only 0.7 percentage points above the baseline. Predicting a fake MMR would be dishonest, so I predict targets that exist.
3. **What is the difference between TrueSkill and MMR?** TrueSkill is Microsoft's Bayesian rating (μ = skill, σ = uncertainty), updated from wins and losses. In this dataset a researcher calculated it. MMR is Valve's own hidden, proprietary rating. They are different numbers.
4. **Why one model per game instead of one combined model?** The features are different and the targets mean different things. Combining them would mix incompatible data.
5. **What does the CS:GO model predict?** HLTV's per-map performance rating, where 1.00 is an average pro performance.
6. **Why is R² so high for CS:GO and VALORANT? Is something wrong?** Those ratings are formulas calculated from the same statistics, so the model mostly re-learns the formula. Even linear regression gets 0.95+. I state this openly as a limitation.
7. **Why is PUBG lower (0.83)?** Placement depends on many things that are not in one player's stats: teammates, the zone, luck. The relationship is also non-linear.
8. **What is data leakage? Give an example from your project.** Using information that reveals the answer or would not be available at prediction time. PUBG `killPlace` ranks your kills against the whole lobby after the match and correlates −0.72 with placement, so I removed it.
9. **Why did you split by player or match instead of randomly?** With a random split, the same player or match appears in both train and test. The model can then recognise them and the score looks too good. Grouping tests the model on unseen players or matches.
10. **What is cross-validation and why did you use GroupKFold?** Training and testing on several different splits to check the score is stable. GroupKFold keeps groups together. My CV standard deviations are tiny (≤ 0.0011).
11. **Explain R², MAE and RMSE.** R² = fraction of variation explained. MAE = average absolute error. RMSE = square root of the average squared error, which punishes big errors. CS:GO: R² 0.978, MAE 0.039, RMSE 0.050.
12. **Why did you select models by RMSE and not R²?** For a fixed test set they rank models the same way. RMSE is in the target's own units and punishes large errors, which matter to users.
13. **What is ROC-AUC?** The probability that a random winner gets a higher predicted score than a random loser. 0.5 is random and 1.0 is perfect. Mine is 0.980.
14. **What is a confusion matrix?** A table of actual vs. predicted classes: true and false wins and losses. It is on the Dota 2 analytics page.
15. **How do you know your models don't overfit?** Train and test scores are almost equal (difference < 0.005 for the selected models), and the CV scores agree with the test scores.
16. **How does Random Forest work?** It builds many decision trees on random samples of rows and features and averages them. Averaging reduces variance.
17. **How does XGBoost differ from Random Forest?** Random Forest builds trees independently and averages them (bagging). XGBoost builds trees sequentially, each correcting the previous errors (boosting), with regularisation.
18. **Why did Linear Regression win for VALORANT?** The VLR rating is almost linear in per-round stats, so a simple model is enough, and it generalises slightly better. The data decided, not my assumption.
19. **What is SHAP?** A method based on Shapley values that splits a prediction exactly into per-feature contributions: base value + contributions = prediction.
20. **Why does "deaths per round" sometimes show a small positive contribution?** Features are correlated. When K/D ratio has already captured your deaths, SHAP can give a related feature a small corrective share. Contributions show associations the model learned, not causes.
21. **What feature engineering did you do?** Per-round and per-minute rates, K/D, KDA, headshot %, one-hot encoding of mode and role. I also removed duplicate raw counts.
22. **How did you handle missing values and outliers?** Rows missing the target or an input are dropped (there is plenty of data). Impossible values are filtered with domain rules, for example deaths > rounds or kills without movement (likely cheating). The removals are logged.
23. **Why did you sample PUBG?** 4.4 million rows is heavy for a laptop. I sampled 15,000 *whole matches* (1.4M rows) so the lobbies stay intact.
24. **How does the frontend talk to the backend?** Axios sends JSON over HTTP to FastAPI endpoints such as `POST /api/predict/{game}`; FastAPI returns JSON.
25. **How is input validated?** Three layers: the browser (required, number, range); Pydantic on the server (types, ranges, categories, no unknown fields); game rules (headshots ≤ kills, no revives in solo, …). Invalid input gets HTTP 422 with a message for each field.
26. **What happens if a model file is missing?** The registry marks that game "unavailable" with the reason. The UI shows it, and prediction returns HTTP 503 instead of crashing. This is tested.
27. **Why FastAPI and not Flask or Streamlit?** Built-in validation, automatic documentation and good performance. Separating the backend from React gives a real product structure, not a demo script.
28. **What does the database store?** Only the game, the inputs, the prediction, the result and a timestamp. There are no personal details, and SQLAlchemy lets it switch to MySQL by changing the URL.
29. **How did you test the project?** 54 pytest tests (data loading, features, training, saving/loading, SHAP additivity, every API error case), 19 UI tests, and a 16-check browser end-to-end script against the real backend. All of them pass.
30. **What would you improve next?** Official API integration, CS2 data, player history and trends, hyper-parameter tuning with uncertainty ranges, and anti-smurfing research if real rank labels become available.
