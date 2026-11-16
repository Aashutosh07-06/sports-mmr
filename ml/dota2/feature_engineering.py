"""Dota 2 — user inputs, engineered features and task specification.

Target: whether the player's team WON the match (binary classification), predicted from
the player's own end-of-match stat line. Output = Win Probability.

Why not TrueSkill / MMR?  The dataset's player_ratings.csv contains TrueSkill mu/sigma
computed by the dataset author from win/loss records only. Our feasibility experiment
(ml/experiments/dota2_trueskill_feasibility.py) shows gameplay stats explain ~0 % of the
variance of TrueSkill mu (R² ≈ 0), so a "skill estimate" model would be meaningless.

Caveat: these are POST-match stats; gold, XP and tower damage partly reflect winning.
The model describes how strongly a stat line is associated with a win — it is not a
pre-game forecast.

Excluded: total_wins / total_matches / TrueSkill (derived from outcomes), account_id,
hero_id (high-cardinality identity, not performance), item slots, leaver_status.
"""
from __future__ import annotations

import pandas as pd

from ml.common.spec import GameSpec, InputField

INPUTS = [
    InputField("duration_min", "Match duration", "Length of the match in minutes.", "float", 10, 90, unit="min",
               step=0.5, group="Match context"),
    InputField("kills", "Kills", "Enemy heroes you killed.", "int", 0, 60, group="Combat"),
    InputField("deaths", "Deaths", "Times your hero died.", "int", 0, 50, group="Combat"),
    InputField("assists", "Assists", "Kills you contributed to.", "int", 0, 80, group="Combat"),
    InputField("hero_damage", "Hero damage", "Total damage dealt to enemy heroes.", "int", 0, 150000, group="Combat"),
    InputField("hero_healing", "Hero healing", "Total healing done to allied heroes.", "int", 0, 50000, group="Combat"),
    InputField("gold_per_min", "GPM", "Gold earned per minute.", "int", 50, 1500, group="Economy & farm"),
    InputField("xp_per_min", "XPM", "Experience earned per minute.", "int", 50, 1500, group="Economy & farm"),
    InputField("last_hits", "Last hits", "Creeps/units you landed the killing blow on.", "int", 0, 1500,
               group="Economy & farm"),
    InputField("denies", "Denies", "Allied creeps you denied the enemy.", "int", 0, 200, group="Economy & farm"),
    InputField("level", "Hero level", "Final hero level (1–25).", "int", 1, 25, group="Economy & farm"),
    InputField("tower_damage", "Tower damage", "Damage dealt to enemy buildings.", "int", 0, 40000, group="Objectives"),
]


def build_features(raw: pd.DataFrame) -> pd.DataFrame:
    X = raw[[f.name for f in INPUTS]].astype(float).copy()
    minutes = X["duration_min"].clip(lower=1)
    X["kda"] = (X["kills"] + X["assists"]) / (X["deaths"] + 1)
    X["last_hits_per_min"] = X["last_hits"] / minutes
    X["hero_damage_per_min"] = X["hero_damage"] / minutes
    X["tower_damage_per_min"] = X["tower_damage"] / minutes
    X["deaths_per_min"] = X["deaths"] / minutes
    X["kills_per_min"] = X["kills"] / minutes
    # raw totals replaced by per-minute rates (no duplicate information -> clearer explanations)
    return X[["duration_min", "kda", "kills_per_min", "deaths_per_min", "gold_per_min", "xp_per_min",
              "last_hits_per_min", "denies", "hero_damage_per_min", "hero_healing", "tower_damage_per_min", "level"]]


def validate(v: dict) -> list[str]:
    errors = []
    if v["kills"] + v["deaths"] + v["assists"] > 6 * v["duration_min"] + 20:
        errors.append("Kills + deaths + assists are implausibly high for this match length.")
    if v["last_hits"] > 25 * v["duration_min"]:
        errors.append("More than 25 last hits per minute is not achievable.")
    return errors


SPEC = GameSpec(
    key="dota2",
    name="Dota 2",
    task="classification",
    target_column="won",
    target_name="Win Probability",
    target_short="Win prob.",
    target_description=("Estimated probability that a player with this end-of-match stat line was on the "
                        "winning team. 50 % = the stats look neutral."),
    not_mmr_note=("This is not MMR or a TrueSkill estimate. TrueSkill in this dataset could not be predicted "
                  "from gameplay stats (R² ≈ 0), so the project predicts match outcome association instead."),
    unit_of_analysis="One player in one ranked All-Pick match",
    dataset_name="Dota 2 Matches (YASP/OpenDota sample of 50,000 ranked matches)",
    dataset_url="https://www.kaggle.com/datasets/devinanzelmo/dota-2-matches",
    group_column="match_id",
    inputs=INPUTS,
    build_features=build_features,
    validate=validate,
    extra={"feature_labels": {"kda": "KDA ratio", "last_hits_per_min": "Last hits per minute", "hero_damage_per_min": "Hero damage per minute", "tower_damage_per_min": "Tower damage per minute", "deaths_per_min": "Deaths per minute", "kills_per_min": "Kills per minute"}},
    target_range=(0.0, 1.0),
)
