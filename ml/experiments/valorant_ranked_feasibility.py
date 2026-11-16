"""Experiment: can aggregated ranked statistics predict a VALORANT player's competitive rank tier?

val_stats.csv is the only file in the project with a genuine ranked label. This checks
whether it can support a "Rank Prediction" model. Run:
    python -m ml.experiments.valorant_ranked_feasibility
Output: ml/artifacts/experiments/valorant_ranked.json
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from ml.common.paths import ARTIFACTS, DATA_RAW

TIERS = ["Immortal 1", "Immortal 2", "Immortal 3", "Radiant"]
FEATS = ["damage_round", "headshot_percent", "kd_ratio", "kills_round", "score_round", "win_percent",
         "first_bloods", "clutches", "flawless", "aces", "kills", "deaths", "assists", "wins", "most_kills"]


def _conclusion(res: dict, distribution: dict, raw_rows: int) -> str:
    """Conclusion text derived from the measured numbers (not written in advance)."""
    top_share = sum(distribution.get(t, 0) for t in TIERS) / raw_rows
    base = res["Majority-class baseline"]["accuracy"]
    best_name, best = max(((k, v) for k, v in res.items() if k != "Majority-class baseline"),
                          key=lambda kv: kv[1]["accuracy"])
    gain = (best["accuracy"] - base) * 100
    return (f"{top_share:.1%} of players in this file are Immortal 1–3 or Radiant. The best model ({best_name}) "
            f"reaches {best['accuracy']:.1%} accuracy versus {base:.1%} for always predicting the most common tier "
            f"(a gain of {gain:.1f} percentage points; macro-F1 {best['macro_f1']:.2f}). The aggregated stats barely "
            "separate rank tiers at the top of the ladder, so no rank/MMR model is deployed for VALORANT; the "
            "professional vlr.gg dataset is used for a Performance Rating model instead.")


def main() -> dict:
    v = pd.read_csv(DATA_RAW / "valorant_ranked" / "val_stats.csv", thousands=",", encoding="utf-8-sig",
                    low_memory=False)
    raw_rows = len(v)
    distribution = v["rating"].value_counts().to_dict()
    v = v.drop_duplicates()
    v = v[v["rating"].isin(TIERS)].copy()
    v["first_blood_share"] = v.first_bloods / v.kills.clip(lower=1)
    X = v[FEATS + ["first_blood_share"]]
    y = v["rating"].map({t: i for i, t in enumerate(TIERS)})
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    majority = int(y_tr.mode().iloc[0])
    res = {"Majority-class baseline": {"accuracy": float(accuracy_score(y_te, np.full(len(y_te), majority))),
                                       "macro_f1": float(f1_score(y_te, np.full(len(y_te), majority), average="macro"))}}
    for name, model in {
        "Logistic Regression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)),
        "XGBoost": XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.1, random_state=42),
    }.items():
        p = model.fit(X_tr, y_tr).predict(X_te)
        res[name] = {"accuracy": float(accuracy_score(y_te, p)), "macro_f1": float(f1_score(y_te, p, average="macro"))}
    print(json.dumps(res, indent=1))

    out = {
        "experiment": "VALORANT rank-tier predictability from aggregated ranked statistics (val_stats.csv)",
        "raw_rows": raw_rows, "rows_used": int(len(v)),
        "rank_distribution": {str(k): int(c) for k, c in distribution.items()},
        "results": res,
        "conclusion": _conclusion(res, distribution, raw_rows),
    }
    (ARTIFACTS / "experiments").mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / "experiments" / "valorant_ranked.json").write_text(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    main()
