FROM python:3.11-slim

# ============================================
# Set Working Directory
# ============================================

WORKDIR /app

# ============================================
# Install System Dependencies
# ============================================

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Copy Requirements
# ============================================

COPY requirements.txt .

# ============================================
# Install Python Dependencies
# ============================================

RUN pip install --no-cache-dir -r requirements.txt

# ============================================
# Copy Project Files
# ============================================

COPY . .

# ============================================
# Expose FastAPI Port
# ============================================

EXPOSE 8000

# ============================================
# Start FastAPI Server
# ============================================

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]