"""Prediction + explanation logic for one game.

Steps for every request:
  1. validate the input dict against a Pydantic model generated from the game's schema
     (required fields, types, hard min/max, allowed categories, no unknown fields),
  2. run game-specific cross-field checks (e.g. headshots <= kills),
  3. build model features with the SAME function used in training,
  4. predict, explain (SHAP), and turn the number into an honest interpretation.
"""
from __future__ import annotations

from bisect import bisect_left
from functools import lru_cache
from typing import Annotated, Any, Literal

import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict, Field, ValidationError, create_model

from app.services.registry import GameModel


class InputValidationError(Exception):
    def __init__(self, errors: list[dict]):
        super().__init__("Invalid input")
        self.errors = errors


# ------------------------------------------------------------------ validation
@lru_cache(maxsize=None)
def _input_model(game: str, schema_key: int, fields_tuple: tuple) -> type[BaseModel]:
    fields: dict[str, Any] = {}
    for name, dtype, lo, hi, options in fields_tuple:
        if dtype == "category":
            fields[name] = (Literal[tuple(options)], ...)
        else:
            py = int if dtype == "int" else float
            fields[name] = (Annotated[py, Field(ge=lo, le=hi)], ...)
    return create_model(f"{game}_inputs", __config__=ConfigDict(extra="forbid"), **fields)


def validate_inputs(gm: GameModel, raw: dict) -> dict:
    fields_tuple = tuple((f["name"], f["dtype"], f.get("hard_min"), f.get("hard_max"), tuple(f.get("options") or ()))
                         for f in gm.schema["inputs"])
    Model = _input_model(gm.key, id(gm.schema), fields_tuple)
    labels = {f["name"]: f["label"] for f in gm.schema["inputs"]}
    try:
        values = Model(**raw).model_dump()
    except ValidationError as exc:
        errors = []
        for e in exc.errors():
            field = str(e["loc"][0]) if e["loc"] else "inputs"
            errors.append({"field": field, "label": labels.get(field, field), "message": e["msg"]})
        raise InputValidationError(errors) from None
    cross = gm.spec.validate(values)
    if cross:
        raise InputValidationError([{"field": None, "label": None, "message": m} for m in cross])
    return values


# ------------------------------------------------------------------ interpretation
def _band(pct: float) -> str:
    if pct >= 95: return "Exceptional"
    if pct >= 80: return "Strong"
    if pct >= 60: return "Above average"
    if pct >= 40: return "Average"
    if pct >= 20: return "Below average"
    return "Weak"


def interpret(gm: GameModel, value: float) -> dict:
    s = gm.schema
    if s["task"] == "classification":
        label = "Likely win" if value >= 0.65 else "Likely loss" if value <= 0.35 else "Toss-up"
        return {"label": label, "percentile": None,
                "summary": (f"A player with this stat line has an estimated {value:.0%} probability of having been on "
                            f"the winning team. Remember these are end-of-match stats: they describe how strongly the "
                            f"performance is associated with winning, not a pre-game forecast.")}
    pct = 100.0 * bisect_left(s["target_quantiles"], value) / 100.0
    pct = float(np.clip(pct, 0, 100))
    if gm.key == "pubg":
        summary = (f"Predicted placement percentile {value:.2f}: your team would finish ahead of roughly "
                   f"{value:.0%} of the teams in the lobby. That is higher than about {pct:.0f}% of player-matches "
                   f"in the training data.")
    else:
        summary = (f"A predicted {s['target_name']} of {value:.2f} is higher than about {pct:.0f}% of professional "
                   f"player-map performances in the dataset (≈1.00 is an average pro performance).")
    return {"label": _band(pct), "percentile": round(pct, 1), "summary": summary}


# ------------------------------------------------------------------ main
def predict(gm: GameModel, raw_inputs: dict, with_explanation: bool = True) -> dict:
    values = validate_inputs(gm, raw_inputs)
    X = gm.spec.build_features(pd.DataFrame([values]))[gm.schema["model_features"]]

    with gm.lock:
        if gm.schema["task"] == "classification":
            raw_pred = float(gm.model.predict_proba(X)[0, 1])
        else:
            raw_pred = float(gm.model.predict(X)[0])
        explanation = explain(gm, X, raw_pred) if with_explanation else None

    lo, hi = gm.schema.get("target_range") or (None, None)
    pred = float(np.clip(raw_pred, lo, hi)) if lo is not None else raw_pred

    warnings = []
    for f in gm.schema["inputs"]:
        if f["dtype"] != "category" and "typical_min" in f:
            v = values[f["name"]]
            if v < f["typical_min"] or v > f["typical_max"]:
                warnings.append(f"{f['label']} ({v:g}) is outside the range seen in 98% of training data "
                                f"({f['typical_min']:g}–{f['typical_max']:g}); treat the prediction as an extrapolation.")
    if pred != raw_pred:
        warnings.append(f"The raw model output ({raw_pred:.3f}) was clipped to the valid range {lo}–{hi}.")

    return {
        "game": gm.key, "game_name": gm.schema["name"], "task": gm.schema["task"],
        "target_name": gm.schema["target_name"], "target_description": gm.schema["target_description"],
        "not_mmr_note": gm.schema["not_mmr_note"], "model_name": gm.schema["model_name"],
        "prediction": round(pred, 4), "inputs": values,
        "interpretation": interpret(gm, pred), "explanation": explanation, "warnings": warnings,
        "status": "success",
    }


def explain(gm: GameModel, X: pd.DataFrame, raw_pred: float) -> dict:
    base, contrib = gm.explainer.explain(X)
    labels = gm.schema.get("feature_labels", {})
    items = [{"feature": f, "label": labels.get(f, f), "value": float(X.iloc[0][f]), "contribution": float(c)}
             for f, c in zip(X.columns, contrib[0])]
    items.sort(key=lambda d: -abs(d["contribution"]))
    is_clf = gm.schema["task"] == "classification"
    pos = [i["label"] for i in items if i["contribution"] > 0][:3]
    neg = [i["label"] for i in items if i["contribution"] < 0][:3]
    return {
        "method": "SHAP (TreeExplainer)" if gm.explainer.kind == "tree" else "Linear contributions (exact SHAP for linear models)",
        "units": "log-odds of winning" if is_clf else gm.schema["target_short"],
        "base_value": base,
        "base_description": ("average model output (log-odds) before looking at your stats" if is_clf
                             else "average prediction before looking at your stats"),
        "model_output": float(np.log(raw_pred / (1 - raw_pred))) if is_clf and 0 < raw_pred < 1 else raw_pred,
        "contributions": items,
        "top_positive": pos, "top_negative": neg,
        "summary": ((f"Biggest boosts: {', '.join(pos)}. " if pos else "") +
                    (f"Biggest drags: {', '.join(neg)}." if neg else "")).strip(),
    }
