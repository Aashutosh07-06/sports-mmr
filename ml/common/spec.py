"""Declarative description of a game's prediction task.

Each game module creates one `GameSpec`. The spec is the single source of truth for:
  * which raw inputs the user types into the form (InputField)
  * hard validation limits used by the API
  * what the target is called (so we never mislabel something as MMR)
The trainer turns the spec into `schema.json`, which the backend and frontend read.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Callable, Literal

import pandas as pd


@dataclass
class InputField:
    name: str
    label: str
    description: str                       # shown as a tooltip in the UI
    dtype: Literal["int", "float", "category"] = "float"
    hard_min: float | None = None          # API rejects values outside [hard_min, hard_max]
    hard_max: float | None = None
    unit: str = ""
    options: list[str] | None = None       # for category inputs
    step: float | None = None
    group: str = "Performance"             # UI section heading

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class GameSpec:
    key: str
    name: str
    task: Literal["regression", "classification"]
    target_column: str
    target_name: str                       # honest, user-facing target name
    target_short: str
    target_description: str
    not_mmr_note: str                      # explicit statement of what the target is NOT
    unit_of_analysis: str
    dataset_name: str
    dataset_url: str
    group_column: str                      # used for group-based train/test split
    inputs: list[InputField]
    build_features: Callable[[pd.DataFrame], pd.DataFrame]
    # Cross-field sanity checks on user input (e.g. headshots <= kills). Returns error messages.
    validate: Callable[[dict], list[str]] = lambda inputs: []
    target_range: tuple[float, float] | None = None
    max_train_rows: int = 300_000
    max_test_rows: int = 100_000
    extra: dict = field(default_factory=dict)

    @property
    def input_names(self) -> list[str]:
        return [f.name for f in self.inputs]
