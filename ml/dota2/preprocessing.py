"""Dota 2 — load and clean players.csv joined with match.csv.

Label: a player won if (player_slot < 128 and radiant_win) or (player_slot >= 128 and not radiant_win).
Slots 0–4 are Radiant, 128–132 are Dire.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ml.common.cleaning import CleaningLog
from ml.common.paths import DATA_RAW

RAW = DATA_RAW / "dota2"
PCOLS = ["match_id", "player_slot", "kills", "deaths", "assists", "gold_per_min", "xp_per_min", "last_hits",
         "denies", "hero_damage", "hero_healing", "tower_damage", "level", "leaver_status"]


def load_raw() -> tuple[pd.DataFrame, pd.DataFrame]:
    players = pd.read_csv(RAW / "players.csv", usecols=PCOLS)
    match = pd.read_csv(RAW / "match.csv", usecols=["match_id", "duration", "game_mode", "radiant_win"])
    return players, match


def load_and_clean() -> tuple[pd.DataFrame, list[dict], int]:
    log = CleaningLog()
    players, match = load_raw()
    raw_rows = len(players)
    log.note("players.csv rows (player × match)", raw_rows)

    df = players.merge(match, on="match_id", how="inner")
    df = log.apply(df, df["game_mode"] == 22, "Keep Ranked All Pick (game_mode 22); drop Captains Mode")
    bad = df.loc[df["leaver_status"] != 0, "match_id"].unique()
    df = log.apply(df, ~df["match_id"].isin(bad), "Drop matches where any player abandoned (leaver_status ≠ 0)")
    df = log.apply(df, df["duration"].between(900, 5400), "Keep matches lasting 15–90 minutes")
    sane = (df["level"].between(1, 25) & (df["gold_per_min"] > 0) & (df["xp_per_min"] > 0)
            & (df[["kills", "deaths", "assists", "hero_damage", "hero_healing", "tower_damage"]] >= 0).all(axis=1))
    df = log.apply(df, sane, "Remove impossible values (level outside 1–25, zero GPM/XPM, negatives)")
    df = log.apply(df, df.groupby("match_id")["match_id"].transform("size") == 10, "Keep complete 10-player matches")

    radiant = df["player_slot"] < 128
    df["won"] = np.where(radiant, df["radiant_win"], ~df["radiant_win"].astype(bool)).astype(int)
    df["duration_min"] = (df["duration"] / 60).round(2)
    out = df[["match_id", "duration_min", "kills", "deaths", "assists", "hero_damage", "hero_healing",
              "gold_per_min", "xp_per_min", "last_hits", "denies", "level", "tower_damage", "won"]]
    return out.reset_index(drop=True), log.steps, raw_rows
