"""Experiment: can gameplay statistics predict a Dota 2 player's TrueSkill rating (mu)?

If yes, Dota 2 could offer a genuine "Skill Estimate". The result decides the project's
Dota 2 task. Run:  python -m ml.experiments.dota2_trueskill_feasibility
Output: ml/artifacts/experiments/dota2_trueskill.json
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from ml.common.paths import ARTIFACTS, DATA_RAW

RAW = DATA_RAW / "dota2"
FEATS = ["kills", "deaths", "assists", "gold_per_min", "xp_per_min", "last_hits", "denies",
         "hero_damage", "hero_healing", "tower_damage", "level"]


def main() -> dict:
    ratings = pd.read_csv(RAW / "player_ratings.csv")
    players = pd.read_csv(RAW / "players.csv", usecols=["match_id", "account_id", "player_slot", *FEATS])
    match = pd.read_csv(RAW / "match.csv", usecols=["match_id", "radiant_win"])
    players = players.merge(match, on="match_id")
    players["won"] = np.where(players.player_slot < 128, players.radiant_win, ~players.radiant_win).astype(int)
    players = players[players.account_id > 0].merge(ratings, on="account_id")
    players["kda"] = (players.kills + players.assists) / (players.deaths + 1)

    results = []
    for min_games in (1, 3, 5):
        agg = players.groupby("account_id").agg(
            **{f: (f, "mean") for f in FEATS + ["kda"]}, sample_games=("match_id", "size"),
            sample_win_rate=("won", "mean"), mu=("trueskill_mu", "first"), total_matches=("total_matches", "first"))
        # require a reasonably settled rating (>= 10 rated matches) and >= min_games stat lines
        agg = agg[(agg.sample_games >= min_games) & (agg.total_matches >= 10)]
        X, y = agg[FEATS + ["kda", "sample_games"]], agg["mu"]
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)  # one row per player
        row = {"min_sample_games": min_games, "players": int(len(agg)), "mu_std": float(y.std()),
               "baseline_mae_predict_mean": float(mean_absolute_error(y_te, np.full(len(y_te), y_tr.mean()))),
               "corr_sample_win_rate_vs_mu": float(agg.sample_win_rate.corr(agg.mu)), "models": {}}
        for name, model in {"Linear Regression": LinearRegression(),
                            "XGBoost": XGBRegressor(n_estimators=300, max_depth=5, learning_rate=0.05,
                                                    random_state=42)}.items():
            p = model.fit(X_tr, y_tr).predict(X_te)
            row["models"][name] = {"r2": float(r2_score(y_te, p)), "mae": float(mean_absolute_error(y_te, p))}
        results.append(row)
        print(json.dumps(row, indent=1))

    out = {
        "experiment": "Dota 2 TrueSkill (mu) predictability from per-match gameplay statistics",
        "conclusion": ("Gameplay statistics explain essentially none of the variance of TrueSkill mu (R² ≈ 0; "
                       "MAE equal to predicting the mean). Even the player's win rate within this sample barely "
                       "correlates with mu, because the ratings were computed from a much larger match history "
                       "(match_outcomes.csv) for which per-player statistics are not available. A skill-estimate "
                       "model would therefore be meaningless, so the Dota 2 module predicts Win Probability instead."),
        "results": results,
    }
    (ARTIFACTS / "experiments").mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / "experiments" / "dota2_trueskill.json").write_text(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    main()
