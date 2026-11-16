"""VALORANT — load and clean the vlr.gg professional per-map dataset.

Known data problems found during inspection (Phase 1):
  * invalid UTF-8 in some player names     -> read with encoding_errors="replace"
  * rows whose columns are shifted (agent column contains a rating number) -> keep known agents only
  * impossible values: rating up to 289, KAST up to 182 %, negative deaths/assists -> range filters
"""
from __future__ import annotations

import pandas as pd

from ml.common.cleaning import CleaningLog
from ml.common.paths import DATA_RAW
from ml.valorant.feature_engineering import AGENT_ROLE

RAW = DATA_RAW / "valorant_pro"
NUM = ["team1-score", "team2-score", "rating", "acs", "k", "d", "a", "kast", "adr", "hs", "fk", "fd"]


def load_raw() -> pd.DataFrame:
    cols = ["match-datetime", "map", "team1", "team2", "player-name", "player-team", "agent", *NUM]
    return pd.read_csv(RAW / "data-since-april-2021.csv", usecols=cols, encoding_errors="replace", low_memory=False)


def load_and_clean() -> tuple[pd.DataFrame, list[dict], int]:
    log = CleaningLog()
    df = load_raw()
    raw_rows = len(df)
    log.note("data-since-april-2021.csv rows (player × map)", raw_rows)

    df = log.apply(df, ~df.duplicated(), "Remove exact duplicate rows")
    df = log.apply(df, df["agent"].isin(AGENT_ROLE.keys()), "Drop column-shifted rows (unknown agent value)")
    for c in NUM:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = log.apply(df, df[NUM].notna().all(axis=1), "Drop rows with missing/non-numeric stats")

    df["rounds"] = df["team1-score"] + df["team2-score"]
    ok = (df["rounds"].between(13, 60) & df["rating"].between(0.0, 4.0) & df["kast"].between(0, 1)
          & df["hs"].between(0, 1) & (df[["k", "d", "a", "fk", "fd"]] >= 0).all(axis=1)
          & (df["d"] <= df["rounds"]) & (df["fk"] <= df["k"]) & (df["fd"] <= df["d"])
          & ((df["fk"] + df["fd"]) <= df["rounds"]) & df["acs"].between(0, 700) & df["adr"].between(0, 450))
    df = log.apply(df, ok, "Remove impossible values (rating>4, KAST/HS outside 0–100 %, negatives, FK>K …)")

    df["player"] = df["player-name"].astype(str).str.strip().str.lower()
    out = pd.DataFrame({
        "player": df["player"], "rounds": df["rounds"].astype(int), "role": df["agent"].map(AGENT_ROLE),
        "kills": df["k"].astype(int), "deaths": df["d"].astype(int), "assists": df["a"].astype(int),
        "acs": df["acs"], "adr": df["adr"], "kast": (df["kast"] * 100).round(1), "hs_pct": (df["hs"] * 100).round(1),
        "first_kills": df["fk"].astype(int), "first_deaths": df["fd"].astype(int), "rating": df["rating"],
    })
    return out.reset_index(drop=True), log.steps, raw_rows
