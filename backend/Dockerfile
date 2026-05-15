FROM python:3.11-slim

WORKDIR /app

COPY requirements.prod.txt .
RUN pip install --no-cache-dir -r requirements.prod.txt

COPY server.py .

EXPOSE 8001

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
