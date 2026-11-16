# User Guide

## Starting the application

1. Start the backend: `scripts\run_backend.bat`. Wait for `Application startup complete`.
2. Start the frontend: `scripts\run_frontend.bat`.
3. Open **http://localhost:5173**. The status dot in the top bar should read **API online · 4/4 models**.

## Making a prediction

1. Click **Start predicting** (or **Predict** in the menu).
2. Choose a game. Only games marked **Model ready** can be selected. If a model is not trained, the card says
   why and shows the command that fixes it.
3. Fill in the form with the stats from your match scoreboard.
   - Hover over or focus the **ⓘ** icon next to a field to see what it means.
   - Each field shows the **typical range** found in the training data. A value outside it turns the hint
     amber: the prediction is still made, but it is an extrapolation.
   - **Fill with dataset medians** loads typical values, which is useful for a quick demo. Then change a
     few fields.
4. Click **Submit prediction**. Errors are shown next to the affected fields:
   - empty fields, wrong types and out-of-range values are caught in the browser;
   - contradictions such as "headshots > kills" or "revives in solo mode" are caught by the server.

## Reading the result

| Element | Meaning |
|---|---|
| Big number | The prediction: a rating (CS:GO, VALORANT), a placement percentile from 0 to 1 (PUBG) or a win probability (Dota 2) |
| Badge | A band relative to the dataset (Weak … Exceptional), or Likely loss / Toss-up / Likely win |
| Percentile bar | Where the prediction falls among all records in the training data |
| Amber note | What the number is **not** (it is never official MMR) |
| "What drove this prediction" | SHAP contributions: cyan bars push the result up, red bars push it down. Switch to **Table** to see the exact values |
| Input summary | Exactly what you submitted |

## Other pages

- **Analytics:** for each game, the dataset size, cleaning log, comparison of the five algorithms, SHAP feature
  importance, actual vs. predicted, residuals and error by range. For Dota 2 there are ROC, calibration and
  confusion-matrix charts instead. Every chart has a **Table** view.
- **History:** every prediction you have made, newest first, with a filter by game. Click a row to reopen it.
  **Clear history** deletes them all.
- **Methodology:** how the project works, including the two experiments that explain why no MMR model exists.

## Example values for a demo

These figures were measured with the trained models (16 Nov 2026). They will change if you retrain.

| Game | Try | What happens |
|---|---|---|
| CS:GO | Medians (rating 1.01), then kills 30 / deaths 12 / ADR 110 | Rating 1.72. The largest boosts are K/D ratio (+0.40), kills per round and ADR |
| PUBG | Medians (0.40), then walk distance 3500 m | Placement percentile 0.83. Walk distance alone adds +0.29 |
| VALORANT | Medians (0.955), then switch role to Controller or Duelist | 0.951 or 0.958: role matters very little once the stats are known |
| Dota 2 | Medians (68%), then GPM 650 and tower damage 6000 | Win probability 99.8%. GPM and tower damage per minute dominate |
