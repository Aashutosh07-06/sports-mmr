# Statline: one container that serves the API + the React website (same as run.bat).
# Used by Render (render.yaml) and Hugging Face Spaces. Raw datasets are NOT needed:
# the trained models in ml/artifacts are committed to the repository.

# ---- Stage 1: build the React frontend ---------------------------------------------
FROM node:24-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python runtime -------------------------------------------------------
FROM python:3.12-slim
# libgomp1: OpenMP runtime required by XGBoost on Linux
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

COPY requirements-deploy.txt .
RUN pip install -r requirements-deploy.txt

COPY ml/ ml/
COPY backend/app/ backend/app/
COPY --from=web /web/dist frontend/dist

# Non-root user (uid 1000 is also what Hugging Face Spaces expects)
RUN useradd -m -u 1000 appuser && mkdir -p backend/data && chown -R appuser /app
USER appuser

# Render sets $PORT; default 8000 elsewhere
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT}"]
