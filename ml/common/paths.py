"""Central place for filesystem locations so no script hardcodes absolute paths."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_RAW = ROOT / "data" / "raw"
ARTIFACTS = ROOT / "ml" / "artifacts"


def artifact_dir(game: str) -> Path:
    path = ARTIFACTS / game
    path.mkdir(parents=True, exist_ok=True)
    return path
