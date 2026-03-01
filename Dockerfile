# ── Backend Dockerfile ────────────────────────────────────────────────────────
# Runs the Flask API server on port 5001
FROM python:3.12-slim

WORKDIR /app

# Install deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose the Flask port
EXPOSE 5001

# Run with gunicorn for production stability (falls back to Flask dev if missing)
CMD ["python", "app.py"]
