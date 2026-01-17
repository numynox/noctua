# Multi-stage Dockerfile for Noctua
# Supports running individual steps or the full pipeline

FROM python:3.12-slim AS python-base

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy Python project files
COPY pyproject.toml .
COPY python/ python/
COPY config/ config/

# Install Python dependencies
RUN uv sync --frozen

# -------------------------------------------
# Node.js stage
FROM node:20-slim AS node-base

WORKDIR /app

# Copy Node.js project files
COPY package.json .
COPY node/ node/
COPY config/ config/

# Install dependencies for both Node.js steps
RUN cd node/step3_summarize && npm install
RUN cd node/step4_website && npm install

# -------------------------------------------
# Full pipeline stage
FROM python:3.12-slim AS full

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN uv sync --frozen
RUN cd node/step3_summarize && npm install
RUN cd node/step4_website && npm install

# Environment variables
ENV NOCTUA_ROOT=/app
ENV NOCTUA_OUTPUT_DIR=/app/output
ENV NOCTUA_CACHE_DIR=/app/.cache

# Default command runs the full pipeline
CMD ["sh", "-c", "\
    echo '=== Step 1: Download feeds ===' && \
    uv run python -m python.step1_download.main && \
    echo '=== Step 2: Filter feeds ===' && \
    uv run python -m python.step2_filter.main && \
    echo '=== Step 3: Summarize ===' && \
    cd node/step3_summarize && npm run summarize && cd ../.. && \
    echo '=== Step 4: Build website ===' && \
    cd node/step4_website && npm run build && cd ../.. && \
    echo '=== Done! Output in /app/output/step4 ===' \
"]

# -------------------------------------------
# Python-only stage (steps 1 & 2)
FROM python-base AS python-steps

ENV NOCTUA_ROOT=/app
ENV NOCTUA_OUTPUT_DIR=/app/output

CMD ["sh", "-c", "\
    uv run python -m python.step1_download.main && \
    uv run python -m python.step2_filter.main \
"]

# -------------------------------------------
# Node-only stage (steps 3 & 4)
FROM node-base AS node-steps

ENV NOCTUA_ROOT=/app
ENV NOCTUA_OUTPUT_DIR=/app/output
ENV NOCTUA_CACHE_DIR=/app/.cache

# Expects step2 output to be mounted at /app/output/step2
CMD ["sh", "-c", "\
    cd node/step3_summarize && npm run summarize && \
    cd ../step4_website && npm run build \
"]
