"""HTTP endpoints. All numbers returned come from trained artifacts or real model calls."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.models import database as db
from app.schemas.api import GameSummary, HealthResponse, HistoryItem, PredictRequest
from app.services import predictor
from app.services.registry import GameModel, registry

router = APIRouter(prefix="/api")
log = logging.getLogger("api")


def _game_or_404(game: str) -> GameModel:
    gm = registry.get(game)
    if gm is None:
        raise HTTPException(404, detail=f"Unknown game '{game}'. Supported: {', '.join(registry.games)}")
    return gm


def _ready_or_503(game: str) -> GameModel:
    gm = _game_or_404(game)
    if not gm.ready:
        raise HTTPException(503, detail=gm.reason or "Model unavailable")
    return gm


def _summary(gm: GameModel) -> GameSummary:
    if not gm.ready:
        name = gm.spec.name if gm.spec else gm.key
        return GameSummary(key=gm.key, name=name, status=gm.status, reason=gm.reason,
                           task=getattr(gm.spec, "task", None), target_name=getattr(gm.spec, "target_name", None))
    m, s = gm.metrics, gm.schema
    best = next(r for r in m["models"] if r["selected"])
    key = m["selection_metric"]
    headline = ({"name": "R²", "value": best["test"]["r2"], "secondary_name": "MAE", "secondary_value": best["test"]["mae"]}
                if key == "rmse" else
                {"name": "ROC-AUC", "value": best["test"]["roc_auc"], "secondary_name": "Accuracy",
                 "secondary_value": best["test"]["accuracy"]})
    return GameSummary(key=gm.key, name=s["name"], status="ready", task=s["task"], target_name=s["target_name"],
                       target_description=s["target_description"], not_mmr_note=s["not_mmr_note"],
                       model_name=s["model_name"], headline_metric=headline,
                       dataset_name=m["dataset"]["name"], n_inputs=len(s["inputs"]))


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", version=settings.version,
                          games={k: g.status for k, g in registry.games.items()})


@router.get("/games", response_model=list[GameSummary])
def games():
    return [_summary(g) for g in registry.games.values()]


@router.get("/model-info")
def model_info_all():
    return [{**_summary(g).model_dump(), "metrics": g.metrics if g.ready else None} for g in registry.games.values()]


@router.get("/model-info/{game}")
def model_info(game: str):
    gm = _ready_or_503(game)
    return {"summary": _summary(gm), "schema": gm.schema, "metrics": gm.metrics}


@router.post("/predict/{game}")
def predict(game: str, body: PredictRequest):
    gm = _ready_or_503(game)
    try:
        result = predictor.predict(gm, body.inputs)
    except predictor.InputValidationError as exc:
        return JSONResponse(status_code=422, content={"status": "error", "detail": "Invalid input",
                                                      "errors": exc.errors})
    row = db.save_prediction(gm.key, result["target_name"], result["model_name"], result["inputs"],
                             result["prediction"], result)
    result["id"] = row.id
    result["created_at"] = row.created_at.isoformat()
    return result


@router.post("/explain/{game}")
def explain(game: str, body: PredictRequest):
    """Same as /predict but returns only the explanation and does not store history."""
    gm = _ready_or_503(game)
    try:
        result = predictor.predict(gm, body.inputs)
    except predictor.InputValidationError as exc:
        return JSONResponse(status_code=422, content={"status": "error", "detail": "Invalid input",
                                                      "errors": exc.errors})
    return {"game": gm.key, "prediction": result["prediction"], "explanation": result["explanation"],
            "status": "success"}


@router.get("/analytics/{game}")
def analytics(game: str):
    gm = _ready_or_503(game)
    return {"game": gm.key, "name": gm.schema["name"], "task": gm.schema["task"],
            "target_name": gm.schema["target_name"], "feature_labels": gm.schema.get("feature_labels", {}),
            "dataset": gm.metrics["dataset"], "selected_model": gm.metrics["selected_model"],
            "cross_validation": gm.metrics["cross_validation"], "trained_at": gm.metrics["trained_at"],
            **{k: v for k, v in gm.analytics.items() if k not in ("game", "task")}}


@router.get("/experiments")
def experiments():
    return registry.experiments


@router.get("/predictions/history", response_model=list[HistoryItem])
def history(game: str | None = None, limit: int = Query(50, ge=1, le=500)):
    if game:
        _game_or_404(game)
    return [HistoryItem(id=r.id, game=r.game, target_name=r.target_name, model_name=r.model_name,
                        prediction=r.prediction, inputs=r.inputs, created_at=r.created_at,
                        label=(r.result or {}).get("interpretation", {}).get("label"))
            for r in db.list_predictions(game, limit)]


@router.delete("/predictions/history")
def clear_history():
    return {"deleted": db.clear_predictions()}


@router.get("/predictions/{pid}")
def prediction_detail(pid: int):
    row = db.get_prediction(pid)
    if row is None:
        raise HTTPException(404, detail=f"Prediction {pid} not found")
    return {**row.result, "id": row.id, "created_at": row.created_at.isoformat()}
