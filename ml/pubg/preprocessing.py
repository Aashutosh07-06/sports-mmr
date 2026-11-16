"""PUBG — load and clean train_V2.csv (4.45M player-match rows).

Only train_V2.csv has the target (test_V2.csv is the competition's unlabeled test set).
To keep training feasible on a laptop we sample whole MATCHES (never individual rows,
so lobby structure stays intact) before cleaning.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ml.common.cleaning import CleaningLog
from ml.common.paths import DATA_RAW

RAW = DATA_RAW / "pubg"
N_MATCHES = 15_000
RENAME = {"matchDuration": "match_duration", "damageDealt": "damage_dealt", "headshotKills": "headshot_kills",
          "DBNOs": "dbnos", "killStreaks": "kill_streaks", "longestKill": "longest_kill",
          "walkDistance": "walk_distance", "rideDistance": "ride_distance", "swimDistance": "swim_distance",
          "weaponsAcquired": "weapons_acquired", "matchType": "match_type_raw"}


def load_raw() -> pd.DataFrame:
    usecols = ["matchId", "maxPlace", "winPlacePerc", "kills", "assists", "boosts", "heals", "revives",
               "roadKills", *RENAME.keys()]
    return pd.read_csv(RAW / "train_V2.csv", usecols=usecols)


def load_and_clean() -> tuple[pd.DataFrame, list[dict], int]:
    log = CleaningLog()
    df = load_raw()
    raw_rows = len(df)
    log.note("train_V2.csv rows (player × match)", raw_rows)
    df = df.rename(columns=RENAME)

    df = log.apply(df, df["winPlacePerc"].notna(), "Drop rows with missing target")
    std = df["match_type_raw"].isin(["solo", "solo-fpp", "duo", "duo-fpp", "squad", "squad-fpp"])
    df = log.apply(df, std, "Keep standard solo/duo/squad modes (drop custom: crash, flare, normal-*)")
    df["match_type"] = df["match_type_raw"].str.replace("-fpp", "", regex=False)

    rng = np.random.default_rng(42)
    matches = df["matchId"].unique()
    keep = set(rng.choice(matches, min(N_MATCHES, len(matches)), replace=False))
    df = log.apply(df, df["matchId"].isin(keep), f"Random sample of {N_MATCHES:,} whole matches (laptop-friendly)")

    df = log.apply(df, df["maxPlace"] > 1, "Drop matches with maxPlace ≤ 1 (placement undefined)")
    moved = df["walk_distance"] + df["ride_distance"] + df["swim_distance"]
    df = log.apply(df, ~((df["kills"] > 0) & (moved == 0)), "Remove suspected cheaters: kills without moving")
    sane = ((df["kills"] <= 30) & (df["longest_kill"] <= 1000) & (df["weapons_acquired"] <= 80)
            & (df["heals"] <= 40) & (df["roadKills"] <= 10) & (df["headshot_kills"] <= df["kills"]))
    df = log.apply(df, sane, "Remove extreme outliers (kills>30, longest kill>1km, >80 weapons, >40 heals)")
    df = df.drop(columns=["match_type_raw", "maxPlace", "roadKills"])
    return df.reset_index(drop=True), log.steps, raw_rows
