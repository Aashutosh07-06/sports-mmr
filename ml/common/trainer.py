"""Generic training / evaluation / export routine used by every game.

Given a cleaned DataFrame and a GameSpec this module:
  1. builds model features from the raw user-facing inputs (same function the API uses),
  2. performs a GROUP-based train/test split (no player/match appears in both sets),
  3. trains several candidate algorithms and evaluates them on the held-out test set,
  4. selects the best model, cross-validates it with GroupKFold,
  5. computes SHAP global importance and analytics data for the dashboard,
  6. saves model.joblib, schema.json, metrics.json, analytics.json and PNG plots.

Nothing in the frontend is hardcoded: every number it shows comes from these files.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor

from .explain import global_importance
from .paths import artifact_dir
from .spec import GameSpec

SEED = 42


# --------------------------------------------------------------------------- models
def candidate_models(task: str) -> dict:
    """Algorithms compared for each task. Hyper-parameters are fixed, sensible defaults
    (documented in docs/methodology.md) rather than tuned on the test set."""
    if task == "regression":
        return {
            "Linear Regression": Pipeline([("scaler", StandardScaler()), ("model", LinearRegression())]),
            "Decision Tree": DecisionTreeRegressor(max_depth=12, min_samples_leaf=20, random_state=SEED),
            "Random Forest": RandomForestRegressor(
                n_estimators=100, max_depth=16, min_samples_leaf=5, max_samples=0.5,
                n_jobs=-1, random_state=SEED),
            "Gradient Boosting": HistGradientBoostingRegressor(max_iter=300, learning_rate=0.08, random_state=SEED),
            "XGBoost": XGBRegressor(
                n_estimators=600, learning_rate=0.05, max_depth=7, subsample=0.8,
                colsample_bytree=0.8, n_jobs=-1, random_state=SEED, tree_method="hist"),
        }
    return {
        "Logistic Regression": Pipeline([("scaler", StandardScaler()), ("model", LogisticRegression(max_iter=2000))]),
        "Decision Tree": DecisionTreeClassifier(max_depth=12, min_samples_leaf=20, random_state=SEED),
        "Random Forest": RandomForestClassifier(
            n_estimators=100, max_depth=16, min_samples_leaf=5, max_samples=0.5,
            n_jobs=-1, random_state=SEED),
        "Gradient Boosting": HistGradientBoostingClassifier(max_iter=300, learning_rate=0.08, random_state=SEED),
        "XGBoost": XGBClassifier(
            n_estimators=500, learning_rate=0.05, max_depth=6, subsample=0.8,
            colsample_bytree=0.8, n_jobs=-1, random_state=SEED, tree_method="hist",
            eval_metric="logloss"),
    }


# --------------------------------------------------------------------------- metrics
def regression_metrics(y, p) -> dict:
    mse = mean_squared_error(y, p)
    return {"r2": float(r2_score(y, p)), "mae": float(mean_absolute_error(y, p)),
            "mse": float(mse), "rmse": float(np.sqrt(mse))}


def classification_metrics(y, proba, threshold=0.5) -> dict:
    pred = (proba >= threshold).astype(int)
    return {"accuracy": float(accuracy_score(y, pred)), "precision": float(precision_score(y, pred)),
            "recall": float(recall_score(y, pred)), "f1": float(f1_score(y, pred)),
            "roc_auc": float(roc_auc_score(y, proba))}


def _predict(model, X, task):
    return model.predict_proba(X)[:, 1] if task == "classification" else model.predict(X)


def _hist(values, bins):
    counts, edges = np.histogram(values, bins=bins)
    return [{"start": float(edges[i]), "end": float(edges[i + 1]), "count": int(counts[i])}
            for i in range(len(counts))]


# --------------------------------------------------------------------------- main entry
def train_game(spec: GameSpec, df: pd.DataFrame, cleaning_log: list[dict], raw_rows: int) -> dict:
    out = artifact_dir(spec.key)
    t_start = time.time()
    print(f"\n=== Training {spec.name} ({spec.task}) on {len(df):,} cleaned rows ===")

    X_all = spec.build_features(df[spec.input_names])
    y_all = df[spec.target_column].astype(float if spec.task == "regression" else int).to_numpy()
    groups = df[spec.group_column].to_numpy()

    # ---- group-based split: prevents the same player/match leaking into test
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    tr_idx, te_idx = next(gss.split(X_all, y_all, groups))
    rng = np.random.default_rng(SEED)
    if len(tr_idx) > spec.max_train_rows:
        tr_idx = rng.choice(tr_idx, spec.max_train_rows, replace=False)
    if len(te_idx) > spec.max_test_rows:
        te_idx = rng.choice(te_idx, spec.max_test_rows, replace=False)
    X_tr, X_te = X_all.iloc[tr_idx], X_all.iloc[te_idx]
    y_tr, y_te = y_all[tr_idx], y_all[te_idx]
    g_tr = groups[tr_idx]
    assert not set(g_tr) & set(groups[te_idx]), "group leakage between train and test"
    print(f"train={len(X_tr):,} test={len(X_te):,} features={X_all.shape[1]}")

    # ---- train & compare
    results, fitted = [], {}
    for name, model in candidate_models(spec.task).items():
        t0 = time.time()
        model.fit(X_tr, y_tr)
        fit_s = time.time() - t0
        p_te = _predict(model, X_te, spec.task)
        p_tr = _predict(model, X_tr.iloc[:50_000], spec.task)
        if spec.task == "regression":
            m_te, m_tr = regression_metrics(y_te, p_te), regression_metrics(y_tr[:50_000], p_tr)
        else:
            m_te, m_tr = classification_metrics(y_te, p_te), classification_metrics(y_tr[:50_000], p_tr)
        results.append({"model": name, "test": m_te, "train": m_tr, "fit_seconds": round(fit_s, 2)})
        fitted[name] = model
        print(f"  {name:20s} {json.dumps({k: round(v, 4) for k, v in m_te.items()})}  ({fit_s:.1f}s)")

    key = "rmse" if spec.task == "regression" else "roc_auc"
    best = (min if spec.task == "regression" else max)(results, key=lambda r: r["test"][key])
    best_name = best["model"]
    best_model = fitted[best_name]
    for r in results:
        r["selected"] = r["model"] == best_name
    print(f"  -> best: {best_name}")

    # ---- cross-validation of the selected algorithm (GroupKFold on the training portion)
    cv_n = min(len(X_tr), 150_000)
    cv_rows = rng.choice(len(X_tr), cv_n, replace=False)
    cv_scores = []
    for f_tr, f_va in GroupKFold(n_splits=3).split(X_tr.iloc[cv_rows], y_tr[cv_rows], g_tr[cv_rows]):
        m = clone(candidate_models(spec.task)[best_name])
        Xc, yc = X_tr.iloc[cv_rows], y_tr[cv_rows]
        m.fit(Xc.iloc[f_tr], yc[f_tr])
        pv = _predict(m, Xc.iloc[f_va], spec.task)
        cv_scores.append(r2_score(yc[f_va], pv) if spec.task == "regression" else roc_auc_score(yc[f_va], pv))
    cv = {"metric": "r2" if spec.task == "regression" else "roc_auc", "folds": 3,
          "scores": [float(s) for s in cv_scores], "mean": float(np.mean(cv_scores)), "std": float(np.std(cv_scores))}
    print(f"  CV {cv['metric']}: {cv['mean']:.4f} ± {cv['std']:.4f}")

    # ---- explainability (SHAP) on a test sample
    shap_rows = X_te.sample(min(1500, len(X_te)), random_state=SEED)
    importance = global_importance(best_model, shap_rows)

    # ---- analytics payload for the dashboard
    p_best = _predict(best_model, X_te, spec.task)
    analytics = _analytics(spec, y_te, p_best, X_te, results, importance, rng)

    # ---- schema consumed by the API (validation) and the frontend (form generation)
    raw_inputs = df[spec.input_names]
    schema_inputs = []
    for f in spec.inputs:
        d = f.to_dict()
        if f.dtype == "category":
            d["default"] = str(raw_inputs[f.name].mode().iloc[0])
        else:
            col = raw_inputs[f.name].astype(float)
            q = col.quantile([0.01, 0.5, 0.99])
            med = float(q.loc[0.5])
            d["typical_min"], d["typical_max"] = float(q.loc[0.01]), float(q.loc[0.99])
            d["default"] = int(round(med)) if f.dtype == "int" else round(med, 2)
        schema_inputs.append(d)

    target_quantiles = (np.quantile(y_all, np.linspace(0, 1, 101)).tolist()
                        if spec.task == "regression" else None)
    schema = {
        "game": spec.key, "name": spec.name, "task": spec.task,
        "target_column": spec.target_column, "target_name": spec.target_name,
        "target_short": spec.target_short, "target_description": spec.target_description,
        "not_mmr_note": spec.not_mmr_note, "target_range": spec.target_range,
        "target_quantiles": target_quantiles,
        "positive_rate": float(np.mean(y_all)) if spec.task == "classification" else None,
        "inputs": schema_inputs, "model_features": list(X_all.columns),
        "feature_labels": {**{f.name: f.label for f in spec.inputs}, **spec.extra.get("feature_labels", {})},
        "model_name": best_name, "extra": spec.extra,
    }

    metrics = {
        "game": spec.key, "name": spec.name, "task": spec.task, "target_name": spec.target_name,
        "selected_model": best_name, "selection_metric": key,
        "models": results, "cross_validation": cv,
        "dataset": {
            "name": spec.dataset_name, "url": spec.dataset_url, "unit_of_analysis": spec.unit_of_analysis,
            "raw_rows": int(raw_rows), "clean_rows": int(len(df)),
            "train_rows": int(len(X_tr)), "test_rows": int(len(X_te)),
            "n_groups": int(pd.Series(groups).nunique()), "group_column": spec.group_column,
            "n_input_fields": len(spec.inputs), "n_model_features": int(X_all.shape[1]),
            "cleaning_log": cleaning_log,
            "target_summary": {k: float(v) for k, v in pd.Series(y_all).describe().items()},
        },
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "training_seconds": round(time.time() - t_start, 1),
    }

    joblib.dump(best_model, out / "model.joblib", compress=3)
    (out / "schema.json").write_text(json.dumps(schema, indent=2))
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (out / "analytics.json").write_text(json.dumps(analytics))
    test_sample = X_te.iloc[:20_000].copy()
    test_sample["__target__"] = y_te[:20_000]
    test_sample.to_parquet(out / "test_sample.parquet")
    _plots(spec, out, y_te, p_best, results, importance)
    print(f"  saved artifacts to {out}  ({metrics['training_seconds']}s)")
    return metrics


def _analytics(spec, y_te, p, X_te, results, importance, rng) -> dict:
    idx = rng.choice(len(y_te), min(1200, len(y_te)), replace=False)
    a = {"game": spec.key, "task": spec.task, "model_comparison": results,
         "feature_importance": importance}
    if spec.task == "regression":
        resid = y_te - p
        lo, hi = float(min(y_te.min(), p.min())), float(max(y_te.max(), p.max()))
        bins = np.linspace(lo, hi, 31)
        a["actual_vs_predicted"] = [{"actual": float(y_te[i]), "predicted": float(p[i])} for i in idx]
        a["residual_histogram"] = _hist(resid, 30)
        a["prediction_distribution"] = [
            {"start": b["start"], "end": b["end"], "actual": b["count"], "predicted": c["count"]}
            for b, c in zip(_hist(y_te, bins), _hist(p, bins))]
        # error broken down by target decile -> where is the model weakest?
        dec = pd.qcut(y_te, 10, duplicates="drop")
        err = pd.DataFrame({"bin": dec, "abs": np.abs(resid)}).groupby("bin", observed=True)["abs"].mean()
        a["error_by_target_decile"] = [{"range": f"{iv.left:.2f}–{iv.right:.2f}", "mae": float(v)}
                                       for iv, v in err.items()]
        a["residual_summary"] = {"mean": float(resid.mean()), "std": float(resid.std())}
    else:
        fpr, tpr, _ = roc_curve(y_te, p)
        keep = np.unique(np.linspace(0, len(fpr) - 1, 120).astype(int))
        a["roc_curve"] = [{"fpr": float(fpr[i]), "tpr": float(tpr[i])} for i in keep]
        cm = confusion_matrix(y_te, (p >= 0.5).astype(int))
        a["confusion_matrix"] = {"labels": ["Loss", "Win"], "matrix": cm.tolist()}
        bins = np.linspace(0, 1, 21)
        a["prediction_distribution"] = [
            {"start": b["start"], "end": b["end"], "actual": b["count"], "predicted": c["count"]}
            for b, c in zip(_hist(p[y_te == 0], bins), _hist(p[y_te == 1], bins))]
        a["prediction_distribution_labels"] = {"actual": "Actual losses", "predicted": "Actual wins"}
        cal = pd.DataFrame({"p": p, "y": y_te, "b": pd.cut(p, np.linspace(0, 1, 11), include_lowest=True)})
        g = cal.groupby("b", observed=True).agg(mean_pred=("p", "mean"), frac_pos=("y", "mean"), n=("y", "size"))
        a["calibration"] = [{"mean_predicted": float(r.mean_pred), "observed_rate": float(r.frac_pos), "n": int(r.n)}
                            for r in g.itertuples()]
    return a


def _plots(spec, out, y_te, p, results, importance):
    """Static PNGs for the written report (the web dashboard draws its own charts)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    pdir = out / "plots"
    pdir.mkdir(exist_ok=True)
    key = "r2" if spec.task == "regression" else "roc_auc"
    fig, ax = plt.subplots(figsize=(7, 3.6))
    names = [r["model"] for r in results]
    vals = [r["test"][key] for r in results]
    ax.barh(names, vals, color=["#8B5CF6" if r["selected"] else "#94A3B8" for r in results])
    ax.set_xlabel(f"Test {key.upper()}"); ax.set_title(f"{spec.name}: model comparison")
    for i, v in enumerate(vals):
        ax.text(v, i, f" {v:.3f}", va="center", fontsize=8)
    fig.tight_layout(); fig.savefig(pdir / "model_comparison.png", dpi=130); plt.close(fig)

    top = importance[:12][::-1]
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.barh([t["feature"] for t in top], [t["mean_abs_shap"] for t in top], color="#22D3EE")
    ax.set_xlabel("mean |SHAP value|"); ax.set_title(f"{spec.name}: feature importance (SHAP)")
    fig.tight_layout(); fig.savefig(pdir / "shap_importance.png", dpi=130); plt.close(fig)

    if spec.task == "regression":
        s = np.random.default_rng(SEED).choice(len(y_te), min(3000, len(y_te)), replace=False)
        fig, ax = plt.subplots(figsize=(5, 5))
        ax.scatter(y_te[s], p[s], s=4, alpha=0.35, color="#8B5CF6")
        lo, hi = float(np.min(y_te)), float(np.max(y_te))
        ax.plot([lo, hi], [lo, hi], color="#0F172A", lw=1)
        ax.set_xlabel("Actual"); ax.set_ylabel("Predicted"); ax.set_title(f"{spec.name}: actual vs predicted")
        fig.tight_layout(); fig.savefig(pdir / "actual_vs_predicted.png", dpi=130); plt.close(fig)
        fig, ax = plt.subplots(figsize=(6, 3.5))
        ax.hist(y_te - p, bins=60, color="#22D3EE")
        ax.set_xlabel("Residual (actual − predicted)"); ax.set_title(f"{spec.name}: residuals")
        fig.tight_layout(); fig.savefig(pdir / "residuals.png", dpi=130); plt.close(fig)
    else:
        fpr, tpr, _ = roc_curve(y_te, p)
        fig, ax = plt.subplots(figsize=(5, 5))
        ax.plot(fpr, tpr, color="#8B5CF6"); ax.plot([0, 1], [0, 1], ls="--", color="#94A3B8")
        ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate"); ax.set_title(f"{spec.name}: ROC")
        fig.tight_layout(); fig.savefig(pdir / "roc_curve.png", dpi=130); plt.close(fig)
