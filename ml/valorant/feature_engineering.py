"""VALORANT — user inputs, engineered features and task specification.

Dataset: per-map statistics of professional players scraped from vlr.gg (Oct 2021 – Apr 2023).
Target: VLR.gg Performance Rating for one player on one map. This is vlr.gg's own
professional performance rating — it is NOT Riot's ranked MMR, RR or rank tier.

Excluded: rating-t / rating-ct (components of the target), T/CT stat splits,
tkmd / fkmd (pure differences of included columns), names, teams.
"""
from __future__ import annotations

import pandas as pd

from ml.common.spec import GameSpec, InputField

ROLES = ["Duelist", "Initiator", "Controller", "Sentinel"]
AGENT_ROLE = {
    "Jett": "Duelist", "Raze": "Duelist", "Reyna": "Duelist", "Phoenix": "Duelist", "Neon": "Duelist", "Yoru": "Duelist",
    "Sova": "Initiator", "Skye": "Initiator", "Breach": "Initiator", "Kayo": "Initiator", "Fade": "Initiator",
    "Gekko": "Initiator",
    "Viper": "Controller", "Astra": "Controller", "Omen": "Controller", "Brimstone": "Controller", "Harbor": "Controller",
    "Killjoy": "Sentinel", "Sage": "Sentinel", "Cypher": "Sentinel", "Chamber": "Sentinel",
}

INPUTS = [
    InputField("rounds", "Rounds played", "Total rounds on the map (e.g. 13-9 = 22 rounds).", "int", 13, 60,
               group="Match context"),
    InputField("role", "Agent role", "Role of the agent you played.", "category", options=ROLES, group="Match context"),
    InputField("kills", "Kills", "Enemies you eliminated.", "int", 0, 80),
    InputField("deaths", "Deaths", "Times you died. Cannot exceed rounds.", "int", 0, 60),
    InputField("assists", "Assists", "Kills you assisted (damage, flashes, utility).", "int", 0, 50),
    InputField("acs", "ACS", "Average Combat Score — Riot's per-round combat score shown on the scoreboard.",
               "float", 0, 700, step=1),
    InputField("adr", "ADR", "Average Damage per Round.", "float", 0, 450, step=1),
    InputField("kast", "KAST", "% of rounds with a Kill, Assist, Survival or Trade.", "float", 0, 100, unit="%", step=1),
    InputField("hs_pct", "Headshot %", "Share of your hits that landed on the head.", "float", 0, 100, unit="%", step=1),
    InputField("first_kills", "First kills", "Rounds where you got the opening kill.", "int", 0, 30, group="Impact"),
    InputField("first_deaths", "First deaths", "Rounds where you were the first to die.", "int", 0, 30, group="Impact"),
]


def build_features(raw: pd.DataFrame) -> pd.DataFrame:
    X = raw[[f.name for f in INPUTS if f.dtype != "category"]].astype(float).copy()
    role = raw["role"].astype(str)
    for r in ROLES:
        X[f"role_{r.lower()}"] = (role == r).astype(float)
    rounds = X["rounds"].clip(lower=1)
    X["kpr"] = X["kills"] / rounds
    X["dpr"] = X["deaths"] / rounds
    X["apr"] = X["assists"] / rounds
    X["kd_ratio"] = X["kills"] / X["deaths"].clip(lower=1)
    X["fk_per_round"] = X["first_kills"] / rounds
    X["fd_per_round"] = X["first_deaths"] / rounds
    # raw counts replaced by per-round versions (no duplicate information -> clearer explanations)
    keep = ["rounds", "acs", "adr", "kast", "hs_pct", *[f"role_{r.lower()}" for r in ROLES],
            "kpr", "dpr", "apr", "kd_ratio", "fk_per_round", "fd_per_round"]
    return X[keep]


def validate(v: dict) -> list[str]:
    errors = []
    if v["deaths"] > v["rounds"]:
        errors.append("Deaths cannot exceed rounds played.")
    if v["first_kills"] > v["kills"]:
        errors.append("First kills cannot exceed total kills.")
    if v["first_deaths"] > v["deaths"]:
        errors.append("First deaths cannot exceed total deaths.")
    if v["first_kills"] + v["first_deaths"] > v["rounds"]:
        errors.append("First kills + first deaths cannot exceed rounds (one opening duel per round).")
    if v["kills"] > 5 * v["rounds"]:
        errors.append("Kills cannot exceed 5 per round.")
    return errors


SPEC = GameSpec(
    key="valorant",
    name="VALORANT",
    task="regression",
    target_column="rating",
    target_name="VLR Performance Rating",
    target_short="Rating",
    target_description=("vlr.gg's per-map performance rating for professional players. Around 1.00 is an "
                        "average professional performance; higher is better."),
    not_mmr_note=("This is a professional-match rating from vlr.gg. It is not Riot's hidden ranked MMR, "
                  "Rank Rating (RR) or competitive tier."),
    unit_of_analysis="One professional player on one map",
    dataset_name="Valorant Pro Matches since April 2021 (vlr.gg scrape, Kaggle)",
    dataset_url="https://www.kaggle.com/datasets/qualidea1217/valorant-pro-matches-since-april-2021",
    group_column="player",
    inputs=INPUTS,
    build_features=build_features,
    validate=validate,
    extra={"feature_labels": {"role_duelist": "Role: Duelist", "role_initiator": "Role: Initiator", "role_controller": "Role: Controller", "role_sentinel": "Role: Sentinel", "kpr": "Kills per round", "dpr": "Deaths per round", "apr": "Assists per round", "kd_ratio": "K/D ratio", "fk_per_round": "First kills per round", "fd_per_round": "First deaths per round"}},
    target_range=(0.0, 4.0),
)
