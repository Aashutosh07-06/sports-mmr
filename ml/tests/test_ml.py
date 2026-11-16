"""ML pipeline tests. Run from the project root:  python -m pytest ml/tests -q

Tests that need the raw Kaggle files are skipped automatically if data/raw is missing.
"""
import importlib
import json

import numpy as np
import pandas as pd
import pytest

from ml.common.paths import ARTIFACTS, DATA_RAW

GAMES = ["csgo", "pubg", "valorant", "dota2"]
spec_of = lambda g: importlib.import_module(f"ml.{g}.feature_engineering").SPEC  # noqa: E731
needs_data = pytest.mark.skipif(not DATA_RAW.exists(), reason="raw datasets not present")


def _defaults(game):
    schema = json.loads((ARTIFACTS / game / "schema.json").read_text())
    return {f["name"]: f["default"] for f in schema["inputs"]}


# ---------------------------------------------------------------- dataset loading / preprocessing
@needs_data
@pytest.mark.parametrize("game,nrows", [("csgo", 3000), ("pubg", 20000), ("valorant", 5000), ("dota2", 20000)])
def test_preprocessing_on_real_sample(game, nrows, monkeypatch):
    """Load the first rows of the real files and run the full cleaning pipeline."""
    pre = importlib.import_module(f"ml.{game}.preprocessing")
    real_read = pd.read_csv
    monkeypatch.setattr(pre.pd, "read_csv", lambda *a, **k: real_read(*a, **{**k, "nrows": nrows}))
    if game == "pubg":
        monkeypatch.setattr(pre, "N_MATCHES", 10_000)
    df, log, raw_rows = pre.load_and_clean()
    spec = spec_of(game)
    assert len(df) > 0 and raw_rows >= len(df) // 3
    assert set(spec.input_names) <= set(df.columns)
    assert spec.target_column in df.columns and spec.group_column in df.columns
    assert df[spec.input_names + [spec.target_column]].notna().all().all()
    assert log and all(s["rows_after"] <= s["rows_before"] for s in log)


@needs_data
def test_csgo_cleaning_rules_hold():
    from ml.csgo.preprocessing import unpivot_maps
    p = pd.read_csv(DATA_RAW / "csgo" / "players.csv", nrows=500, low_memory=False)
    long = unpivot_maps(p)
    assert len(long) == 3 * len(p)       # one block per map slot before dropping unplayed maps


# ---------------------------------------------------------------- feature engineering
def test_csgo_features():
    X = spec_of("csgo").build_features(pd.DataFrame([{"rounds": 20, "kills": 20, "deaths": 10, "assists": 4,
                                                       "headshots": 10, "kast": 75, "adr": 90, "fk_diff": 2}]))
    assert X.loc[0, "kpr"] == 1.0 and X.loc[0, "kd_ratio"] == 2.0 and X.loc[0, "hs_pct"] == 50.0


def test_zero_deaths_and_zero_kills_safe():
    X = spec_of("csgo").build_features(pd.DataFrame([{"rounds": 16, "kills": 0, "deaths": 0, "assists": 0,
                                                       "headshots": 0, "kast": 0, "adr": 0, "fk_diff": 0}]))
    assert np.isfinite(X.to_numpy()).all()


def test_pubg_mode_encoding():
    base = _defaults("pubg")
    X = spec_of("pubg").build_features(pd.DataFrame([{**base, "match_type": "squad"}, {**base, "match_type": "solo"}]))
    assert list(X["mode_squad"]) == [1.0, 0.0] and list(X["mode_duo"]) == [0.0, 0.0]


def test_valorant_role_one_hot():
    X = spec_of("valorant").build_features(pd.DataFrame([{**_defaults("valorant"), "role": "Sentinel"}]))
    assert X.loc[0, "role_sentinel"] == 1.0 and X.filter(like="role_").sum(axis=1).iloc[0] == 1.0


@pytest.mark.parametrize("game", GAMES)
def test_feature_order_matches_trained_schema(game):
    schema = json.loads((ARTIFACTS / game / "schema.json").read_text())
    X = spec_of(game).build_features(pd.DataFrame([_defaults(game)]))
    assert list(X.columns) == schema["model_features"]


# ---------------------------------------------------------------- input validation rules
def test_cross_field_rules():
    assert spec_of("csgo").validate({**_defaults("csgo"), "kills": 3, "headshots": 5})
    assert spec_of("pubg").validate({**_defaults("pubg"), "match_type": "solo", "revives": 2})
    assert spec_of("valorant").validate({**_defaults("valorant"), "first_kills": 99})
    for g in GAMES:
        assert spec_of(g).validate(_defaults(g)) == []


# ---------------------------------------------------------------- training on synthetic data
def test_train_game_end_to_end(tmp_path, monkeypatch):
    """Train the full pipeline on a small synthetic dataset with a known signal."""
    from ml.common import trainer
    monkeypatch.setattr(trainer, "artifact_dir", lambda g: tmp_path)
    spec = spec_of("csgo")
    rng = np.random.default_rng(0)
    n = 3000
    df = pd.DataFrame({"rounds": rng.integers(16, 40, n), "deaths": rng.integers(5, 25, n),
                       "assists": rng.integers(0, 10, n), "kast": rng.uniform(40, 90, n),
                       "adr": rng.uniform(40, 120, n), "fk_diff": rng.integers(-4, 5, n),
                       "player_id": rng.integers(0, 300, n)})
    df["kills"] = rng.integers(3, 35, n)
    df["headshots"] = (df["kills"] * 0.4).astype(int)
    df["rating"] = 0.4 + 0.7 * df["kills"] / df["rounds"] - 0.4 * df["deaths"] / df["rounds"] + 0.004 * df["adr"]
    metrics = trainer.train_game(spec, df, [{"step": "synthetic", "rows_before": n, "rows_after": n, "removed": 0}], n)
    assert {m["model"] for m in metrics["models"]} >= {"Linear Regression", "Random Forest", "XGBoost"}
    assert max(m["test"]["r2"] for m in metrics["models"]) > 0.9
    for f in ["model.joblib", "schema.json", "metrics.json", "analytics.json", "test_sample.parquet"]:
        assert (tmp_path / f).exists()


# ---------------------------------------------------------------- saved models
@pytest.mark.parametrize("game", GAMES)
def test_saved_model_reproduces_reported_metrics(game):
    from ml.common.evaluate import evaluate_saved
    metrics = json.loads((ARTIFACTS / game / "metrics.json").read_text())
    best = next(m for m in metrics["models"] if m["selected"])["test"]
    m = evaluate_saved(game)
    key = "r2" if metrics["task"] == "regression" else "roc_auc"
    assert abs(m[key] - best[key]) < 0.01   # 20k-row subsample of the same test set


@pytest.mark.parametrize("game", GAMES)
def test_selected_model_beats_baseline(game):
    metrics = json.loads((ARTIFACTS / game / "metrics.json").read_text())
    best = next(m for m in metrics["models"] if m["selected"])["test"]
    if metrics["task"] == "regression":
        assert best["r2"] > 0.5
    else:
        assert best["roc_auc"] > 0.7


@pytest.mark.parametrize("game", GAMES)
def test_explainer_additivity(game):
    import joblib
    from ml.common.explain import ModelExplainer
    schema = json.loads((ARTIFACTS / game / "schema.json").read_text())
    model = joblib.load(ARTIFACTS / game / "model.joblib")
    X = spec_of(game).build_features(pd.DataFrame([_defaults(game)]))[schema["model_features"]]
    base, contrib = ModelExplainer(model).explain(X)
    if schema["task"] == "regression":
        out = float(model.predict(X)[0])
    else:
        p = float(model.predict_proba(X)[0, 1])
        out = np.log(p / (1 - p))
    assert abs(base + contrib.sum() - out) < 1e-3
