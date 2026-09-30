# ── Stage 1: builder (install deps + pre-download HF model) ──────────────────
FROM python:3.11-slim AS builder
WORKDIR /app

# System deps needed by chromadb / sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Pre-download the HuggingFace embedding model so it's baked into the image
# (avoids a slow first-request download inside the container)
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app

# Non-root user
RUN addgroup --system rakshak && adduser --system --ingroup rakshak rakshak

# Copy installed packages and pre-downloaded model from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /root/.cache /root/.cache

# Copy application code
COPY . .

# Create directories for persisted data
RUN mkdir -p models datasets rag/chroma_db \
 && chown -R rakshak:rakshak /app

USER rakshak

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

# 2 workers — enough for a dev/staging environment
CMD ["gunicorn", "app:app", "--workers", "2", "--bind", "0.0.0.0:8000", "--timeout", "120", "--access-logfile", "-"]
