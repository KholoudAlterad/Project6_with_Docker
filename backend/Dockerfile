# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# ── Install system tools (sqlite3) ─────────────────────────────────────────────
RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 \
  && rm -rf /var/lib/apt/lists/*

# ── App setup ─────────────────────────────────────────────────────────────────
WORKDIR /app
COPY . /app

# Install backend Python dependencies
RUN pip install --upgrade pip \
  && pip install --no-cache-dir \
       fastapi "uvicorn[standard]" sqlalchemy passlib pyjwt pydantic email-validator python-multipart boto3

EXPOSE 8000

# Note: build context is ./backend, so the module is just "main:app"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
