FROM python:3.11-slim
WORKDIR /app

# Install system deps for Playwright + BeautifulSoup
RUN apt-get update && apt-get install -y \
    gcc libpq-dev chromium chromium-driver \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium --with-deps

COPY . .

# Cloud Run requires binding to $PORT
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
