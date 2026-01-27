# SeeMe 3D Sandbox

Phase 3.1: Full-Body 3D Avatar & Skeleton CV System

## Structure

```
sandbox-3d/
├── cv-service/          # Python FastAPI (pose detection)
└── mobile-renderer/     # React Native (3D rendering)
```

## Quick Start

### Terminal 1: CV Service
```bash
cd cv-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python main.py
```

### Terminal 2: Mobile App
```bash
cd mobile-renderer
npm install
npx expo start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/body-avatar/detect-person` | Detect person |
| `POST /api/body-avatar/extract-landmarks` | Extract landmarks |
| `POST /api/body-avatar/pose-to-rig` | Get VRM rotations |
| `POST /api/body-avatar/full-pipeline` | Complete pipeline |

## Integration

When sandbox is working, copy files to main project:
- `cv-service/src/body_detection/*.py` -> `ml-service/src/body_detection/`
- `mobile-renderer/src/**` -> `mobile/src/`

See MASTER_3D.md for detailed integration instructions.
