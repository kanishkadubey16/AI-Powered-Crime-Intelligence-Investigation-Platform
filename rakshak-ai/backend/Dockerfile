# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S rakshak && adduser -S rakshak -G rakshak

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure uploads directories exist and are writable
RUN mkdir -p uploads/reports && chown -R rakshak:rakshak /app

USER rakshak

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8001/api/health || exit 1

CMD ["node", "server.js"]
