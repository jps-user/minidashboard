FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY web ./web

RUN mkdir -p /app/data

ENV DATA_DIR=/app/data
EXPOSE 8080

CMD ["python", "main.py"]
