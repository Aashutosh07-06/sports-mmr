import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

# Use a throw-away SQLite database for tests (never the real history DB).
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp, 'test.db').as_posix()}"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services.registry import registry  # noqa: E402

GAMES = ["csgo", "pubg", "valorant", "dota2"]


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:     # runs lifespan: init DB + load models
        yield c


def default_inputs(game: str) -> dict:
    """Valid inputs built from the trained schema's median defaults."""
    schema = registry.get(game).schema
    return {f["name"]: f["default"] for f in schema["inputs"]}
