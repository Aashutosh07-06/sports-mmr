"""PUBG — user inputs, engineered features and task specification.

Target: winPlacePerc — the finishing placement of the player's team expressed as a
percentile (1.0 = won the match, 0.0 = finished last). It is NOT an MMR or rank.

Deliberately EXCLUDED (leakage / unusable):
  killPlace            ranking of the player's kills against everyone else in the match; computed after
                       the match from other players' data, unknowable to a user, strongly leaks placement.
  maxPlace, numGroups  post-match lobby information.
  rankPoints, killPoints, winPoints   documented by Kaggle as inconsistent/deprecated; 38–60% missing.
  Id, groupId, matchId identifiers.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ml.common.spec import GameSpec, InputField

MODES = ["solo", "duo", "squad"]

INPUTS = [
    InputField("match_type", "Match mode", "Team size of the match (FPP/TPP variants are merged).", "category",
               options=MODES, group="Match context"),
    InputField("match_duration", "Match duration", "Length of the whole match in seconds (typically 1,300–2,000 s).",
               "int", 60, 2400, unit="s", group="Match context"),
    InputField("kills", "Kills", "Enemy players you killed.", "int", 0, 60, group="Combat"),
    InputField("damage_dealt", "Damage dealt", "Total damage you dealt to enemies (self-inflicted damage excluded).",
               "float", 0, 5000, step=1, group="Combat"),
    InputField("assists", "Assists", "Enemies you damaged that were killed by teammates.", "int", 0, 20, group="Combat"),
    InputField("headshot_kills", "Headshot kills", "Kills made with a headshot. Cannot exceed kills.", "int", 0, 60, group="Combat"),
    InputField("dbnos", "Knockdowns (DBNOs)", "Enemies you knocked down (Down-But-Not-Out). Always 0 in solo.",
               "int", 0, 40, group="Combat"),
    InputField("kill_streaks", "Best kill streak", "Max enemies killed in a short time window.", "int", 0, 20, group="Combat"),
    InputField("longest_kill", "Longest kill", "Distance of your longest kill.", "float", 0, 1000, unit="m", step=1, group="Combat"),
    InputField("revives", "Revives", "Times you revived a knocked teammate. Always 0 in solo.", "int", 0, 20, group="Team play"),
    InputField("walk_distance", "Walk distance", "Distance travelled on foot.", "float", 0, 15000, unit="m", step=1,
               group="Movement & survival"),
    InputField("ride_distance", "Vehicle distance", "Distance travelled in vehicles.", "float", 0, 40000, unit="m", step=1,
               group="Movement & survival"),
    InputField("swim_distance", "Swim distance", "Distance travelled by swimming.", "float", 0, 3000, unit="m", step=1,
               group="Movement & survival"),
    InputField("heals", "Healing items used", "First-aid kits, bandages and med-kits used.", "int", 0, 40, group="Items"),
    InputField("boosts", "Boost items used", "Energy drinks, painkillers and adrenaline syringes used.", "int", 0, 30, group="Items"),
    InputField("weapons_acquired", "Weapons picked up", "Number of weapons you picked up.", "int", 0, 80, group="Items"),
]


def build_features(raw: pd.DataFrame) -> pd.DataFrame:
    X = raw[[f.name for f in INPUTS if f.dtype != "category"]].astype(float).copy()
    mode = raw["match_type"].astype(str)
    X["mode_duo"] = (mode == "duo").astype(float)
    X["mode_squad"] = (mode == "squad").astype(float)
    X["total_distance"] = X["walk_distance"] + X["ride_distance"] + X["swim_distance"]
    X["headshot_rate"] = np.where(X["kills"] > 0, X["headshot_kills"] / X["kills"].clip(lower=1), 0.0)
    return X


def validate(v: dict) -> list[str]:
    errors = []
    if v["headshot_kills"] > v["kills"]:
        errors.append("Headshot kills cannot exceed total kills.")
    if v["match_type"] == "solo" and (v["dbnos"] > 0 or v["revives"] > 0):
        errors.append("Knockdowns and revives do not exist in solo mode — set them to 0.")
    if v["kills"] > 0 and v["walk_distance"] + v["ride_distance"] + v["swim_distance"] == 0:
        errors.append("Kills without any movement look like invalid data (filtered as cheating in training).")
    if v["kill_streaks"] > v["kills"]:
        errors.append("Kill streak cannot exceed total kills.")
    if v["longest_kill"] > 0 and v["kills"] == 0:
        errors.append("Longest kill must be 0 when kills are 0.")
    return errors


SPEC = GameSpec(
    key="pubg",
    name="PUBG",
    task="regression",
    target_column="winPlacePerc",
    target_name="Placement Percentile",
    target_short="Placement",
    target_description=("Where your team finished, as a percentile of the lobby: 1.00 = winner (chicken dinner), "
                        "0.50 = mid-table, 0.00 = first team eliminated."),
    not_mmr_note=("This predicts finishing position within a single match. It is not an MMR, rank tier or "
                  "the deprecated rankPoints value."),
    unit_of_analysis="One player in one match",
    dataset_name="PUBG Finish Placement Prediction (Kaggle competition)",
    dataset_url="https://www.kaggle.com/competitions/pubg-finish-placement-prediction/data",
    group_column="matchId",
    inputs=INPUTS,
    build_features=build_features,
    validate=validate,
    extra={"feature_labels": {"mode_duo": "Mode: duo", "mode_squad": "Mode: squad", "total_distance": "Total distance", "headshot_rate": "Headshot rate"}},
    target_range=(0.0, 1.0),
)
