# server/Dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run FastAPI with uvicorn
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
