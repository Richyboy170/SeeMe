# SeeMe ML Service - Deployment Guide

## WORKSTREAM 1.1 + 1.2 Integration Complete

This guide covers deployment of the integrated face processing pipeline combining:
- **WORKSTREAM 1.1**: Face Detection & Segmentation
- **WORKSTREAM 1.2**: Structure Extraction (Depth & Edges)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              FastAPI ML Service                         │
│                 (Port 8000)                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │       IntegratedFacePipeline                     │  │
│  │                                                   │  │
│  │  WORKSTREAM 1.1: Face Detection & Segmentation  │  │
│  │  ├── FaceDetector (MediaPipe)                   │  │
│  │  ├── FaceParser (BiSeNet)                       │  │
│  │  └── FaceExtractor                              │  │
│  │                                                   │  │
│  │  WORKSTREAM 1.2: Structure Extraction           │  │
│  │  ├── DepthEstimator (MiDaS DPT_Large)          │  │
│  │  ├── NormalEstimator                            │  │
│  │  └── EdgeDetector (Multi-scale)                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Disk: 5GB free space
- Python: 3.9+

**Recommended (with GPU):**
- GPU: NVIDIA GPU with 4GB+ VRAM
- CUDA: 11.8+
- cuDNN: 8.0+
- RAM: 16GB

### Software Requirements

- Python 3.9 or higher
- pip (latest version)
- Virtual environment (venv)

---

## Installation

### 1. Clone Repository

```bash
cd SeeMe
cd ml-service
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

**Key Dependencies:**
- `fastapi==0.115.0` - Web framework
- `torch>=2.6.0` - PyTorch for deep learning
- `torchvision>=0.21.0` - Vision utilities
- `opencv-python>=4.10.0` - Image processing
- `mediapipe>=0.10.30` - Face detection
- `timm>=1.0.0` - PyTorch Image Models (for MiDaS)
- `scipy>=1.11.0` - Scientific computing
- `loguru==0.7.2` - Logging

### 4. Download Models

The service uses two main models:

**BiSeNet Face Parsing** (already integrated in WORKSTREAM 1.1)
- Automatically downloaded via torch hub

**MiDaS Depth Estimation** (WORKSTREAM 1.2)
- Automatically downloaded on first use (~1.4GB)
- Cached in `~/.cache/torch/hub/`

Optional: Pre-download models:
```bash
python scripts/download_midas.py --verify
```

### 5. Configure Environment

Create `.env.ml` file in `ml-service/` directory:

```env
# Service Configuration
SERVICE_NAME=SeeMe ML Service
SERVICE_VERSION=1.0.0
HOST=0.0.0.0
PORT=8000

# AWS S3 (for image storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=seeme-images
CLOUDFRONT_URL=https://your-cloudfront-url.com

# Redis
REDIS_URL=redis://:password@localhost:6379/0

# RabbitMQ (optional for async processing)
RABBITMQ_URL=amqp://user:password@localhost:5672/vhost

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:19006"]

# Processing
MAX_IMAGE_SIZE=10485760  # 10MB
LOG_LEVEL=INFO
```

---

## Running the Service

### Development Mode

```bash
cd ml-service/src
python main.py
```

Or using uvicorn directly:
```bash
cd ml-service/src
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
cd ml-service/src
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Production Configuration:**
- Use `--workers` based on available CPU cores
- Set `--log-level info` for production logging
- Use process manager (systemd, supervisor, or PM2)
- Enable HTTPS with reverse proxy (nginx)

---

## API Endpoints

### Health & Status

#### `GET /health`
Service health check
```json
{
  "status": "healthy",
  "service": "SeeMe ML Service",
  "version": "1.0.0",
  "gpu_available": true,
  "all_models_ready": true
}
```

#### `GET /api/face/pipeline/info`
Pipeline configuration info
```json
{
  "workstreams": ["1.1: Face Detection & Segmentation", "1.2: Structure Extraction"],
  "components": {
    "face_detector": "active",
    "depth_estimator": "active",
    ...
  },
  "device": "cuda"
}
```

### Face Processing

#### `POST /api/face/validate`
Quick face validation (detection only)

**Request:**
- `file`: Image file (multipart/form-data)

**Response:**
```json
{
  "face_detected": true,
  "confidence": 0.98,
  "bbox": {"x": 100, "y": 50, "width": 200, "height": 250},
  "processing_time": 0.045
}
```

#### `POST /api/face/process`
Full pipeline processing

**Request (multipart/form-data):**
- `file`: Image file (required)
- `user_id`: User identifier
- `avatar_id`: Avatar identifier
- `quality`: "fast" | "standard" | "high" (default: "standard")
- `enable_depth`: bool (default: true)
- `enable_normals`: bool (default: true)
- `enable_edges`: bool (default: true)
- `return_visualizations`: bool (default: false)
- `return_images`: bool (default: false)

**Response:**
```json
{
  "success": true,
  "face_detected": true,
  "face_bbox": {"x": 100, "y": 50, "width": 200, "height": 250},
  "face_confidence": 0.98,
  "segmentation_quality_valid": true,
  "depth_features": {
    "mean_depth": 130.15,
    "depth_range": 255.0,
    ...
  },
  "depth_quality_valid": true,
  "normal_features": {
    "mean_x": 0.02,
    "mean_z": 0.99,
    ...
  },
  "edge_statistics": {
    "total_pixels": 15234,
    "coarse_pixels": 8520,
    ...
  },
  "timings": {
    "face_detection": 0.045,
    "face_parsing": 0.850,
    "depth_estimation": 1.850,
    "normal_generation": 0.080,
    "edge_detection": 0.220,
    "total": 3.045
  }
}
```

---

## Testing

### Unit Tests

Test individual components:

```bash
cd ml-service

# Test WORKSTREAM 1.2 components
python -m unittest tests.test_workstream_1_2 -v

# Test depth estimation
python tests/test_depth_estimation.py

# Test integrated pipeline
python test_integrated_pipeline.py testPic/image.jpg
```

### API Tests

Test REST endpoints:

```bash
# Start the service first
cd ml-service/src
python main.py

# In another terminal, run tests
cd ml-service
python test_api.py http://localhost:8000
```

### Load Testing

Use Apache Bench or similar:
```bash
ab -n 100 -c 10 -p test_image.jpg -T image/jpeg http://localhost:8000/api/face/process
```

---

## Performance Benchmarks

**Hardware:** Intel i7, 16GB RAM, NVIDIA GPU

| Operation | GPU Time | CPU Time | Target |
|-----------|----------|----------|--------|
| Face Detection | ~45ms | ~80ms | <200ms |
| Face Parsing | ~850ms | ~2.5s | <3s |
| Depth Estimation | ~1.8s | ~5s | <8s |
| Normal Generation | ~80ms | ~150ms | <200ms |
| Edge Detection | ~220ms | ~250ms | <500ms |
| **Full Pipeline** | **~3s** | **~8s** | **<10s** |

---

## Monitoring

### Logs

Logs are written to:
- Console: Colored output with timestamps
- File: `logs/ml_service_YYYY-MM-DD.log` (rotated daily)

Log levels: DEBUG, INFO, WARNING, ERROR

### Metrics to Monitor

1. **Response Times**
   - p50, p95, p99 latencies
   - Track per endpoint

2. **Success Rates**
   - Face detection success rate (target: >95%)
   - Processing success rate (target: >90%)

3. **Resource Usage**
   - CPU utilization
   - Memory usage
   - GPU utilization (if available)
   - Disk I/O

4. **Model Performance**
   - Depth quality validation pass rate
   - Normal quality validation pass rate
   - Segmentation quality validation pass rate

---

## Troubleshooting

### Common Issues

#### 1. ModuleNotFoundError: No module named 'timm'

**Solution:**
```bash
pip install timm>=1.0.0
```

#### 2. CUDA out of memory

**Solution:** Use CPU mode or reduce batch size
```python
# In config or environment
FORCE_CPU=true
```

#### 3. Model download fails

**Solution:** Manual download or check internet connection
```bash
python scripts/download_midas.py --verify
```

#### 4. Slow processing times

**Checklist:**
- [ ] GPU available? Check `torch.cuda.is_available()`
- [ ] Models cached? First run downloads models
- [ ] Image resolution too high? Resize before processing
- [ ] Multiple concurrent requests? Add queue system

#### 5. Face detection failing

**Common causes:**
- Low quality image
- Face too small (< 100x100 pixels)
- Extreme angles (> 45 degrees)
- Poor lighting

---

## Production Deployment

### Using Systemd (Linux)

Create `/etc/systemd/system/seeme-ml.service`:

```ini
[Unit]
Description=SeeMe ML Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/seeme/ml-service/src
Environment="PATH=/opt/seeme/ml-service/venv/bin"
ExecStart=/opt/seeme/ml-service/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable seeme-ml
sudo systemctl start seeme-ml
sudo systemctl status seeme-ml
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY models/ ./models/

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t seeme-ml-service .
docker run -p 8000:8000 seeme-ml-service
```

### Using Nginx Reverse Proxy

```nginx
upstream ml_service {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name ml.seeme.app;

    client_max_body_size 20M;

    location / {
        proxy_pass http://ml_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
}
```

---

## Security Considerations

1. **Input Validation**
   - File type validation enforced
   - File size limits (10MB default)
   - Image format validation

2. **Rate Limiting**
   - Implement per-user rate limits
   - Use Redis for distributed rate limiting

3. **Authentication**
   - Add API key authentication
   - Use JWT tokens for user requests

4. **Network Security**
   - Use HTTPS in production
   - Firewall rules to restrict access
   - VPC for AWS deployment

---

## Scaling

### Horizontal Scaling

1. **Load Balancer**
   - Use nginx or AWS ALB
   - Distribute requests across multiple instances

2. **Auto-scaling**
   - Scale based on CPU/GPU usage
   - Scale based on queue depth

### Vertical Scaling

1. **GPU Acceleration**
   - Use GPU instances (AWS p3, p4)
   - Batch processing for efficiency

2. **Async Processing**
   - Use Celery + Redis for job queue
   - Return job ID immediately
   - Poll for results

---

## Support

For issues or questions:
- Check logs: `logs/ml_service_*.log`
- Review test results: `test_output/`
- Check model status: `GET /api/models/status`

---

**Last Updated:** 2026-01-09
**Version:** 1.0.0
**Status:** Production Ready
