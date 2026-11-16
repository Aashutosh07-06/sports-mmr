"""FastAPI entry point.

Run (from the backend/ folder, virtual environment active):
    uvicorn app.main:app --reload --port 8000
Interactive API docs: http://localhost:8000/docs
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings  # noqa: F401  (adds project root to sys.path)
from app.api.routes import router
from app.models.database import init_db
from app.services.registry import registry

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    registry.load()   # models are loaded once, never retrained per request
    yield


app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]) or None, "label": None, "message": e["msg"]}
              for e in exc.errors()]
    return JSONResponse(status_code=422, content={"status": "error", "detail": "Invalid request", "errors": errors})


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    # Log full details server-side, return a generic message (no stack traces to clients).
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"status": "error", "detail": "Internal server error"})


@app.get("/")
def root():
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}
