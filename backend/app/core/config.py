"""Application settings (read from environment variables / .env with safe defaults)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent

# The ML package (ml/) lives at the project root; make it importable so the API reuses
# exactly the same feature-engineering code that was used in training.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _load_dotenv() -> None:
    env = PROJECT_ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()


class Settings:
    app_name = "Gaming & Esports Performance Predictor API"
    version = "1.0.0"
    # `or` so that an empty value in .env (e.g. "DATABASE_URL=") falls back to the default
    artifacts_dir = Path(os.getenv("ARTIFACTS_DIR") or PROJECT_ROOT / "ml" / "artifacts")
    database_url = os.getenv("DATABASE_URL") or f"sqlite:///{(BACKEND_DIR / 'data' / 'predictions.db').as_posix()}"
    cors_origins = [o.strip() for o in (os.getenv("CORS_ORIGINS") or
                    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173").split(",") if o.strip()]
    games = ["csgo", "pubg", "valorant", "dota2"]
    # built React app, served by FastAPI in single-command mode (start.bat)
    frontend_dist = Path(os.getenv("FRONTEND_DIST") or PROJECT_ROOT / "frontend" / "dist")


settings = Settings()
