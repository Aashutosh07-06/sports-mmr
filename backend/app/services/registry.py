"""Model registry: loads every game's trained artifacts ONCE at startup.

A game is "ready" only when its model, schema, metrics and analytics files all exist.
Otherwise it is reported as "unavailable" with the reason, and prediction requests
for it return HTTP 503 instead of pretending to work. Models are never retrained here.
"""
from __future__ import annotations

import importlib
import json
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib

from app.core.config import settings

log = logging.getLogger("registry")
REQUIRED = ["model.joblib", "schema.json", "metrics.json", "analytics.json"]


@dataclass
class GameModel:
    key: str
    status: str = "unavailable"
    reason: str | None = None
    spec: Any = None
    schema: dict = field(default_factory=dict)
    metrics: dict = field(default_factory=dict)
    analytics: dict = field(default_factory=dict)
    model: Any = None
    explainer: Any = None
    lock: threading.Lock = field(default_factory=threading.Lock)

    @property
    def ready(self) -> bool:
        return self.status == "ready"


class ModelRegistry:
    def __init__(self, artifacts_dir: Path | None = None, games: list[str] | None = None):
        self.artifacts_dir = Path(artifacts_dir or settings.artifacts_dir)
        self.games: dict[str, GameModel] = {}
        self.experiments: dict[str, dict] = {}
        self._keys = games or settings.games

    def load(self) -> "ModelRegistry":
        from ml.common.explain import ModelExplainer

        for key in self._keys:
            gm = GameModel(key=key)
            try:
                gm.spec = importlib.import_module(f"ml.{key}.feature_engineering").SPEC
                folder = self.artifacts_dir / key
                missing = [f for f in REQUIRED if not (folder / f).exists()]
                if missing:
                    gm.reason = f"Model not trained yet (missing {', '.join(missing)}). Run: python -m ml.{key}.train"
                else:
                    gm.schema = json.loads((folder / "schema.json").read_text())
                    gm.metrics = json.loads((folder / "metrics.json").read_text())
                    gm.analytics = json.loads((folder / "analytics.json").read_text())
                    gm.model = joblib.load(folder / "model.joblib")
                    gm.explainer = ModelExplainer(gm.model)
                    gm.status = "ready"
            except Exception as exc:  # keep the API alive even if one game fails to load
                log.exception("Failed to load model for %s", key)
                gm.status, gm.reason = "unavailable", f"Failed to load model artifacts: {type(exc).__name__}"
            self.games[key] = gm
            log.info("game=%s status=%s", key, gm.status)

        exp_dir = self.artifacts_dir / "experiments"
        if exp_dir.exists():
            for f in exp_dir.glob("*.json"):
                self.experiments[f.stem] = json.loads(f.read_text())
        return self

    def get(self, key: str) -> GameModel | None:
        return self.games.get(key)


registry = ModelRegistry()
