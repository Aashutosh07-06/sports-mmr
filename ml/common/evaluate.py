"""Re-evaluate a SAVED model on its saved held-out test sample.

This proves the persisted artifact (model.joblib) reproduces the reported metrics after
reloading — i.e. what the API serves is exactly what was evaluated.
"""
from __future__ import annotations

import json

import joblib
import pandas as pd

from .paths import artifact_dir
from .trainer import classification_metrics, regression_metrics


def evaluate_saved(game: str) -> dict:
    out = artifact_dir(game)
    schema = json.loads((out / "schema.json").read_text())
    model = joblib.load(out / "model.joblib")
    test = pd.read_parquet(out / "test_sample.parquet")
    y = test.pop("__target__").to_numpy()
    X = test[schema["model_features"]]
    if schema["task"] == "regression":
        m = regression_metrics(y, model.predict(X))
    else:
        m = classification_metrics(y, model.predict_proba(X)[:, 1])
    print(f"{schema['name']} — {schema['model_name']} on {len(y):,} saved test rows:")
    for k, v in m.items():
        print(f"  {k:10s} {v:.4f}")
    return m
