# CV Service - 3D Sandbox

Computer Vision service for body detection, landmark extraction, and pose-to-rig mapping.

## Setup

```bash
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

Server runs at: http://localhost:8001

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/body-avatar/detect-person` | POST | Detect person in image |
| `/api/body-avatar/extract-landmarks` | POST | Extract holistic landmarks |
| `/api/body-avatar/extract-skeleton` | POST | Build skeleton from landmarks |
| `/api/body-avatar/pose-to-rig` | POST | Convert pose to VRM rotations |
| `/api/body-avatar/full-pipeline` | POST | Run complete pipeline |

## API Documentation

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
