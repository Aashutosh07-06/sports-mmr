"""Request / response models (also drive the interactive docs at /docs)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    inputs: dict[str, Any] = Field(..., description="Gameplay statistics keyed by the game's input field names "
                                                    "(see GET /api/model-info/{game}).")


class GameSummary(BaseModel):
    key: str
    name: str
    status: str
    reason: str | None = None
    task: str | None = None
    target_name: str | None = None
    target_description: str | None = None
    not_mmr_note: str | None = None
    model_name: str | None = None
    headline_metric: dict | None = None
    dataset_name: str | None = None
    n_inputs: int | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    games: dict[str, str]


class HistoryItem(BaseModel):
    id: int
    game: str
    target_name: str
    model_name: str
    prediction: float
    inputs: dict
    created_at: datetime
    label: str | None = None
