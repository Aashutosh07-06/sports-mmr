"""Small helper that records every cleaning step and how many rows it removed.
The log is saved in metrics.json and reproduced in the dataset documentation."""
from __future__ import annotations

import pandas as pd


class CleaningLog:
    def __init__(self) -> None:
        self.steps: list[dict] = []

    def apply(self, df: pd.DataFrame, mask_keep, step: str) -> pd.DataFrame:
        """Keep rows where mask_keep is True and log the number removed."""
        before = len(df)
        out = df[mask_keep]
        self.steps.append({"step": step, "rows_before": before, "rows_after": len(out),
                           "removed": before - len(out)})
        print(f"  [clean] {step}: -{before - len(out):,} -> {len(out):,}")
        return out

    def note(self, step: str, rows: int) -> None:
        self.steps.append({"step": step, "rows_before": rows, "rows_after": rows, "removed": 0})
        print(f"  [clean] {step}: {rows:,} rows")
