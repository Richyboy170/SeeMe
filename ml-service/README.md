# SeeMe ML Service

Python-based machine learning service for face detection, segmentation, and avatar style transfer.

## Overview

The ML Service is responsible for processing images uploaded by users and applying avatar-style transformations using deep learning models. It runs as a separate microservice and communicates with the backend via RabbitMQ message queue.

## Tech Stack

- **Python 3.10+** - Core language
- **FastAPI** - REST API framework
- **PyTorch 2.5+** - Deep learning framework
- **OpenCV** - Image processing
- **MediaPipe** - Face detection and landmarks
- **Celery** - Distributed task queue
- **RabbitMQ** - Message broker
- **Redis** - Result backend
- **AWS S3** - Image storage

## Project Structure

```
ml-service/
├── src/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration management
│   ├── celery_app.py        # Celery worker configuration
│   ├── models/
│   │   ├── __init__.py
│   │   └── loader.py        # Model loading utilities
│   └── tasks/
│       ├── __init__.py
│       └── process_image.py # Image processing tasks
├── scripts/
│   └── download_models.py   # Download pre-trained models
├── models/                  # ML model weights (downloaded)
├── logs/                    # Application logs
├── venv/                    # Python virtual environment
├── requirements.txt         # Python dependencies
├── .env.ml                  # Environment variables
├── setup.ps1               # Setup script (PowerShell)
├── setup.bat               # Setup script (Batch)
├── start_server.ps1        # Start FastAPI server (PowerShell)
├── start_server.bat        # Start FastAPI server (Batch)
├── start_worker.ps1        # Start Celery worker (PowerShell)
└── start_worker.bat        # Start Celery worker (Batch)
```

## Prerequisites

1. **Python 3.10 or higher** installed
2. **Docker** running with infrastructure services:
   - PostgreSQL
   - MongoDB
   - Redis
   - RabbitMQ
3. **AWS Account** with S3 bucket configured
4. **GPU (Optional)** - CUDA-compatible GPU for faster processing

## Quick Start

### 1. Setup Environment

**Using PowerShell:**
```powershell
.\setup.ps1
```

**Using Batch:**
```batch
setup.bat
```

**Manual Setup:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (PowerShell)
.\venv\Scripts\Activate.ps1

# OR Activate virtual environment (CMD)
venv\Scripts\activate.bat

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Download ML models
python scripts\download_models.py
```

### 2. Configure Environment Variables

Create or verify `.env.ml` file with your configuration:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=seeme-images-dev
CLOUDFRONT_URL=https://your-cloudfront-url.cloudfront.net

# Redis Configuration
REDIS_URL=redis://:seeme_redis_2026@localhost:6379/0

# RabbitMQ Configuration
RABBITMQ_URL=amqp://seeme:seeme_rabbit_2026@localhost:5672/seeme_vhost

# Service Configuration
HOST=0.0.0.0
PORT=8000

# Logging
LOG_LEVEL=INFO
```

### 3. Start the Services

You need to run **both** the FastAPI server and the Celery worker:

**Terminal 1 - FastAPI Server:**
```powershell
.\start_server.ps1
# OR
start_server.bat
```

**Terminal 2 - Celery Worker:**
```powershell
.\start_worker.ps1
# OR
start_worker.bat
```

## API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "SeeMe ML Service",
  "version": "0.1.0",
  "gpu_available": true,
  "gpu_device": "NVIDIA GeForce RTX 3080",
  "models_loaded": {
    "bisenet_face_parsing.pth": true,
    "midas_v3_1.pt": true
  },
  "all_models_ready": true
}
```

### Process Image
```http
POST /api/process
Content-Type: multipart/form-data

file: <image_file>
user_id: <user_id>
avatar_id: <avatar_id>
```

**Response:**
```json
{
  "status": "success",
  "message": "Image received",
  "file_size": 1234567,
  "filename": "photo.jpg",
  "user_id": "user123",
  "avatar_id": "avatar456"
}
```

### Models Status
```http
GET /api/models/status
```

**Response:**
```json
{
  "models": {
    "bisenet_face_parsing.pth": true,
    "midas_v3_1.pt": true
  },
  "models_directory": "C:\\path\\to\\models",
  "all_ready": true
}
```

## ML Models

The service uses the following pre-trained models:

### 1. BiSeNet (Face Parsing)
- **Purpose:** Semantic segmentation of facial features
- **Size:** ~50 MB
- **Source:** [face-parsing.PyTorch](https://github.com/zllrunning/face-parsing.PyTorch)
- **File:** `bisenet_face_parsing.pth`

### 2. MiDaS (Depth Estimation)
- **Purpose:** Monocular depth estimation
- **Size:** ~1.3 GB
- **Source:** [MiDaS](https://github.com/isl-org/MiDaS)
- **Model:** DPT-BEiT-Large-512
- **File:** `midas_v3_1.pt`

## Development

### Running Tests
```bash
# Activate virtual environment first
.\venv\Scripts\Activate.ps1

# Run tests (to be implemented)
pytest tests/
```

### Monitoring Celery Tasks

View RabbitMQ Management UI:
```
http://localhost:15672
Username: seeme
Password: seeme_rabbit_2026
```

### Logs

Logs are stored in the `logs/` directory with daily rotation:
- Format: `ml_service_YYYY-MM-DD.log`
- Retention: 30 days
- Console output: Colored, structured logs

## Troubleshooting

### Virtual Environment Issues
```bash
# If activation fails, recreate the virtual environment
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Model Download Issues
```bash
# Manually download models
python scripts\download_models.py
```

### Celery Worker Issues (Windows)
- Use `--pool=solo` for Windows compatibility
- Avoid `--pool=prefork` (Unix-only)
- Alternative: Use `gevent` pool
  ```bash
  pip install gevent
  celery -A celery_app worker --pool=gevent
  ```

### GPU Not Detected
```python
# Check GPU availability
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"

# Install CUDA-enabled PyTorch (if needed)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

## Phase 0 Status

**✅ Completed:**
- FastAPI application skeleton
- Health check endpoints
- File upload validation
- Celery worker configuration
- Model download scripts
- Logging infrastructure
- Environment configuration

**⏳ Pending (Future Phases):**
- Actual ML model inference
- Face detection integration
- Avatar style transfer
- S3 upload/download
- Result caching
- Performance optimization

## Contributing

See main project README for contribution guidelines.

## License

Proprietary - SeeMe Project 2026
