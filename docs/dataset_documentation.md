# Dataset Documentation

All counts below come from the cleaning logs written during training (`ml/artifacts/<game>/metrics.json`,
also shown on the Analytics page). Each game uses **its own** dataset and pipeline; data from different games
is never combined.

---

## 1. CS:GO: CS:GO Professional Matches

| Item | Value |
|---|---|
| Source | https://www.kaggle.com/datasets/mateusdmachado/csgo-professional-matches (scraped from HLTV.org) |
| Game | Counter-Strike: Global Offensive (professional matches, Oct 2015 – Feb 2020) |
| Files available | `players.csv` (383,317 × 101), `results.csv` (45,773 × 19), `economy.csv`, `picks.csv` |
| Files used | `players.csv`, `results.csv` |
| Raw records | 383,317 player × series rows (12,295 players, 38,375 matches) |
| Unit of analysis | one player on one map |
| Records after cleaning | **439,078** player-maps (4,972 players) |
| Target | `rating`: **HLTV Performance Rating** of that map (regression) |
| User inputs (8) | rounds, kills, deaths, assists, headshot kills, KAST %, ADR, opening-duel differential |
| Model features (9) | rounds, kills/round, deaths/round, assists/round, K/D ratio, headshot %, KAST, ADR, opening-duel diff./round |
| Excluded | `rating_ct`, `rating_t` (components of the target); series-level rating; `kddiff` (= kills − deaths); `flash_assists` (29% missing in older data); names/IDs |

**Cleaning steps**

| Step | Removed | Remaining |
|---|---:|---:|
| Unpivot per-map blocks `m1_*/m2_*/m3_*` to one row per player × map; drop unplayed maps | – | 648,023 |
| Join rounds played (`result_1 + result_2`) from results.csv; drop unmatched | 204,286 | 443,737 |
| Drop rows missing KAST/ADR/rating | 4,624 | 439,113 |
| Remove duplicates | 0 | 439,113 |
| Remove impossible values (rounds outside 16–80, deaths > rounds, HS > kills, KAST/ADR out of range) | 35 | 439,078 |

**Missing-value treatment:** rows with a missing target or model input are dropped. Nothing is imputed, because
enough complete rows remain.

**Limitations**
- About 31.5% of player-maps belong to matches that are missing from `results.csv`, so they have no round count and were dropped.
- HLTV switched from Rating 1.0 to Rating 2.0 in mid-2017. The target therefore mixes two formula versions.
- The rating is calculated from the same kinds of statistics the model uses, so a very high R² is expected. The model is mostly learning HLTV's formula.
- Professional players only, and CS:GO-era data (before CS2).

---

## 2. PUBG: Finish Placement Prediction

| Item | Value |
|---|---|
| Source | https://www.kaggle.com/competitions/pubg-finish-placement-prediction/data |
| Game | PUBG: Battlegrounds (public matches) |
| Files available | `train_V2.csv` (4,446,966 × 29), `test_V2.csv` (no target), `sample_submission_V2.csv` |
| Files used | `train_V2.csv` |
| Raw records | 4,446,966 player × match rows (47,965 matches) |
| Records after cleaning | **1,402,311** rows from 15,000 randomly sampled whole matches |
| Target | `winPlacePerc`: **Placement Percentile** (1 = winner, 0 = last) (regression) |
| User inputs (16) | match mode, match duration, kills, damage dealt, assists, headshot kills, DBNOs, kill streak, longest kill, revives, walk / ride / swim distance, heals, boosts, weapons acquired |
| Model features (19) | the 15 numeric inputs + duo/squad indicators, total distance, headshot rate |
| Excluded (leakage / unusable) | **`killPlace`** (rank of the player's kills within the match, computed after the match from other players' data; r = −0.72 with the target); `maxPlace`, `numGroups` (post-match lobby info); `rankPoints`, `killPoints`, `winPoints` (marked deprecated by Kaggle; −1 or 0 in 38–60% of rows); `Id`, `groupId`, `matchId` |

**Cleaning steps**

| Step | Removed | Remaining |
|---|---:|---:|
| Drop missing target | 1 | 4,446,965 |
| Keep standard solo/duo/squad (incl. FPP) modes | 35,267 | 4,411,698 |
| Random sample of 15,000 whole matches (keeps the laptop memory use manageable) | 3,009,283 | 1,402,415 |
| Drop matches with maxPlace ≤ 1 | 0 | 1,402,415 |
| Remove suspected cheaters (kills > 0 with zero movement) | 62 | 1,402,353 |
| Remove extreme outliers (kills > 30, longest kill > 1 km, > 80 weapons, > 40 heals, > 10 road kills) | 42 | 1,402,311 |

**Limitations:** `walkDistance` is the strongest predictor and is effectively a proxy for survival time. The
predictions therefore describe a finished match; they do not forecast one. Placement is a *team* outcome predicted from
*one player's* stats.

---

## 3. VALORANT: Professional match statistics (vlr.gg)

| Item | Value |
|---|---|
| Source | https://www.kaggle.com/datasets/qualidea1217/valorant-pro-matches-since-april-2021 by Kaggle user qualidea1217, prepared for the Emory University CS334 Machine Learning course. Data scraped from https://www.vlr.gg; `scraper.py` is included with the file |
| Note | The brief proposed GitHub `mohitgaikwad897-tech/Valorant-Esports-Data-Analysis`; this Kaggle dataset was used instead |
| Game | VALORANT professional matches (Oct 2021 – Apr 2023) |
| Files | `data-since-april-2021.csv` (249,710 × 47) |
| Records after cleaning | **248,348** player-maps (8,720 players) |
| Target | `rating`: **VLR Performance Rating** for that map (regression) |
| User inputs (11) | rounds, agent role, kills, deaths, assists, ACS, ADR, KAST %, headshot %, first kills, first deaths |
| Model features (15) | rounds, ACS, ADR, KAST, HS %, 4 role indicators, kills/deaths/assists per round, K/D, first kills/round, first deaths/round |
| Excluded | `rating-t`, `rating-ct` (components of the target); T/CT splits; `tkmd`, `fkmd` (differences of included columns); names, teams |

**Cleaning steps**

| Step | Removed | Remaining |
|---|---:|---:|
| Read with `encoding_errors="replace"` (some names contain invalid UTF-8) | – | 249,710 |
| Remove exact duplicates | 220 | 249,490 |
| Drop column-shifted rows (agent column contains a number) | 250 | 249,240 |
| Drop rows with missing or non-numeric stats | 468 | 248,772 |
| Remove impossible values (rating > 4, KAST or HS outside 0–100%, negative counts, FK > K, FD > D, FK + FD > rounds) | 424 | 248,348 |

**Limitations:** professional players only, and VLR's rating is itself a formula of these statistics. Agents are
mapped to roles as of 2023.

### 3b. VALORANT ranked-ladder statistics (`val_stats.csv`): experiment only

85,678 players with aggregated ranked statistics and a genuine rank label. 99.9% of them are Immortal 1–3 or
Radiant. The best classifier reaches 60.5% accuracy against 59.8% for the majority-class baseline, so **no model is
deployed**. Source: https://www.kaggle.com/datasets/aliibrahim10/valorant-stats (Ali Ibrahim; tracker.gg leaderboards, Episode 4 Act 3).

---

## 4. Dota 2: Dota 2 Matches

| Item | Value |
|---|---|
| Source | https://www.kaggle.com/datasets/devinanzelmo/dota-2-matches (YASP/OpenDota data) |
| Game | Dota 2 ranked matches (2015) |
| Files available | 18 files, e.g. `players.csv` (500,000 × 73), `match.csv` (50,000), `player_ratings.csv` (834,226), `match_outcomes.csv` (1.83 M) |
| Files used | `players.csv`, `match.csv` (model); `player_ratings.csv` (experiment) |
| Records after cleaning | **410,270** player-matches (41,027 matches) |
| Target | `won` (1 if the player's team won) → **Win Probability** (binary classification, 50/50 balanced) |
| User inputs (12) | duration, kills, deaths, assists, hero damage, hero healing, GPM, XPM, last hits, denies, level, tower damage |
| Model features (12) | duration, KDA, kills/min, deaths/min, GPM, XPM, last hits/min, denies, hero damage/min, healing, tower damage/min, level |
| Excluded | TrueSkill μ/σ, total wins and total matches (derived from outcomes); hero ID; items; account ID; leaver status |

**Cleaning steps**

| Step | Removed | Remaining |
|---|---:|---:|
| Keep Ranked All Pick (game_mode 22) | 13,300 | 486,700 |
| Drop whole matches where any player abandoned | 76,230 | 410,470 |
| Keep matches of 15–90 minutes | 200 | 410,270 |
| Impossible values; incomplete matches | 0 | 410,270 |

**TrueSkill vs. MMR.** TrueSkill (Microsoft Research, 2007) is a Bayesian rating that is updated from wins and losses only.
μ is the estimated skill and σ is the uncertainty. In this dataset the dataset author computed it, not Valve.
Valve's ranked MMR is a separate, proprietary system. Our experiment found that gameplay statistics explain
essentially none of TrueSkill μ (R² between −0.024 and 0.022), so it was not used as a target.

**Limitations:** end-of-match statistics such as gold and tower damage partly *reflect* winning. The model
measures how strongly a stat line is associated with winning; it is not a pre-game forecast. The data is from 2015.

---

## 5. Licensing and attribution

Licences were read from the Kaggle dataset metadata on 16 Nov 2026.

| Dataset | Licence / terms | Attribution |
|---|---|---|
| CS:GO Professional Matches | **CC BY-NC-SA 4.0** (attribution, non-commercial, share-alike) | Mateus Dauernheimer Machado (Kaggle); data from HLTV.org |
| PUBG Finish Placement Prediction | Kaggle competition rules (accepted when downloading; academic use) | PUBG Corporation / Kaggle |
| Dota 2 Matches | **CC BY-SA 4.0** (attribution, share-alike) | Kaggle user devinanzelmo (profile name now shown as Timo Bozsolik); data from the OpenDota/YASP dump |
| Valorant Pro Matches since April 2021 | **CC0: Public Domain** | qualidea1217 (Kaggle); data from vlr.gg |
| Valorant Stats (ranked) | **CC0: Public Domain** | Ali Ibrahim (Kaggle); data from tracker.gg |

The project is academic and non-commercial. No dataset is redistributed: `data/raw/` is git-ignored.
