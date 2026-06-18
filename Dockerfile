# =============================================================================
# Carbon Footprint Tracker — Multi-stage Dockerfile (Google Cloud Run)
# Stage 1: Build React/Vite static assets (Node 20 Alpine)
# Stage 2: FastAPI runtime serving API + static UI (Python 3.10 Slim)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — Frontend Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install dependencies first (layer cache)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and compile production assets → dist/
COPY frontend/ ./
RUN npm run build


# -----------------------------------------------------------------------------
# Stage 2 — Production Runtime
# -----------------------------------------------------------------------------
FROM python:3.10-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    STATIC_DIR=/app/static \
    PORT=8080

WORKDIR /app

# Install runtime dependencies, then remove apt lists to keep the image slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-privileged user (rootless at runtime)
RUN groupadd --gid 1001 appuser \
    && useradd --uid 1001 --gid appuser --shell /usr/sbin/nologin --create-home appuser

# Install Python production dependencies (no dev/test packages)
COPY backend/requirements-prod.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements-prod.txt

# Copy backend application code
COPY backend/app ./app

# Copy compiled frontend assets from Stage 1 into static/
COPY --from=frontend-builder /build/frontend/dist ./static

# Ensure the runtime user owns application files
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8080

# Cloud Run injects PORT; default to 8080 for local docker run
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
