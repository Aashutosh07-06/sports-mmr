"""SQLite persistence for prediction history (SQLAlchemy 2.0).

Only gameplay inputs and model outputs are stored — no personal information.
Switching to MySQL only requires changing DATABASE_URL (e.g. mysql+pymysql://user:pw@host/db).
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, DateTime, Float, Integer, String, create_engine, select, delete
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game: Mapped[str] = mapped_column(String(32), index=True)
    target_name: Mapped[str] = mapped_column(String(64))
    model_name: Mapped[str] = mapped_column(String(64))
    inputs: Mapped[dict] = mapped_column(JSON)
    prediction: Mapped[float] = mapped_column(Float)
    result: Mapped[dict] = mapped_column(JSON)          # full response payload (interpretation + explanation)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                 default=lambda: datetime.now(timezone.utc), index=True)


_engine = None
_SessionLocal: sessionmaker | None = None


def init_db(url: str | None = None) -> None:
    global _engine, _SessionLocal
    url = url or settings.database_url
    if url.startswith("sqlite:///"):
        Path(url.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)
    _engine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {})
    Base.metadata.create_all(_engine)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)


def session() -> Session:
    if _SessionLocal is None:
        init_db()
    return _SessionLocal()


# ---- repository helpers -------------------------------------------------------------
def save_prediction(game: str, target_name: str, model_name: str, inputs: dict, prediction: float,
                    result: dict) -> Prediction:
    with session() as s:
        row = Prediction(game=game, target_name=target_name, model_name=model_name, inputs=inputs,
                         prediction=prediction, result=result)
        s.add(row)
        s.commit()
        s.refresh(row)
        return row


def list_predictions(game: str | None = None, limit: int = 50) -> list[Prediction]:
    with session() as s:
        q = select(Prediction).order_by(Prediction.created_at.desc(), Prediction.id.desc()).limit(limit)
        if game:
            q = q.where(Prediction.game == game)
        return list(s.scalars(q))


def get_prediction(pid: int) -> Prediction | None:
    with session() as s:
        return s.get(Prediction, pid)


def clear_predictions() -> int:
    with session() as s:
        n = s.execute(delete(Prediction)).rowcount
        s.commit()
        return n
