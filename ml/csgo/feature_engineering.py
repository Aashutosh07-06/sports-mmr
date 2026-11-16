"""CS:GO — user inputs, engineered features and task specification.

Target: HLTV Performance Rating of a player on ONE map of a professional match.
This is HLTV's published per-map performance rating (Rating 1.0 before mid-2017,
Rating 2.0 afterwards). It is NOT Valve's matchmaking MMR / Premier rating.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ml.common.spec import GameSpec, InputField

INPUTS = [
    InputField("rounds", "Rounds played", "Total rounds on the map (e.g. 16-12 = 28 rounds). Used to normalise per-round stats.",
               "int", 16, 80, group="Match context"),
    InputField("kills", "Kills", "Enemies you eliminated on this map.", "int", 0, 120),
    InputField("deaths", "Deaths", "Times you died on this map. Cannot exceed rounds played.", "int", 0, 80),
    InputField("assists", "Assists", "Kills where you dealt damage but a teammate finished the enemy.", "int", 0, 60),
    InputField("headshots", "Headshot kills", "Kills where the final shot hit the head. Cannot exceed kills.", "int", 0, 120),
    InputField("kast", "KAST", "% of rounds in which you got a Kill, Assist, Survived or were Traded.", "float", 0, 100, unit="%", step=0.1),
    InputField("adr", "ADR", "Average Damage per Round dealt to enemies.", "float", 0, 300, step=0.1),
    InputField("fk_diff", "Opening duel differential", "First kills minus first deaths (opening duels won − lost).", "int", -30, 30,
               group="Impact"),
]


def build_features(raw: pd.DataFrame) -> pd.DataFrame:
    """Raw inputs -> model features. Also used by the API at prediction time."""
    X = raw[[f.name for f in INPUTS]].astype(float).copy()
    r = X["rounds"].clip(lower=1)
    X["kpr"] = X["kills"] / r                         # kills per round
    X["dpr"] = X["deaths"] / r                        # deaths per round
    X["apr"] = X["assists"] / r                       # assists per round
    X["kd_ratio"] = X["kills"] / X["deaths"].clip(lower=1)
    X["hs_pct"] = np.where(X["kills"] > 0, 100 * X["headshots"] / X["kills"].clip(lower=1), 0.0)
    X["fk_diff_per_round"] = X["fk_diff"] / r
    # Raw counts are replaced by their per-round / ratio versions. Keeping both would give the
    # model duplicate information and make SHAP split credit between near-identical features.
    return X[["rounds", "kpr", "dpr", "apr", "kd_ratio", "hs_pct", "kast", "adr", "fk_diff_per_round"]]


def validate(v: dict) -> list[str]:
    errors = []
    if v["headshots"] > v["kills"]:
        errors.append("Headshot kills cannot exceed total kills.")
    if v["deaths"] > v["rounds"]:
        errors.append("Deaths cannot exceed rounds played (you can die at most once per round).")
    if v["kills"] > 5 * v["rounds"]:
        errors.append("Kills cannot exceed 5 per round.")
    return errors


SPEC = GameSpec(
    key="csgo",
    name="CS:GO",
    task="regression",
    target_column="rating",
    target_name="HLTV Performance Rating",
    target_short="Rating",
    target_description=("HLTV's per-map performance rating of a professional player. 1.00 is roughly an "
                        "average professional performance; higher is better."),
    not_mmr_note=("This is a professional-match performance rating published by HLTV.org. It is not "
                  "Valve's matchmaking MMR, Premier rating or skill group."),
    unit_of_analysis="One player on one map of a professional match",
    dataset_name="CS:GO Professional Matches (HLTV scrape, 2015–2020)",
    dataset_url="https://www.kaggle.com/datasets/mateusdmachado/csgo-professional-matches",
    group_column="player_id",
    inputs=INPUTS,
    build_features=build_features,
    validate=validate,
    extra={"feature_labels": {"kpr": "Kills per round", "dpr": "Deaths per round", "apr": "Assists per round", "kd_ratio": "K/D ratio", "hs_pct": "Headshot %", "fk_diff_per_round": "Opening duel diff. per round"}},
    target_range=(0.0, 3.5),
)
