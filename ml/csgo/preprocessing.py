"""CS:GO — load and clean the HLTV professional matches dataset.

players.csv holds one row per player per *series* with per-map blocks m1_*, m2_*, m3_*.
We unpivot those blocks into one row per player per map, then join the number of rounds
on that map from results.csv so per-round statistics can be computed.
"""
from __future__ import annotations

import pandas as pd

from ml.common.cleaning import CleaningLog
from ml.common.paths import DATA_RAW

RAW = DATA_RAW / "csgo"
STATS = {"kills": "kills", "deaths": "deaths", "assists": "assists", "hs": "headshots",
         "kast": "kast", "adr": "adr", "fkdiff": "fk_diff", "rating": "rating"}


def load_raw() -> tuple[pd.DataFrame, pd.DataFrame]:
    cols = ["player_id", "match_id", "date"] + [f"map_{k}" for k in (1, 2, 3)] + \
           [f"m{k}_{s}" for k in (1, 2, 3) for s in STATS]
    players = pd.read_csv(RAW / "players.csv", usecols=cols, low_memory=False)
    results = pd.read_csv(RAW / "results.csv", usecols=["match_id", "_map", "result_1", "result_2"])
    return players, results


def unpivot_maps(players: pd.DataFrame) -> pd.DataFrame:
    parts = []
    for k in (1, 2, 3):
        part = players[["player_id", "match_id", "date", f"map_{k}"]].rename(columns={f"map_{k}": "map"})
        for s, new in STATS.items():
            part[new] = players[f"m{k}_{s}"]
        parts.append(part)
    return pd.concat(parts, ignore_index=True)


def load_and_clean() -> tuple[pd.DataFrame, list[dict], int]:
    log = CleaningLog()
    players, results = load_raw()
    raw_rows = len(players)
    log.note("players.csv rows (player × series)", raw_rows)

    df = unpivot_maps(players)
    df = log.apply(df, df["kills"].notna() & df["map"].notna(), "Unpivot to player × map; drop unplayed maps")

    # rounds on each map from results.csv; ambiguous (map played twice in a match) keys dropped
    results["rounds"] = results["result_1"] + results["result_2"]
    keys = results.drop_duplicates(["match_id", "_map"], keep=False)[["match_id", "_map", "rounds"]]
    df = df.merge(keys, left_on=["match_id", "map"], right_on=["match_id", "_map"], how="left").drop(columns="_map")
    df = log.apply(df, df["rounds"].notna(), "Join rounds played from results.csv (drop unmatched)")

    df = log.apply(df, df[["kast", "adr", "rating"]].notna().all(axis=1), "Drop rows missing KAST/ADR/rating")
    df = log.apply(df, ~df.duplicated(["player_id", "match_id", "map"]), "Remove duplicate player-map records")
    ok = (df["rounds"].between(16, 80) & (df["deaths"] <= df["rounds"]) & (df["headshots"] <= df["kills"])
          & df["kast"].between(0, 100) & df["adr"].between(0, 300) & (df["rating"] > 0)
          & (df["kills"] <= 5 * df["rounds"]))
    df = log.apply(df, ok, "Remove impossible values (rounds, deaths>rounds, HS>kills, KAST/ADR range)")

    for c in ["rounds", "kills", "deaths", "assists", "headshots", "fk_diff"]:
        df[c] = df[c].astype(int)
    return df.reset_index(drop=True), log.steps, raw_rows
