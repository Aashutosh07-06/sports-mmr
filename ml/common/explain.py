"""Model explainability shared by training (global importance) and the API (per-prediction).

Two cases:
  * Tree models (Decision Tree, Random Forest, XGBoost, HistGradientBoosting):
    exact SHAP values via `shap.TreeExplainer`.
  * Linear pipelines (StandardScaler -> Linear/Logistic Regression):
    contribution_i = coef_i * standardized(x_i). Because the scaler centres every
    feature on its training mean, this equals the exact (interventional) SHAP value
    for a linear model, with the intercept as the base value.

For classifiers, contributions are in log-odds units (positive = pushes toward class 1).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline


class ModelExplainer:
    def __init__(self, model):
        self.model = model
        self.kind = "linear" if isinstance(model, Pipeline) else "tree"
        if self.kind == "tree":
            import shap  # imported lazily: slow import

            self._explainer = shap.TreeExplainer(model)

    def explain(self, X: pd.DataFrame) -> tuple[float, np.ndarray]:
        """Return (base_value, contributions[n_rows, n_features])."""
        if self.kind == "linear":
            scaler = self.model.steps[0][1]
            est = self.model.steps[-1][1]
            Z = scaler.transform(X)
            coef = np.ravel(est.coef_)
            base = float(np.ravel(est.intercept_)[0])
            return base, Z * coef

        values = self._explainer.shap_values(X)
        base = self._explainer.expected_value
        values = np.asarray(values)
        # Binary classifiers may return one array per class -> keep the positive class.
        if values.ndim == 3:
            values = values[:, :, 1] if values.shape[2] == 2 else values[1]
        base = np.ravel(np.asarray(base, dtype=float))
        base_value = float(base[-1]) if base.size > 1 else float(base[0])
        return base_value, values


def global_importance(model, X: pd.DataFrame) -> list[dict]:
    """Mean |SHAP| per feature over the rows of X, sorted descending."""
    _, contrib = ModelExplainer(model).explain(X)
    mean_abs = np.abs(contrib).mean(axis=0)
    mean_signed = contrib.mean(axis=0)
    order = np.argsort(-mean_abs)
    total = mean_abs.sum() or 1.0
    return [
        {
            "feature": X.columns[i],
            "mean_abs_shap": float(mean_abs[i]),
            "share": float(mean_abs[i] / total),
            "mean_shap": float(mean_signed[i]),
        }
        for i in order
    ]
