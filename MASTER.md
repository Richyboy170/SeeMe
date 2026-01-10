# MASTER.md - SeeMe Application Development Specification

**Version:** 1.0
**Last Updated:** January 2026
**Project Type:** Social Media Platform with Avatar-Based Face Replacement
**Core Innovation:** Edge-preserving semantic style transfer for expression-preserving avatarization

---

## 🎯 PROJECT VISION

**Mission Statement:**
Create a social media platform where users' faces are replaced with customizable avatars, eliminating judgment based on physical appearance while preserving authentic emotional expression.

**Core Differentiator:**
Unlike traditional avatar systems that use pre-made expressions, SeeMe preserves the user's actual facial expressions through edge-detection and semantic-aware style transfer, maintaining authenticity while providing anonymity.

**Target Audience:**
- Primary: Ages 15-35
- Geographic: Global (English first, multilingual later)
- Psychographic: Privacy-conscious, creative, socially active individuals who want authentic connection without appearance-based judgment

---

## 📐 TECHNICAL ARCHITECTURE

### **System Components**

```
┌─────────────────────────────────────────────────────────────────┐
│                     MOBILE APPLICATION                          │
│  React Native + Expo + TypeScript                               │
│  - iOS (14+) and Android (10+)                                  │
│  - Offline-capable core features                                │
└────────────────┬────────────────────────────────────────────────┘
                 │ REST API + WebSocket
┌────────────────▼────────────────────────────────────────────────┐
│                   NODE.JS API SERVER                            │
│  Express + TypeScript                                           │
│  - Authentication & Authorization                               │
│  - Business Logic & Data Management                             │
│  - Job Queue Management                                         │
└──┬──────────────┬──────────────┬──────────────┬────────────────┘
   │              │              │              │
   ▼              ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│PostgreSQL│ │ MongoDB  │ │  Redis   │ │ Python ML Service│
│ (Users,  │ │ (Avatar  │ │(Cache &  │ │   (FastAPI)      │
│  Posts,  │ │ Configs, │ │ Session) │ │ - Face Detection │
│ Social)  │ │ Market)  │ │          │ │ - Segmentation   │
│          │ │          │ │          │ │ - Style Transfer │
└──────────┘ └──────────┘ └──────────┘ └────────┬─────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │  RabbitMQ Queue  │
                                        │ (Async Processing)│
                                        └──────────────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │   AWS S3 + CDN   │
                                        │ (Image Storage)  │
                                        └──────────────────┘
```

---

## 🔒 NON-NEGOTIABLE REQUIREMENTS

### **Legal & Compliance**
1. **Age Restriction:** Minimum age 15+, strictly enforced
2. **GDPR Compliance:** Right to deletion, data export, consent management
3. **COPPA Compliance:** No users under 13, parental consent for 13-15
4. **Content Policy:** No real faces in posts (enforced by ML)
5. **Privacy:** User photos not stored after processing (configurable)

### **Security**
1. **Authentication:** JWT tokens, refresh token rotation, secure session management
2. **Data Encryption:** At-rest and in-transit (TLS 1.3)
3. **API Rate Limiting:** Per-user and per-IP limits
4. **Input Validation:** All user inputs sanitized and validated
5. **Payment Security:** PCI compliance via Stripe (no card data storage)

### **Performance Targets**
1. **Avatar Processing Time:** <5 seconds (standard quality)
2. **App Startup:** <2 seconds to interactive
3. **Feed Load Time:** <1 second (cached), <3 seconds (fresh)
4. **API Response Time:** p95 <500ms
5. **Crash-Free Rate:** >99.5%

### **Quality Standards**
1. **Expression Preservation:** >90% accuracy (subjective evaluation)
2. **Face Detection Rate:** >95% success on standard photos
3. **Processing Success Rate:** >90% (including edge cases)
4. **App Store Rating:** Target >4.2 stars
5. **User Retention:** >40% Day 7 retention

---

## 📋 PHASE BREAKDOWN

---

# PHASE 0: FOUNDATION & SETUP

**Duration:** 3 weeks
**Parallel Workstreams:** 3 (Infrastructure, Backend Setup, ML Environment)
**Goal:** Complete development environment with all services running and integrated

---

## WORKSTREAM 0.1: INFRASTRUCTURE SETUP

**Agent:** Infrastructure Agent
**Duration:** Week 1
**Dependencies:** None
**Output:** Running local and cloud infrastructure

### **Tasks:**

#### Task 0.1.1: Local Development Environment
**Conditions:**
- [ ] Docker Desktop installed and running
- [ ] Docker Compose configured with all services
- [ ] All services start with single command (`docker-compose up`)
- [ ] Services include: PostgreSQL 15+, MongoDB 6+, Redis 7+, RabbitMQ 3.12+

**Deliverables:**
```yaml
# docker-compose.yml must include:
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: seeme_dev
      POSTGRES_USER: seeme
      POSTGRES_PASSWORD: [secure_password]
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  mongodb:
    image: mongo:6-jammy
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"  # Management UI
```

**Quality Checks:**
- All services healthy after startup
- Can connect to each service from host machine
- Data persists across container restarts

---

#### Task 0.1.2: Cloud Account Setup
**Conditions:**
- [ ] AWS account created and configured
- [ ] S3 bucket created: `seeme-images-dev`
- [ ] IAM user created with limited permissions (S3 only)
- [ ] CloudFront distribution configured (basic)
- [ ] Firebase project created for authentication
- [ ] MongoDB Atlas free tier cluster created

**Deliverables:**
- AWS credentials file with access keys
- Firebase service account JSON
- MongoDB connection string
- All credentials stored in `.env` (never committed)

**Security Requirements:**
- S3 bucket must have public access blocked
- CloudFront must be only access point
- IAM user follows principle of least privilege
- All API keys rotatable

---

#### Task 0.1.3: Repository Structure
**Conditions:**
- [ ] GitHub repository created
- [ ] Monorepo structure established
- [ ] Git hooks configured (pre-commit, pre-push)
- [ ] README.md with setup instructions
- [ ] .gitignore properly configured

**Deliverables:**
```
seeme-app/
├── .github/
│   └── workflows/           # GitHub Actions (Phase 4)
├── mobile/                  # React Native app
├── backend/                 # Node.js API
├── ml-service/              # Python ML pipeline
├── infrastructure/          # Terraform, Docker configs
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── .gitignore
├── docker-compose.yml
├── README.md
└── MASTER.md               # This file
```

**Quality Checks:**
- Can clone and run with documented steps
- No secrets in repository
- All team members can access

---

## WORKSTREAM 0.2: BACKEND SETUP

**Agent:** Backend Agent
**Duration:** Week 2
**Dependencies:** Infrastructure Setup (0.1) complete
**Output:** Functional Node.js API with database connections

### **Tasks:**

#### Task 0.2.1: Node.js Project Initialization
**Conditions:**
- [ ] Node.js 18+ installed
- [ ] TypeScript configured (strict mode)
- [ ] Express server running on port 3000
- [ ] Environment variables loaded from .env
- [ ] Logging configured (Winston or Pino)

**Deliverables:**
```typescript
// backend/src/index.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (to be added)
// app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

**Quality Checks:**
- `curl localhost:3000/health` returns 200
- Logs show structured JSON output
- TypeScript compilation has 0 errors

**Code Standards:**
- ESLint + Prettier configured
- All functions have JSDoc comments
- Async/await (no callbacks)
- Error handling in all routes

---

#### Task 0.2.2: Database Layer Setup
**Conditions:**
- [ ] PostgreSQL connection pool configured
- [ ] Sequelize ORM initialized
- [ ] MongoDB connection established
- [ ] Mongoose schemas ready
- [ ] Redis client connected

**Deliverables:**

**PostgreSQL (Sequelize):**
```typescript
// backend/src/config/database.ts
import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: false, // or custom logger
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
sequelize.authenticate()
  .then(() => logger.info('PostgreSQL connected'))
  .catch(err => logger.error('PostgreSQL connection failed:', err));
```

**MongoDB (Mongoose):**
```typescript
// backend/src/config/mongodb.ts
import mongoose from 'mongoose';

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      maxPoolSize: 10,
      minPoolSize: 2
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed:', err);
    process.exit(1);
  }
};

export default connectMongoDB;
```

**Redis:**
```typescript
// backend/src/config/redis.ts
import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => logger.error('Redis error:', err));
redisClient.on('connect', () => logger.info('Redis connected'));

await redisClient.connect();
```

**Quality Checks:**
- All database connections succeed on startup
- Connection pooling configured appropriately
- Graceful shutdown closes connections
- Error handling for connection failures

---

#### Task 0.2.3: Initial Database Schemas
**Conditions:**
- [ ] User model defined (PostgreSQL)
- [ ] Post model defined (PostgreSQL)
- [ ] Avatar config model defined (MongoDB)
- [ ] Database migrations created
- [ ] Seeds for development data

**Deliverables:**

**User Model (Sequelize):**
```typescript
// backend/src/models/User.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class User extends Model {
  public id!: string;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public ageVerified!: boolean;
  public activeAvatarId!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  ageVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  activeAvatarId: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'users',
  timestamps: true
});
```

**Avatar Config Model (Mongoose):**
```typescript
// backend/src/models/AvatarConfig.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAvatarConfig extends Document {
  userId: string;
  avatarId: string;
  name: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: {
    skinTone: string;
    eyeColor: string;
    eyeSize: number;
    hairColor: string;
    hairStyle: string;
    accessories: {
      glasses: string | null;
      hat: string | null;
      earrings: string | null;
    };
  };
  isActive: boolean;
  createdAt: Date;
}

const AvatarConfigSchema = new Schema({
  userId: { type: String, required: true, index: true },
  avatarId: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 50 },
  style: { 
    type: String, 
    enum: ['cartoon', 'anime', 'minimalist'], 
    required: true 
  },
  customizations: {
    skinTone: { type: String, required: true },
    eyeColor: { type: String, required: true },
    eyeSize: { type: Number, min: 0.8, max: 2.0, default: 1.0 },
    hairColor: { type: String, required: true },
    hairStyle: { type: String, required: true },
    accessories: {
      glasses: { type: String, default: null },
      hat: { type: String, default: null },
      earrings: { type: String, default: null }
    }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const AvatarConfig = mongoose.model<IAvatarConfig>('AvatarConfig', AvatarConfigSchema);
```

**Quality Checks:**
- Models match specification exactly
- Validation rules enforced at model level
- Indexes created for common queries
- Migrations run successfully
- Can create, read, update, delete records

---

#### Task 0.2.4: Authentication Skeleton
**Conditions:**
- [ ] Firebase Admin SDK integrated
- [ ] JWT token generation/validation
- [ ] Auth middleware created
- [ ] Password hashing (bcrypt)
- [ ] Basic auth routes defined

**Deliverables:**
```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Attach user to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
```

**Routes:**
```typescript
// backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({
      username,
      email,
      passwordHash,
      ageVerified: false
    });
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ageVerified: user.ageVerified
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
```

**Quality Checks:**
- Can register new user successfully
- Can login with correct credentials
- Login fails with wrong password
- JWT tokens generated correctly
- Auth middleware blocks unauthenticated requests
- Passwords never stored in plain text

---

## WORKSTREAM 0.3: ML ENVIRONMENT SETUP

**Agent:** ML Agent
**Duration:** Week 2
**Dependencies:** Infrastructure Setup (0.1) complete
**Output:** Python ML service ready to accept jobs

### **Tasks:**

#### Task 0.3.1: Python Environment Setup
**Conditions:**
- [ ] Python 3.10+ installed
- [ ] Virtual environment created
- [ ] FastAPI project initialized
- [ ] All ML dependencies installed
- [ ] GPU drivers installed (if available)

**Deliverables:**
```python
# ml-service/requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
pydantic==2.5.0
pydantic-settings==2.1.0

# ML/CV Libraries
torch==2.1.2
torchvision==0.16.2
opencv-python==4.9.0.80
mediapipe==0.10.9
numpy==1.26.3
pillow==10.2.0

# AWS
boto3==1.34.20

# Queue
celery==5.3.4
redis==5.0.1

# Utilities
python-dotenv==1.0.0
```

**Installation Script:**
```bash
#!/bin/bash
# ml-service/setup.sh

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Download pre-trained models
python scripts/download_models.py
```

**Quality Checks:**
- `pip list` shows all required packages
- PyTorch detects GPU if available
- Can import all libraries without errors

---

#### Task 0.3.2: FastAPI Application Skeleton
**Conditions:**
- [ ] FastAPI app running on port 8000
- [ ] Health check endpoint working
- [ ] File upload endpoint defined
- [ ] Environment variables configured
- [ ] CORS configured for backend origin

**Deliverables:**
```python
# ml-service/src/main.py
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
import logging

# Configuration
class Settings(BaseSettings):
    aws_access_key_id: str
    aws_secret_access_key: str
    s3_bucket: str
    redis_url: str
    
    class Config:
        env_file = ".env"

settings = Settings()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="SeeMe ML Service", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Backend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "gpu_available": torch.cuda.is_available(),
        "models_loaded": check_models_loaded()
    }

# Test endpoint (will be replaced with actual processing)
@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...),
    user_id: str = "",
    avatar_id: str = ""
):
    logger.info(f"Received image for processing: user_id={user_id}")
    
    # For now, just return success
    return {
        "status": "success",
        "message": "Image received (processing not implemented yet)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Quality Checks:**
- `curl localhost:8000/health` returns 200
- Can upload image via `/api/process`
- Logs show structured output
- No errors on startup

---

#### Task 0.3.3: Pre-trained Models Download
**Conditions:**
- [ ] MediaPipe models downloaded
- [ ] BiSeNet weights downloaded
- [ ] MiDaS weights downloaded
- [ ] Models stored in `ml-service/models/` directory
- [ ] Model loading verified

**Deliverables:**
```python
# ml-service/scripts/download_models.py
import os
import urllib.request
from pathlib import Path

MODELS_DIR = Path("models")
MODELS_DIR.mkdir(exist_ok=True)

MODELS = {
    "bisenet": {
        "url": "https://github.com/zllrunning/face-parsing.PyTorch/releases/download/v0.1/79999_iter.pth",
        "path": MODELS_DIR / "bisenet_face_parsing.pth"
    },
    "midas": {
        "url": "https://github.com/isl-org/MiDaS/releases/download/v3_1/dpt_beit_large_512.pt",
        "path": MODELS_DIR / "midas_v3_1.pt"
    }
}

def download_model(name, info):
    if info["path"].exists():
        print(f"{name} already downloaded")
        return
    
    print(f"Downloading {name}...")
    urllib.request.urlretrieve(info["url"], info["path"])
    print(f"{name} downloaded successfully")

if __name__ == "__main__":
    for name, info in MODELS.items():
        download_model(name, info)
    
    print("\nAll models downloaded!")
    print(f"Models directory: {MODELS_DIR.absolute()}")
```

**Model Verification:**
```python
# ml-service/src/models/loader.py
import torch
from pathlib import Path

MODELS_DIR = Path("models")

def check_models_loaded():
    """Verify all required models are present"""
    required_models = [
        "bisenet_face_parsing.pth",
        "midas_v3_1.pt"
    ]
    
    for model_file in required_models:
        model_path = MODELS_DIR / model_file
        if not model_path.exists():
            return False
    
    return True

def load_bisenet():
    """Load BiSeNet face parsing model"""
    from .bisenet import BiSeNet
    
    model = BiSeNet(n_classes=19)
    model.load_state_dict(
        torch.load(MODELS_DIR / "bisenet_face_parsing.pth")
    )
    model.eval()
    
    if torch.cuda.is_available():
        model = model.cuda()
    
    return model

def load_midas():
    """Load MiDaS depth estimation model"""
    model_path = str(MODELS_DIR / "midas_v3_1.pt")
    model = torch.hub.load("intel-isl/MiDaS", "DPT_BEiT_L_512", pretrained=False)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    if torch.cuda.is_available():
        model = model.cuda()
    
    return model
```

**Quality Checks:**
- All model files present in `models/` directory
- Models load without errors
- GPU memory allocated if GPU available
- Model inference runs (even on dummy data)

---

#### Task 0.3.4: Queue System Integration
**Conditions:**
- [ ] Celery configured with RabbitMQ
- [ ] Worker process starts successfully
- [ ] Can queue and process jobs
- [ ] Redis result backend working

**Deliverables:**
```python
# ml-service/src/celery_app.py
from celery import Celery
import os

celery_app = Celery(
    'seeme_ml',
    broker=os.getenv('RABBITMQ_URL', 'amqp://localhost:5672'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0')
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    result_expires=3600,  # Results expire after 1 hour
)
```

**Test Task:**
```python
# ml-service/src/tasks/process_image.py
from celery_app import celery_app
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='process_image')
def process_image_task(self, image_url, user_id, avatar_id):
    """
    Process image with avatar style transfer
    (Placeholder implementation for Phase 0)
    """
    logger.info(f"Processing image: {image_url} for user {user_id}")
    
    # Update task state
    self.update_state(state='PROGRESS', meta={'progress': 25})
    
    # Simulate processing
    import time
    time.sleep(2)
    
    self.update_state(state='PROGRESS', meta={'progress': 75})
    
    # Return result
    return {
        'status': 'success',
        'original_url': image_url,
        'processed_url': 'https://placeholder.com/processed.jpg',
        'processing_time': 2.0
    }
```

**Worker Start Script:**
```bash
#!/bin/bash
# ml-service/start_worker.sh

source venv/bin/activate
celery -A src.celery_app worker --loglevel=info --concurrency=2
```

**Quality Checks:**
- Worker starts without errors
- Can submit task from Python console
- Task executes and returns result
- Task status updates visible in Redis

---

## WORKSTREAM 0.4: MOBILE APP SKELETON

**Agent:** Mobile Agent
**Duration:** Week 3
**Dependencies:** Backend Setup (0.2) complete
**Output:** React Native app with navigation and API integration

### **Tasks:**

#### Task 0.4.1: React Native Project Setup
**Conditions:**
- [ ] Expo project initialized with TypeScript
- [ ] Project runs on iOS simulator
- [ ] Project runs on Android emulator
- [ ] Environment variables configured
- [ ] Navigation library installed

**Deliverables:**
```bash
# Create project
npx create-expo-app mobile --template expo-template-blank-typescript

cd mobile

# Install dependencies
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-navigation/native @react-navigation/stack
npx expo install @react-native-async-storage/async-storage
npx expo install axios
npx expo install expo-image-picker
```

**App Configuration:**
```typescript
// mobile/app.json
{
  "expo": {
    "name": "SeeMe",
    "slug": "seeme",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourname.seeme",
      "infoPlist": {
        "NSCameraUsageDescription": "SeeMe needs camera access to take photos for avatar processing",
        "NSPhotoLibraryUsageDescription": "SeeMe needs photo library access to select photos for avatar processing"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourname.seeme",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

**Quality Checks:**
- `npx expo start` runs without errors
- Can view app in Expo Go or simulator
- Hot reload works
- No TypeScript compilation errors

---

#### Task 0.4.2: Navigation Structure
**Conditions:**
- [ ] Stack navigator configured
- [ ] Tab navigator for main app
- [ ] Auth flow separate from main app
- [ ] Deep linking ready (basic)

**Deliverables:**
```typescript
// mobile/src/navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main screens
import FeedScreen from '../screens/main/FeedScreen';
import CreatePostScreen from '../screens/main/CreatePostScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  CreatePost: undefined;
  Profile: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainTab.Navigator>
      <MainTab.Screen name="Feed" component={FeedScreen} />
      <MainTab.Screen name="CreatePost" component={CreatePostScreen} />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  // Check authentication status (will be implemented properly later)
  React.useEffect(() => {
    // Check AsyncStorage for auth token
    checkAuth();
  }, []);
  
  async function checkAuth() {
    // Placeholder
    setIsAuthenticated(false);
  }
  
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

**Quality Checks:**
- Navigation transitions smooth
- Back button works on Android
- Can navigate between all screens
- Auth/Main flow switches correctly

---

#### Task 0.4.3: API Client Setup
**Conditions:**
- [ ] Axios instance configured
- [ ] Request/response interceptors
- [ ] Error handling
- [ ] Token management
- [ ] Environment-based API URL

**Deliverables:**
```typescript
// mobile/src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://api.seeme.app/api';   // Production

class ApiClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized: Clear token and redirect to login
          await AsyncStorage.removeItem('auth_token');
          // Trigger navigation to login (implement with navigation ref)
        }
        return Promise.reject(error);
      }
    );
  }
  
  // Auth methods
  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
    });
    
    if (response.data.token) {
      await AsyncStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  }
  
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    
    if (response.data.token) {
      await AsyncStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  }
  
  async logout() {
    await AsyncStorage.removeItem('auth_token');
  }
  
  // Placeholder methods for future use
  async getFeed(page: number = 1) {
    const response = await this.client.get(`/feed?page=${page}`);
    return response.data;
  }
  
  async createPost(imageUri: string, caption: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    formData.append('caption', caption);
    
    const response = await this.client.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }
}

export const api = new ApiClient();
```

**Quality Checks:**
- Can make API requests to backend
- Token automatically added to requests
- Errors handled gracefully
- Token persists across app restarts

---

#### Task 0.4.4: Basic Screens Skeleton
**Conditions:**
- [ ] All navigation screens created
- [ ] Basic UI layout for each screen
- [ ] No functionality yet (just UI)
- [ ] Consistent design tokens

**Deliverables:**

**Login Screen:**
```typescript
// mobile/src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../../services/api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await api.login(email, password);
      // Navigation will be handled by auth state change
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SeeMe</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 20,
  },
});
```

**Feed Screen:**
```typescript
// mobile/src/screens/main/FeedScreen.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';

export default function FeedScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [posts, setPosts] = React.useState([]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    // Will fetch posts from API
    setRefreshing(false);
  };
  
  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text>Post placeholder</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Follow users to see their posts here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  postCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
```

**Quality Checks:**
- All screens render without crashes
- Can navigate between screens
- Inputs accept text
- Buttons respond to presses
- Loading states show correctly

---

## WORKSTREAM 0.5: END-TO-END INTEGRATION TEST

**Agent:** Integration Agent
**Duration:** Week 3 (Days 5-7)
**Dependencies:** All previous workstreams complete
**Output:** Verified working system from mobile to ML service

### **Tasks:**

#### Task 0.5.1: Simple Upload Flow Test
**Conditions:**
- [ ] Mobile app can upload image to backend
- [ ] Backend saves image to S3
- [ ] Backend queues ML processing job
- [ ] ML service picks up job
- [ ] ML service downloads image from S3
- [ ] ML service returns placeholder result
- [ ] Backend updates database
- [ ] Mobile app receives completion notification

**Test Script:**
```typescript
// integration-tests/upload-flow.test.ts
import { api } from '../mobile/src/services/api';
import fs from 'fs';

describe('End-to-End Upload Flow', () => {
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    // Register test user
    const user = await api.register(
      'testuser',
      'test@example.com',
      'password123'
    );
    authToken = user.token;
    userId = user.user.id;
  });
  
  test('Complete image processing flow', async () => {
    // 1. Upload image
    const testImage = fs.readFileSync('test-assets/sample-photo.jpg');
    const formData = new FormData();
    formData.append('image', testImage, 'test.jpg');
    formData.append('caption', 'Test post');
    
    const uploadResponse = await api.createPost(testImage, 'Test post');
    expect(uploadResponse.status).toBe('processing');
    expect(uploadResponse.postId).toBeDefined();
    
    // 2. Poll for completion
    let attempts = 0;
    let completed = false;
    
    while (attempts < 30 && !completed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const status = await api.getPostStatus(uploadResponse.postId);
      
      if (status.status === 'completed') {
        completed = true;
        expect(status.processedImageUrl).toBeDefined();
        expect(status.processingTime).toBeLessThan(30);
      } else if (status.status === 'failed') {
        fail('Processing failed: ' + status.error);
      }
      
      attempts++;
    }
    
    expect(completed).toBe(true);
  }, 60000); // 60 second timeout
  
  afterAll(async () => {
    // Cleanup test user
  });
});
```

**Acceptance Criteria:**
- Test passes with 100% success rate
- Total processing time <30 seconds
- No errors in any service logs
- Image stored in S3
- Database updated correctly

---

## PHASE 0 COMPLETION CRITERIA

**All workstreams must meet these criteria:**

### **Infrastructure:**
- [ ] All Docker services running and healthy
- [ ] Can access all services from host machine
- [ ] AWS S3 bucket accessible
- [ ] Firebase project configured
- [ ] MongoDB Atlas cluster accessible

### **Backend:**
- [ ] Server starts without errors
- [ ] Health check returns 200
- [ ] Database connections successful
- [ ] Can create user via API
- [ ] Can login via API
- [ ] JWT authentication working

### **ML Service:**
- [ ] FastAPI server running
- [ ] All pre-trained models downloaded
- [ ] GPU detected (if available)
- [ ] Celery worker running
- [ ] Can queue and process jobs
- [ ] Health check shows models loaded

### **Mobile:**
- [ ] App runs on iOS and Android
- [ ] Can navigate between screens
- [ ] Can register/login
- [ ] API integration working
- [ ] Token persists across restarts

### **Integration:**
- [ ] End-to-end test passes
- [ ] Image upload → processing → completion flow works
- [ ] All services communicate successfully
- [ ] Logs from all services show expected behavior

### **Documentation:**
- [ ] README with setup instructions
- [ ] Architecture diagram created
- [ ] API documentation (basic)
- [ ] Each service has its own README

**Time Budget:** 3 weeks
**Exit Criteria:** Complete development environment with all systems integrated and tested

---

# PHASE 1: CORE CV PIPELINE

**Duration:** 10 weeks
**Parallel Workstreams:** 3 (Face Detection, Style Engine, Pipeline Integration)
**Goal:** Production-ready computer vision pipeline for avatar-ifying faces

**CRITICAL SUCCESS METRICS:**
- Expression preservation accuracy: >90%
- Processing time: <5 seconds per image
- Success rate: >90% on standard photos
- Edge quality: No visible artifacts in >85% of images

---

## WORKSTREAM 1.1: FACE DETECTION & SEGMENTATION

**Agent:** CV Agent 1
**Duration:** Weeks 4-5 (2 weeks)
**Dependencies:** Phase 0 complete
**Output:** Robust face detection with semantic segmentation

---

### **Task 1.1.1: MediaPipe Face Detection Integration**

**Conditions:**
- [ ] MediaPipe Face Detection model loaded
- [ ] Can detect 1-5 faces per image
- [ ] Returns bounding boxes with confidence scores
- [ ] Extracts 468 facial landmarks per face
- [ ] Handles edge cases (no face, partial face, etc.)

**Implementation Requirements:**
```python
# ml-service/src/pipeline/face_detection.py
import mediapipe as mp
import cv2
import numpy as np
from typing import List, Dict, Optional

class FaceDetector:
    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        
        # Initialize detectors
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 0=short range (<2m), 1=long range (>2m)
            min_detection_confidence=0.7
        )
        
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=5,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
    
    def detect_faces(self, image: np.ndarray) -> Optional[List[Dict]]:
        """
        Detect faces in image and extract landmarks
        
        Returns:
            List of dicts with:
            - bbox: {x, y, width, height} in pixels
            - landmarks: List of 468 (x, y, z) tuples
            - confidence: Detection confidence score
        """
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        h, w, _ = image.shape
        
        # Detect faces
        detection_results = self.face_detection.process(rgb_image)
        
        if not detection_results.detections:
            return None
        
        # Too many faces
        if len(detection_results.detections) > 5:
            raise TooManyFacesError(f"Found {len(detection_results.detections)} faces, maximum is 5")
        
        # Extract landmarks
        mesh_results = self.face_mesh.process(rgb_image)
        
        if not mesh_results.multi_face_landmarks:
            return None
        
        faces = []
        for i, (detection, face_landmarks) in enumerate(
            zip(detection_results.detections, mesh_results.multi_face_landmarks)
        ):
            bbox = detection.location_data.relative_bounding_box
            
            # Convert relative to absolute coordinates
            face_data = {
                'bbox': {
                    'x': int(bbox.xmin * w),
                    'y': int(bbox.ymin * h),
                    'width': int(bbox.width * w),
                    'height': int(bbox.height * h)
                },
                'landmarks': [
                    (lm.x * w, lm.y * h, lm.z) 
                    for lm in face_landmarks.landmark
                ],
                'confidence': detection.score[0]
            }
            
            faces.append(face_data)
        
        return faces
    
    def validate_face_size(self, face_bbox: Dict, image_shape: tuple) -> bool:
        """Check if face is large enough for processing"""
        min_face_width = 100  # pixels
        return face_bbox['width'] >= min_face_width
    
    def estimate_face_angle(self, landmarks: List[tuple]) -> Dict[str, float]:
        """
        Estimate head pose angles from landmarks
        
        Returns:
            {yaw, pitch, roll} in degrees
        """
        # Key landmarks for pose estimation
        nose_tip = landmarks[1]
        chin = landmarks[152]
        left_eye = landmarks[33]
        right_eye = landmarks[263]
        left_ear = landmarks[234]
        right_ear = landmarks[454]
        
        # Calculate yaw (left-right rotation)
        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        yaw = np.arctan2(nose_tip[0] - eye_center_x, 50) * 180 / np.pi
        
        # Calculate pitch (up-down rotation)
        eye_center_y = (left_eye[1] + right_eye[1]) / 2
        pitch = np.arctan2(nose_tip[1] - eye_center_y, 50) * 180 / np.pi
        
        # Calculate roll (tilt)
        roll = np.arctan2(
            right_eye[1] - left_eye[1],
            right_eye[0] - left_eye[0]
        ) * 180 / np.pi
        
        return {
            'yaw': yaw,
            'pitch': pitch,
            'roll': roll
        }
    
    def is_acceptable_angle(self, angles: Dict[str, float]) -> bool:
        """Check if face angle is within acceptable range for processing"""
        # Phase 1 limits: Frontal faces only
        return (
            abs(angles['yaw']) < 45 and
            abs(angles['pitch']) < 30 and
            abs(angles['roll']) < 30
        )
```

**Error Classes:**
```python
# ml-service/src/pipeline/exceptions.py
class FaceProcessingError(Exception):
    """Base exception for face processing errors"""
    pass

class NoFaceDetectedError(FaceProcessingError):
    """No face found in image"""
    pass

class TooManyFacesError(FaceProcessingError):
    """More than maximum allowed faces"""
    pass

class FaceTooSmallError(FaceProcessingError):
    """Face is too small for quality processing"""
    pass

class FaceAngleTooExtremeError(FaceProcessingError):
    """Face angle outside acceptable range"""
    pass
```

**Quality Checks:**
- [ ] Detects faces in 95%+ of standard photos
- [ ] Correctly identifies number of faces (1-5)
- [ ] Landmark positions accurate (visual inspection)
- [ ] Angle estimation within ±10° (compared to manual labels)
- [ ] Processing time <100ms per image

**Test Dataset:**
- 100 images with varying:
  - Number of faces (1-5)
  - Face sizes (small to large)
  - Angles (frontal, slight turn, profile)
  - Lighting (bright, dim, backlit)
  - Ethnicities
  - Ages

**Acceptance Criteria:**
- Passes all quality checks
- No crashes on edge cases
- Clear error messages for rejections
- Logs contain useful debugging info

---

### **Task 1.1.2: BiSeNet Face Parsing Integration**

**Conditions:**
- [ ] BiSeNet model loaded and initialized
- [ ] Generates 19-class segmentation map
- [ ] Outputs binary masks per face region
- [ ] Processing time <1 second per face
- [ ] GPU acceleration if available

**Implementation Requirements:**
```python
# ml-service/src/pipeline/face_parsing.py
import torch
import torch.nn as nn
import cv2
import numpy as np
from typing import Dict

# Face parsing classes (BiSeNet 19 classes)
FACE_PARSING_CLASSES = {
    0: 'background',
    1: 'skin',
    2: 'left_eyebrow',
    3: 'right_eyebrow',
    4: 'left_eye',
    5: 'right_eye',
    6: 'glasses',
    7: 'left_ear',
    8: 'right_ear',
    9: 'earring',
    10: 'nose',
    11: 'mouth_interior',
    12: 'upper_lip',
    13: 'lower_lip',
    14: 'neck',
    15: 'necklace',
    16: 'clothing',
    17: 'hair',
    18: 'hat'
}

class FaceParser:
    def __init__(self, model_path: str, device: str = 'cuda'):
        self.device = device if torch.cuda.is_available() else 'cpu'
        
        # Load BiSeNet model
        from .models.bisenet import BiSeNet
        self.model = BiSeNet(n_classes=19)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        print(f"FaceParser initialized on {self.device}")
    
    def parse_face(self, image: np.ndarray, face_bbox: Dict) -> Dict[str, np.ndarray]:
        """
        Parse face into semantic regions
        
        Args:
            image: Full image
            face_bbox: Face bounding box {x, y, width, height}
        
        Returns:
            Dict mapping region names to binary masks
        """
        # Extract and pad face region
        padding = int(max(face_bbox['width'], face_bbox['height']) * 0.2)
        x1 = max(0, face_bbox['x'] - padding)
        y1 = max(0, face_bbox['y'] - padding)
        x2 = min(image.shape[1], face_bbox['x'] + face_bbox['width'] + padding)
        y2 = min(image.shape[0], face_bbox['y'] + face_bbox['height'] + padding)
        
        face_crop = image[y1:y2, x1:x2]
        
        # Preprocess for BiSeNet
        face_resized = cv2.resize(face_crop, (512, 512))
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        face_normalized = (face_rgb / 255.0 - 0.5) / 0.5  # Normalize to [-1, 1]
        
        # Convert to tensor
        face_tensor = torch.from_numpy(face_normalized).float()
        face_tensor = face_tensor.permute(2, 0, 1).unsqueeze(0)  # [1, 3, 512, 512]
        face_tensor = face_tensor.to(self.device)
        
        # Inference
        with torch.no_grad():
            output = self.model(face_tensor)[0]  # [1, 19, 512, 512]
            parsing = output.squeeze(0).argmax(0)  # [512, 512]
        
        # Convert to numpy and resize back
        parsing_np = parsing.cpu().numpy().astype(np.uint8)
        parsing_resized = cv2.resize(
            parsing_np, 
            (face_crop.shape[1], face_crop.shape[0]),
            interpolation=cv2.INTER_NEAREST
        )
        
        # Create binary masks for each region
        masks = {}
        for class_id, class_name in FACE_PARSING_CLASSES.items():
            mask = (parsing_resized == class_id).astype(np.uint8) * 255
            masks[class_name] = mask
        
        # Store crop coordinates for later use
        masks['_crop_coords'] = (x1, y1, x2, y2)
        
        return masks
    
    def get_combined_face_mask(self, masks: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Combine relevant face regions into single mask
        (Excludes background, clothing, accessories)
        """
        face_regions = [
            'skin', 'left_eyebrow', 'right_eyebrow', 
            'left_eye', 'right_eye', 'nose',
            'mouth_interior', 'upper_lip', 'lower_lip'
        ]
        
        combined = np.zeros_like(masks['skin'])
        for region in face_regions:
            if region in masks:
                combined = np.maximum(combined, masks[region])
        
        return combined
```

**Quality Checks:**
- [ ] Segmentation accuracy >85% (compared to manual labels)
- [ ] All 19 classes properly detected
- [ ] Masks align with face boundaries
- [ ] Processing time <1s per face (GPU), <5s (CPU)
- [ ] No GPU memory leaks

**Test Dataset:**
- 50 images with manual segmentation labels
- Diverse faces (age, ethnicity, accessories)

**Acceptance Criteria:**
- IoU (Intersection over Union) >0.85 for main face regions
- Works on both GPU and CPU
- Handles edge cases (glasses, hats, etc.)

---

### **Task 1.1.3: Face Region Extraction & Validation**

**Conditions:**
- [ ] Can extract individual face regions from full image
- [ ] Validates segmentation quality
- [ ] Creates feathered masks for blending
- [ ] Handles overlapping faces
- [ ] Stores region metadata

**Implementation Requirements:**
```python
# ml-service/src/pipeline/face_extraction.py
import cv2
import numpy as np
from typing import Dict, List, Tuple
from scipy.ndimage import gaussian_filter

class FaceExtractor:
    def __init__(self):
        self.feather_radius = 5  # pixels
    
    def extract_face_region(
        self,
        image: np.ndarray,
        masks: Dict[str, np.ndarray]
    ) -> Dict:
        """
        Extract face region with proper boundaries
        
        Returns:
            Dict with:
            - face_image: Extracted face region
            - mask: Binary mask of face
            - feathered_mask: Soft-edged mask for blending
            - bbox: Bounding box of extracted region
        """
        # Get crop coordinates
        x1, y1, x2, y2 = masks['_crop_coords']
        face_crop = image[y1:y2, x1:x2]
        
        # Get combined face mask
        face_mask = self.get_combined_face_mask(masks)
        
        # Create feathered mask for smooth blending
        feathered_mask = self.create_feathered_mask(face_mask)
        
        return {
            'face_image': face_crop,
            'mask': face_mask,
            'feathered_mask': feathered_mask,
            'bbox': {'x': x1, 'y': y1, 'width': x2-x1, 'height': y2-y1}
        }
    
    def create_feathered_mask(self, mask: np.ndarray) -> np.ndarray:
        """
        Create soft-edged mask for seamless blending
        """
        # Apply Gaussian blur to mask edges
        mask_float = mask.astype(np.float32) / 255.0
        feathered = gaussian_filter(mask_float, sigma=self.feather_radius)
        
        # Normalize back to 0-255
        feathered = (feathered * 255).astype(np.uint8)
        
        return feathered
    
    def validate_segmentation_quality(self, masks: Dict[str, np.ndarray]) -> bool:
        """
        Check if segmentation is high enough quality for processing
        """
        # Check if key regions are detected
        required_regions = ['skin', 'left_eye', 'right_eye', 'nose', 'mouth']
        
        for region in required_regions:
            if region not in masks:
                return False
            
            # Check if region has minimum pixels
            region_pixels = np.sum(masks[region] > 0)
            if region_pixels < 100:  # Minimum 100 pixels per region
                return False
        
        return True
    
    def get_combined_face_mask(self, masks: Dict[str, np.ndarray]) -> np.ndarray:
        """Combine face regions (excluding background and accessories)"""
        face_regions = [
            'skin', 'left_eyebrow', 'right_eyebrow',
            'left_eye', 'right_eye', 'nose',
            'mouth_interior', 'upper_lip', 'lower_lip'
        ]
        
        combined = np.zeros_like(list(masks.values())[0])
        for region in face_regions:
            if region in masks:
                combined = np.maximum(combined, masks[region])
        
        return combined
```

**Quality Checks:**
- [ ] Extracted regions match original face positions
- [ ] Feathered masks create smooth transitions
- [ ] Validation correctly identifies poor segmentations
- [ ] No artifacts at region boundaries

**Acceptance Criteria:**
- Visual inspection shows clean extractions
- Feathering eliminates hard edges
- Validation catches <10% false positives

---

## WORKSTREAM 1.2: STRUCTURE EXTRACTION (DEPTH & EDGES)

**Agent:** CV Agent 2
**Duration:** Weeks 6-7 (2 weeks)
**Dependencies:** Task 1.1.1 complete (face detection working)
**Output:** Depth maps, normal maps, and multi-scale edge maps

---

### **Task 1.2.1: MiDaS Depth Estimation**

**Conditions:**
- [ ] MiDaS v3.1 model loaded
- [ ] Generates depth maps from face images
- [ ] Depth values normalized and calibrated
- [ ] Processing time <2 seconds per face
- [ ] GPU optimized

**Implementation Requirements:**
```python
# ml-service/src/pipeline/depth_estimation.py
import torch
import cv2
import numpy as np
from typing import Dict

class DepthEstimator:
    def __init__(self, model_path: str, device: str = 'cuda'):
        self.device = device if torch.cuda.is_available() else 'cpu'
        
        # Load MiDaS model
        self.model = torch.hub.load("intel-isl/MiDaS", "DPT_BEiT_L_512", pretrained=False)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        # Load transform
        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
        self.transform = midas_transforms.beit512_transform
        
        print(f"DepthEstimator initialized on {self.device}")
    
    def estimate_depth(self, image: np.ndarray) -> np.ndarray:
        """
        Estimate depth map from image
        
        Args:
            image: RGB image (H, W, 3)
        
        Returns:
            depth_map: Normalized depth map (H, W) in range [0, 255]
                      where higher values = closer to camera
        """
        # Prepare image
        input_batch = self.transform(image).to(self.device)
        
        # Inference
        with torch.no_grad():
            prediction = self.model(input_batch)
            
            # Resize to original size
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=image.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()
        
        # Convert to numpy
        depth = prediction.cpu().numpy()
        
        # Normalize to 0-255 (invert so close=high value)
        depth_normalized = self.normalize_depth(depth)
        
        return depth_normalized
    
    def normalize_depth(self, depth: np.ndarray) -> np.ndarray:
        """
        Normalize depth map to 0-255 range
        """
        # MiDaS outputs inverse depth (larger = farther)
        # We want (larger = closer) for easier interpretation
        depth_inverted = np.max(depth) - depth
        
        # Normalize to 0-255
        depth_min = np.min(depth_inverted)
        depth_max = np.max(depth_inverted)
        
        if depth_max - depth_min > 0:
            depth_normalized = (depth_inverted - depth_min) / (depth_max - depth_min) * 255
        else:
            depth_normalized = np.zeros_like(depth_inverted)
        
        return depth_normalized.astype(np.uint8)
    
    def extract_depth_features(self, depth_map: np.ndarray) -> Dict:
        """
        Extract useful features from depth map
        """
        return {
            'mean_depth': np.mean(depth_map),
            'max_depth': np.max(depth_map),
            'min_depth': np.min(depth_map),
            'depth_range': np.max(depth_map) - np.min(depth_map),
            'depth_std': np.std(depth_map)
        }
```

**Quality Checks:**
- [ ] Depth maps show clear 3D structure
- [ ] Nose/forehead closer than ears (as expected)
- [ ] Smooth gradients (no noise)
- [ ] Consistent across similar poses
- [ ] Processing time <2s (GPU), <8s (CPU)

**Test Dataset:**
- 30 faces with known 3D structure
- Manual verification of depth ordering

**Acceptance Criteria:**
- Depth ordering correct in >90% of cases
- Visual quality suitable for lighting estimation
- No artifacts or noise

---

### **Task 1.2.2: Normal Map Generation**

**Conditions:**
- [ ] Derives surface normals from depth map
- [ ] Normals encoded as RGB image
- [ ] Smooth normals without discontinuities
- [ ] Enhanced normals at key features (eyes, mouth)

**Implementation Requirements:**
```python
# ml-service/src/pipeline/normal_estimation.py
import cv2
import numpy as np
from typing import Tuple

class NormalEstimator:
    def __init__(self):
        pass
    
    def compute_normals(self, depth_map: np.ndarray) -> np.ndarray:
        """
        Compute surface normal map from depth map
        
        Args:
            depth_map: Depth map (H, W) with values 0-255
        
        Returns:
            normal_map: RGB image (H, W, 3) where:
                       R = X component of normal
                       G = Y component of normal
                       B = Z component of normal
                       Values in range [0, 255]
        """
        # Convert to float
        depth_float = depth_map.astype(np.float32) / 255.0
        
        # Compute gradients using Sobel
        grad_x = cv2.Sobel(depth_float, cv2.CV_32F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(depth_float, cv2.CV_32F, 0, 1, ksize=3)
        
        # Build normal vectors
        # Normal = (-dz/dx, -dz/dy, 1)
        normals = np.zeros((depth_map.shape[0], depth_map.shape[1], 3), dtype=np.float32)
        normals[:, :, 0] = -grad_x
        normals[:, :, 1] = -grad_y
        normals[:, :, 2] = 1.0
        
        # Normalize vectors
        norm = np.linalg.norm(normals, axis=2, keepdims=True)
        normals = normals / (norm + 1e-8)  # Avoid division by zero
        
        # Convert to RGB (map from [-1, 1] to [0, 255])
        normal_map = ((normals + 1.0) / 2.0 * 255).astype(np.uint8)
        
        return normal_map
    
    def smooth_normals(self, normal_map: np.ndarray, kernel_size: int = 5) -> np.ndarray:
        """
        Apply bilateral filter to smooth normals while preserving edges
        """
        smoothed = cv2.bilateralFilter(
            normal_map,
            kernel_size,
            sigmaColor=75,
            sigmaSpace=75
        )
        
        return smoothed
    
    def visualize_normals(self, normal_map: np.ndarray) -> np.ndarray:
        """
        Create visualization of normals (useful for debugging)
        """
        # Normal map is already in RGB format
        return cv2.cvtColor(normal_map, cv2.COLOR_RGB2BGR)
```

**Quality Checks:**
- [ ] Normals point outward from face surface
- [ ] Smooth transitions except at true edges
- [ ] Flat regions have consistent normals
- [ ] Curved regions show gradual normal changes

**Acceptance Criteria:**
- Visual inspection shows realistic surface orientation
- No discontinuities except at actual edges
- Suitable for lighting calculations

---

### **Task 1.2.3: Multi-Scale Edge Detection**

**Conditions:**
- [ ] Three edge detection layers implemented
- [ ] Coarse edges (major features)
- [ ] Fine edges (wrinkles, expression lines)
- [ ] Semantic edges (from segmentation)
- [ ] Edge fusion algorithm working

**Implementation Requirements:**
```python
# ml-service/src/pipeline/edge_detection.py
import cv2
import numpy as np
from typing import Dict, List

class EdgeDetector:
    def __init__(self):
        pass
    
    def detect_edges_multiscale(
        self,
        image: np.ndarray,
        masks: Dict[str, np.ndarray],
        depth_map: np.ndarray
    ) -> Dict[str, np.ndarray]:
        """
        Detect edges at multiple scales
        
        Returns:
            Dict with:
            - coarse_edges: Major features (face outline, eyes, nose)
            - fine_edges: Expression lines, wrinkles
            - semantic_edges: Region boundaries from segmentation
            - fused_edges: Combined edge map
        """
        # 1. Coarse edges (Sobel on grayscale)
        coarse_edges = self.detect_coarse_edges(image)
        
        # 2. Fine edges (HED or Canny with low threshold)
        fine_edges = self.detect_fine_edges(image)
        
        # 3. Semantic edges (boundaries from segmentation)
        semantic_edges = self.extract_semantic_edges(masks)
        
        # 4. Depth edges (discontinuities in depth)
        depth_edges = self.detect_depth_edges(depth_map)
        
        # 5. Fuse all edge maps
        fused_edges = self.fuse_edges({
            'coarse': coarse_edges,
            'fine': fine_edges,
            'semantic': semantic_edges,
            'depth': depth_edges
        })
        
        return {
            'coarse_edges': coarse_edges,
            'fine_edges': fine_edges,
            'semantic_edges': semantic_edges,
            'depth_edges': depth_edges,
            'fused_edges': fused_edges
        }
    
    def detect_coarse_edges(self, image: np.ndarray) -> np.ndarray:
        """
        Detect major edges using Sobel operator
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Sobel in X and Y
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
        
        # Magnitude
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        
        # Normalize and threshold
        magnitude_normalized = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)
        _, edges = cv2.threshold(magnitude_normalized, 100, 255, cv2.THRESH_BINARY)
        
        return edges.astype(np.uint8)
    
    def detect_fine_edges(self, image: np.ndarray) -> np.ndarray:
        """
        Detect fine edges (wrinkles, expression lines) using Canny
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Canny with low thresholds to catch subtle edges
        edges = cv2.Canny(blurred, threshold1=30, threshold2=100)
        
        return edges
    
    def extract_semantic_edges(self, masks: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Extract edges from segmentation boundaries
        """
        # Get combined face mask
        combined_mask = np.zeros_like(list(masks.values())[0])
        for region_name, mask in masks.items():
            if not region_name.startswith('_'):  # Skip metadata
                combined_mask = np.maximum(combined_mask, mask)
        
        # Find contours
        edges = cv2.Canny(combined_mask, 100, 200)
        
        # Dilate slightly to make edges more visible
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)
        
        return edges
    
    def detect_depth_edges(self, depth_map: np.ndarray) -> np.ndarray:
        """
        Detect edges from depth discontinuities
        """
        # Sobel on depth map
        sobel_x = cv2.Sobel(depth_map, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(depth_map, cv2.CV_64F, 0, 1, ksize=3)
        
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        magnitude_normalized = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)
        
        _, edges = cv2.threshold(magnitude_normalized, 80, 255, cv2.THRESH_BINARY)
        
        return edges.astype(np.uint8)
    
    def fuse_edges(self, edge_maps: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Combine multiple edge maps with appropriate weighting
        """
        # Weighted combination
        weights = {
            'semantic': 0.4,  # Highest weight (most reliable)
            'depth': 0.3,     # Second highest
            'coarse': 0.2,    # Third
            'fine': 0.1       # Lowest (can be noisy)
        }
        
        # Initialize fused map
        fused = np.zeros_like(edge_maps['coarse'], dtype=np.float32)
        
        # Weighted sum
        for edge_type, weight in weights.items():
            if edge_type in edge_maps:
                fused += edge_maps[edge_type].astype(np.float32) * weight
        
        # Normalize and threshold
        fused_normalized = cv2.normalize(fused, None, 0, 255, cv2.NORM_MINMAX)
        _, fused_binary = cv2.threshold(fused_normalized, 127, 255, cv2.THRESH_BINARY)
        
        # Morphological operations to clean up
        kernel = np.ones((3, 3), np.uint8)
        fused_cleaned = cv2.morphologyEx(fused_binary, cv2.MORPH_CLOSE, kernel)
        
        return fused_cleaned.astype(np.uint8)
    
    def enhance_expression_edges(
        self,
        fused_edges: np.ndarray,
        landmarks: List[Tuple[float, float, float]]
    ) -> np.ndarray:
        """
        Enhance edges around expression-critical areas (mouth, eyes)
        """
        # Create mask for important regions
        mask = np.zeros_like(fused_edges)
        
        # Mouth region (landmarks 61, 291, 0, 17, etc.)
        mouth_landmarks = [61, 291, 0, 17, 269, 405, 314, 39, 181, 82]
        
        # Eyes region
        eye_landmarks = [33, 133, 362, 263, 155, 382]
        
        # Draw circles around important landmarks
        for idx in mouth_landmarks + eye_landmarks:
            if idx < len(landmarks):
                x, y, _ = landmarks[idx]
                cv2.circle(mask, (int(x), int(y)), radius=15, color=255, thickness=-1)
        
        # Enhance edges in important regions
        enhanced = fused_edges.copy()
        enhanced[mask > 0] = np.maximum(enhanced[mask > 0], 200)  # Boost edge strength
        
        return enhanced
```

**Quality Checks:**
- [ ] Coarse edges capture major features
- [ ] Fine edges capture expression details
- [ ] Semantic edges align with region boundaries
- [ ] Fused edges show clear face structure
- [ ] No excessive noise in edge maps

**Test Dataset:**
- 20 faces with different expressions
- Manual annotation of expected edges

**Acceptance Criteria:**
- Edge detection accuracy >80% (compared to manual labels)
- Mouth edges clearly visible (critical for expressions)
- Eye edges well-defined
- No false edges in flat regions

---

## WORKSTREAM 1.3: AVATAR STYLE SYSTEM

**Agent:** Style Agent
**Duration:** Weeks 8-9 (2 weeks)
**Dependencies:** Phase 0 complete, Artist delivers style guides
**Output:** Style application engine with 3 avatar styles

---

### **Task 1.3.1: Style Guide Implementation**

**Conditions:**
- [ ] 3 avatar styles fully specified
- [ ] Color palettes defined
- [ ] Feature transformation rules documented
- [ ] Reference images created
- [ ] Style parameters configurable

**Deliverables:**

**Style Configuration Files:**
```python
# ml-service/src/styles/style_config.py
from dataclasses import dataclass
from typing import Dict, List, Tuple

@dataclass
class ColorPalette:
    skin_tones: List[str]  # Hex colors
    eye_colors: List[str]
    hair_colors: List[str]
    outline_color: str
    highlight_color: str
    shadow_color: str

@dataclass
class FeatureStyle:
    eye_size_multiplier: float  # 1.0 = normal, 1.5 = 50% larger
    nose_style: str  # 'detailed', 'simple_line', 'dots', 'minimal'
    mouth_style: str  # 'detailed', 'simple', 'minimal'
    outline_thickness: int  # pixels
    shading_style: str  # 'cell', 'gradient', 'flat', 'none'

@dataclass
class StyleDefinition:
    name: str
    description: str
    colors: ColorPalette
    features: FeatureStyle
    texture_smoothness: float  # 0.0 = keep texture, 1.0 = completely smooth
    edge_enhancement: float  # 0.0 = soft, 1.0 = sharp outlines

# Define the 3 styles
CARTOON_STYLE = StyleDefinition(
    name='cartoon',
    description='Bold, colorful, Western animation style',
    colors=ColorPalette(
        skin_tones=['#FFE0BD', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'],
        eye_colors=['#1F51FF', '#654321', '#228B22', '#8B4513'],
        hair_colors=['#000000', '#3D2314', '#A52A2A', '#FFD700', '#DC143C'],
        outline_color='#000000',
        highlight_color='#FFFFFF',
        shadow_color='#00000040'
    ),
    features=FeatureStyle(
        eye_size_multiplier=1.3,
        nose_style='simple_line',
        mouth_style='detailed',
        outline_thickness=3,
        shading_style='cell'  # 3-tone cell shading
    ),
    texture_smoothness=0.8,
    edge_enhancement=0.9
)

ANIME_STYLE = StyleDefinition(
    name='anime',
    description='Japanese anime/manga style with large expressive eyes',
    colors=ColorPalette(
        skin_tones=['#FFE4C4', '#F5DEB3', '#DEB887', '#D2691E', '#8B4513'],
        eye_colors=['#4169E1', '#8B4513', '#32CD32', '#FF1493', '#9370DB'],
        hair_colors=['#000000', '#4A2511', '#B22222', '#FFD700', '#FF69B4', '#9370DB'],
        outline_color='#2C1810',
        highlight_color='#FFFFFF',
        shadow_color='#FFB6C140'
    ),
    features=FeatureStyle(
        eye_size_multiplier=1.8,  # Very large eyes
        nose_style='minimal',  # Often just a small line or dot
        mouth_style='simple',
        outline_thickness=2,
        shading_style='gradient'
    ),
    texture_smoothness=0.95,  # Very smooth
    edge_enhancement=0.7
)

MINIMALIST_STYLE = StyleDefinition(
    name='minimalist',
    description='Simple, geometric, abstract style',
    colors=ColorPalette(
        skin_tones=['#F5E6D3', '#E8CBA8', '#D4A574', '#B8865A', '#8B6F47'],
        eye_colors=['#000000', '#FFFFFF'],  # Binary
        hair_colors=['#000000', '#808080', '#FFFFFF'],
        outline_color='#000000',
        highlight_color='#FFFFFF',
        shadow_color='#00000020'
    ),
    features=FeatureStyle(
        eye_size_multiplier=1.0,
        nose_style='dots',  # Two dots or omitted
        mouth_style='minimal',  # Simple line
        outline_thickness=4,  # Thick outlines
        shading_style='flat'  # No shading
    ),
    texture_smoothness=1.0,  # Completely flat
    edge_enhancement=1.0
)

STYLES = {
    'cartoon': CARTOON_STYLE,
    'anime': ANIME_STYLE,
    'minimalist': MINIMALIST_STYLE
}
```

**Quality Checks:**
- [ ] Style definitions match artist's specifications
- [ ] All parameters within valid ranges
- [ ] Color palettes aesthetically pleasing
- [ ] Can load and access all styles

**Acceptance Criteria:**
- Visual comparison with reference images
- Artist approval of implementation
- All 3 styles clearly distinct

---

### **Task 1.3.2: Region-Based Style Application**

**Conditions:**
- [ ] Can apply style to individual face regions
- [ ] Respects region boundaries from segmentation
- [ ] Color application follows palette
- [ ] Texture smoothing working
- [ ] Edge enhancement functional

**Implementation Requirements:**
```python
# ml-service/src/styles/style_applicator.py
import cv2
import numpy as np
from typing import Dict
from .style_config import StyleDefinition, STYLES

class StyleApplicator:
    def __init__(self, style_name: str):
        if style_name not in STYLES:
            raise ValueError(f"Unknown style: {style_name}")
        
        self.style = STYLES[style_name]
    
    def apply_style_to_region(
        self,
        region_image: np.ndarray,
        region_name: str,
        region_mask: np.ndarray,
        edge_map: np.ndarray
    ) -> np.ndarray:
        """
        Apply avatar style to a specific face region
        
        Args:
            region_image: RGB image of region
            region_name: Name of region (e.g., 'skin', 'left_eye')
            region_mask: Binary mask of region
            edge_map: Edge map for structure preservation
        
        Returns:
            Styled region image
        """
        styled = region_image.copy()
        
        # 1. Smooth texture
        if self.style.texture_smoothness > 0:
            styled = self.smooth_texture(styled, region_mask, self.style.texture_smoothness)
        
        # 2. Apply color palette
        styled = self.apply_color_palette(styled, region_name, region_mask)
        
        # 3. Apply shading style
        if self.style.features.shading_style != 'none':
            styled = self.apply_shading(styled, region_mask, self.style.features.shading_style)
        
        # 4. Enhance edges (but preserve original edge positions)
        if self.style.edge_enhancement > 0:
            styled = self.enhance_edges(styled, edge_map, self.style.edge_enhancement)
        
        return styled
    
    def smooth_texture(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        smoothness: float
    ) -> np.ndarray:
        """
        Smooth texture while preserving edges
        """
        # Bilateral filter: smooths while preserving edges
        kernel_size = int(smoothness * 20) + 5  # 5-25 based on smoothness
        smoothed = cv2.bilateralFilter(
            image,
            d=kernel_size,
            sigmaColor=75 * smoothness,
            sigmaSpace=75 * smoothness
        )
        
        # Apply only within mask
        result = image.copy()
        result[mask > 0] = smoothed[mask > 0]
        
        return result
    
    def apply_color_palette(
        self,
        image: np.ndarray,
        region_name: str,
        mask: np.ndarray
    ) -> np.ndarray:
        """
        Map region colors to style palette
        """
        result = image.copy()
        
        # Get appropriate palette based on region
        if region_name == 'skin':
            # Calculate average skin tone
            masked_pixels = image[mask > 0]
            if len(masked_pixels) == 0:
                return result
            
            avg_color = np.mean(masked_pixels, axis=0)
            
            # Find closest palette color
            palette_color = self.find_closest_palette_color(
                avg_color,
                self.style.colors.skin_tones
            )
            
            # Apply palette color (preserve relative lightness)
            result = self.recolor_region(image, mask, palette_color)
        
        elif region_name in ['left_eye', 'right_eye']:
            # Apply eye color from palette
            palette_color = self.style.colors.eye_colors[0]  # Default
            result = self.recolor_region(image, mask, palette_color)
        
        elif region_name == 'hair':
            # Apply hair color from palette
            palette_color = self.style.colors.hair_colors[0]  # Default
            result = self.recolor_region(image, mask, palette_color)
        
        return result
    
    def find_closest_palette_color(
        self,
        color: np.ndarray,
        palette: List[str]
    ) -> np.ndarray:
        """
        Find closest color in palette to given color
        """
        color_rgb = color[:3]  # In case of BGRA
        
        # Convert palette hex colors to RGB
        palette_rgb = [self.hex_to_rgb(hex_color) for hex_color in palette]
        
        # Find closest by Euclidean distance
        distances = [np.linalg.norm(color_rgb - p) for p in palette_rgb]
        closest_idx = np.argmin(distances)
        
        return palette_rgb[closest_idx]
    
    def hex_to_rgb(self, hex_color: str) -> np.ndarray:
        """Convert hex color to RGB array"""
        hex_color = hex_color.lstrip('#')
        return np.array([int(hex_color[i:i+2], 16) for i in (0, 2, 4)])
    
    def recolor_region(
        self,
        image: np.n

# PHASE 2: BASIC SOCIAL FEATURES (CONTINUED)

---

## WORKSTREAM 2.1: POST CREATION & MANAGEMENT

**Agent:** Backend Post Agent
**Duration:** Weeks 14-16 (3 weeks)
**Dependencies:** Phase 1 complete (CV pipeline working)
**Output:** Complete post creation system with processing queue

---

### **Task 2.1.1: Post Data Model & API**

**Conditions:**
- [ ] Post model defined with all required fields
- [ ] Database migrations created
- [ ] CRUD API endpoints implemented
- [ ] Image upload handling
- [ ] Processing status tracking

**Implementation Requirements:**

**Database Schema:**
```sql
-- PostgreSQL schema
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Image URLs
    original_image_url TEXT NOT NULL,
    processed_image_url TEXT,
    thumbnail_url TEXT,
    
    -- Content
    caption TEXT,
    
    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
        -- Values: 'processing', 'completed', 'failed'
    processing_error TEXT,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_time_seconds FLOAT,
    
    -- Avatar used
    avatar_id VARCHAR(50),
    
    -- Engagement metrics
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    
    -- Metadata
    image_width INTEGER,
    image_height INTEGER,
    faces_detected INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_posts_user_created (user_id, created_at DESC),
    INDEX idx_posts_status (status),
    INDEX idx_posts_created (created_at DESC)
);

-- Trigger to update updated_at
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Post Model (Sequelize):**
```typescript
// backend/src/models/Post.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Post extends Model {
    public id!: string;
    public userId!: string;
    public originalImageUrl!: string;
    public processedImageUrl!: string | null;
    public thumbnailUrl!: string | null;
    public caption!: string | null;
    public status!: 'processing' | 'completed' | 'failed';
    public processingError!: string | null;
    public processingStartedAt!: Date | null;
    public processingCompletedAt!: Date | null;
    public processingTimeSeconds!: number | null;
    public avatarId!: string | null;
    public likesCount!: number;
    public commentsCount!: number;
    public imageWidth!: number | null;
    public imageHeight!: number | null;
    public facesDetected!: number | null;
    public createdAt!: Date;
    public updatedAt!: Date;
}

Post.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    originalImageUrl: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    processedImageUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    thumbnailUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    caption: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: [0, 2200]  // Instagram-like caption length
        }
    },
    status: {
        type: DataTypes.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing'
    },
    processingError: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    processingStartedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    processingCompletedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    processingTimeSeconds: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    avatarId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    likesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    commentsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    imageWidth: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    imageHeight: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    facesDetected: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'posts',
    timestamps: true,
    indexes: [
        {
            fields: ['userId', 'createdAt']
        },
        {
            fields: ['status']
        },
        {
            fields: ['createdAt']
        }
    ]
});
```

**API Routes:**
```typescript
// backend/src/routes/posts.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { PostController } from '../controllers/PostController';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024  // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only accept images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Create new post
router.post(
    '/',
    authenticateToken,
    upload.single('image'),
    PostController.createPost
);

// Get post by ID
router.get('/:postId', PostController.getPost);

// Get post processing status
router.get('/:postId/status', PostController.getPostStatus);

// Update post (edit caption)
router.put(
    '/:postId',
    authenticateToken,
    PostController.updatePost
);

// Delete post
router.delete(
    '/:postId',
    authenticateToken,
    PostController.deletePost
);

// Get user's posts
router.get(
    '/user/:username',
    PostController.getUserPosts
);

export default router;
```

**Post Controller:**
```typescript
// backend/src/controllers/PostController.ts
import { Request, Response } from 'express';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { S3Service } from '../services/S3Service';
import { MLService } from '../services/MLService';
import { AuthRequest } from '../middleware/auth';
import sharp from 'sharp';

export class PostController {
    static async createPost(req: AuthRequest, res: Response) {
        try {
            const { caption } = req.body;
            const userId = req.user!.id;
            
            if (!req.file) {
                return res.status(400).json({ error: 'Image file required' });
            }
            
            // Get user's active avatar
            const user = await User.findByPk(userId);
            const avatarId = user?.activeAvatarId || 'default';
            
            // Get image dimensions
            const metadata = await sharp(req.file.buffer).metadata();
            const imageWidth = metadata.width;
            const imageHeight = metadata.height;
            
            // Upload original image to S3
            const originalKey = `originals/${userId}/${Date.now()}_${req.file.originalname}`;
            const originalUrl = await S3Service.uploadImage(
                req.file.buffer,
                originalKey,
                req.file.mimetype
            );
            
            // Create post record
            const post = await Post.create({
                userId,
                originalImageUrl: originalUrl,
                caption: caption || null,
                status: 'processing',
                avatarId,
                imageWidth,
                imageHeight,
                processingStartedAt: new Date()
            });
            
            // Queue ML processing job
            await MLService.queueProcessingJob({
                postId: post.id,
                userId,
                originalImageUrl: originalUrl,
                avatarId
            });
            
            res.status(201).json({
                postId: post.id,
                status: 'processing',
                message: 'Post created, processing avatar...',
                estimatedTime: 10  // seconds
            });
            
        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ error: 'Failed to create post' });
        }
    }
    
    static async getPost(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            
            const post = await Post.findByPk(postId, {
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            res.json({
                id: post.id,
                user: post.user,
                imageUrl: post.processedImageUrl || post.originalImageUrl,
                thumbnailUrl: post.thumbnailUrl,
                caption: post.caption,
                status: post.status,
                likesCount: post.likesCount,
                commentsCount: post.commentsCount,
                createdAt: post.createdAt
            });
            
        } catch (error) {
            console.error('Error getting post:', error);
            res.status(500).json({ error: 'Failed to get post' });
        }
    }
    
    static async getPostStatus(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            
            const post = await Post.findByPk(postId, {
                attributes: [
                    'id', 'status', 'processedImageUrl', 'thumbnailUrl',
                    'processingError', 'processingTimeSeconds'
                ]
            });
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            res.json({
                postId: post.id,
                status: post.status,
                processedImageUrl: post.processedImageUrl,
                thumbnailUrl: post.thumbnailUrl,
                error: post.processingError,
                processingTime: post.processingTimeSeconds
            });
            
        } catch (error) {
            console.error('Error getting post status:', error);
            res.status(500).json({ error: 'Failed to get status' });
        }
    }
    
    static async updatePost(req: AuthRequest, res: Response) {
        try {
            const { postId } = req.params;
            const { caption } = req.body;
            const userId = req.user!.id;
            
            const post = await Post.findByPk(postId);
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            if (post.userId !== userId) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            await post.update({ caption });
            
            res.json({ message: 'Post updated', post });
            
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({ error: 'Failed to update post' });
        }
    }
    
    static async deletePost(req: AuthRequest, res: Response) {
        try {
            const { postId } = req.params;
            const userId = req.user!.id;
            
            const post = await Post.findByPk(postId);
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            if (post.userId !== userId) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            // Delete images from S3
            if (post.originalImageUrl) {
                await S3Service.deleteImage(post.originalImageUrl);
            }
            if (post.processedImageUrl) {
                await S3Service.deleteImage(post.processedImageUrl);
            }
            if (post.thumbnailUrl) {
                await S3Service.deleteImage(post.thumbnailUrl);
            }
            
            await post.destroy();
            
            res.json({ message: 'Post deleted' });
            
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ error: 'Failed to delete post' });
        }
    }
    
    static async getUserPosts(req: Request, res: Response) {
        try {
            const { username } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            // Find user by username
            const user = await User.findOne({ where: { username } });
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const { rows: posts, count } = await Post.findAndCountAll({
                where: {
                    userId: user.id,
                    status: 'completed'  // Only show completed posts
                },
                order: [['createdAt', 'DESC']],
                limit,
                offset,
                attributes: [
                    'id', 'processedImageUrl', 'thumbnailUrl', 'caption',
                    'likesCount', 'commentsCount', 'createdAt'
                ]
            });
            
            res.json({
                posts,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting user posts:', error);
            res.status(500).json({ error: 'Failed to get posts' });
        }
    }
}
```

**Quality Checks:**
- [ ] Can create post with image upload
- [ ] Image uploads to S3 successfully
- [ ] Post record created in database
- [ ] Can retrieve post by ID
- [ ] Can update caption
- [ ] Can delete post (removes from S3 and DB)
- [ ] Proper authorization checks

**Acceptance Criteria:**
- All CRUD operations work
- Image handling robust
- Error handling comprehensive
- API documented
# PHASE 2
## WORKSTREAM 2.1: POST CREATION & MANAGEMENT

**Agent:** Backend Post Agent
**Duration:** Weeks 14-16 (3 weeks)
**Dependencies:** Phase 1 complete (CV pipeline working)
**Output:** Complete post creation system with processing queue

---

### Task 2.1.1: Post Data Model & API

**Conditions:**
- [ ] Post model defined with all required fields
- [ ] Database migrations created
- [ ] CRUD API endpoints implemented
- [ ] Image upload handling
- [ ] Processing status tracking

**Implementation Requirements:**

**Database Schema:**
```sql
-- PostgreSQL schema
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Image URLs
    original_image_url TEXT NOT NULL,
    processed_image_url TEXT,
    thumbnail_url TEXT,
    
    -- Content
    caption TEXT,
    
    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
        -- Values: 'processing', 'completed', 'failed'
    processing_error TEXT,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_time_seconds FLOAT,
    
    -- Avatar used
    avatar_id VARCHAR(50),
    
    -- Engagement metrics
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    
    -- Metadata
    image_width INTEGER,
    image_height INTEGER,
    faces_detected INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_posts_user_created (user_id, created_at DESC),
    INDEX idx_posts_status (status),
    INDEX idx_posts_created (created_at DESC)
);

-- Trigger to update updated_at
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Post Model (Sequelize):**
```typescript
// backend/src/models/Post.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Post extends Model {
    public id!: string;
    public userId!: string;
    public originalImageUrl!: string;
    public processedImageUrl!: string | null;
    public thumbnailUrl!: string | null;
    public caption!: string | null;
    public status!: 'processing' | 'completed' | 'failed';
    public processingError!: string | null;
    public processingStartedAt!: Date | null;
    public processingCompletedAt!: Date | null;
    public processingTimeSeconds!: number | null;
    public avatarId!: string | null;
    public likesCount!: number;
    public commentsCount!: number;
    public imageWidth!: number | null;
    public imageHeight!: number | null;
    public facesDetected!: number | null;
    public createdAt!: Date;
    public updatedAt!: Date;
}

Post.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    originalImageUrl: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    processedImageUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    thumbnailUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    caption: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: [0, 2200]  // Instagram-like caption length
        }
    },
    status: {
        type: DataTypes.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing'
    },
    processingError: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    processingStartedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    processingCompletedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    processingTimeSeconds: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    avatarId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    likesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    commentsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    imageWidth: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    imageHeight: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    facesDetected: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'posts',
    timestamps: true,
    indexes: [
        {
            fields: ['userId', 'createdAt']
        },
        {
            fields: ['status']
        },
        {
            fields: ['createdAt']
        }
    ]
});
```

**API Routes:**
```typescript
// backend/src/routes/posts.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { PostController } from '../controllers/PostController';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024  // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only accept images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Create new post
router.post(
    '/',
    authenticateToken,
    upload.single('image'),
    PostController.createPost
);

// Get post by ID
router.get('/:postId', PostController.getPost);

// Get post processing status
router.get('/:postId/status', PostController.getPostStatus);

// Update post (edit caption)
router.put(
    '/:postId',
    authenticateToken,
    PostController.updatePost
);

// Delete post
router.delete(
    '/:postId',
    authenticateToken,
    PostController.deletePost
);

// Get user's posts
router.get(
    '/user/:username',
    PostController.getUserPosts
);

export default router;
```

**Post Controller:**
```typescript
// backend/src/controllers/PostController.ts
import { Request, Response } from 'express';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { S3Service } from '../services/S3Service';
import { MLService } from '../services/MLService';
import { AuthRequest } from '../middleware/auth';
import sharp from 'sharp';

export class PostController {
    static async createPost(req: AuthRequest, res: Response) {
        try {
            const { caption } = req.body;
            const userId = req.user!.id;
            
            if (!req.file) {
                return res.status(400).json({ error: 'Image file required' });
            }
            
            // Get user's active avatar
            const user = await User.findByPk(userId);
            const avatarId = user?.activeAvatarId || 'default';
            
            // Get image dimensions
            const metadata = await sharp(req.file.buffer).metadata();
            const imageWidth = metadata.width;
            const imageHeight = metadata.height;
            
            // Upload original image to S3
            const originalKey = `originals/${userId}/${Date.now()}_${req.file.originalname}`;
            const originalUrl = await S3Service.uploadImage(
                req.file.buffer,
                originalKey,
                req.file.mimetype
            );
            
            // Create post record
            const post = await Post.create({
                userId,
                originalImageUrl: originalUrl,
                caption: caption || null,
                status: 'processing',
                avatarId,
                imageWidth,
                imageHeight,
                processingStartedAt: new Date()
            });
            
            // Queue ML processing job
            await MLService.queueProcessingJob({
                postId: post.id,
                userId,
                originalImageUrl: originalUrl,
                avatarId
            });
            
            res.status(201).json({
                postId: post.id,
                status: 'processing',
                message: 'Post created, processing avatar...',
                estimatedTime: 10  // seconds
            });
            
        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ error: 'Failed to create post' });
        }
    }
    
    static async getPost(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            
            const post = await Post.findByPk(postId, {
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            res.json({
                id: post.id,
                user: post.user,
                imageUrl: post.processedImageUrl || post.originalImageUrl,
                thumbnailUrl: post.thumbnailUrl,
                caption: post.caption,
                status: post.status,
                likesCount: post.likesCount,
                commentsCount: post.commentsCount,
                createdAt: post.createdAt
            });
            
        } catch (error) {
            console.error('Error getting post:', error);
            res.status(500).json({ error: 'Failed to get post' });
        }
    }
    
    static async getPostStatus(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            
            const post = await Post.findByPk(postId, {
                attributes: [
                    'id', 'status', 'processedImageUrl', 'thumbnailUrl',
                    'processingError', 'processingTimeSeconds'
                ]
            });
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            res.json({
                postId: post.id,
                status: post.status,
                processedImageUrl: post.processedImageUrl,
                thumbnailUrl: post.thumbnailUrl,
                error: post.processingError,
                processingTime: post.processingTimeSeconds
            });
            
        } catch (error) {
            console.error('Error getting post status:', error);
            res.status(500).json({ error: 'Failed to get status' });
        }
    }
    
    static async updatePost(req: AuthRequest, res: Response) {
        try {
            const { postId } = req.params;
            const { caption } = req.body;
            const userId = req.user!.id;
            
            const post = await Post.findByPk(postId);
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            if (post.userId !== userId) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            await post.update({ caption });
            
            res.json({ message: 'Post updated', post });
            
        } catch (error) {
            console.error('Error updating post:', error);
            res.status(500).json({ error: 'Failed to update post' });
        }
    }
    
    static async deletePost(req: AuthRequest, res: Response) {
        try {
            const { postId } = req.params;
            const userId = req.user!.id;
            
            const post = await Post.findByPk(postId);
            
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            if (post.userId !== userId) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            // Delete images from S3
            if (post.originalImageUrl) {
                await S3Service.deleteImage(post.originalImageUrl);
            }
            if (post.processedImageUrl) {
                await S3Service.deleteImage(post.processedImageUrl);
            }
            if (post.thumbnailUrl) {
                await S3Service.deleteImage(post.thumbnailUrl);
            }
            
            await post.destroy();
            
            res.json({ message: 'Post deleted' });
            
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ error: 'Failed to delete post' });
        }
    }
    
    static async getUserPosts(req: Request, res: Response) {
        try {
            const { username } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            // Find user by username
            const user = await User.findOne({ where: { username } });
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const { rows: posts, count } = await Post.findAndCountAll({
                where: {
                    userId: user.id,
                    status: 'completed'  // Only show completed posts
                },
                order: [['createdAt', 'DESC']],
                limit,
                offset,
                attributes: [
                    'id', 'processedImageUrl', 'thumbnailUrl', 'caption',
                    'likesCount', 'commentsCount', 'createdAt'
                ]
            });
            
            res.json({
                posts,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting user posts:', error);
            res.status(500).json({ error: 'Failed to get posts' });
        }
    }
}
```

**Quality Checks:**
- [ ] Can create post with image upload
- [ ] Image uploads to S3 successfully
- [ ] Post record created in database
- [ ] Can retrieve post by ID
- [ ] Can update caption
- [ ] Can delete post (removes from S3 and DB)
- [ ] Proper authorization checks

**Acceptance Criteria:**
- All CRUD operations work
- Image handling robust
- Error handling comprehensive
- API documented

---

### Task 2.1.2: S3 Integration & Image Management

**Conditions:**
- [ ] S3 service class implemented
- [ ] Image upload/download working
- [ ] CloudFront URL generation
- [ ] Image deletion working
- [ ] Thumbnail generation

**Implementation Requirements:**

**S3 Service:**
```typescript
// backend/src/services/S3Service.ts
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;

export class S3Service {
    /**
     * Upload image to S3
     */
    static async uploadImage(
        buffer: Buffer,
        key: string,
        contentType: string = 'image/jpeg'
    ): Promise<string> {
        try {
            await s3.putObject({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                ACL: 'private',  // Not publicly accessible
                CacheControl: 'max-age=31536000'  // 1 year
            }).promise();
            
            // Return CloudFront URL
            return `https://${CLOUDFRONT_DOMAIN}/${key}`;
            
        } catch (error) {
            console.error('S3 upload error:', error);
            throw new Error('Failed to upload image to S3');
        }
    }
    
    /**
     * Generate and upload thumbnail
     */
    static async uploadThumbnail(
        originalBuffer: Buffer,
        key: string
    ): Promise<string> {
        try {
            // Resize to thumbnail (400x400 max, maintain aspect ratio)
            const thumbnailBuffer = await sharp(originalBuffer)
                .resize(400, 400, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toBuffer();
            
            const thumbnailKey = key.replace(/(\.[^.]+)$/, '_thumb$1');
            
            await s3.putObject({
                Bucket: BUCKET_NAME,
                Key: thumbnailKey,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg',
                ACL: 'private',
                CacheControl: 'max-age=31536000'
            }).promise();
            
            return `https://${CLOUDFRONT_DOMAIN}/${thumbnailKey}`;
            
        } catch (error) {
            console.error('Thumbnail upload error:', error);
            throw new Error('Failed to upload thumbnail');
        }
    }
    
    /**
     * Download image from S3
     */
    static async downloadImage(url: string): Promise<Buffer> {
        try {
            // Extract key from CloudFront URL
            const key = url.replace(`https://${CLOUDFRONT_DOMAIN}/`, '');
            
            const result = await s3.getObject({
                Bucket: BUCKET_NAME,
                Key: key
            }).promise();
            
            return result.Body as Buffer;
            
        } catch (error) {
            console.error('S3 download error:', error);
            throw new Error('Failed to download image from S3');
        }
    }
    
    /**
     * Delete image from S3
     */
    static async deleteImage(url: string): Promise<void> {
        try {
            const key = url.replace(`https://${CLOUDFRONT_DOMAIN}/`, '');
            
            await s3.deleteObject({
                Bucket: BUCKET_NAME,
                Key: key
            }).promise();
            
        } catch (error) {
            console.error('S3 delete error:', error);
            // Don't throw - deletion failure shouldn't break other operations
        }
    }
    
    /**
     * Generate signed URL for temporary access
     */
    static generateSignedUrl(key: string, expiresIn: number = 3600): string {
        return s3.getSignedUrl('getObject', {
            Bucket: BUCKET_NAME,
            Key: key,
            Expires: expiresIn
        });
    }
    
    /**
     * Check if image exists
     */
    static async imageExists(url: string): Promise<boolean> {
        try {
            const key = url.replace(`https://${CLOUDFRONT_DOMAIN}/`, '');
            
            await s3.headObject({
                Bucket: BUCKET_NAME,
                Key: key
            }).promise();
            
            return true;
            
        } catch (error) {
            return false;
        }
    }
}
```

**Image Processing Utilities:**
```typescript
// backend/src/utils/imageProcessing.ts
import sharp from 'sharp';

export class ImageProcessor {
    /**
     * Validate image file
     */
    static async validateImage(buffer: Buffer): Promise<{
        valid: boolean;
        error?: string;
        metadata?: sharp.Metadata;
    }> {
        try {
            const metadata = await sharp(buffer).metadata();
            
            // Check format
            const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
            if (!metadata.format || !allowedFormats.includes(metadata.format)) {
                return {
                    valid: false,
                    error: 'Invalid image format. Only JPEG, PNG, and WebP allowed.'
                };
            }
            
            // Check dimensions
            if (!metadata.width || !metadata.height) {
                return {
                    valid: false,
                    error: 'Could not read image dimensions'
                };
            }
            
            if (metadata.width < 400 || metadata.height < 400) {
                return {
                    valid: false,
                    error: 'Image too small. Minimum 400x400 pixels required.'
                };
            }
            
            if (metadata.width > 4096 || metadata.height > 4096) {
                return {
                    valid: false,
                    error: 'Image too large. Maximum 4096x4096 pixels.'
                };
            }
            
            return { valid: true, metadata };
            
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid or corrupted image file'
            };
        }
    }
    
    /**
     * Optimize image for storage
     */
    static async optimizeImage(buffer: Buffer): Promise<Buffer> {
        return await sharp(buffer)
            .resize(2048, 2048, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();
    }
    
    /**
     * Generate multiple sizes
     */
    static async generateSizes(buffer: Buffer): Promise<{
        original: Buffer;
        large: Buffer;
        medium: Buffer;
        thumbnail: Buffer;
    }> {
        const [original, large, medium, thumbnail] = await Promise.all([
            sharp(buffer).jpeg({ quality: 90 }).toBuffer(),
            sharp(buffer).resize(1200, 1200, { fit: 'inside' }).jpeg({ quality: 85 }).toBuffer(),
            sharp(buffer).resize(600, 600, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer(),
            sharp(buffer).resize(400, 400, { fit: 'inside' }).jpeg({ quality: 75 }).toBuffer()
        ]);
        
        return { original, large, medium, thumbnail };
    }
}
```

**Quality Checks:**
- [ ] Images upload to S3 successfully
- [ ] CloudFront URLs accessible
- [ ] Thumbnails generated correctly
- [ ] Image deletion works
- [ ] Validation catches invalid images
- [ ] Optimization reduces file size

**Acceptance Criteria:**
- Image upload success rate >99%
- Thumbnail generation <2 seconds
- CloudFront delivery <500ms globally
- No orphaned files in S3

---

### Task 2.1.3: ML Processing Queue Integration

**Conditions:**
- [ ] RabbitMQ queue configured
- [ ] Celery worker processing jobs
- [ ] Job status updates in database
- [ ] Error handling and retries
- [ ] Processing callback working

**Implementation Requirements:**

**ML Service Wrapper:**
```typescript
// backend/src/services/MLService.ts
import amqp from 'amqplib';
import { Post } from '../models/Post';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'avatar_processing';

export class MLService {
    private static connection: amqp.Connection | null = null;
    private static channel: amqp.Channel | null = null;
    
    /**
     * Initialize RabbitMQ connection
     */
    static async initialize() {
        try {
            this.connection = await amqp.connect(RABBITMQ_URL);
            this.channel = await this.connection.createChannel();
            
            await this.channel.assertQueue(QUEUE_NAME, {
                durable: true
            });
            
            console.log('MLService initialized');
            
        } catch (error) {
            console.error('Failed to initialize MLService:', error);
            throw error;
        }
    }
    
    /**
     * Queue image processing job
     */
    static async queueProcessingJob(data: {
        postId: string;
        userId: string;
        originalImageUrl: string;
        avatarId: string;
    }): Promise<void> {
        try {
            if (!this.channel) {
                await this.initialize();
            }
            
            const message = JSON.stringify({
                task: 'process_avatar',
                ...data,
                callback_url: `${process.env.API_URL}/api/internal/processing-callback`
            });
            
            this.channel!.sendToQueue(
                QUEUE_NAME,
                Buffer.from(message),
                { persistent: true }
            );
            
            console.log(`Queued processing job for post ${data.postId}`);
            
        } catch (error) {
            console.error('Failed to queue processing job:', error);
            
            // Update post status to failed
            await Post.update(
                {
                    status: 'failed',
                    processingError: 'Failed to queue processing job'
                },
                { where: { id: data.postId } }
            );
            
            throw error;
        }
    }
    
    /**
     * Handle processing callback from ML service
     */
    static async handleProcessingCallback(data: {
        postId: string;
        success: boolean;
        processedImageUrl?: string;
        thumbnailUrl?: string;
        error?: string;
        metadata?: any;
        processingTime?: number;
    }): Promise<void> {
        try {
            const post = await Post.findByPk(data.postId);
            
            if (!post) {
                throw new Error(`Post ${data.postId} not found`);
            }
            
            if (data.success) {
                await post.update({
                    status: 'completed',
                    processedImageUrl: data.processedImageUrl,
                    thumbnailUrl: data.thumbnailUrl,
                    processingCompletedAt: new Date(),
                    processingTimeSeconds: data.processingTime,
                    facesDetected: data.metadata?.num_faces
                });
                
                console.log(`Post ${data.postId} processing completed`);
                
            } else {
                await post.update({
                    status: 'failed',
                    processingError: data.error || 'Unknown error',
                    processingCompletedAt: new Date()
                });
                
                console.error(`Post ${data.postId} processing failed:`, data.error);
            }
            
        } catch (error) {
            console.error('Error handling processing callback:', error);
            throw error;
        }
    }
    
    /**
     * Get processing status
     */
    static async getProcessingStatus(postId: string): Promise<{
        status: string;
        progress?: number;
        message?: string;
    }> {
        // This would query the ML service or cache for live progress
        // For now, just return database status
        const post = await Post.findByPk(postId, {
            attributes: ['status', 'processingError']
        });
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        return {
            status: post.status,
            message: post.processingError || undefined
        };
    }
}

// Initialize on module load
MLService.initialize();
```

**Processing Callback Endpoint:**
```typescript
// backend/src/routes/internal.ts
import { Router } from 'express';
import { MLService } from '../services/MLService';

const router = Router();

// This endpoint is called by the ML service
// Should be authenticated with a secret key
router.post('/processing-callback', async (req, res) => {
    try {
        // Verify request is from ML service
        const secret = req.headers['x-ml-secret'];
        if (secret !== process.env.ML_SERVICE_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        await MLService.handleProcessingCallback(req.body);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Processing callback error:', error);
        res.status(500).json({ error: 'Callback failed' });
    }
});

export default router;
```

**Python ML Service Task:**
```python
# ml-service/src/tasks/process_avatar.py
from celery import Task
from ..pipeline.avatar_pipeline import AvatarPipeline
from ..utils.s3_client import download_from_s3, upload_to_s3
from ..utils.callback import send_callback
import logging
import time
import cv2
import numpy as np

logger = logging.getLogger(__name__)

class ProcessAvatarTask(Task):
    """Celery task for processing avatar images"""
    
    def __init__(self):
        self.pipeline = None
    
    def __call__(self, *args, **kwargs):
        # Initialize pipeline on first use (worker-level singleton)
        if self.pipeline is None:
            style = kwargs.get('style', 'cartoon')
            self.pipeline = AvatarPipeline(style_name=style)
            logger.info(f"Initialized AvatarPipeline with style '{style}'")
        
        return self.run(*args, **kwargs)
    
    def run(self, task_data):
        """
        Process avatar image
        
        Args:
            task_data: Dict with:
                - postId: Post ID
                - userId: User ID
                - originalImageUrl: S3 URL of original image
                - avatarId: Avatar configuration ID
                - callback_url: URL to send results
        """
        post_id = task_data['postId']
        user_id = task_data['userId']
        original_url = task_data['originalImageUrl']
        avatar_id = task_data.get('avatarId', 'default')
        callback_url = task_data['callback_url']
        
        start_time = time.time()
        
        try:
            logger.info(f"Processing post {post_id} for user {user_id}")
            
            # Update task state
            self.update_state(
                state='PROGRESS',
                meta={'progress': 0.05, 'message': 'Downloading image...'}
            )
            
            # Download original image from S3
            image_buffer = download_from_s3(original_url)
            image_array = np.frombuffer(image_buffer, dtype=np.uint8)
            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")
            
            # Progress callback
            def progress_callback(progress, message):
                self.update_state(
                    state='PROGRESS',
                    meta={'progress': progress, 'message': message}
                )
            
            # Process through pipeline
            result = self.pipeline.process_image(image, progress_callback)
            
            if not result.success:
                raise Exception(result.error)
            
            # Upload processed image
            self.update_state(
                state='PROGRESS',
                meta={'progress': 0.95, 'message': 'Uploading result...'}
            )
            
            processed_key = f"processed/{user_id}/{post_id}.jpg"
            thumbnail_key = f"thumbnails/{user_id}/{post_id}.jpg"
            
            # Encode processed image
            _, processed_buffer = cv2.imencode('.jpg', result.processed_image, [cv2.IMWRITE_JPEG_QUALITY, 90])
            processed_url = upload_to_s3(processed_buffer.tobytes(), processed_key)
            
            # Generate thumbnail
            thumbnail = cv2.resize(result.processed_image, (400, 400))
            _, thumbnail_buffer = cv2.imencode('.jpg', thumbnail, [cv2.IMWRITE_JPEG_QUALITY, 80])
            thumbnail_url = upload_to_s3(thumbnail_buffer.tobytes(), thumbnail_key)
            
            processing_time = time.time() - start_time
            
            # Send success callback
            send_callback(callback_url, {
                'postId': post_id,
                'success': True,
                'processedImageUrl': processed_url,
                'thumbnailUrl': thumbnail_url,
                'metadata': result.metadata,
                'processingTime': processing_time
            })
            
            logger.info(f"Post {post_id} processed successfully in {processing_time:.2f}s")
            
            return {
                'success': True,
                'processedImageUrl': processed_url,
                'processingTime': processing_time
            }
            
        except Exception as e:
            logger.error(f"Failed to process post {post_id}: {e}", exc_info=True)
            
            processing_time = time.time() - start_time
            
            # Send failure callback
            send_callback(callback_url, {
                'postId': post_id,
                'success': False,
                'error': str(e),
                'processingTime': processing_time
            })
            
            raise

# Register task
from ..celery_app import celery_app

process_avatar_task = celery_app.register_task(ProcessAvatarTask())
```

**Quality Checks:**
- [ ] Jobs queued successfully
- [ ] Celery workers pick up jobs
- [ ] Processing completes and callbacks work
- [ ] Failed jobs reported correctly
- [ ] Retries work on transient failures

**Acceptance Criteria:**
- Job success rate >90%
- Callback latency <1 second
- Failed jobs don't block queue
- Status updates accurate

---

## WORKSTREAM 2.2: FEED SYSTEM

**Agent:** Backend Feed Agent
**Duration:** Weeks 17-18 (2 weeks)
**Dependencies:** Post system complete
**Output:** Personalized feed with pagination

---

### **Task 2.2.1: Feed Generation Algorithm**

**Conditions:**
- [ ] Feed shows posts from followed users
- [ ] Chronological ordering
- [ ] Pagination implemented
- [ ] Efficient database queries
- [ ] Caching layer

**Implementation Requirements:**

**Feed Model:**
```sql
-- No separate feed table needed for Phase 2
-- Feed is generated dynamically from posts + follows
-- Later phases will add caching/precomputation
```

**Feed Controller:**
```typescript
// backend/src/controllers/FeedController.ts
import { Request, Response } from 'express';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { AuthRequest } from '../middleware/auth';
import { redisClient } from '../config/redis';

export class FeedController {
    /**
     * Get personalized feed for authenticated user
     */
    static async getFeed(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            // Check cache first
            const cacheKey = `feed:${userId}:page:${page}`;
            const cached = await redisClient.get(cacheKey);
            
            if (cached) {
                return res.json(JSON.parse(cached));
            }
            
            // Get list of users being followed
            const following = await Follow.findAll({
                where: { followerId: userId },
                attributes: ['followingId']
            });
            
            const followingIds = following.map(f => f.followingId);
            
            if (followingIds.length === 0) {
                // No follows yet, return empty feed
                return res.json({
                    posts: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    }
                });
            }
            
            // Get posts from followed users
            const { rows: posts, count } = await Post.findAndCountAll({
                where: {
                    userId: followingIds,
                    status: 'completed'
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }],
                order: [['createdAt', 'DESC']],
                limit,
                offset,
                attributes: [
                    'id', 'processedImageUrl', 'thumbnailUrl', 'caption',
                    'likesCount', 'commentsCount', 'createdAt'
                ]
            });
            
            // Check which posts current user has liked
            // (Will implement in social interactions)
            
            const response = {
                posts: posts.map(post => ({
                    id: post.id,
                    user: post.user,
                    imageUrl: post.processedImageUrl,
                    thumbnailUrl: post.thumbnailUrl,
                    caption: post.caption,
                    likesCount: post.likesCount,
                    commentsCount: post.commentsCount,
                    createdAt: post.createdAt,
                    likedByMe: false  // TODO: implement
                })),
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit),
                    hasMore: page < Math.ceil(count / limit)
                }
            };
            
            // Cache for 1 minute
            await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
            
            res.json(response);
            
        } catch (error) {
            console.error('Error getting feed:', error);
            res.status(500).json({ error: 'Failed to load feed' });
        }
    }
    
    /**
     * Get discover feed (all recent posts, not just followed users)
     */
    static async getDiscoverFeed(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            const { rows: posts, count } = await Post.findAndCountAll({
                where: {
                    status: 'completed'
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }],
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            
            res.json({
                posts,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit),
                    hasMore: page < Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting discover feed:', error);
            res.status(500).json({ error: 'Failed to load discover feed' });
        }
    }
    
    /**
     * Invalidate feed cache for user
     */
    static async invalidateFeedCache(userId: string) {
        try {
            // Delete all cached pages for this user
            const keys = await redisClient.keys(`feed:${userId}:page:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            console.error('Error invalidating cache:', error);
        }
    }
}
```

**Feed Routes:**
```typescript
// backend/src/routes/feed.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { FeedController } from '../controllers/FeedController';

const router = Router();

// Get personalized feed
router.get('/', authenticateToken, FeedController.getFeed);

// Get discover feed
router.get('/discover', FeedController.getDiscoverFeed);

export default router;
```

**Quality Checks:**
- [ ] Feed loads correctly for users with follows
- [ ] Empty feed for users with no follows
- [ ] Pagination works correctly
- [ ] Query performance <500ms
- [ ] Cache hit rate >70%

**Acceptance Criteria:**
- Feed loads in <1 second (cached)
- Feed loads in <3 seconds (uncached)
- Correct posts shown
- Pagination accurate

---

### **Task 2.2.2: Mobile Feed UI**

**Conditions:**
- [ ] Feed screen implemented
- [ ] Post card component created
- [ ] Infinite scroll working
- [ ] Pull to refresh
- [ ] Loading states

**Implementation Requirements:**

**Feed Screen:**
```typescript
// mobile/src/screens/main/FeedScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    StyleSheet,
    ActivityIndicator,
    Text
} from 'react-native';
import { api } from '../../services/api';
import PostCard from '../../components/PostCard';

interface Post {
    id: string;
    user: {
        id: string;
        username: string;
        activeAvatarId: string;
    };
    imageUrl: string;
    thumbnailUrl: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    likedByMe: boolean;
}

export default function FeedScreen() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    useEffect(() => {
        loadFeed();
    }, []);
    
    const loadFeed = async (pageNum: number = 1) => {
        try {
            const response = await api.getFeed(pageNum);
            
            if (pageNum === 1) {
                setPosts(response.posts);
            } else {
                setPosts(prev => [...prev, ...response.posts]);
            }
            
            setHasMore(response.pagination.hasMore);
            setPage(pageNum);
            
        } catch (error) {
            console.error('Error loading feed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };
    
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadFeed(1);
    }, []);
    
    const handleLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            loadFeed(page + 1);
        }
    }, [loadingMore, hasMore, page]);
    
    const renderPost = ({ item }: { item: Post }) => (
        <PostCard post={item} />
    );
    
    const renderFooter = () => {
        if (!loadingMore) return null;
        
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" />
            </View>
        );
    };
    
    const renderEmpty = () => (
        <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your feed is empty</Text>
            <Text style={styles.emptyText}>
                Follow users to see their posts here
            </Text>
        </View>
    );
    
    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" />
            </View>
        );
    }
    
    return (
        <View style={styles.container}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    footer: {
        padding: 20,
        alignItems: 'center'
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 100
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333'
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center'
    }
});
```

**Post Card Component:**
```typescript
// mobile/src/components/PostCard.tsx
import React from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Post {
    id: string;
    user: {
        username: string;
    };
    imageUrl: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
    likedByMe: boolean;
}

interface PostCardProps {
    post: Post;
}

export default function PostCard({ post }: PostCardProps) {
    const handleLike = () => {
        // TODO: Implement like functionality
        console.log('Like post:', post.id);
    };
    
    const handleComment = () => {
        // TODO: Navigate to comments
        console.log('Comment on post:', post.id);
    };
    
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <Ionicons name="person-circle" size={32} color="#999" />
                    </View>
                    <Text style={styles.username}>{post.user.username}</Text>
                </View>
                <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
                </TouchableOpacity>
            </View>
            
            {/* Image */}
            <Image
                source={{ uri: post.imageUrl }}
                style={styles.image}
                resizeMode="cover"
            />
            
            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                        <Ionicons
                            name={post.likedByMe ? "heart" : "heart-outline"}
                            size={28}
                            color={post.likedByMe ? "#FF3B30" : "#000"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={26} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="paper-plane-outline" size={26} color="#000" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity>
                    <Ionicons name="bookmark-outline" size={26} color="#000" />
                </TouchableOpacity>
            </View>
            
            {/* Likes */}
            <View style={styles.likesContainer}>
                <Text style={styles.likes}>
                    {post.likesCount.toLocaleString()} {post.likesCount === 1 ? 'like' : 'likes'}
                </Text>
            </View>
            
            {/* Caption */}
            {post.caption && (
                <View style={styles.captionContainer}>
                    <Text style={styles.caption}>
                        <Text style={styles.username}>{post.user.username}</Text>
                        {' '}
                        {post.caption}
                    </Text>
                </View>
            )}
            
            {/* Comments */}
            {post.commentsCount > 0 && (
                <TouchableOpacity onPress={handleComment}>
                    <Text style={styles.viewComments}>
                        View all {post.commentsCount} comments
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        marginRight: 10
    },
    username: {
        fontWeight: '600',
        fontSize: 14
    },
    image: {
        width: width,
        height: width,
        backgroundColor: '#f0f0f0'
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12
    },
    leftActions: {
        flexDirection: 'row'
    },
    actionButton: {
        marginRight: 15
    },
    likesContainer: {
        paddingHorizontal: 12,
        paddingBottom: 8
    },
    likes: {
        fontWeight: '600',
        fontSize: 14
    },
    captionContainer: {
        paddingHorizontal: 12,
        paddingBottom: 8
    },
    caption: {
        fontSize: 14,
        lineHeight: 18
    },
    viewComments: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        color: '#999',
        fontSize: 14
    }
});
```

**Quality Checks:**
- [ ] Feed loads smoothly
- [ ] Images load progressively
- [ ] Infinite scroll doesn't jank
- [ ] Pull to refresh works
- [ ] Loading states clear

**Acceptance Criteria:**
- Scroll performance 60fps
- Images cached properly
- No memory leaks
- Works offline (cached content)

---

## WORKSTREAM 2.3: SOCIAL INTERACTIONS

**Agent:** Social Features Agent
**Duration:** Weeks 19-21 (3 weeks)
**Dependencies:** Feed system complete
**Output:** Follow, like, and comment functionality

---

### **Task 2.3.1: Follow System**

**Conditions:**
- [ ] Follow/unfollow working
- [ ] Follower/following counts accurate
- [ ] Following list and followers list
- [ ] Feed updates after follow/unfollow
- [ ] Prevent duplicate follows

**Implementation Requirements:**

**Follow Model:**
```typescript
// backend/src/models/Follow.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Follow extends Model {
    public followerId!: string;
    public followingId!: string;
    public createdAt!: Date;
}

Follow.init({
    followerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    followingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    sequelize,
    tableName: 'follows',
    timestamps: true,
    updatedAt: false,  // No need for updatedAt
    indexes: [
        {
            unique: true,
            fields: ['followerId', 'followingId']
        },
        {
            fields: ['followerId']
        },
        {
            fields: ['followingId']
        }
    ]
});
```

**Update User Model:**
```typescript
// Add to User model
User.hasMany(Follow, {
    foreignKey: 'followerId',
    as: 'following'
});

User.hasMany(Follow, {
    foreignKey: 'followingId',
    as: 'followers'
});
```

**Follow Controller:**
```typescript
// backend/src/controllers/FollowController.ts
import { Response } from 'express';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { FeedController } from './FeedController';

export class FollowController {
    /**
     * Follow a user
     */
    static async followUser(req: AuthRequest, res: Response) {
        try {
            const { username } = req.params;
            const followerId = req.user!.id;
            
            // Find user to follow
            const userToFollow = await User.findOne({ where: { username } });
            
            if (!userToFollow) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            if (userToFollow.id === followerId) {
                return res.status(400).json({ error: 'Cannot follow yourself' });
            }
            
            // Check if already following
            const existing = await Follow.findOne({
                where: {
                    followerId,
                    followingId: userToFollow.id
                }
            });
            
            if (existing) {
                return res.status(400).json({ error: 'Already following this user' });
            }
            
            // Create follow
            await Follow.create({
                followerId,
                followingId: userToFollow.id
            });
            
            // Invalidate feed cache
            await FeedController.invalidateFeedCache(followerId);
            
            res.json({ message: 'Now following user', following: true });
            
        } catch (error) {
            console.error('Error following user:', error);
            res.status(500).json({ error: 'Failed to follow user' });
        }
    }
    
    /**
     * Unfollow a user
     */
    static async unfollowUser(req: AuthRequest, res: Response) {
        try {
            const { username } = req.params;
            const followerId = req.user!.id;
            
            // Find user to unfollow
            const userToUnfollow = await User.findOne({ where: { username } });
            
            if (!userToUnfollow) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Delete follow
            const deleted = await Follow.destroy({
                where: {
                    followerId,
                    followingId: userToUnfollow.id
                }
            });
            
            if (deleted === 0) {
                return res.status(400).json({ error: 'Not following this user' });
            }
            
            // Invalidate feed cache
            await FeedController.invalidateFeedCache(followerId);
            
            res.json({ message: 'Unfollowed user', following: false });
            
        } catch (error) {
            console.error('Error unfollowing user:', error);
            res.status(500).json({ error: 'Failed to unfollow user' });
        }
    }
    
    /**
     * Get followers list
     */
    static async getFollowers(req: Request, res: Response) {
        try {
            const { username } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 30;
            const offset = (page - 1) * limit;
            
            const user = await User.findOne({ where: { username } });
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const { rows: follows, count } = await Follow.findAndCountAll({
                where: { followingId: user.id },
                include: [{
                    model: User,
                    as: 'follower',
                    attributes: ['id', 'username', 'activeAvatarId']
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });
            
            const followers = follows.map(f => f.follower);
            
            res.json({
                followers,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting followers:', error);
            res.status(500).json({ error: 'Failed to get followers' });
        }
    }
    
    /**
     * Get following list
     */
    static async getFollowing(req: Request, res: Response) {
        try {
            const { username } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 30;
            const offset = (page - 1) * limit;
            
            const user = await User.findOne({ where: { username } });
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const { rows: follows, count } = await Follow.findAndCountAll({
                where: { followerId: user.id },
                include: [{
                    model: User,
                    as: 'following',
                    attributes: ['id', 'username', 'activeAvatarId']
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });
            
            const following = follows.map(f => f.following);
            
            res.json({
                following,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting following:', error);
            res.status(500).json({ error: 'Failed to get following' });
        }
    }
    
    /**
     * Check if authenticated user is following another user
     */
    static async checkFollowing(req: AuthRequest, res: Response) {
        try {
            const { username } = req.params;
            const followerId = req.user!.id;
            
            const userToCheck = await User.findOne({ where: { username } });
            
            if (!userToCheck) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const follow = await Follow.findOne({
                where: {
                    followerId,
                    followingId: userToCheck.id
                }
            });
            
            res.json({ following: !!follow });
            
        } catch (error) {
            console.error('Error checking following:', error);
            res.status(500).json({ error: 'Failed to check following status' });
        }
    }
}
```

**Follow Routes:**
```typescript
// backend/src/routes/follows.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { FollowController } from '../controllers/FollowController';

const router = Router();

// Follow/unfollow
router.post('/:username/follow', authenticateToken, FollowController.followUser);
router.delete('/:username/follow', authenticateToken, FollowController.unfollowUser);

// Lists
router.get('/:username/followers', FollowController.getFollowers);
router.get('/:username/following', FollowController.getFollowing);

// Check status
router.get('/:username/following-status', authenticateToken, FollowController.checkFollowing);

export default router;
```

**Quality Checks:**
- [ ] Can follow/unfollow users
- [ ] Counts update correctly
- [ ] Cannot follow same user twice
- [ ] Cannot follow self
- [ ] Feed updates after follow

**Acceptance Criteria:**
- Follow/unfollow <200ms
- Counts always accurate
- No race conditions


### **Task 2.3.2: Like System**

**Conditions:**
- [ ] Users can like/unlike posts
- [ ] Like counts update in real-time
- [ ] Like status persists
- [ ] Optimistic UI updates
- [ ] No duplicate likes

**Implementation Requirements:**

**Like Model:**
```typescript
// backend/src/models/Like.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Like extends Model {
    public id!: string;
    public userId!: string;
    public postId!: string;
    public createdAt!: Date;
}

Like.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    postId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'posts',
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    sequelize,
    tableName: 'likes',
    timestamps: true,
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'postId']
        },
        {
            fields: ['postId']
        },
        {
            fields: ['userId']
        }
    ]
});

// Associations
import { Post } from './Post';
import { User } from './User';

Post.hasMany(Like, { foreignKey: 'postId', as: 'likes' });
Like.belongsTo(Post, { foreignKey: 'postId' });
Like.belongsTo(User, { foreignKey: 'userId', as: 'user' });
```

**Like Controller:**
```typescript
// backend/src/controllers/LikeController.ts
import { Response } from 'express';
import { Like } from '../models/Like';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sequelize } from '../config/database';

export class LikeController {
    /**
     * Like a post
     */
    static async likePost(req: AuthRequest, res: Response) {
        const transaction = await sequelize.transaction();
        
        try {
            const { postId } = req.params;
            const userId = req.user!.id;
            
            // Check if post exists
            const post = await Post.findByPk(postId);
            if (!post) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Post not found' });
            }
            
            // Check if already liked
            const existingLike = await Like.findOne({
                where: { userId, postId }
            });
            
            if (existingLike) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Post already liked' });
            }
            
            // Create like
            await Like.create({ userId, postId }, { transaction });
            
            // Increment like count
            await post.increment('likesCount', { transaction });
            
            await transaction.commit();
            
            res.json({
                message: 'Post liked',
                liked: true,
                likesCount: post.likesCount + 1
            });
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error liking post:', error);
            res.status(500).json({ error: 'Failed to like post' });
        }
    }
    
    /**
     * Unlike a post
     */
    static async unlikePost(req: AuthRequest, res: Response) {
        const transaction = await sequelize.transaction();
        
        try {
            const { postId } = req.params;
            const userId = req.user!.id;
            
            const post = await Post.findByPk(postId);
            if (!post) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Post not found' });
            }
            
            // Delete like
            const deleted = await Like.destroy({
                where: { userId, postId },
                transaction
            });
            
            if (deleted === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Post not liked' });
            }
            
            // Decrement like count (ensure doesn't go below 0)
            if (post.likesCount > 0) {
                await post.decrement('likesCount', { transaction });
            }
            
            await transaction.commit();
            
            res.json({
                message: 'Post unliked',
                liked: false,
                likesCount: Math.max(0, post.likesCount - 1)
            });
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error unliking post:', error);
            res.status(500).json({ error: 'Failed to unlike post' });
        }
    }
    
    /**
     * Get list of users who liked a post
     */
    static async getPostLikes(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 30;
            const offset = (page - 1) * limit;
            
            const post = await Post.findByPk(postId);
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            const { rows: likes, count } = await Like.findAndCountAll({
                where: { postId },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }],
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            
            const users = likes.map(like => like.user);
            
            res.json({
                users,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting likes:', error);
            res.status(500).json({ error: 'Failed to get likes' });
        }
    }
    
    /**
     * Get liked status for multiple posts (batch request)
     */
    static async getLikedStatus(req: AuthRequest, res: Response) {
        try {
            const { postIds } = req.body; // Array of post IDs
            const userId = req.user!.id;
            
            if (!Array.isArray(postIds) || postIds.length === 0) {
                return res.status(400).json({ error: 'Invalid postIds' });
            }
            
            const likes = await Like.findAll({
                where: {
                    userId,
                    postId: postIds
                },
                attributes: ['postId']
            });
            
            const likedPostIds = new Set(likes.map(like => like.postId));
            
            const status = postIds.reduce((acc, postId) => {
                acc[postId] = likedPostIds.has(postId);
                return acc;
            }, {} as Record<string, boolean>);
            
            res.json({ status });
            
        } catch (error) {
            console.error('Error getting liked status:', error);
            res.status(500).json({ error: 'Failed to get liked status' });
        }
    }
}
```

**Like Routes:**
```typescript
// backend/src/routes/likes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { LikeController } from '../controllers/LikeController';

const router = Router();

// Like/unlike
router.post('/posts/:postId/like', authenticateToken, LikeController.likePost);
router.delete('/posts/:postId/like', authenticateToken, LikeController.unlikePost);

// Get likes
router.get('/posts/:postId/likes', LikeController.getPostLikes);

// Batch check
router.post('/likes/status', authenticateToken, LikeController.getLikedStatus);

export default router;
```

**Mobile Like Implementation:**
```typescript
// mobile/src/hooks/useLike.ts
import { useState } from 'react';
import { api } from '../services/api';

export function useLike(initialLiked: boolean, initialCount: number) {
    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    
    const toggleLike = async (postId: string) => {
        // Optimistic update
        const previousLiked = liked;
        const previousCount = likesCount;
        
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
        
        setLoading(true);
        
        try {
            if (liked) {
                await api.unlikePost(postId);
            } else {
                await api.likePost(postId);
            }
        } catch (error) {
            // Revert on error
            setLiked(previousLiked);
            setLikesCount(previousCount);
            console.error('Error toggling like:', error);
        } finally {
            setLoading(false);
        }
    };
    
    return { liked, likesCount, loading, toggleLike };
}
```

**Update PostCard Component:**
```typescript
// mobile/src/components/PostCard.tsx (modifications)
import { useLike } from '../hooks/useLike';

export default function PostCard({ post }: PostCardProps) {
    const { liked, likesCount, toggleLike } = useLike(
        post.likedByMe,
        post.likesCount
    );
    
    const handleLike = () => {
        toggleLike(post.id);
    };
    
    // ... rest of component with updated liked state
}
```

**Quality Checks:**
- [ ] Like/unlike works correctly
- [ ] Counts update immediately (optimistic)
- [ ] Counts revert on error
- [ ] No duplicate likes possible
- [ ] Like status persists after app restart

**Acceptance Criteria:**
- Like action <200ms response
- No race conditions
- Counts always accurate
- Optimistic UI feels instant

---

### **Task 2.3.3: Comment System**

**Conditions:**
- [ ] Users can add comments to posts
- [ ] Comments display in chronological order
- [ ] Comment counts update
- [ ] Users can delete their own comments
- [ ] Nested replies (optional for Phase 2)

**Implementation Requirements:**

**Comment Model:**
```typescript
// backend/src/models/Comment.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Comment extends Model {
    public id!: string;
    public postId!: string;
    public userId!: string;
    public content!: string;
    public parentCommentId!: string | null;  // For nested replies
    public createdAt!: Date;
    public updatedAt!: Date;
}

Comment.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    postId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'posts',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 500]  // Max 500 characters
        }
    },
    parentCommentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'comments',
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    sequelize,
    tableName: 'comments',
    timestamps: true,
    indexes: [
        {
            fields: ['postId', 'createdAt']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['parentCommentId']
        }
    ]
});

// Self-referential association for replies
Comment.hasMany(Comment, {
    foreignKey: 'parentCommentId',
    as: 'replies'
});

Comment.belongsTo(Comment, {
    foreignKey: 'parentCommentId',
    as: 'parentComment'
});

// Associations
import { Post } from './Post';
import { User } from './User';

Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
```

**Comment Controller:**
```typescript
// backend/src/controllers/CommentController.ts
import { Response } from 'express';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sequelize } from '../config/database';

export class CommentController {
    /**
     * Create a comment
     */
    static async createComment(req: AuthRequest, res: Response) {
        const transaction = await sequelize.transaction();
        
        try {
            const { postId } = req.params;
            const { content, parentCommentId } = req.body;
            const userId = req.user!.id;
            
            // Validate content
            if (!content || content.trim().length === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Comment content required' });
            }
            
            if (content.length > 500) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
            }
            
            // Check if post exists
            const post = await Post.findByPk(postId);
            if (!post) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Post not found' });
            }
            
            // If replying, check parent comment exists
            if (parentCommentId) {
                const parentComment = await Comment.findByPk(parentCommentId);
                if (!parentComment || parentComment.postId !== postId) {
                    await transaction.rollback();
                    return res.status(404).json({ error: 'Parent comment not found' });
                }
            }
            
            // Create comment
            const comment = await Comment.create({
                postId,
                userId,
                content: content.trim(),
                parentCommentId: parentCommentId || null
            }, { transaction });
            
            // Increment comment count (only for top-level comments)
            if (!parentCommentId) {
                await post.increment('commentsCount', { transaction });
            }
            
            await transaction.commit();
            
            // Fetch comment with user data
            const commentWithUser = await Comment.findByPk(comment.id, {
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });
            
            res.status(201).json({
                message: 'Comment created',
                comment: commentWithUser
            });
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error creating comment:', error);
            res.status(500).json({ error: 'Failed to create comment' });
        }
    }
    
    /**
     * Get comments for a post
     */
    static async getPostComments(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            const post = await Post.findByPk(postId);
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }
            
            // Get top-level comments only (no replies)
            const { rows: comments, count } = await Comment.findAndCountAll({
                where: {
                    postId,
                    parentCommentId: null
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'activeAvatarId']
                    },
                    {
                        model: Comment,
                        as: 'replies',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'activeAvatarId']
                        }],
                        limit: 3,  // Show first 3 replies
                        order: [['createdAt', 'ASC']]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            
            res.json({
                comments,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting comments:', error);
            res.status(500).json({ error: 'Failed to get comments' });
        }
    }
    
    /**
     * Get replies for a comment
     */
    static async getCommentReplies(req: Request, res: Response) {
        try {
            const { commentId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            const { rows: replies, count } = await Comment.findAndCountAll({
                where: {
                    parentCommentId: commentId
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }],
                order: [['createdAt', 'ASC']],
                limit,
                offset
            });
            
            res.json({
                replies,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
            
        } catch (error) {
            console.error('Error getting replies:', error);
            res.status(500).json({ error: 'Failed to get replies' });
        }
    }
    
    /**
     * Delete a comment
     */
    static async deleteComment(req: AuthRequest, res: Response) {
        const transaction = await sequelize.transaction();
        
        try {
            const { commentId } = req.params;
            const userId = req.user!.id;
            
            const comment = await Comment.findByPk(commentId);
            
            if (!comment) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Comment not found' });
            }
            
            // Check ownership
            if (comment.userId !== userId) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Not authorized to delete this comment' });
            }
            
            const postId = comment.postId;
            const isTopLevel = comment.parentCommentId === null;
            
            // Delete comment (cascade deletes replies)
            await comment.destroy({ transaction });
            
            // Decrement comment count (only for top-level comments)
            if (isTopLevel) {
                await Post.decrement('commentsCount', {
                    where: { id: postId },
                    transaction
                });
            }
            
            await transaction.commit();
            
            res.json({ message: 'Comment deleted' });
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error deleting comment:', error);
            res.status(500).json({ error: 'Failed to delete comment' });
        }
    }
}
```

**Comment Routes:**
```typescript
// backend/src/routes/comments.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CommentController } from '../controllers/CommentController';

const router = Router();

// Create comment
router.post('/posts/:postId/comments', authenticateToken, CommentController.createComment);

// Get comments
router.get('/posts/:postId/comments', CommentController.getPostComments);

// Get replies
router.get('/comments/:commentId/replies', CommentController.getCommentReplies);

// Delete comment
router.delete('/comments/:commentId', authenticateToken, CommentController.deleteComment);

export default router;
```

**Mobile Comments Screen:**
```typescript
// mobile/src/screens/main/CommentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    FlatList,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

interface Comment {
    id: string;
    user: {
        username: string;
    };
    content: string;
    createdAt: string;
    replies?: Comment[];
}

export default function CommentsScreen({ route, navigation }: any) {
    const { postId } = route.params;
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    
    useEffect(() => {
        loadComments();
    }, []);
    
    const loadComments = async () => {
        try {
            const response = await api.getPostComments(postId);
            setComments(response.comments);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSubmitComment = async () => {
        if (!commentText.trim()) return;
        
        setSubmitting(true);
        
        try {
            const newComment = await api.createComment(postId, {
                content: commentText.trim(),
                parentCommentId: replyingTo
            });
            
            if (replyingTo) {
                // Add as reply
                setComments(prev => prev.map(c => {
                    if (c.id === replyingTo) {
                        return {
                            ...c,
                            replies: [...(c.replies || []), newComment.comment]
                        };
                    }
                    return c;
                }));
                setReplyingTo(null);
            } else {
                // Add as top-level comment
                setComments(prev => [newComment.comment, ...prev]);
            }
            
            setCommentText('');
        } catch (error) {
            console.error('Error submitting comment:', error);
            alert('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };
    
    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentContainer}>
            <View style={styles.commentHeader}>
                <Text style={styles.username}>{item.user.username}</Text>
                <Text style={styles.timestamp}>
                    {formatTimestamp(item.createdAt)}
                </Text>
            </View>
            
            <Text style={styles.commentContent}>{item.content}</Text>
            
            <TouchableOpacity
                onPress={() => setReplyingTo(item.id)}
                style={styles.replyButton}
            >
                <Text style={styles.replyText}>Reply</Text>
            </TouchableOpacity>
            
            {/* Replies */}
            {item.replies && item.replies.length > 0 && (
                <View style={styles.repliesContainer}>
                    {item.replies.map(reply => (
                        <View key={reply.id} style={styles.replyContainer}>
                            <Text style={styles.username}>{reply.user.username}</Text>
                            <Text style={styles.commentContent}>{reply.content}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
    
    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" />
            </View>
        );
    }
    
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No comments yet</Text>
                        <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                    </View>
                }
            />
            
            {replyingTo && (
                <View style={styles.replyingBanner}>
                    <Text style={styles.replyingText}>Replying to comment</Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                        <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            )}
            
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                />
                
                <TouchableOpacity
                    onPress={handleSubmitComment}
                    disabled={!commentText.trim() || submitting}
                    style={styles.sendButton}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" />
                    ) : (
                        <Ionicons
                            name="send"
                            size={24}
                            color={commentText.trim() ? '#007AFF' : '#CCC'}
                        />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

function formatTimestamp(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    list: {
        padding: 15
    },
    commentContainer: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5
    },
    username: {
        fontWeight: '600',
        fontSize: 14
    },
    timestamp: {
        color: '#999',
        fontSize: 12
    },
    commentContent: {
        fontSize: 14,
        lineHeight: 18,
        marginBottom: 8
    },
    replyButton: {
        alignSelf: 'flex-start'
    },
    replyText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '500'
    },
    repliesContainer: {
        marginTop: 10,
        marginLeft: 20,
        paddingLeft: 10,
        borderLeftWidth: 2,
        borderLeftColor: '#eee'
    },
    replyContainer: {
        marginBottom: 10
    },
    empty: {
        alignItems: 'center',
        marginTop: 50
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999'
    },
    replyingBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderTopWidth: 1,
        borderTopColor: '#ddd'
    },
    replyingText: {
        fontSize: 14,
        color: '#666'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        backgroundColor: '#fff'
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        fontSize: 16
    },
    sendButton: {
        marginLeft: 10,
        padding: 10
    }
});
```

**Quality Checks:**
- [ ] Comments post successfully
- [ ] Comments display in correct order
- [ ] Replies work correctly
- [ ] Users can delete their comments
- [ ] Comment count updates

**Acceptance Criteria:**
- Comment submission <500ms
- Comments load <1 second
- Nested replies supported
- Real-time feel with optimistic updates

---

## PHASE 2 COMPLETION CRITERIA

**All features must meet these standards:**

### **Functional Requirements:**
- [ ] Users can create posts with image upload
- [ ] Avatar processing queue working
- [ ] Feed shows posts from followed users
- [ ] Like/unlike posts
- [ ] Comment on posts
- [ ] Follow/unfollow users
- [ ] User profiles with post grid
- [ ] All CRUD operations working

### **Performance Requirements:**
- [ ] Image upload <5 seconds
- [ ] Processing time <10 seconds average
- [ ] Feed load <2 seconds (cached)
- [ ] API response times p95 <500ms
- [ ] Mobile app smooth 60fps scrolling

### **Quality Requirements:**
- [ ] No data loss
- [ ] Counts always accurate
- [ ] No race conditions
- [ ] Proper error handling
- [ ] Graceful degradation

### **Integration Requirements:**
- [ ] All API endpoints documented
- [ ] Mobile app integrated with all endpoints
- [ ] S3 uploads working reliably
- [ ] Queue processing stable
- [ ] Database queries optimized

**Exit Criteria:** Basic social media app functional, ready for friends testing

---

# PHASE 2.5: POSITIVITY COINS & KINDNESS ECOSYSTEM

**Duration:** 4 weeks (Weeks 19.5-22.5)
**Goal:** Create gamified kindness system to encourage positive behavior
**Dependencies:** Phase 2 complete (social features working)
**Parallel with:** Early Phase 3 preparation

---

## OVERVIEW

**Positivity Coins Philosophy:**
> "What if we could measure and reward kindness? Positivity Coins make being kind feel as good as getting likes - but with real meaning."

**Core Concept:**
- Users earn Positivity Coins through kind actions
- Coins can be given to others to show appreciation
- "Give Counter" publicly displays how much positivity someone spreads
- Free cooldown coins prevent pay-to-win
- Encourages daily engagement through cooldown mechanics

**Key Metrics:**
- Coins given per user per week (target: 5+)
- Give Counter visibility (on all profiles)
- Daily active users claiming cooldown coins (target: 40%+)
- Positive content increase (meaningful posts, kind comments)

---

## WORKSTREAM 2.5.1: COINS SYSTEM BACKEND

**Agent:** Coins System Agent
**Duration:** Week 1-2
**Output:** Complete coins economy infrastructure

---

### **Task 2.5.1.1: Database Schema & Models**

**Database Schema:**
```sql
-- Positivity Coins table
CREATE TABLE positivity_coins (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Coin balances
    total_coins INTEGER DEFAULT 0,  -- Total coins user currently has
    lifetime_earned INTEGER DEFAULT 0,  -- Total coins ever earned
    lifetime_given INTEGER DEFAULT 0,  -- Total coins ever given (for Give Counter)
    
    -- Cooldown system
    cooldown_coins_available INTEGER DEFAULT 0,  -- 0-3 available cooldown coins
    last_cooldown_claim TIMESTAMP,  -- When user last claimed cooldown coin
    next_cooldown_available_at TIMESTAMP,  -- When next cooldown coin will be ready
    
    -- Stats
    coins_from_posts INTEGER DEFAULT 0,
    coins_from_comments INTEGER DEFAULT 0,
    coins_from_ads INTEGER DEFAULT 0,
    coins_from_cooldown INTEGER DEFAULT 0,
    coins_from_other INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_positivity_coins_user (user_id),
    INDEX idx_positivity_coins_give_counter (lifetime_given DESC)
);

-- Coin transactions (history)
CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL if system-generated
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    amount INTEGER NOT NULL,  -- Number of coins
    transaction_type VARCHAR(30) NOT NULL,
        -- Values: 'earned_post', 'earned_comment', 'earned_ad', 'earned_cooldown',
        --         'given_to_user', 'received_from_user'
    
    -- Context
    related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    related_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
    message TEXT,  -- Optional message when giving coins
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_coin_transactions_from_user (from_user_id, created_at DESC),
    INDEX idx_coin_transactions_to_user (to_user_id, created_at DESC),
    INDEX idx_coin_transactions_type (transaction_type)
);

-- Coin giving activity (for notifications and feed)
CREATE TABLE coin_giving_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    giver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    coins_amount INTEGER NOT NULL,
    message TEXT,
    
    -- What triggered the gift
    context_type VARCHAR(20),  -- 'post', 'comment', 'profile', 'general'
    context_id UUID,  -- ID of post/comment if applicable
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_coin_giving_giver (giver_id, created_at DESC),
    INDEX idx_coin_giving_receiver (receiver_id, created_at DESC)
);

-- Update users table
ALTER TABLE users ADD COLUMN positivity_give_counter INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN positivity_rank VARCHAR(20) DEFAULT 'beginner';
    -- Ranks: 'beginner', 'kind', 'generous', 'inspirational', 'legend'
```

**Sequelize Models:**
```typescript
// backend/src/models/PositivityCoins.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class PositivityCoins extends Model {
    public userId!: string;
    public totalCoins!: number;
    public lifetimeEarned!: number;
    public lifetimeGiven!: number;
    
    public cooldownCoinsAvailable!: number;
    public lastCooldownClaim!: Date | null;
    public nextCooldownAvailableAt!: Date | null;
    
    public coinsFromPosts!: number;
    public coinsFromComments!: number;
    public coinsFromAds!: number;
    public coinsFromCooldown!: number;
    public coinsFromOther!: number;
    
    public createdAt!: Date;
    public updatedAt!: Date;
}

PositivityCoins.init({
    userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: 'users', key: 'id' }
    },
    totalCoins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: { min: 0 }
    },
    lifetimeEarned: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    lifetimeGiven: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    cooldownCoinsAvailable: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: { min: 0, max: 3 }
    },
    lastCooldownClaim: {
        type: DataTypes.DATE,
        allowNull: true
    },
    nextCooldownAvailableAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    coinsFromPosts: { type: DataTypes.INTEGER, defaultValue: 0 },
    coinsFromComments: { type: DataTypes.INTEGER, defaultValue: 0 },
    coinsFromAds: { type: DataTypes.INTEGER, defaultValue: 0 },
    coinsFromCooldown: { type: DataTypes.INTEGER, defaultValue: 0 },
    coinsFromOther: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    sequelize,
    tableName: 'positivity_coins',
    timestamps: true
});

// backend/src/models/CoinTransaction.ts
export class CoinTransaction extends Model {
    public id!: string;
    public fromUserId!: string | null;
    public toUserId!: string;
    public amount!: number;
    public transactionType!: string;
    public relatedPostId!: string | null;
    public relatedCommentId!: string | null;
    public message!: string | null;
    public createdAt!: Date;
}

CoinTransaction.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fromUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' }
    },
    toUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 }
    },
    transactionType: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    relatedPostId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'posts', key: 'id' }
    },
    relatedCommentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'comments', key: 'id' }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'coin_transactions',
    timestamps: true,
    updatedAt: false
});

// backend/src/models/CoinGivingActivity.ts
export class CoinGivingActivity extends Model {
    public id!: string;
    public giverId!: string;
    public receiverId!: string;
    public coinsAmount!: number;
    public message!: string | null;
    public contextType!: string | null;
    public contextId!: string | null;
    public createdAt!: Date;
}

CoinGivingActivity.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    giverId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    receiverId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    coinsAmount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    contextType: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    contextId: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'coin_giving_activity',
    timestamps: true,
    updatedAt: false
});

// Associations
import { User } from './User';

User.hasOne(PositivityCoins, { foreignKey: 'userId', as: 'coins' });
PositivityCoins.belongsTo(User, { foreignKey: 'userId' });

CoinTransaction.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
CoinTransaction.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' });

CoinGivingActivity.belongsTo(User, { foreignKey: 'giverId', as: 'giver' });
CoinGivingActivity.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
```

---

### **Task 2.5.1.2: Coins Service Layer**

**Core Coins Service:**
```typescript
// backend/src/services/CoinsService.ts
import { sequelize } from '../config/database';
import { PositivityCoins } from '../models/PositivityCoins';
import { CoinTransaction } from '../models/CoinTransaction';
import { CoinGivingActivity } from '../models/CoinGivingActivity';
import { User } from '../models/User';

const COOLDOWN_DURATION_MS = 3 * 60 * 60 * 1000;  // 3 hours
const MAX_COOLDOWN_COINS = 3;

export class CoinsService {
    /**
     * Initialize coins for new user
     */
    static async initializeUserCoins(userId: string): Promise<PositivityCoins> {
        const coins = await PositivityCoins.create({
            userId,
            totalCoins: 3,  // Start with 3 free coins!
            lifetimeEarned: 3,
            cooldownCoinsAvailable: 0,
            nextCooldownAvailableAt: new Date(Date.now() + COOLDOWN_DURATION_MS)
        });
        
        // Record welcome transaction
        await CoinTransaction.create({
            fromUserId: null,  // System
            toUserId: userId,
            amount: 3,
            transactionType: 'welcome_bonus'
        });
        
        return coins;
    }
    
    /**
     * Get user's coin balance and cooldown status
     */
    static async getUserCoins(userId: string): Promise<{
        totalCoins: number;
        lifetimeGiven: number;
        cooldownCoinsAvailable: number;
        nextCooldownAt: Date | null;
        minutesUntilNextCooldown: number | null;
    }> {
        let coins = await PositivityCoins.findByPk(userId);
        
        if (!coins) {
            coins = await this.initializeUserCoins(userId);
        }
        
        // Update cooldown coins if ready
        await this.updateCooldownCoins(userId);
        
        // Refresh after update
        coins = await PositivityCoins.findByPk(userId);
        
        const minutesUntilNext = coins!.nextCooldownAvailableAt
            ? Math.max(0, Math.ceil((coins!.nextCooldownAvailableAt.getTime() - Date.now()) / (60 * 1000)))
            : null;
        
        return {
            totalCoins: coins!.totalCoins,
            lifetimeGiven: coins!.lifetimeGiven,
            cooldownCoinsAvailable: coins!.cooldownCoinsAvailable,
            nextCooldownAt: coins!.nextCooldownAvailableAt,
            minutesUntilNextCooldown: minutesUntilNext
        };
    }
    
    /**
     * Update cooldown coins based on time elapsed
     */
    static async updateCooldownCoins(userId: string): Promise<void> {
        const coins = await PositivityCoins.findByPk(userId);
        if (!coins) return;
        
        const now = new Date();
        
        // If we have less than max cooldown coins and timer is up
        if (coins.cooldownCoinsAvailable < MAX_COOLDOWN_COINS && 
            coins.nextCooldownAvailableAt && 
            now >= coins.nextCooldownAvailableAt) {
            
            // Calculate how many cooldown periods have passed
            const msSinceLastCheck = now.getTime() - coins.nextCooldownAvailableAt.getTime();
            const periodsElapsed = Math.floor(msSinceLastCheck / COOLDOWN_DURATION_MS) + 1;
            
            // Add coins (up to max)
            const coinsToAdd = Math.min(
                periodsElapsed,
                MAX_COOLDOWN_COINS - coins.cooldownCoinsAvailable
            );
            
            if (coinsToAdd > 0) {
                const newCooldownCoins = coins.cooldownCoinsAvailable + coinsToAdd;
                
                // Set next cooldown time
                const nextCooldownAt = newCooldownCoins >= MAX_COOLDOWN_COINS
                    ? null  // Stop timer when at max
                    : new Date(now.getTime() + COOLDOWN_DURATION_MS);
                
                await coins.update({
                    cooldownCoinsAvailable: newCooldownCoins,
                    nextCooldownAvailableAt: nextCooldownAt
                });
            }
        }
    }
    
    /**
     * Claim cooldown coins
     */
    static async claimCooldownCoins(userId: string): Promise<{
        coinsClaimed: number;
        newBalance: number;
    }> {
        const transaction = await sequelize.transaction();
        
        try {
            await this.updateCooldownCoins(userId);
            
            const coins = await PositivityCoins.findByPk(userId, { transaction });
            if (!coins) throw new Error('Coins not initialized');
            
            if (coins.cooldownCoinsAvailable === 0) {
                await transaction.rollback();
                throw new Error('No cooldown coins available to claim');
            }
            
            const coinsToClaim = coins.cooldownCoinsAvailable;
            
            // Move cooldown coins to main balance
            await coins.update({
                totalCoins: coins.totalCoins + coinsToClaim,
                lifetimeEarned: coins.lifetimeEarned + coinsToClaim,
                coinsFromCooldown: coins.coinsFromCooldown + coinsToClaim,
                cooldownCoinsAvailable: 0,
                lastCooldownClaim: new Date(),
                nextCooldownAvailableAt: new Date(Date.now() + COOLDOWN_DURATION_MS)
            }, { transaction });
            
            // Record transaction
            await CoinTransaction.create({
                fromUserId: null,
                toUserId: userId,
                amount: coinsToClaim,
                transactionType: 'earned_cooldown'
            }, { transaction });
            
            await transaction.commit();
            
            return {
                coinsClaimed: coinsToClaim,
                newBalance: coins.totalCoins + coinsToClaim
            };
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Award coins for meaningful post
     */
    static async awardCoinsForPost(userId: string, postId: string): Promise<number> {
        const COINS_PER_POST = 2;
        
        const transaction = await sequelize.transaction();
        
        try {
            const coins = await PositivityCoins.findByPk(userId, { transaction });
            if (!coins) throw new Error('Coins not initialized');
            
            await coins.update({
                totalCoins: coins.totalCoins + COINS_PER_POST,
                lifetimeEarned: coins.lifetimeEarned + COINS_PER_POST,
                coinsFromPosts: coins.coinsFromPosts + COINS_PER_POST
            }, { transaction });
            
            await CoinTransaction.create({
                fromUserId: null,
                toUserId: userId,
                amount: COINS_PER_POST,
                transactionType: 'earned_post',
                relatedPostId: postId
            }, { transaction });
            
            await transaction.commit();
            
            return COINS_PER_POST;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Award coins for positive comment
     */
    static async awardCoinsForComment(userId: string, commentId: string): Promise<number> {
        const COINS_PER_COMMENT = 1;
        
        const transaction = await sequelize.transaction();
        
        try {
            const coins = await PositivityCoins.findByPk(userId, { transaction });
            if (!coins) throw new Error('Coins not initialized');
            
            await coins.update({
                totalCoins: coins.totalCoins + COINS_PER_COMMENT,
                lifetimeEarned: coins.lifetimeEarned + COINS_PER_COMMENT,
                coinsFromComments: coins.coinsFromComments + COINS_PER_COMMENT
            }, { transaction });
            
            await CoinTransaction.create({
                fromUserId: null,
                toUserId: userId,
                amount: COINS_PER_COMMENT,
                transactionType: 'earned_comment',
                relatedCommentId: commentId
            }, { transaction });
            
            await transaction.commit();
            
            return COINS_PER_COMMENT;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Award coins for watching ad
     */
    static async awardCoinsForAd(userId: string, adId: string): Promise<number> {
        const COINS_PER_AD = 5;
        const MAX_ADS_PER_DAY = 3;
        
        const transaction = await sequelize.transaction();
        
        try {
            // Check how many ads watched today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const adsWatchedToday = await CoinTransaction.count({
                where: {
                    toUserId: userId,
                    transactionType: 'earned_ad',
                    createdAt: { [sequelize.Op.gte]: today }
                }
            });
            
            if (adsWatchedToday >= MAX_ADS_PER_DAY) {
                await transaction.rollback();
                throw new Error('Daily ad limit reached (max 3 per day)');
            }
            
            const coins = await PositivityCoins.findByPk(userId, { transaction });
            if (!coins) throw new Error('Coins not initialized');
            
            await coins.update({
                totalCoins: coins.totalCoins + COINS_PER_AD,
                lifetimeEarned: coins.lifetimeEarned + COINS_PER_AD,
                coinsFromAds: coins.coinsFromAds + COINS_PER_AD
            }, { transaction });
            
            await CoinTransaction.create({
                fromUserId: null,
                toUserId: userId,
                amount: COINS_PER_AD,
                transactionType: 'earned_ad',
                message: adId
            }, { transaction });
            
            await transaction.commit();
            
            return COINS_PER_AD;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Give coins to another user
     */
    static async giveCoins(params: {
        fromUserId: string;
        toUserId: string;
        amount: number;
        message?: string;
        contextType?: string;
        contextId?: string;
    }): Promise<{
        success: boolean;
        newBalance: number;
        newGiveCounter: number;
    }> {
        const { fromUserId, toUserId, amount, message, contextType, contextId } = params;
        
        // Validation
        if (fromUserId === toUserId) {
            throw new Error('Cannot give coins to yourself');
        }
        
        if (amount < 1 || amount > 100) {
            throw new Error('Invalid coin amount (must be 1-100)');
        }
        
        const transaction = await sequelize.transaction();
        
        try {
            // Get giver's coins
            const giverCoins = await PositivityCoins.findByPk(fromUserId, { transaction });
            if (!giverCoins) throw new Error('Giver coins not initialized');
            
            if (giverCoins.totalCoins < amount) {
                throw new Error('Insufficient coins');
            }
            
            // Get receiver's coins
            let receiverCoins = await PositivityCoins.findByPk(toUserId, { transaction });
            if (!receiverCoins) {
                receiverCoins = await this.initializeUserCoins(toUserId);
            }
            
            // Get giver user for rank update
            const giverUser = await User.findByPk(fromUserId, { transaction });
            if (!giverUser) throw new Error('Giver not found');
            
            // Deduct from giver
            await giverCoins.update({
                totalCoins: giverCoins.totalCoins - amount,
                lifetimeGiven: giverCoins.lifetimeGiven + amount
            }, { transaction });
            
            // Add to receiver
            await receiverCoins.update({
                totalCoins: receiverCoins.totalCoins + amount,
                lifetimeEarned: receiverCoins.lifetimeEarned + amount
            }, { transaction });
            
            // Update giver's Give Counter on profile
            const newGiveCounter = giverUser.positivityGiveCounter + amount;
            await giverUser.update({
                positivityGiveCounter: newGiveCounter,
                positivityRank: this.calculateRank(newGiveCounter)
            }, { transaction });
            
            // Record transactions
            await CoinTransaction.create({
                fromUserId,
                toUserId,
                amount,
                transactionType: 'given_to_user',
                message,
                relatedPostId: contextType === 'post' ? contextId : null,
                relatedCommentId: contextType === 'comment' ? contextId : null
            }, { transaction });
            
            await CoinTransaction.create({
                fromUserId,
                toUserId,
                amount,
                transactionType: 'received_from_user',
                message,
                relatedPostId: contextType === 'post' ? contextId : null,
                relatedCommentId: contextType === 'comment' ? contextId : null
            }, { transaction });
            
            // Record giving activity (for feed/notifications)
            await CoinGivingActivity.create({
                giverId: fromUserId,
                receiverId: toUserId,
                coinsAmount: amount,
                message,
                contextType,
                contextId
            }, { transaction });
            
            await transaction.commit();
            
            // Send notification to receiver
            // await NotificationService.notifyCoinsReceived(toUserId, fromUserId, amount, message);
            
            return {
                success: true,
                newBalance: giverCoins.totalCoins - amount,
                newGiveCounter: newGiveCounter
            };
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Calculate rank based on Give Counter
     */
    private static calculateRank(giveCounter: number): string {
        if (giveCounter >= 1000) return 'legend';
        if (giveCounter >= 500) return 'inspirational';
        if (giveCounter >= 100) return 'generous';
        if (giveCounter >= 20) return 'kind';
        return 'beginner';
    }
    
    /**
     * Get leaderboard (top givers)
     */
    static async getGiveLeaderboard(limit: number = 50): Promise<Array<{
        user: User;
        giveCounter: number;
        rank: string;
    }>> {
        const topGivers = await User.findAll({
            order: [['positivityGiveCounter', 'DESC']],
            limit,
            attributes: ['id', 'username', 'activeAvatarId', 'positivityGiveCounter', 'positivityRank'],
            where: {
                positivityGiveCounter: { [sequelize.Op.gt]: 0 }
            }
        });
        
        return topGivers.map(user => ({
            user,
            giveCounter: user.positivityGiveCounter,
            rank: user.positivityRank
        }));
    }
    
    /**
     * Get user's coin transaction history
     */
    static async getTransactionHistory(
        userId: string,
        limit: number = 50
    ): Promise<CoinTransaction[]> {
        return await CoinTransaction.findAll({
            where: {
                [sequelize.Op.or]: [
                    { fromUserId: userId },
                    { toUserId: userId }
                ]
            },
            include: [
                { model: User, as: 'fromUser', attributes: ['id', 'username'] },
                { model: User, as: 'toUser', attributes: ['id', 'username'] }
            ],
            order: [['createdAt', 'DESC']],
            limit
        });
    }
}
```

---

### **Task 2.5.1.3: Coins API Endpoints**

**API Routes:**
```typescript
// backend/src/routes/coins.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CoinsController } from '../controllers/CoinsController';

const router = Router();

// Get user's coin balance and status
router.get('/me', authenticateToken, CoinsController.getMyCoins);

// Claim cooldown coins
router.post('/claim-cooldown', authenticateToken, CoinsController.claimCooldown);

// Give coins to another user
router.post('/give', authenticateToken, CoinsController.giveCoins);

// Get transaction history
router.get('/history', authenticateToken, CoinsController.getHistory);

// Get leaderboard
router.get('/leaderboard', CoinsController.getLeaderboard);

// Get give activity feed
router.get('/activity', CoinsController.getGivingActivity);

// Record ad watch (internal)
router.post('/reward-ad', authenticateToken, CoinsController.rewardAdWatch);

export default router;
```

**Controller:**
```typescript
// backend/src/controllers/CoinsController.ts
import { Request, Response } from 'express';
import { CoinsService } from '../services/CoinsService';
import { AuthRequest } from '../middleware/auth';

export class CoinsController {
    static async getMyCoins(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const coins = await CoinsService.getUserCoins(userId);
            
            res.json({ coins });
        } catch (error) {
            console.error('Error getting coins:', error);
            res.status(500).json({ error: 'Failed to get coins' });
        }
    }
    
    static async claimCooldown(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const result = await CoinsService.claimCooldownCoins(userId);
            
            res.json({
                message: `Claimed ${result.coinsClaimed} cooldown coins!`,
                ...result
            });
        } catch (error) {
            console.error('Error claiming cooldown:', error);
            res.status(400).json({ error: error.message });
        }
    }
    
    static async giveCoins(req: AuthRequest, res: Response) {
        try {
            const fromUserId = req.user!.id;
            const { toUserId, amount, message, contextType, contextId } = req.body;
            
            // Validation
            if (!toUserId) {
                return res.status(400).json({ error: 'Recipient required' });
            }
            
            if (!amount || amount < 1) {
                return res.status(400).json({ error: 'Invalid amount' });
            }
            
            const result = await CoinsService.giveCoins({
                fromUserId,
                toUserId,
                amount,
                message,
                contextType,
                contextId
            });
            
            res.json({
                message: 'Coins given successfully!',
                ...result
            });
        } catch (error) {
            console.error('Error giving coins:', error);
            res.status(400).json({ error: error.message });
        }
    }
    
    static async getHistory(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const limit = parseInt(req.query.limit as string) || 50;
            
            const history = await CoinsService.getTransactionHistory(userId, limit);
            
            res.json({ history });
        } catch (error) {
            console.error('Error getting history:', error);
            res.status(500).json({ error: 'Failed to get history' });
        }
    }
    
    static async getLeaderboard(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const leaderboard = await CoinsService.getGiveLeaderboard(limit);
            
            res.json({ leaderboard });
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            res.status(500).json({ error: 'Failed to get leaderboard' });
        }
    }
    
    static async getGivingActivity(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            
            const { rows: activity, count } = await CoinGivingActivity.findAndCountAll({
                include: [
                    { model: User, as: 'giver', attributes: ['id', 'username', 'activeAvatarId'] },
                    { model: User, as: 'receiver', attributes: ['id', 'username', 'activeAvatarId'] }
                ],
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            
            res.json({
                activity,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            console.error('Error getting activity:', error);
            res.status(500).json({ error: 'Failed to get activity' });
        }
    }
    
    static async rewardAdWatch(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { adId } = req.body;
            
            if (!adId) {
                return res.status(400).json({ error: 'Ad ID required' });
            }
            
            const coinsEarned = await CoinsService.awardCoinsForAd(userId, adId);
            
            res.json({
                message: `Earned ${coinsEarned} coins for watching ad!`,
                coinsEarned
            });
        } catch (error) {
            console.error('Error rewarding ad:', error);
            res.status(400).json({ error: error.message });
        }
    }
}
```

---

## WORKSTREAM 2.5.2: MOBILE UI/UX

**Agent:** Coins UI Agent
**Duration:** Week 2-3
**Output:** Beautiful, engaging coin system UI

---

### **Task 2.5.2.1: Coin Display Components**

**Cooldown Coins Widget (3-coin stack icon):**
```typescript
// mobile/src/components/coins/CooldownCoinsWidget.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence
} from 'react-native-reanimated';

interface CooldownCoinsWidgetProps {
    cooldownCoinsAvailable: number;
    minutesUntilNext: number | null;
    onPress: () => void;
}

export default function CooldownCoinsWidget({
    cooldownCoinsAvailable,
    minutesUntilNext,
    onPress
}: CooldownCoinsWidgetProps) {
    const scale = useSharedValue(1);
    
    // Pulse animation when coins available
    useEffect(() => {
        if (cooldownCoinsAvailable > 0) {
            scale.value = withRepeat(
                withSequence(
                    withSpring(1.1),
                    withSpring(1.0)
                ),
                -1,  // Infinite
                true
            );
        } else {
            scale.value = withSpring(1);
        }
    }, [cooldownCoinsAvailable]);
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));
    
    const formatTimeUntilNext = (minutes: number | null): string => {
        if (minutes === null) return '';
        if (minutes === 0) return 'Ready!';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };
    
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            disabled={cooldownCoinsAvailable === 0}
        >
            <Animated.View style={[styles.iconContainer, animatedStyle]}>
                {/* Stack of 3 coins */}
                <View style={styles.coinStack}>
                    {/* Bottom coin */}
                    <View style={[styles.coin, styles.coin3, cooldownCoinsAvailable >= 1 && styles.coinActive]} />
                    
                    {/* Middle coin */}
                    <View style={[styles.coin, styles.coin2, cooldownCoinsAvailable >= 2 && styles.coinActive]} />
                    
                    {/* Top coin */}
                    <View style={[styles.coin, styles.coin1, cooldownCoinsAvailable >= 3 && styles.coinActive]} />
                </View>
                
                {/* Badge showing count */}
                {cooldownCoinsAvailable > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{cooldownCoinsAvailable}</Text>
                    </View>
                )}
            </Animated.View>
            
            <View style={styles.info}>
                <Text style={styles.label}>Free Coins</Text>
                {cooldownCoinsAvailable > 0 ? (
                    <Text style={styles.ready}>Tap to claim!</Text>
                ) : (
                    <Text style={styles.timer}>{formatTimeUntilNext(minutesUntilNext)}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    iconContainer: {
        position: 'relative',
        marginRight: 12
    },
    coinStack: {
        width: 50,
        height: 50,
        position: 'relative'
    },
    coin: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#D1D5DB',
        borderWidth: 3,
        borderColor: '#9CA3AF'
    },
    coin1: {
        left: 10,
        top: 0,
        zIndex: 3
    },
    coin2: {
        left: 5,
        top: 5,
        zIndex: 2
    },
    coin3: {
        left: 0,
        top: 10,
        zIndex: 1
    },
    coinActive: {
        backgroundColor: '#FBBF24',  // Gold
        borderColor: '#F59E0B'
    },
    badge: {
        position: 'absolute',
        right: -5,
        top: -5,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold'
    },
    info: {
        flex: 1
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2
    },
    ready: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '600'
    },
    timer: {
        fontSize: 13,
        color: '#6B7280'
    }
});
```

**Positivity Coins Balance Display:**
```typescript
// mobile/src/components/coins/CoinsBalance.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CoinsBalanceProps {
    totalCoins: number;
    size?: 'small' | 'medium' | 'large';
}

export default function CoinsBalance({ totalCoins, size = 'medium' }: CoinsBalanceProps) {
    const sizeStyles = {
        small: {
            container: styles.smallContainer,
            icon: 16,
            text: styles.smallText
        },
        medium: {
            container: styles.mediumContainer,
            icon: 20,
            text: styles.mediumText
        },
        large: {
            container: styles.largeContainer,
            icon: 28,
            text: styles.largeText
        }
    };
    
    const currentSize = sizeStyles[size];
    
    return (
        <View style={[styles.container, currentSize.container]}>
            <Ionicons name="heart" size={currentSize.icon} color="#FBBF24" />
            <Text style={[styles.text, currentSize.text]}>
                {totalCoins.toLocaleString()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    text: {
        marginLeft: 6,
        fontWeight: '700',
        color: '#374151'
    },
    smallContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    smallText: {
        fontSize: 13
    },
    mediumContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6
    },
    mediumText: {
        fontSize: 16
    },
    largeContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8
    },
    largeText: {
        fontSize: 20
    }
});
```

**Give Counter Badge (on profiles):**
```typescript
// mobile/src/components/coins/GiveCounterBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GiveCounterBadgeProps {
    giveCounter: number;
    rank: string;
}

export default function GiveCounterBadge({ giveCounter, rank }: GiveCounterBadgeProps) {
    const rankColors = {
        beginner: '#9CA3AF',
        kind: '#60A5FA',
        generous: '#A78BFA',
        inspirational: '#F59E0B',
        legend: '#EF4444'
    };
    
    const rankEmojis = {
        beginner: '🌱',
        kind: '💙',
        generous: '💜',
        inspirational: '⭐',
        legend: '🏆'
    };
    
    return (
        <View style={[styles.container, { borderColor: rankColors[rank] }]}>
            <View style={styles.iconContainer}>
                <Ionicons name="gift" size={20} color={rankColors[rank]} />
            </View>
            
            <View style={styles.content}>
                <View style={styles.row}>
                    <Text style={styles.label}>Given</Text>
                    <Text style={styles.emoji}>{rankEmojis[rank]}</Text>
                </View>
                <Text style={[styles.count, { color: rankColors[rank] }]}>
                    {giveCounter.toLocaleString()}
                </Text>
                <Text style={[styles.rank, { color: rankColors[rank] }]}>
                    {rank.charAt(0).toUpperCase() + rank.slice(1)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    iconContainer: {
        marginRight: 12,
        justifyContent: 'center'
    },
    content: {
        flex: 1
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 4
    },
    emoji: {
        fontSize: 14
    },
    count: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 2
    },
    rank: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    }
});
```

---

### **Task 2.5.2.2: Coins Screens**

**Main Coins Screen:**
```typescript
// mobile/src/screens/coins/CoinsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    Text,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert
} from 'react-native';
import { api } from '../../services/api';
import CooldownCoinsWidget from '../../components/coins/CooldownCoinsWidget';
import CoinsBalance from '../../components/coins/CoinsBalance';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';
import { Ionicons } from '@expo/vector-icons';

export default function CoinsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [coinsData, setCoinsData] = useState({
        totalCoins: 0,
        lifetimeGiven: 0,
        cooldownCoinsAvailable: 0,
        minutesUntilNextCooldown: null,
        rank: 'beginner'
    });
    
    useEffect(() => {
        loadCoins();
        
        // Refresh every minute to update cooldown timer
        const interval = setInterval(loadCoins, 60000);
        return () => clearInterval(interval);
    }, []);
    
    const loadCoins = async () => {
        try {
            const response = await api.getMyCoins();
            setCoinsData({
                totalCoins: response.coins.totalCoins,
                lifetimeGiven: response.coins.lifetimeGiven,
                cooldownCoinsAvailable: response.coins.cooldownCoinsAvailable,
                minutesUntilNextCooldown: response.coins.minutesUntilNextCooldown,
                rank: response.coins.rank || 'beginner'
            });
        } catch (error) {
            console.error('Error loading coins:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    const handleClaimCooldown = async () => {
        try {
            const response = await api.claimCooldownCoins();
            Alert.alert(
                '🎉 Coins Claimed!',
                `You received ${response.coinsClaimed} free coins!`,
                [{ text: 'Awesome!', onPress: loadCoins }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to claim coins');
        }
    };
    
    const handleRefresh = () => {
        setRefreshing(true);
        loadCoins();
    };
    
    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Positivity Coins</Text>
                <Text style={styles.subtitle}>Spread kindness, earn rewards</Text>
            </View>
            
            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Your Balance</Text>
                <CoinsBalance totalCoins={coinsData.totalCoins} size="large" />
            </View>
            
            {/* Cooldown Coins */}
            <View style={styles.section}>
                <CooldownCoinsWidget
                    cooldownCoinsAvailable={coinsData.cooldownCoinsAvailable}
                    minutesUntilNext={coinsData.minutesUntilNextCooldown}
                    onPress={handleClaimCooldown}
                />
                <Text style={styles.cooldownInfo}>
                    💡 Free coins regenerate every 3 hours (max 3)
                </Text>
            </View>
            
            {/* Give Counter */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Impact</Text>
                <GiveCounterBadge
                    giveCounter={coinsData.lifetimeGiven}
                    rank={coinsData.rank}
                />
                <Text style={styles.giveInfo}>
                    You've spread {coinsData.lifetimeGiven} positive vibes! Keep it up! 🌟
                </Text>
            </View>
            
            {/* Earn More Coins */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earn More Coins</Text>
                
                <EarnOption
                    icon="create-outline"
                    title="Write a Meaningful Post"
                    reward="+2 coins"
                    description="Share something positive or helpful"
                    onPress={() => navigation.navigate('CreatePost')}
                />
                
                <EarnOption
                    icon="chatbubble-outline"
                    title="Leave a Kind Comment"
                    reward="+1 coin"
                    description="Brighten someone's day"
                    onPress={() => navigation.navigate('Feed')}
                />
                
                <EarnOption
                    icon="play-circle-outline"
                    title="Watch an Ad"
                    reward="+5 coins"
                    description="Max 3 per day"
                    onPress={() => navigation.navigate('WatchAd')}
                />
            </View>
            
            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('CoinHistory')}
                >
                    <Ionicons name="list-outline" size={24} color="#007AFF" />
                    <Text style={styles.actionText}>Transaction History</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('GiveLeaderboard')}
                >
                    <Ionicons name="trophy-outline" size={24} color="#F59E0B" />
                    <Text style={styles.actionText}>Kindness Leaderboard</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('GiveActivity')}
                >
                    <Ionicons name="heart-outline" size={24} color="#EF4444" />
                    <Text style={styles.actionText}>Recent Giving Activity</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

function EarnOption({ icon, title, reward, description, onPress }: any) {
    return (
        <TouchableOpacity style={styles.earnOption} onPress={onPress}>
            <View style={styles.earnIcon}>
                <Ionicons name={icon} size={28} color="#007AFF" />
            </View>
            <View style={styles.earnContent}>
                <View style={styles.earnHeader}>
                    <Text style={styles.earnTitle}>{title}</Text>
                    <View style={styles.rewardBadge}>
                        <Text style={styles.rewardText}>{reward}</Text>
                    </View>
                </View>
                <Text style={styles.earnDescription}>{description}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB'
    },
    header: {
        padding: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280'
    },
    balanceCard: {
        backgroundColor: '#FFF',
        margin: 16,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    balanceLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    section: {
        padding: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12
    },
    cooldownInfo: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 12,
        textAlign: 'center'
    },
    giveInfo: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 12,
        textAlign: 'center'
    },
    earnOption: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    earnIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    earnContent: {
        flex: 1
    },
    earnHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    earnTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827'
    },
    rewardBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    rewardText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF'
    },
    earnDescription: {
        fontSize: 14,
        color: '#6B7280'
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginLeft: 12
    }
});
```

**Give Coins Modal:**
```typescript
// mobile/src/components/coins/GiveCoinsModal.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

interface GiveCoinsModalProps {
    visible: boolean;
    recipientId: string;
    recipientUsername: string;
    contextType?: string;
    contextId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GiveCoinsModal({
    visible,
    recipientId,
    recipientUsername,
    contextType,
    contextId,
    onClose,
    onSuccess
}: GiveCoinsModalProps) {
    const [amount, setAmount] = useState('1');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    const presetAmounts = [1, 3, 5, 10];
    
    const handleGive = async () => {
        const coinsAmount = parseInt(amount);
        
        if (isNaN(coinsAmount) || coinsAmount < 1 || coinsAmount > 100) {
            Alert.alert('Invalid Amount', 'Please enter a number between 1 and 100');
            return;
        }
        
        setSubmitting(true);
        
        try {
            await api.giveCoins({
                toUserId: recipientId,
                amount: coinsAmount,
                message: message.trim() || undefined,
                contextType,
                contextId
            });
            
            Alert.alert(
                '💝 Coins Sent!',
                `You gave ${coinsAmount} coin${coinsAmount > 1 ? 's' : ''} to @${recipientUsername}`,
                [{ text: 'Great!', onPress: () => {
                    onSuccess();
                    onClose();
                }}]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to give coins');
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Give Positivity Coins</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Recipient */}
                    <View style={styles.recipient}>
                        <Ionicons name="person-circle" size={40} color="#9CA3AF" />
                        <Text style={styles.recipientName}>@{recipientUsername}</Text>
                    </View>
                    
                    {/* Amount Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>How many coins?</Text>
                        
                        <View style={styles.presets}>
                            {presetAmounts.map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[
                                        styles.presetButton,
                                        amount === preset.toString() && styles.presetButtonActive
                                    ]}
                                    onPress={() => setAmount(preset.toString())}
                                >
                                    <Text style={[
                                        styles.presetText,
                                        amount === preset.toString() && styles.presetTextActive
                                    ]}>
                                        {preset}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="Custom amount"
                            keyboardType="number-pad"
                            maxLength={3}
                        />
                    </View>
                    
                    {/* Message (Optional) */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Add a message (optional)</Text>
                        <TextInput
                            style={styles.messageInput}
                            value={message}
                            onChangeText={setMessage}
                            placeholder="You're awesome! 😊"
                            multiline
                            maxLength={200}
                        />
                        <Text style={styles.charCount}>{message.length}/200</Text>
                    </View>
                    
                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.giveButton, submitting && styles.giveButtonDisabled]}
                            onPress={handleGive}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.giveText}>Give Coins 💝</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modal: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        padding: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827'
    },
    recipient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 20
    },
    recipientName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 12
    },
    section: {
        marginBottom: 20
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12
    },
    presets: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    presetButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFF',
        alignItems: 'center'
    },
    presetButtonActive: {
        borderColor: '#FBBF24',
        backgroundColor: '#FEF3C7'
    },
    presetText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280'
    },
    presetTextActive: {
        color: '#F59E0B'
    },
    amountInput: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 16
    },
    messageInput: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top'
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center'
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280'
    },
    giveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center'
    },
    giveButtonDisabled: {
        backgroundColor: '#FCA5A5'
    },
    giveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF'
    }
});
```

---

## WORKSTREAM 2.5.3: INTEGRATION & GAMIFICATION

**Agent:** Gamification Agent
**Duration:** Week 3-4
**Output:** Coins integrated throughout app

---

### **Task 2.5.3.1: Automatic Coin Awards**

**Award Coins for Meaningful Posts:**
```typescript
// backend/src/controllers/PostController.ts (update createPost method)

static async createPost(req: AuthRequest, res: Response) {
    try {
        const { caption } = req.body;
        const userId = req.user!.id;
        
        // ... existing post creation logic ...
        
        // Check if post is "meaningful" (has caption with >20 chars)
        if (caption && caption.trim().length >= 20) {
            // Award coins for meaningful post
            await CoinsService.awardCoinsForPost(userId, post.id);
            
            // Notify user
            await NotificationService.sendNotification(userId, {
                type: 'coins_earned',
                title: 'Coins Earned! 🎉',
                body: 'You earned 2 coins for your meaningful post!',
                data: { coinsEarned: 2 }
            });
        }
        
        res.status(201).json({
            postId: post.id,
            status: 'processing',
            coinsEarned: caption && caption.trim().length >= 20 ? 2 : 0
        });
        
    } catch (error) {
        // ... error handling ...
    }
}
```

**Award Coins for Positive Comments:**
```typescript
// backend/src/services/PositivityDetectionService.ts

import { Configuration, OpenAIApi } from 'openai';

export class PositivityDetectionService {
    private static openai = new OpenAIApi(new Configuration({
        apiKey: process.env.OPENAI_API_KEY
    }));
    
    /**
     * Detect if comment is positive/kind
     * Returns true if positive, false otherwise
     */
    static async isPositiveComment(commentText: string): Promise<boolean> {
        // Simple rule-based approach (fast, no API cost)
        const positiveKeywords = [
            'love', 'great', 'awesome', 'beautiful', 'amazing', 'wonderful',
            'fantastic', 'excellent', 'nice', 'good', 'cool', 'thank', 'thanks',
            'appreciate', 'helpful', 'inspiring', 'motivating', '❤️', '😊', '🙌',
            '👏', '🎉', '💪', '✨', '🌟'
        ];
        
        const lowerComment = commentText.toLowerCase();
        
        // At least 10 characters
        if (commentText.length < 10) return false;
        
        // Contains positive keywords
        const hasPositiveWords = positiveKeywords.some(word => 
            lowerComment.includes(word)
        );
        
        // Doesn't contain negative keywords
        const negativeKeywords = ['hate', 'ugly', 'stupid', 'bad', 'terrible', 'awful'];
        const hasNegativeWords = negativeKeywords.some(word =>
            lowerComment.includes(word)
        );
        
        return hasPositiveWords && !hasNegativeWords;
    }
}

// backend/src/controllers/CommentController.ts (update createComment)

static async createComment(req: AuthRequest, res: Response) {
    const transaction = await sequelize.transaction();
    
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user!.id;
        
        // ... existing comment creation logic ...
        
        // Check if comment is positive
        const isPositive = await PositivityDetectionService.isPositiveComment(content);
        
        if (isPositive) {
            // Award coin for positive comment
            await CoinsService.awardCoinsForComment(userId, comment.id);
            
            // Notify user
            await NotificationService.sendNotification(userId, {
                type: 'coins_earned',
                title: 'Kindness Rewarded! 💙',
                body: 'You earned 1 coin for spreading positivity!',
                data: { coinsEarned: 1 }
            });
        }
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'Comment created',
            comment: commentWithUser,
            coinsEarned: isPositive ? 1 : 0
        });
        
    } catch (error) {
        await transaction.rollback();
        // ... error handling ...
    }
}
```

---

### **Task 2.5.3.2: Give Coins Integration**

**Add "Give Coins" Button to Posts:**
```typescript
// mobile/src/components/PostCard.tsx (update)

export default function PostCard({ post }: PostCardProps) {
    const [giveModalVisible, setGiveModalVisible] = useState(false);
    const { liked, likesCount, toggleLike } = useLike(post.likedByMe, post.likesCount);
    
    return (
        <View style={styles.container}>
            {/* ... existing post content ... */}
            
            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={() => toggleLike(post.id)} style={styles.actionButton}>
                        <Ionicons
                            name={liked ? "heart" : "heart-outline"}
                            size={28}
                            color={liked ? "#FF3B30" : "#000"}
                        />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => handleComment()} style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={26} color="#000" />
                    </TouchableOpacity>
                    
                    {/* NEW: Give Coins Button */}
                    <TouchableOpacity
                        onPress={() => setGiveModalVisible(true)}
                        style={styles.actionButton}
                    >
                        <Ionicons name="gift" size={26} color="#FBBF24" />
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* Give Coins Modal */}
            <GiveCoinsModal
                visible={giveModalVisible}
                recipientId={post.user.id}
                recipientUsername={post.user.username}
                contextType="post"
                contextId={post.id}
                onClose={() => setGiveModalVisible(false)}
                onSuccess={() => {
                    // Optionally reload post or show animation
                }}
            />
        </View>
    );
}
```

**Add "Give Coins" to User Profiles:**
```typescript
// mobile/src/screens/profile/ProfileScreen.tsx (update)

export default function ProfileScreen({ route }: any) {
    const { username } = route.params;
    const [user, setUser] = useState(null);
    const [giveModalVisible, setGiveModalVisible] = useState(false);
    
    // ... existing profile loading ...
    
    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Text style={styles.username}>@{user.username}</Text>
                    
                    {/* Give Counter Badge */}
                    <GiveCounterBadge
                        giveCounter={user.positivityGiveCounter}
                        rank={user.positivityRank}
                    />
                </View>
                
                {/* NEW: Give Coins Button */}
                {!isOwnProfile && (
                    <TouchableOpacity
                        style={styles.giveButton}
                        onPress={() => setGiveModalVisible(true)}
                    >
                        <Ionicons name="gift" size={20} color="#FFF" />
                        <Text style={styles.giveButtonText}>Give Coins</Text>
                    </TouchableOpacity>
                )}
            </View>
            
            {/* ... rest of profile ... */}
            
            <GiveCoinsModal
                visible={giveModalVisible}
                recipientId={user.id}
                recipientUsername={user.username}
                contextType="profile"
                onClose={() => setGiveModalVisible(false)}
                onSuccess={() => loadProfile()}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // ... existing styles ...
    giveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FBBF24',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    giveButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
        marginLeft: 6
    }
});
```

---

### **Task 2.5.3.3: Kindness Leaderboard**

**Leaderboard Screen:**
```typescript
// mobile/src/screens/coins/GiveLeaderboardScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, Image, StyleSheet } from 'react-native';
import { api } from '../../services/api';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';

export default function GiveLeaderboardScreen() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadLeaderboard();
    }, []);
    
    const loadLeaderboard = async () => {
        try {
            const response = await api.getGiveLeaderboard();
            setLeaderboard(response.leaderboard);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const renderItem = ({ item, index }: any) => (
        <View style={styles.item}>
            {/* Rank */}
            <View style={[styles.rankBadge, index < 3 && styles.rankBadgeTop]}>
                {index < 3 ? (
                    <Text style={styles.medal}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </Text>
                ) : (
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                )}
            </View>
            
            {/* User Info */}
            <View style={styles.userInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>👤</Text>
                </View>
                <View style={styles.details}>
                    <Text style={styles.username}>@{item.user.username}</Text>
                    <Text style={styles.rankLabel}>{item.rank}</Text>
                </View>
            </View>
            
            {/* Give Counter */}
            <View style={styles.counter}>
                <Text style={styles.counterNumber}>{item.giveCounter}</Text>
                <Text style={styles.counterLabel}>given</Text>
            </View>
        </View>
    );
    
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Kindness Leaderboard</Text>
                <Text style={styles.subtitle}>
                    Top spreaders of positivity 🌟
                </Text>
            </View>
            
            <FlatList
                data={leaderboard}
                keyExtractor={(item) => item.user.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB'
    },
    header: {
        backgroundColor: '#FFF',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280'
    },
    list: {
        padding: 16
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    rankBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    rankBadgeTop: {
        backgroundColor: '#FEF3C7'
    },
    medal: {
        fontSize: 24
    },
    rankNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6B7280'
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    avatarText: {
        fontSize: 24
    },
    details: {
        flex: 1
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2
    },
    rankLabel: {
        fontSize: 13,
        color: '#6B7280',
        textTransform: 'capitalize'
    },
    counter: {
        alignItems: 'flex-end'
    },
    counterNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FBBF24'
    },
    counterLabel: {
        fontSize: 12,
        color: '#9CA3AF'
    }
});
```

---

## PHASE 2.5 COMPLETION CRITERIA

**Required Features:**
- [ ] Cooldown coins system working (3 hours, max 3)
- [ ] Users can claim cooldown coins
- [ ] Coins awarded for meaningful posts (>20 chars caption)
- [ ] Coins awarded for positive comments
- [ ] Coins awarded for watching ads (max 3/day)
- [ ] Users can give coins to others
- [ ] Give Counter displayed on profiles
- [ ] Ranks calculated and displayed
- [ ] Transaction history accessible
- [ ] Leaderboard showing top givers
- [ ] Give activity feed visible

**UI/UX Quality:**
- [ ] Cooldown widget shows 3-coin stack
- [ ] Coin balance displayed as integer
- [ ] Give Counter badge beautiful and prominent
- [ ] Animations smooth (pulse on available cooldown)
- [ ] Modal for giving coins intuitive
- [ ] Clear feedback on all actions

**Integration:**
- [ ] Give coins button on posts
- [ ] Give coins button on profiles
- [ ] Coins screen in main navigation
- [ ] Notifications for coins earned/received
- [ ] Automatic coin awards working

**Metrics Targets (Week 1 post-launch):**
- [ ] 60%+ users claim cooldown coins daily
- [ ] 3+ coins given per active user per week
- [ ] 40%+ of posts earn coins (meaningful)
- [ ] 20%+ of comments earn coins (positive)
- [ ] 10+ users on leaderboard with 20+ given

**Exit Criteria:** Positivity Coins fully functional, users actively giving and earning

---

This completes Phase 2.5! The Positivity Coins system adds a unique gamification layer that encourages kindness and positive behavior while driving daily engagement through the cooldown mechanic. 🎉💝
---

# PHASE 3: MVP LAUNCH - FRIENDS TESTING

**Duration:** 2 weeks (Weeks 20-21)
**Goal:** Test with 30-50 friends, collect feedback, validate core value proposition
**Critical Success Metrics:**
- 70%+ complete onboarding
- 50%+ create avatar
- 30%+ make first post
- 3.5/5 average satisfaction

---

## WEEK 20: MVP HARDENING & PREPARATION

### **Day 1-2: Feature Freeze & Scope Definition**

**Locked Features for MVP:**
```
✅ INCLUDED (Must Work):
1. Authentication
   - Email/password registration
   - Email/password login
   - Password reset (basic)
   - Session persistence

2. Avatar System
   - Create ONE avatar per user
   - Choose from 3 styles (cartoon, anime, minimalist)
   - 5 skin tones
   - 8 hair colors
   - No accessories (Phase 4)

3. Post Creation
   - Camera capture OR gallery upload
   - SeeMe processing (5-10 seconds)
   - Add caption
   - Post to feed

4. Feed
   - Chronological posts from followed users
   - Manual pull-to-refresh
   - 20 posts per page
   - No algorithm

5. Social Interactions
   - Like posts
   - Comment on posts (no nested replies in MVP)
   - Follow/unfollow users

6. User Profile
   - View-only profile
   - Username, avatar display
   - Post grid
   - Follower/following counts

❌ EXCLUDED (Save for Later):
- Multiple avatars per user
- Advanced avatar customization
- Avatar marketplace
- Age verification (trust-based for friends)
- Real face detection (friends will cooperate)
- Stories/video
- Direct messaging
- Push notifications (except critical)
- Advanced search
- Settings/preferences
- Edit profile bio
- Share posts
- Save posts
- Discover/explore page
- Hashtags
- Mentions
```

**Technical Debt Acceptance:**
```
ACCEPTABLE FOR MVP:
- Processing time 5-10 seconds
- Works only for frontal faces
- Manual pagination (no infinite scroll polish)
- Basic error messages
- No offline mode
- No caching sophistication
- Simple UI (no animations)

NOT ACCEPTABLE:
- Crashes
- Data loss
- Security vulnerabilities
- Profile photos showing real faces
- Processing success rate <80%
```

---

### **Day 3-4: Critical Bug Triage**

**Bug Severity Levels:**

**P0 - MUST FIX (Blocks launch):**
- App crashes on startup
- Cannot register/login
- Cannot upload photos
- Processing fails >20% of time
- Posts don't appear in feed
- Real faces visible in app
- Data loss (posts disappear)
- Security issues

**P1 - SHOULD FIX (Launch with known issues):**
- Slow processing (>15 seconds)
- UI bugs (misalignment, etc.)
- Minor feature issues
- Edge case crashes

**P2 - CAN WAIT (Fix in Phase 4):**
- Polish items
- Nice-to-have features
- Performance optimizations
- Rare edge cases

**Bug Fixing Protocol:**
```
Day 3: Triage all known bugs
  - Categorize by severity
  - Estimate fix time
  - Decide fix vs. defer

Day 4: Fix ALL P0 bugs
  - No exceptions
  - Test thoroughly
  - Document workarounds if unfixable
```

---

### **Day 5-7: MVP Simplifications**

**Simplify Avatar Creation:**
```typescript
// Original: Complex customization with sliders, pickers, etc.
// MVP: Simple selection from presets

interface MVPAvatarCreation {
    step1: 'Select style' // 3 options: Cartoon, Anime, Minimalist
    step2: 'Select skin tone' // 5 preset options
    step3: 'Select hair color' // 8 preset options
    done: 'Avatar ready'
}

// That's it. 3 steps, <1 minute to complete
```

**Simplify Post Creation:**
```typescript
// Remove: Multiple quality modes, preview editing, filters
// Keep: Photo → Caption → Post → Wait for processing

interface MVPPostFlow {
    step1: 'Take photo or select from gallery'
    step2: 'Add caption (optional)'
    step3: 'Tap "Post"'
    step4: 'See "Processing..." modal for 5-10 seconds'
    step5: 'Processing complete, navigate to feed'
}
```

**Simplify Feed:**
```typescript
// Remove: Algorithm, trending, recommendations
// Keep: Simple chronological from followed users

interface MVPFeed {
    logic: 'Show posts from users you follow'
    order: 'Newest first'
    loading: 'Manual pull-to-refresh only'
    pagination: '20 posts per page, "Load More" button'
}
```

**Implementation:**
```typescript
// mobile/src/screens/avatar/CreateAvatarSimpleScreen.tsx
export default function CreateAvatarSimpleScreen() {
    const [step, setStep] = useState(1);
    const [style, setStyle] = useState('cartoon');
    const [skinTone, setSkinTone] = useState('#FFE0BD');
    const [hairColor, setHairColor] = useState('#000000');
    
    const styles = [
        { id: 'cartoon', name: 'Cartoon', preview: require('...') },
        { id: 'anime', name: 'Anime', preview: require('...') },
        { id: 'minimalist', name: 'Minimal', preview: require('...') }
    ];
    
    const skinTones = [
        '#FFE0BD', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'
    ];
    
    const hairColors = [
        '#000000', '#3D2314', '#A52A2A', '#FFD700',
        '#DC143C', '#4B0082', '#00CED1', '#32CD32'
    ];
    
    const handleCreate = async () => {
        try {
            await api.createAvatar({
                style,
                customizations: {
                    skinTone,
                    hairColor
                }
            });
            
            navigation.navigate('Feed');
        } catch (error) {
            alert('Failed to create avatar');
        }
    };
    
    return (
        <View style={styles.container}>
            {step === 1 && (
                <StyleSelector
                    options={styles}
                    selected={style}
                    onSelect={(s) => { setStyle(s); setStep(2); }}
                />
            )}
            
            {step === 2 && (
                <ColorSelector
                    title="Choose skin tone"
                    options={skinTones}
                    selected={skinTone}
                    onSelect={(c) => { setSkinTone(c); setStep(3); }}
                    onBack={() => setStep(1)}
                />
            )}
            
            {step === 3 && (
                <ColorSelector
                    title="Choose hair color"
                    options={hairColors}
                    selected={hairColor}
                    onSelect={(c) => { setHairColor(c); handleCreate(); }}
                    onBack={() => setStep(2)}
                />
            )}
        </View>
    );
}
```

---

## WEEK 21: FRIENDS BETA LAUNCH

### **Day 1: Beta Deployment**

**TestFlight (iOS) Setup:**
```bash
# Build iOS app for TestFlight
cd mobile
eas build --platform ios --profile preview

# Upload to App Store Connect
# Add beta testers (max 100 external testers)
# Internal testing first (max 100 internal testers)
```

**Google Play Internal Testing:**
```bash
# Build Android app
eas build --platform android --profile preview

# Upload to Google Play Console
# Create internal testing track
# Add testers by email
```

**Beta Build Checklist:**
- [ ] App icon in place
- [ ] Splash screen configured
- [ ] App name: "SeeMe Beta"
- [ ] Version: 0.1.0
- [ ] Bundle ID configured
- [ ] Signing certificates valid
- [ ] Privacy policy URL added
- [ ] Support email configured

---

### **Day 2-3: Beta Tester Recruitment**

**Target: 30-50 testers**

**Ideal Tester Mix:**
```
By Platform:
- 20 iOS users
- 10 Android users

By Demographics:
- 50% ages 18-25 (core target)
- 30% ages 26-35
- 20% ages 36+

By Tech Savviness:
- 30% very tech-savvy (early adopters)
- 50% moderately tech-savvy (typical users)
- 20% not very tech-savvy (stress test UX)

By Social Media Usage:
- 70% active on Instagram/TikTok
- 30% light social media users
```

**Recruitment Message Template:**
```
Subject: Help me test my social media app! 🎉

Hey [Name],

I've been building a social media app for the past 5 months and need your help testing it before launch.

What is SeeMe?
A social network where everyone's face is replaced with a custom avatar. The goal is to eliminate judgment based on physical appearance while preserving authentic expressions.

The twist? The avatar actually preserves your facial expressions using computer vision, so your smile is your avatar's smile, etc.

What I need from you:
- Install the beta app (I'll send you a link)
- Use it for 1-2 weeks
- Post at least 2-3 photos
- Give me honest feedback (especially what's confusing or broken)
- 10 minutes total commitment

What's in it for you:
- Early access before public launch
- Your feedback will shape the final product
- You'll be in the credits as a beta tester
- Plus it's pretty cool to see yourself as an avatar!

Interested? Reply and I'll send you the beta link!

Thanks!
[Your Name]

P.S. Here's a screenshot of what it looks like: [attach screenshot]
```

**Follow-up After Install:**
```
Subject: You're in! Welcome to SeeMe Beta

Thanks for joining the beta!

Quick start guide:
1. Create your avatar (takes <1 min)
2. Take a selfie or upload a photo
3. Wait ~10 seconds for processing
4. See yourself as an avatar!
5. Follow me (@[yourusername]) to see example posts

A few tips:
- For best results, use frontal face photos (no side profiles yet)
- Processing takes 5-10 seconds, be patient
- If something breaks, screenshot it and send it to me!

Feedback form:
[Google Form link]

Bug reports:
Just reply to this email or DM me

Looking forward to your thoughts!
```

---

### **Day 4-7: Active Beta Monitoring**

**Daily Monitoring Dashboard:**
```
Key Metrics to Track:

User Acquisition:
- Sign-ups: [Current / Target: 30+]
- Email verifications: [% of sign-ups]
- Platform split: [iOS vs Android]

Activation:
- Avatar created: [% of sign-ups, Target: >80%]
- First post attempted: [% with avatar]
- First post completed: [% of attempts, Target: >80%]
- Processing success rate: [%, Target: >85%]

Engagement:
- Daily active users: [%, Target: >40%]
- Posts per user: [avg, Target: >2]
- Likes per user: [avg]
- Comments per user: [avg]
- Follows per user: [avg, Target: >3]
- Session duration: [avg minutes, Target: >2]

Technical:
- Crash-free rate: [%, Target: >95%]
- Processing failures: [count, by error type]
- API errors: [count, by endpoint]
- Average processing time: [seconds, Target: <10]

Feedback:
- Feedback form submissions: [count]
- Bug reports: [count, by severity]
- Feature requests: [count, by category]
```

**Daily Routine (30 minutes):**
```
9:00 AM - Check metrics dashboard
  - Any crashes overnight?
  - Processing success rate OK?
  - New user activations?

12:00 PM - Review feedback submissions
  - Categorize bugs
  - Note recurring issues
  - Respond to users

6:00 PM - Evening check-in
  - Usage spike during evening?
  - Any new critical issues?

9:00 PM - End of day summary
  - Update issue tracker
  - Plan tomorrow's fixes
```

**Automated Alerts:**
```javascript
// backend/src/monitoring/alerts.ts
export const alerts = {
    // Critical: Immediate notification
    crash_rate_high: {
        condition: 'crash_rate > 5%',
        action: 'Send email + SMS',
        priority: 'P0'
    },
    
    processing_failures_high: {
        condition: 'processing_failure_rate > 20%',
        action: 'Send email',
        priority: 'P0'
    },
    
    // Warning: Check within hour
    slow_processing: {
        condition: 'avg_processing_time > 15s',
        action: 'Send email',
        priority: 'P1'
    },
    
    low_activation: {
        condition: 'avatar_creation_rate < 60%',
        action: 'Log + email daily summary',
        priority: 'P2'
    }
};
```

---

### **Beta Testing Protocol**

**Week 1 Check-in (Day 3-4 of beta):**
```
Email to all testers:

Subject: How's SeeMe going? Quick check-in

Hey beta testers!

Quick pulse check after a few days with SeeMe:

1. Have you created your avatar? (If not, what stopped you?)
2. Have you posted anything yet? (If not, what stopped you?)
3. What's the most confusing thing so far?
4. What's one thing that's broken or annoying?
5. What's one thing you actually like?

Just reply with quick answers - no essay needed!

Also, reminder to fill out the feedback form if you haven't: [link]

Thanks!
```

**Mid-Beta Survey (Day 7-8):**
```
Google Form Questions:

Overall Experience (1-5 stars)
- How satisfied are you with SeeMe overall?
- How likely are you to recommend it to friends? (NPS score)

Avatar Creation
- Was creating your avatar easy? (Yes/No)
- If no, what was confusing?
- Do you like how your avatar looks? (Yes/No)
- What would you change about your avatar?

Post Creation
- Have you successfully posted? (Yes/No)
- If no, what prevented you?
- If yes, were you satisfied with how your avatar looked in the photo?
- Did the avatar capture your facial expression? (Yes/Somewhat/No)

Core Value Proposition
- Do you understand the purpose of SeeMe? (Yes/Somewhat/No)
- Does the "no real faces" concept appeal to you? (Yes/Neutral/No)
- Would you use this instead of Instagram for some posts? (Yes/Maybe/No)

Technical Issues
- Did you experience any crashes? (Yes/No)
- Did you experience any bugs? (Yes/No)
  - If yes, describe:
- How long did processing take for your photos? (<5s / 5-10s / >10s)
- Was processing reliable? (Always worked / Sometimes failed / Usually failed)

Open Feedback
- What's the best thing about SeeMe?
- What's the worst thing about SeeMe?
- What features are missing that you want?
- Any other comments?
```

**Bug Reporting Template:**
```
When users report bugs, ask for:

1. What happened?
   - [Description]

2. What were you trying to do?
   - [User intent]

3. What did you expect to happen?
   - [Expected behavior]

4. Device info
   - Platform: iOS / Android
   - Model: 
   - OS Version:
   - App Version:

5. Can you reproduce it?
   - Yes, always / Sometimes / No

6. Screenshots?
   - [Attach if possible]
```

---

### **Issue Tracking During Beta**

**GitHub Issues Board:**
```
Columns:
1. Reported (New bugs from beta)
2. Triaged (Categorized by severity)
3. In Progress (Being fixed)
4. Fixed (Deployed to beta)
5. Verified (Confirmed fixed)
6. Deferred (Fix in Phase 4)

Labels:
- P0-Critical
- P1-Important
- P2-Nice-to-have
- bug
- feature-request
- ux-issue
- performance
- platform-ios
- platform-android
```

**Daily Bug Triage:**
```
Morning (15 minutes):
1. Review new bug reports from overnight
2. Categorize by severity
3. Assign P0 bugs to immediate fix queue
4. Respond to reporters acknowledging receipt

Afternoon (30 minutes):
1. Fix P0 bugs
2. Test fixes
3. Deploy to beta if critical
4. Update issue tracker

Evening (15 minutes):
1. Review day's progress
2. Update beta testers on fixes
3. Plan tomorrow's work
```

---

### **Day 7: Mid-Beta Retrospective**

**Internal Review Meeting (Solo or with team):**
```
Agenda:

1. Metrics Review (15 minutes)
   - Are we hitting targets?
   - What's below expectations?
   - What's exceeding expectations?

2. Top Issues (20 minutes)
   - What are the top 5 bugs by frequency?
   - What are users most confused about?
   - What are users requesting most?

3. Decisions (15 minutes)
   - What MUST be fixed before Phase 4?
   - What can we live with for now?
   - Do we need to extend beta?
   - Are we on track for public launch?

4. Action Items (10 minutes)
   - Week 2 priorities
   - Communication plan to testers
   - Any scope changes needed?
```

**Example Decisions:**
```
IF processing success rate < 80%:
→ DECISION: Delay public launch, fix pipeline

IF avatar creation rate < 60%:
→ DECISION: Simplify onboarding, add tutorial

IF engagement (posts/user) < 1:
→ DECISION: Investigate why (UX issue? Value prop?)

IF technical stability good BUT user feedback negative:
→ DECISION: Problem is product-market fit, reconsider concept

IF both technical AND feedback positive:
→ DECISION: Green light for Phase 4 & public launch
```

---

### **Week 2 Focus (Days 8-14)**

**Continue monitoring + focus on top 3 issues:**

**Example Priority List:**
```
Based on Beta Week 1, typical issues:

Issue #1: Processing too slow (avg 12 seconds)
→ Action: Optimize ML pipeline
→ Target: Get to <8 seconds average
→ Effort: 2 days

Issue #2: Avatar creation confusing
→ Action: Add onboarding tutorial
→ Target: >80% completion rate
→ Effort: 1 day

Issue #3: Feed empty for new users
→ Action: Suggest users to follow
→ Target: >5 follows per new user
→ Effort: 1 day
```

**Ship Improvements to Beta:**
```
Day 8-9: Fix top issue
Day 10: Deploy update to TestFlight/Play Store
Day 11: Ask testers to update and retest
Day 12-13: Fix second issue
Day 14: Final deploy before Phase 4
```

---

## PHASE 3 SUCCESS CRITERIA

**Required Metrics (Minimum Viable Success):**

### **Activation:**
- [ ] 70%+ of sign-ups create avatar
- [ ] 50%+ create avatar AND make first post
- [ ] 80%+ of post attempts succeed (not fail processing)

### **Engagement:**
- [ ] 40%+ daily active users (of those who posted)
- [ ] 2.5+ posts per user average
- [ ] 3+ follows per user average
- [ ] 2+ minutes average session time

### **Technical Quality:**
- [ ] 95%+ crash-free rate
- [ ] 85%+ processing success rate
- [ ] <10 second average processing time
- [ ] <5 P0 bugs remaining

### **User Satisfaction:**
- [ ] 3.5+/5 overall satisfaction
- [ ] 60%+ would recommend (NPS)
- [ ] 70%+ understand the concept
- [ ] 80%+ satisfied with avatar quality

### **Feedback Quality:**
- [ ] 50%+ of testers submit feedback form
- [ ] Clear understanding of top 3 issues
- [ ] Clear understanding of top 3 loved features
- [ ] Validated value proposition (or pivoted)

**Exit Criteria:** 
- Beta metrics meet minimums OR
- Clear plan to fix gaps before public launch
- Confidence in proceeding to Phase 4

**Go/No-Go Decision:**
```
GO if:
- All metrics at or above minimums
- No P0 bugs remaining
- Team confidence high
- Clear path to public launch

NO-GO if:
- Core metrics badly missing (<50% of target)
- Product-market fit questionable
- Too many technical issues
- Need major rework

CONDITIONAL GO if:
- Metrics slightly below (but plan to fix)
- Technical stable but UX needs work
- Can fix in Phase 4 before public launch
```

---

# PHASE 4: POST-MVP IMPROVEMENTS

**Duration:** 6 weeks (Weeks 22-27)
**Goal:** Fix critical issues from beta, add essential safety features
**Parallel Workstreams:** 3 (Bug Fixes, Safety Features, Polish)

---

## WORKSTREAM 4.1: CRITICAL FIXES & IMPROVEMENTS

**Agent:** Full-Stack Fix Agent
**Duration:** Weeks 22-23 (2 weeks)
**Dependencies:** Phase 3 beta feedback
**Output:** Top 10 beta issues resolved

---

### **Task 4.1.1: Top Beta Issues Resolution**

**Based on typical beta feedback patterns:**

**Issue Category 1: Processing Performance**

**Problem:** Average processing time 10-12 seconds, target <5 seconds

**Solution Approaches:**
```python
# ml-service/src/pipeline/optimization.py

class PipelineOptimizer:
    """Optimizations to implement"""
    
    @staticmethod
    def optimize_model_loading():
        """
        ISSUE: Models reload for each request
        FIX: Load models once at worker startup, keep in memory
        
        EXPECTED IMPROVEMENT: -2 seconds
        """
        # Implementation: Worker-level singleton pattern
        pass
    
    @staticmethod
    def optimize_image_preprocessing():
        """
        ISSUE: Processing full resolution images (4000x3000)
        FIX: Resize to max 1024px before processing
        
        EXPECTED IMPROVEMENT: -1.5 seconds
        """
        # Resize large images before face detection
        max_dimension = 1024
        # ...implementation
        pass
    
    @staticmethod
    def optimize_depth_estimation():
        """
        ISSUE: MiDaS depth estimation slowest step (3-4 seconds)
        FIX: Use faster MiDaS_small model, reduce resolution
        
        EXPECTED IMPROVEMENT: -2 seconds
        TRADE-OFF: Slightly lower quality (acceptable for MVP)
        """
        # Switch from DPT_BEiT_L_512 to MiDaS_small
        pass
    
    @staticmethod
    def batch_face_processing():
        """
        ISSUE: Processing multiple faces sequentially
        FIX: Batch process faces in parallel
        
        EXPECTED IMPROVEMENT: -1 second for multi-face photos
        """
        # Use GPU batching for multiple faces
        pass
```

**Target:** Reduce average processing time from 10s → 5s

**Testing Plan:**
```
Test Set: 100 diverse images
- 50 single face
- 30 two faces
- 20 three+ faces

Measure:
- Processing time per image
- Quality degradation (manual review)
- GPU memory usage
- Success rate

Acceptance:
- Average time <5 seconds
- p95 time <8 seconds
- No quality regression
- Success rate maintained
```

---

**Issue Category 2: Onboarding Confusion**

**Problem:** Only 60% of users complete avatar creation

**Solution:**
```typescript
// mobile/src/screens/onboarding/OnboardingFlow.tsx

export default function OnboardingFlow() {
    const [step, setStep] = useState(0);
    
    const steps = [
        {
            title: 'Welcome to SeeMe',
            description: 'A social network where everyone uses avatars instead of real photos',
            component: <WelcomeScreen />,
            skippable: false
        },
        {
            title: 'How it works',
            description: 'Take a photo → We turn you into an avatar → Post and share!',
            component: <HowItWorksScreen />,
            skippable: true
        },
        {
            title: 'Create your avatar',
            description: 'Choose your style in just 3 steps',
            component: <AvatarCreationScreen />,
            skippable: false
        },
        {
            title: 'Try it out!',
            description: 'Take your first photo and see the magic',
            component: <FirstPhotoScreen />,
            skippable: false
        }
    ];
    
    // Progress indicator showing 4 steps
    // Clear "Next" / "Skip" buttons
    // Celebration animation when avatar created
}
```

**Improvements:**
- Add visual tutorial (3 screens)
- Show example avatar transformations
- Add progress indicator
- Celebration when avatar created
- Suggest 5 popular users to follow

**Target:** Increase avatar creation rate from 60% → 80%

---

**Issue Category 3: Empty Feed Problem**

**Problem:** New users see empty feed, don't know what to do

**Solution:**
```typescript
// backend/src/controllers/OnboardingController.ts

export class OnboardingController {
    /**
     * Get suggested users to follow (for new users)
     */
    static async getSuggestedUsers(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            
            // Strategy 1: Most active users with completed posts
            const activeUsers = await User.findAll({
                where: {
                    id: { [Op.ne]: userId }  // Exclude self
                },
                include: [{
                    model: Post,
                    as: 'posts',
                    where: { status: 'completed' },
                    required: true
                }],
                attributes: [
                    'id',
                    'username',
                    'activeAvatarId',
                    [sequelize.fn('COUNT', sequelize.col('posts.id')), 'postCount']
                ],
                group: ['User.id'],
                order: [[sequelize.literal('postCount'), 'DESC']],
                limit: 10
            });
            
            // Strategy 2: Friends from contacts (if permission granted)
            // Strategy 3: Users with similar interests (Phase 5+)
            
            res.json({
                suggested: activeUsers,
                message: 'Follow these users to get started!'
            });
            
        } catch (error) {
            console.error('Error getting suggestions:', error);
            res.status(500).json({ error: 'Failed to get suggestions' });
        }
    }
}
```

**Empty Feed Screen Update:**
```typescript
// mobile/src/screens/main/FeedScreen.tsx

const renderEmpty = () => {
    const [suggested, setSuggested] = useState([]);
    
    useEffect(() => {
        loadSuggestions();
    }, []);
    
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your feed is empty</Text>
            <Text style={styles.emptyText}>
                Follow some users to see their posts here
            </Text>
            
            {/* Suggested Users */}
            <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>Suggested for you</Text>
                {suggested.map(user => (
                    <UserSuggestionCard
                        key={user.id}
                        user={user}
                        onFollow={() => handleFollow(user.id)}
                    />
                ))}
            </View>
            
            {/* OR Create First Post */}
            <Button
                title="Create your first post"
                onPress={() => navigation.navigate('CreatePost')}
            />
        </View>
    );
};
```

**Target:** Reduce empty feed experience, increase follows to 5+ per user

---

**Issue Category 4: Expression Preservation Quality**

**Problem:** 30% of users report avatars don't match their expression

**Root Causes:**
```
1. Edge detection missing subtle expressions (20%)
2. Style application too aggressive (40%)
3. User expectations unrealistic (40%)
```

**Solutions:**

**For Edge Detection:**
```python
# ml-service/src/pipeline/edge_detection.py

def enhance_expression_edges(self, fused_edges, landmarks):
    """
    IMPROVEMENT: Boost edge strength in expression-critical regions
    """
    # Increase weight for mouth region
    mouth_landmarks = [61, 291, 0, 17, 269, 405, 314, 39, 181, 82]
    
    # Create stronger mask for mouth
    mouth_mask = np.zeros_like(fused_edges)
    for idx in mouth_landmarks:
        x, y, _ = landmarks[idx]
        cv2.circle(mouth_mask, (int(x), int(y)), radius=25, color=255, thickness=-1)
    
    # Boost edges in mouth region
    fused_edges[mouth_mask > 0] = np.maximum(fused_edges[mouth_mask > 0], 200)
    
    # Same for eyes
    # ...
    
    return fused_edges
```

**For Style Application:**
```python
# ml-service/src/styles/style_applicator.py

def apply_style_to_region(self, region_image, region_name, region_mask, edge_map):
    """
    IMPROVEMENT: Preserve more original structure in expression regions
    """
    # Reduce texture smoothing in mouth/eye regions
    if region_name in ['upper_lip', 'lower_lip', 'mouth_interior', 'left_eye', 'right_eye']:
        # Use less aggressive smoothing
        smoothness = self.style.texture_smoothness * 0.5  # 50% of normal
    else:
        smoothness = self.style.texture_smoothness
    
    # Apply with adjusted smoothness
    styled = self.smooth_texture(region_image, region_mask, smoothness)
    # ...
```

**For User Education:**
```typescript
// Add explanation in app

<InfoTooltip>
  Your avatar preserves facial structure and expression positions,
  but uses {style} style for colors and rendering. 
  
  The expression shape (smile, frown) is maintained, but artistic
  style is applied.
</InfoTooltip>
```

**Target:** Increase expression satisfaction from 70% → 85%

---

### **Task 4.1.2: Mobile UX Polish**

**Based on typical beta feedback:**

**Issue: Confusing Navigation**

**Solution: Clearer Tab Bar:**
```typescript
// mobile/src/navigation/MainNavigator.tsx

function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#007AFF',
                tabBarInactiveTintColor: '#8E8E93',
                tabBarShowLabel: true,  // ADD: Show labels
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600'
                }
            }}
        >
            <Tab.Screen
                name="Feed"
                component={FeedScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                    tabBarLabel: 'Home'  // CLEAR label
                }}
            />
            
            <Tab.Screen
                name="CreatePost"
                component={CreatePostScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add-circle" size={size} color={color} />
                    ),
                    tabBarLabel: 'Post'  // CLEAR label
                }}
            />
            
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                    tabBarLabel: 'Profile'  // CLEAR label
                }}
            />
        </Tab.Navigator>
    );
}
```

---

**Issue: Processing Wait Unclear**

**Solution: Better Processing Modal:**
```typescript
// mobile/src/components/ProcessingModal.tsx

export default function ProcessingModal({ visible, progress }: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Animated avatar icon */}
                    <LottieView
                        source={require('../assets/animations/avatar-processing.json')}
                        autoPlay
                        loop
                        style={{ width: 150, height: 150 }}
                    />
                    
                    {/* Progress bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                    </View>
                    
                    {/* Status text */}
                    <Text style={styles.title}>Creating your avatar...</Text>
                    <Text style={styles.subtitle}>
                        {getProgressMessage(progress)}
                    </Text>
                    
                    {/* Estimated time */}
                    <Text style={styles.time}>
                        {Math.max(0, Math.ceil((1 - progress) * 8))} seconds remaining
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

function getProgressMessage(progress: number): string {
    if (progress < 0.2) return 'Detecting your face...';
    if (progress < 0.4) return 'Analyzing facial structure...';
    if (progress < 0.6) return 'Applying avatar style...';
    if (progress < 0.8) return 'Preserving your expression...';
    return 'Finalizing...';
}
```

---

**Issue: Loading States Missing**

**Solution: Skeleton Screens:**
```typescript
// mobile/src/components/SkeletonPost.tsx

export default function SkeletonPost() {
    return (
        <View style={styles.container}>
            {/* User info skeleton */}
            <View style={styles.header}>
                <SkeletonCircle size={32} />
                <SkeletonLine width={100} height={14} />
            </View>
            
            {/* Image skeleton */}
            <SkeletonBox width="100%" height={400} />
            
            {/* Actions skeleton */}
            <View style={styles.actions}>
                <SkeletonCircle size={28} />
                <SkeletonCircle size={28} />
                <SkeletonCircle size={28} />
            </View>
            
            {/* Caption skeleton */}
            <SkeletonLine width="80%" height={14} />
        </View>
    );
}

// Use in Feed:
{loading ? (
    <>
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
    </>
) : (
    <FlatList data={posts} ... />
)}
```

---

**Issue: Error Messages Unclear**

**Solution: User-Friendly Error Messages:**
```typescript
// mobile/src/utils/errorMessages.ts

export function getUserFriendlyError(error: any): string {
    // Processing errors
    if (error.message?.includes('NoFaceDetected')) {
        return "We couldn't find a face in your photo. Try a clearer selfie!";
    }
    
    if (error.message?.includes('FaceAngleTooExtreme')) {
        return "Please use a front-facing photo. Side profiles don't work yet!";
    }
    
    if (error.message?.includes('FaceTooSmall')) {
        return "Your face is too small in the photo. Try getting closer!";
    }
    
    if (error.message?.includes('TooManyFaces')) {
        return "Too many faces! We can handle up to 5 people per photo.";
    }
    
    // Network errors
    if (error.message?.includes('Network')) {
        return "Connection issue. Check your internet and try again.";
    }
    
    // Auth errors
    if (error.status === 401) {
        return "Session expired. Please log in again.";
    }
    
    // Generic fallback
    return "Something went wrong. Please try again.";
}
```

---

## WORKSTREAM 4.2: SAFETY & COMPLIANCE

**Agent:** Safety Agent
**Duration:** Weeks 24-25 (2 weeks)
**Dependencies:** None
**Output:** Age verification and real face detection working

---

### **Task 4.2.1: Age Verification System**

**Conditions:**
- [ ] Users must be 15+ to use app
- [ ] Verification required before posting
- [ ] Compliant with relevant laws (COPPA, etc.)
- [ ] Multiple verification methods available
- [ ] Under-age users gracefully rejected

**Implementation Approach: Stripe Card Verification (Simplest for MVP)**

**Why Stripe:**
- Assumes 15+ year olds have access to parent's card
- $0.01 charge (immediately refunded)
- Fast implementation (1 week)
- Lower cost than ID verification (~$0.30 vs $1-2)

**Backend Integration:**
```typescript
// backend/src/services/StripeVerificationService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
});

export class StripeVerificationService {
    /**
     * Create verification session
     */
    static async createVerificationSession(userId: string): Promise<string> {
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Age Verification',
                            description: '$0.01 verification charge (refunded immediately)'
                        },
                        unit_amount: 1  // $0.01 in cents
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: `${process.env.APP_URL}/verification-success`,
                cancel_url: `${process.env.APP_URL}/verification-cancel`,
                client_reference_id: userId,
                metadata: {
                    purpose: 'age_verification',
                    userId
                }
            });
            
            return session.url!;
            
        } catch (error) {
            console.error('Error creating verification session:', error);
            throw new Error('Failed to create verification session');
        }
    }
    
    /**
     * Handle webhook from Stripe
     */
    static async handleWebhook(event: Stripe.Event): Promise<void> {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.client_reference_id!;
            const paymentIntentId = session.payment_intent as string;
            
            // Mark user as verified
            await User.update(
                { ageVerified: true },
                { where: { id: userId } }
            );
            
            // Immediately refund
            await stripe.refunds.create({
                payment_intent: paymentIntentId,
                reason: 'requested_by_customer'
            });
            
            console.log(`User ${userId} age verified via Stripe`);
        }
    }
}
```

**Webhook Endpoint:**
```typescript
// backend/src/routes/webhooks.ts
import { Router, raw } from 'express';
import Stripe from 'stripe';
import { StripeVerificationService } from '../services/StripeVerificationService';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    
    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        
        await StripeVerificationService.handleWebhook(event);
        
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
    }
});

export default router;
```

**Mobile Age Gate:**
```typescript
// mobile/src/screens/auth/AgeVerificationScreen.tsx

export default function AgeVerificationScreen() {
    const [loading, setLoading] = useState(false);
    
    const handleVerify = async () => {
        setLoading(true);
        
        try {
            // Get verification URL from backend
            const { url } = await api.createVerificationSession();
            
            // Open Stripe checkout in web browser
            const result = await WebBrowser.openAuthSessionAsync(
                url,
                'seeme://verification-success'
            );
            
            if (result.type === 'success') {
                // Check if user is now verified
                const user = await api.getCurrentUser();
                if (user.ageVerified) {
                    navigation.navigate('CreateAvatar');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Age Verification Required</Text>
            <Text style={styles.description}>
                To use SeeMe, we need to verify you're at least 15 years old.
            </Text>
            
            <View style={styles.methodCard}>
                <Ionicons name="card" size={40} color="#007AFF" />
                <Text style={styles.methodTitle}>Verify with Card</Text>
                <Text style={styles.methodDescription}>
                    We'll charge $0.01 to verify age (refunded immediately)
                </Text>
                <Text style={styles.methodNote}>
                    You can ask a parent or guardian to help
                </Text>
                
                <Button
                    title="Verify Age"
                    onPress={handleVerify}
                    loading={loading}
                />
            </View>
            
            <Text style={styles.whyRequired}>
                Why is this required? We want to create a safe space for young
                people (15+) while complying with child safety laws.
            </Text>
        </View>
    );
}
```

**Age Gate Middleware:**
```typescript
// backend/src/middleware/ageVerification.ts

export function requireAgeVerification(req: AuthRequest, res: Response, next: NextFunction) {
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!user.ageVerified) {
        return res.status(403).json({
            error: 'Age verification required',
            message: 'Please complete age verification to access this feature',
            verificationRequired: true
        });
    }
    
    next();
}

// Apply to protected routes:
router.post('/posts', authenticateToken, requireAgeVerification, PostController.createPost);
```

**Quality Checks:**
- [ ] Verification flow works end-to-end
- [ ] Refund processed automatically
- [ ] Under-age users blocked from posting
- [ ] Can skip verification initially but required before first post
- [ ] Clear messaging about why verification needed

**Acceptance Criteria:**
- Verification success rate >90%
- Refund processed <1 hour
- No payment data stored
- Compliance with Stripe TOS

---

### **Task 4.2.2: Real Face Detection**

**Conditions:**
- [ ] Detect if uploaded photo contains real (non-avatarized) faces
- [ ] Block upload if real faces detected
- [ ] Accuracy >95% (minimize false positives)
- [ ] Fast inference (<500ms)
- [ ] Clear error message to user

**Approach: Binary Classifier**

**Training Data Collection:**
```python
# ml-service/scripts/collect_training_data.py

"""
Collect training data for real vs avatar classifier

Dataset:
- Real faces: 10,000 images from FFHQ, CelebA datasets
- Avatar faces: 10,000 images generated by SeeMe pipeline
"""

import os
from pipeline.avatar_pipeline import AvatarPipeline

def generate_avatar_training_data():
    """Generate avatar versions of real faces"""
    pipeline = AvatarPipeline(style_name='cartoon')
    
    real_faces_dir = 'data/real_faces'
    avatar_faces_dir = 'data/avatar_faces'
    
    for filename in os.listdir(real_faces_dir):
        image_path = os.path.join(real_faces_dir, filename)
        image = cv2.imread(image_path)
        
        # Process through avatar pipeline
        result = pipeline.process_image(image)
        
        if result.success:
            # Save avatar version
            output_path = os.path.join(avatar_faces_dir, filename)
            cv2.imwrite(output_path, result.processed_image)
            
            print(f'Processed {filename}')

# Run for all 3 styles
for style in ['cartoon', 'anime', 'minimalist']:
    pipeline = AvatarPipeline(style_name=style)
    # ... generate data
```

**Model Training:**
```python
# ml-service/models/real_face_classifier.py

import torch
import torch.nn as nn
from torchvision import models, transforms
from torch.utils.data import DataLoader, Dataset

class RealVsAvatarClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        
        # Use pre-trained ResNet18 (smaller, faster than ResNet50)
        self.backbone = models.resnet18(pretrained=True)
        
        # Replace final layer
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_features, 2)  # 2 classes: real, avatar
        )
    
    def forward(self, x):
        return self.backbone(x)

class FaceDataset(Dataset):
    def __init__(self, real_dir, avatar_dir, transform=None):
        self.real_images = [(f, 0) for f in glob(os.path.join(real_dir, '*'))]
        self.avatar_images = [(f, 1) for f in glob(os.path.join(avatar_dir, '*'))]
        self.images = self.real_images + self.avatar_images
        self.transform = transform
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img_path, label = self.images[idx]
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label

def train_classifier():
    # Data augmentation
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # Load datasets
    train_dataset = FaceDataset('data/real_faces', 'data/avatar_faces', train_transform)
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    
    # Initialize model
    model = RealVsAvatarClassifier()
    model = model.cuda()
    
    # Training setup
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.0001)
    
    # Train for 20 epochs
    for epoch in range(20):
        model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for images, labels in train_loader:
            images, labels = images.cuda(), labels.cuda()
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
        
        accuracy = 100. * correct / total
        print(f'Epoch {epoch+1}: Loss={total_loss/len(train_loader):.4f}, Acc={accuracy:.2f}%')
    
    # Save model
    torch.save(model.state_dict(), 'models/real_face_classifier.pth')

if __name__ == '__main__':
    train_classifier()
```

**Inference Integration:**
```python
# ml-service/src/pipeline/real_face_detector.py

import torch
from torchvision import transforms
from PIL import Image

class RealFaceDetector:
    def __init__(self, model_path: str, device: str = 'cuda'):
        self.device = device if torch.cuda.is_available() else 'cpu'
        
        # Load model
        from models.real_face_classifier import RealVsAvatarClassifier
        self.model = RealVsAvatarClassifier()
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        # Transform
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    
    def contains_real_face(self, image: np.ndarray, threshold: float = 0.7) -> bool:
        """
        Check if image contains real (non-avatarized) face
        
        Args:
            image: BGR image
            threshold: Confidence threshold (0.7 = 70% confident it's real)
        
        Returns:
            True if real face detected, False if avatar
        """
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image_pil = Image.fromarray(image_rgb)
        
        # Transform
        image_tensor = self.transform(image_pil).unsqueeze(0)
        image_tensor = image_tensor.to(self.device)
        
        # Inference
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            real_prob = probabilities[0][0].item()  # Probability of "real"
        
        return real_prob > threshold
```

**Add to Upload Flow:**
```python
# ml-service/src/tasks/process_avatar.py

from ..pipeline.real_face_detector import RealFaceDetector

class ProcessAvatarTask(Task):
    def __init__(self):
        self.pipeline = None
        self.real_face_detector = None
    
    def __call__(self, *args, **kwargs):
        if self.pipeline is None:
            self.pipeline = AvatarPipeline(...)
        
        if self.real_face_detector is None:
            self.real_face_detector = RealFaceDetector(
                model_path='models/real_face_classifier.pth'
            )
        
        return self.run(*args, **kwargs)
    
    def run(self, task_data):
        # ... download image ...
        
        # CHECK FOR REAL FACES
        if self.real_face_detector.contains_real_face(image):
            send_callback(callback_url, {
                'postId': post_id,
                'success': False,
                'error': 'RealFaceDetected',
                'message': 'Please use the SeeMe processing to avatarize faces before posting'
            })
            return
        
        # Continue with normal processing...
```

**Mobile Error Handling:**
```typescript
// mobile/src/screens/main/CreatePostScreen.tsx

const handlePost = async () => {
    try {
        await api.createPost(imageUri, caption);
        // ... wait for processing ...
    } catch (error) {
        if (error.code === 'RealFaceDetected') {
            Alert.alert(
                'Real Face Detected',
                'SeeMe is an avatar-only platform. Your photo appears to contain a real face. Please retake the photo or select a different one.',
                [
                    { text: 'Retake Photo', onPress: () => takePhoto() },
                    { text: 'Choose Different', onPress: () => pickImage() },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } else {
            Alert.alert('Error', getUserFriendlyError(error));
        }
    }
};
```

**Quality Checks:**
- [ ] Classifier accuracy >95% on test set
- [ ] False positive rate <5%
- [ ] Inference time <500ms
- [ ] Works for all 3 avatar styles
- [ ] Clear user feedback when blocked

**Acceptance Criteria:**
- Real faces blocked 95%+ of time
- Avatar faces pass through 95%+ of time
- Processing overhead <1 second
- No user complaints about false rejections

---

## WORKSTREAM 4.3: PERFORMANCE & POLISH

**Agent:** Performance Agent
**Duration:** Weeks 26-27 (2 weeks)
**Dependencies:** Workstreams 4.1 and 4.2 complete
**Output:** App feels fast and polished

---

### **Task 4.3.1: Backend Performance Optimization**

**Database Query Optimization:**
```typescript
// backend/src/controllers/FeedController.ts (optimized)

static async getFeed(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    // OPTIMIZATION 1: Single query instead of N+1
    const posts = await sequelize.query(`
        SELECT 
            p.id,
            p.processed_image_url,
            p.thumbnail_url,
            p.caption,
            p.likes_count,
            p.comments_count,
            p.created_at,
            u.id as user_id,
            u.username,
            u.active_avatar_id,
            EXISTS(
                SELECT 1 FROM likes 
                WHERE post_id = p.id AND user_id = :userId
            ) as liked_by_me
        FROM posts p
        INNER JOIN follows f ON f.following_id = p.user_id
        INNER JOIN users u ON u.id = p.user_id
        WHERE f.follower_id = :userId
          AND p.status = 'completed'
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset
    `, {
        replacements: { userId, limit, offset },
        type: QueryTypes.SELECT
    });
    
    // OPTIMIZATION 2: Get total count with same query (explain plan optimized)
    const [{ total }] = await sequelize.query(`
        SELECT COUNT(DISTINCT p.id) as total
        FROM posts p
        INNER JOIN follows f ON f.following_id = p.user_id
        WHERE f.follower_id = :userId
          AND p.status = 'completed'
    `, {
        replacements: { userId },
        type: QueryTypes.SELECT
    });
    
    res.json({
        posts,
        pagination: {
            page,
            limit,
            total: parseInt(total),
            totalPages: Math.ceil(total / limit),
            hasMore: offset + posts.length < total
        }
    });
}
```

**Add Database Indexes:**
```sql
-- Critical indexes for performance

-- Feed query optimization
CREATE INDEX CONCURRENTLY idx_posts_user_created_status 
    ON posts(user_id, created_at DESC, status)
    WHERE status = 'completed';

-- Likes lookup
CREATE INDEX CONCURRENTLY idx_likes_post_user 
    ON likes(post_id, user_id);

-- Follows lookup
CREATE INDEX CONCURRENTLY idx_follows_follower_following 
    ON follows(follower_id, following_id);

-- Comments lookup
CREATE INDEX CONCURRENTLY idx_comments_post_created 
    ON comments(post_id, created_at DESC)
    WHERE parent_comment_id IS NULL;

-- Analyze tables
ANALYZE posts;
ANALYZE follows;
ANALYZE likes;
ANALYZE comments;
```

**Redis Caching Strategy:**
```typescript
// backend/src/services/CacheService.ts

export class CacheService {
    /**
     * Cache feed pages with smart invalidation
     */
    static async getFeed(userId: string, page: number): Promise<any> {
        const cacheKey = `feed:${userId}:page:${page}`;
        
        // Try cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        
        // Cache miss - fetch from database
        const feed = await FeedController.fetchFeedFromDB(userId, page);
        
        // Cache for 5 minutes
        await redisClient.setEx(cacheKey, 300, JSON.stringify(feed));
        
        return feed;
    }
    
    /**
     * Invalidate feed cache when new post added
     */
    static async invalidateFeedForFollowers(userId: string): Promise<void> {
        // Get all followers
        const followers = await Follow.findAll({
            where: { followingId: userId },
            attributes: ['followerId']
        });
        
        // Invalidate their feed caches
        const pipeline = redisClient.pipeline();
        for (const follower of followers) {
            const pattern = `feed:${follower.followerId}:page:*`;
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                pipeline.del(keys);
            }
        }
        await pipeline.exec();
    }
}
```

**API Response Time Targets:**
```
GET /api/feed                  <300ms (cached), <1000ms (uncached)
GET /api/posts/:id             <200ms
POST /api/posts                <500ms (upload), then async processing
POST /api/posts/:id/like       <200ms
POST /api/posts/:id/comments   <300ms
GET /api/users/:username       <200ms
```

---

### **Task 4.3.2: Mobile Performance Optimization**

**Image Loading Optimization:**
```typescript
// mobile/src/components/OptimizedImage.tsx

import FastImage from 'react-native-fast-image';

export default function OptimizedImage({ uri, thumbnail, style }: Props) {
    const [loadingFailed, setLoadingFailed] = useState(false);
    
    return (
        <FastImage
            source={{
                uri: thumbnail || uri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable
            }}
            style={style}
            resizeMode={FastImage.resizeMode.cover}
            onError={() => setLoadingFailed(true)}
            fallback={loadingFailed}
        >
            {/* Progressive loading: Show thumbnail while full image loads */}
            {thumbnail && (
                <FastImage
                    source={{
                        uri: uri,
                        priority: FastImage.priority.low,
                        cache: FastImage.cacheControl.immutable
                    }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode={FastImage.resizeMode.cover}
                />
            )}
        </FastImage>
    );
}
```

**Feed List Optimization:**
```typescript
// mobile/src/screens/main/FeedScreen.tsx (optimized)

import { FlashList } from "@shopify/flash-list";  // Instead of FlatList

export default function FeedScreen() {
    // ... state ...
    
    return (
        <FlashList
            data={posts}
            renderItem={renderPost}
            estimatedItemSize={550}  // Important for FlashList performance
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl ... />}
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            updateCellsBatching

period={50}
            windowSize={10}
        />
    );
}
```

**Memoization:**
```typescript
// mobile/src/components/PostCard.tsx (optimized)

const PostCard = React.memo(({ post }: PostCardProps) => {
    // ... component logic ...
    
    return (
        <View style={styles.container}>
            {/* ... UI ... */}
        </View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for re-render optimization
    return (
        prevProps.post.id === nextProps.post.id &&
        prevProps.post.likesCount === nextProps.post.likesCount &&
        prevProps.post.commentsCount === nextProps.post.commentsCount &&
        prevProps.post.likedByMe === nextProps.post.likedByMe
    );
});
```

**Lazy Loading:**
```typescript
// mobile/src/navigation/MainNavigator.tsx

import React, { Suspense, lazy } from 'react';

// Lazy load screens
const FeedScreen = lazy(() => import('../screens/main/FeedScreen'));
const CreatePostScreen = lazy(() => import('../screens/main/CreatePostScreen'));
const ProfileScreen = lazy(() => import('../screens/main/ProfileScreen'));

function MainTabNavigator() {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Feed">
                {() => (
                    <Suspense fallback={<LoadingScreen />}>
                        <FeedScreen />
                    </Suspense>
                )}
            </Tab.Screen>
            {/* ... other screens ... */}
        </Tab.Navigator>
    );
}
```

**Performance Targets:**
```
App Startup:           <2 seconds to interactive
Feed Scroll:           60fps consistently
Image Load:            <1 second (cached), <3 seconds (network)
Like Action:           Instant (optimistic update)
Comment Submit:        <500ms
Navigation:            <100ms transition
Memory Usage:          <200MB
Crash-Free Rate:       >99.5%
```

---

### **Task 4.3.3: UX Polish**

**Loading States:**
```typescript
// Consistent loading indicators across app

// Button with loading state
<Button
    title="Post"
    onPress={handlePost}
    loading={submitting}
    disabled={submitting}
/>

// Screen with loading state
{loading ? (
    <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
    </View>
) : (
    <Content />
)}

// Skeleton screens for better perceived performance
{loading ? <SkeletonPost /> : <Post />}
```

**Error States:**
```typescript
// Consistent error handling

function ErrorState({ error, onRetry }: Props) {
    return (
        <View style={styles.error}>
            <Ionicons name="alert-circle" size={48} color="#FF3B30" />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorMessage}>
                {getUserFriendlyError(error)}
            </Text>
            <Button title="Try Again" onPress={onRetry} />
        </View>
    );
}
```

**Empty States:**
```typescript
// Helpful empty states

function EmptyFeed() {
    return (
        <View style={styles.empty}>
            <Ionicons name="images-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
                Follow users to see their posts here
            </Text>
            <Button
                title="Find People to Follow"
                onPress={() => navigation.navigate('Discover')}
            />
        </View>
    );
}
```

**Animations:**
```typescript
// Subtle animations for polish

import { useSpring, animated } from '@react-spring/native';

function LikeButton({ liked, onPress }: Props) {
    const scale = useSpring({
        transform: [{ scale: liked ? 1.2 : 1.0 }],
        config: { tension: 300, friction: 10 }
    });
    
    return (
        <animated.View style={scale}>
            <TouchableOpacity onPress={onPress}>
                <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    size={28}
                    color={liked ? "#FF3B30" : "#000"}
                />
            </TouchableOpacity>
        </animated.View>
    );
}
```

**Haptic Feedback:**
```typescript
import * as Haptics from 'expo-haptics';

function handleLike() {
    // Provide tactile feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleLike();
}

function handlePost() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitPost();
}
```

---

## PHASE 4 COMPLETION CRITERIA

**Required Improvements:**

### **Performance:**
- [ ] Average processing time <5 seconds
- [ ] Feed load time <1 second (cached)
- [ ] API response times meet targets
- [ ] Mobile app 60fps scrolling
- [ ] Crash-free rate >99%

### **Safety:**
- [ ] Age verification working (>90% success rate)
- [ ] Real face detection working (>95% accuracy)
- [ ] Under-age users blocked from posting
- [ ] Real faces rejected on upload

### **UX Quality:**
- [ ] Onboarding completion >80%
- [ ] All screens have loading states
- [ ] All errors have friendly messages
- [ ] Empty states helpful
- [ ] Animations smooth

### **Bug Resolution:**
- [ ] Top 10 beta issues fixed
- [ ] Zero P0 bugs remaining
- [ ] <5 P1 bugs remaining
- [ ] Known P2 bugs documented

**Exit Criteria:** App ready for public beta launch

---

# PHASE 5: AVATAR MARKETPLACE

**Duration:** 8 weeks (Weeks 28-35)
**Goal:** Monetization through artist-created accessories
**Revenue Model:** 30% platform commission on sales
**Parallel Workstreams:** 3 (Backend, Artist Tools, User Experience)

---

## MARKETPLACE OVERVIEW

**Concept:**
- Artists create accessories (glasses, hats, hairstyles, outfits)
- Users purchase items ($0.99 - $9.99)
- Platform takes 30% commission
- Artists get 70%

**Example Economics:**
```
User buys glasses for $1.99:
- Artist receives: $1.39 (70%)
- Platform receives: $0.60 (30%)

Monthly projections (1000 MAU, 10% purchase rate):
- 100 purchases × $2.50 average = $250 revenue
- Platform commission: $75/month
- Artist payouts: $175/month

At 10,000 MAU scale:
- 1000 purchases × $2.50 = $2,500 revenue
- Platform commission: $750/month
- Artist payouts: $1,750/month
```

---

## WORKSTREAM 5.1: MARKETPLACE BACKEND

**Agent:** Marketplace Backend Agent
**Duration:** Weeks 28-30 (3 weeks)
**Dependencies:** Phase 4 complete
**Output:** Complete marketplace infrastructure

---

### **Task 5.1.1: Marketplace Data Models**

**Database Schema:**
```sql
-- Artists (extended from users)
CREATE TABLE artists (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    artist_name VARCHAR(100) NOT NULL,
    bio TEXT,
    portfolio_url TEXT,
    social_links JSONB,
    stripe_account_id VARCHAR(255),  -- Stripe Connect account
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
        -- Values: 'pending', 'approved', 'suspended'
    total_earnings_cents BIGINT DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Marketplace Items
CREATE TABLE marketplace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES artists(user_id) ON DELETE CASCADE,
    
    item_type VARCHAR(20) NOT NULL,
        -- Values: 'glasses', 'hat', 'hairstyle', 'earrings', 'outfit'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    price_cents INTEGER NOT NULL CHECK (price_cents >= 99 AND price_cents <= 9999),
        -- Min $0.99, Max $99.99
    
    preview_image_url TEXT NOT NULL,
    asset_files JSONB NOT NULL,
        -- { "cartoon": "url", "anime": "url", "minimalist": "url" }
    
    compatible_styles TEXT[] DEFAULT ARRAY['cartoon', 'anime', 'minimalist'],
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review',
        -- Values: 'pending_review', 'approved', 'rejected', 'archived'
    rejection_reason TEXT,
    
    downloads_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_marketplace_items_status (status),
    INDEX idx_marketplace_items_artist (artist_id, created_at DESC),
    INDEX idx_marketplace_items_type (item_type, status)
);

-- Purchases
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES marketplace_items(id),
    
    price_paid_cents INTEGER NOT NULL,
    artist_earnings_cents INTEGER NOT NULL,  -- 70% of price
    platform_commission_cents INTEGER NOT NULL,  -- 30% of price
    
    stripe_payment_intent_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255),  -- Transfer to artist
    
    purchased_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_purchases_user (user_id, purchased_at DESC),
    INDEX idx_purchases_item (item_id),
    UNIQUE INDEX idx_purchases_user_item (user_id, item_id)
);

-- User Inventory (owned items)
CREATE TABLE user_inventory (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES marketplace_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- Artist Payouts
CREATE TABLE artist_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES artists(user_id) ON DELETE CASCADE,
    
    amount_cents INTEGER NOT NULL,
    payout_method VARCHAR(20) NOT NULL DEFAULT 'stripe',
    
    stripe_transfer_id VARCHAR(255),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
        -- Values: 'pending', 'processing', 'completed', 'failed'
    failure_reason TEXT,
    
    requested_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    INDEX idx_artist_payouts_artist (artist_id, requested_at DESC),
    INDEX idx_artist_payouts_status (status)
);

-- Item Reviews
CREATE TABLE item_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE INDEX idx_item_reviews_user_item (user_id, item_id),
    INDEX idx_item_reviews_item (item_id, created_at DESC)
);
```

**Sequelize Models:**
```typescript
// backend/src/models/Artist.ts
export class Artist extends Model {
    public userId!: string;
    public artistName!: string;
    public bio!: string | null;
    public portfolioUrl!: string | null;
    public socialLinks!: object | null;
    public stripeAccountId!: string | null;
    public status!: 'pending' | 'approved' | 'suspended';
    public totalEarningsCents!: number;
    public totalSales!: number;
    public createdAt!: Date;
    public updatedAt!: Date;
}

Artist.init({
    userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: 'users', key: 'id' }
    },
    artistName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    bio: DataTypes.TEXT,
    portfolioUrl: DataTypes.TEXT,
    socialLinks: DataTypes.JSONB,
    stripeAccountId: DataTypes.STRING(255),
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'suspended'),
        defaultValue: 'pending'
    },
    totalEarningsCents: {
        type: DataTypes.BIGINT,
        defaultValue: 0
    },
    totalSales: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    sequelize,
    tableName: 'artists',
    timestamps: true
});

// backend/src/models/MarketplaceItem.ts
export class MarketplaceItem extends Model {
    public id!: string;
    public artistId!: string;
    public itemType!: 'glasses' | 'hat' | 'hairstyle' | 'earrings' | 'outfit';
    public name!: string;
    public description!: string | null;
    public priceCents!: number;
    public previewImageUrl!: string;
    public assetFiles!: {
        cartoon?: string;
        anime?: string;
        minimalist?: string;
    };
    public compatibleStyles!: string[];
    public status!: 'pending_review' | 'approved' | 'rejected' | 'archived';
    public rejectionReason!: string | null;
    public downloadsCount!: number;
    public ratingAvg!: number;
    public ratingCount!: number;
    public createdAt!: Date;
    public updatedAt!: Date;
}

MarketplaceItem.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    artistId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'artists', key: 'user_id' }
    },
    itemType: {
        type: DataTypes.ENUM('glasses', 'hat', 'hairstyle', 'earrings', 'outfit'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: DataTypes.TEXT,
    priceCents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 99,
            max: 9999
        }
    },
    previewImageUrl: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    assetFiles: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    compatibleStyles: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: ['cartoon', 'anime', 'minimalist']
    },
    status: {
        type: DataTypes.ENUM('pending_review', 'approved', 'rejected', 'archived'),
        defaultValue: 'pending_review'
    },
    rejectionReason: DataTypes.TEXT,
    downloadsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    ratingAvg: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0
    },
    ratingCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    sequelize,
    tableName: 'marketplace_items',
    timestamps: true
});

// Associations
Artist.hasMany(MarketplaceItem, { foreignKey: 'artistId', as: 'items' });
MarketplaceItem.belongsTo(Artist, { foreignKey: 'artistId', as: 'artist' });
```

---

### **Task 5.1.2: Stripe Connect Integration**

**Why Stripe Connect:**
- Handles artist payouts automatically
- Platform takes commission automatically
- Compliance with payment regulations
- Supports multiple countries

**Setup:**
```typescript
// backend/src/services/StripeConnectService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class StripeConnectService {
    /**
     * Create onboarding link for artist to connect Stripe account
     */
    static async createArtistOnboardingLink(artistId: string): Promise<string> {
        try {
            const artist = await Artist.findByPk(artistId);
            
            if (!artist) {
                throw new Error('Artist not found');
            }
            
            let accountId = artist.stripeAccountId;
            
            // Create Stripe Connect account if doesn't exist
            if (!accountId) {
                const account = await stripe.accounts.create({
                    type: 'express',  // Express account for simplicity
                    capabilities: {
                        transfers: { requested: true }
                    },
                    business_type: 'individual',
                    metadata: {
                        artist_id: artistId
                    }
                });
                
                accountId = account.id;
                
                await artist.update({ stripeAccountId: accountId });
            }
            
            // Create onboarding link
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: `${process.env.APP_URL}/artist/stripe-refresh`,
                return_url: `${process.env.APP_URL}/artist/stripe-success`,
                type: 'account_onboarding'
            });
            
            return accountLink.url;
            
        } catch (error) {
            console.error('Error creating onboarding link:', error);
            throw new Error('Failed to create onboarding link');
        }
    }
    
    /**
     * Process purchase with automatic platform commission
     */
    static async processPurchase(
        userId: string,
        itemId: string
    ): Promise<Purchase> {
        const transaction = await sequelize.transaction();
        
        try {
            const item = await MarketplaceItem.findByPk(itemId, {
                include: [{ model: Artist, as: 'artist' }]
            });
            
            if (!item || item.status !== 'approved') {
                throw new Error('Item not available');
            }
            
            const artist = item.artist!;
            
            if (!artist.stripeAccountId) {
                throw new Error('Artist payment setup incomplete');
            }
            
            // Calculate split
            const priceCents = item.priceCents;
            const platformCommission = Math.floor(priceCents * 0.30);
            const artistEarnings = priceCents - platformCommission;
            
            // Create payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: priceCents,
                currency: 'usd',
                application_fee_amount: platformCommission,
                transfer_data: {
                    destination: artist.stripeAccountId
                },
                metadata: {
                    user_id: userId,
                    item_id: itemId,
                    artist_id: artist.userId
                }
            });
            
            // Create purchase record
            const purchase = await Purchase.create({
                userId,
                itemId,
                pricePaidCents: priceCents,
                artistEarningsCents: artistEarnings,
                platformCommissionCents: platformCommission,
                stripePaymentIntentId: paymentIntent.id
            }, { transaction });
            
            // Add to user inventory
            await UserInventory.create({
                userId,
                itemId
            }, { transaction });
            
            // Update item stats
            await item.increment('downloadsCount', { transaction });
            
            // Update artist stats
            await artist.increment({
                totalEarningsCents: artistEarnings,
                totalSales: 1
            }, { transaction });
            
            await transaction.commit();
            
            return purchase;
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error processing purchase:', error);
            throw error;
        }
    }
    
    /**
     * Request artist payout
     */
    static async requestPayout(artistId: string): Promise<ArtistPayout> {
        const transaction = await sequelize.transaction();
        
        try {
            const artist = await Artist.findByPk(artistId);
            
            if (!artist) {
                throw new Error('Artist not found');
            }
            
            // Minimum payout: $50
            const MIN_PAYOUT_CENTS = 5000;
            
            if (artist.totalEarningsCents < MIN_PAYOUT_CENTS) {
                throw new Error(`Minimum payout is $50. Current balance: $${(artist.totalEarningsCents / 100).toFixed(2)}`);
            }
            
            // Create payout record
            const payout = await ArtistPayout.create({
                artistId,
                amountCents: artist.totalEarningsCents,
                payoutMethod: 'stripe',
                status: 'pending'
            }, { transaction });
            
            await transaction.commit();
            
            // Process payout (async)
            this.processPayout(payout.id).catch(console.error);
            
            return payout;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Process payout to artist
     */
    private static async processPayout(payoutId: string): Promise<void> {
        try {
            const payout = await ArtistPayout.findByPk(payoutId, {
                include: [{ model: Artist, as: 'artist' }]
            });
            
            if (!payout) return;
            
            const artist = payout.artist!;
            
            if (!artist.stripeAccountId) {
                throw new Error('Artist Stripe account not connected');
            }
            
            await payout.update({ status: 'processing' });
            
            // Create Stripe transfer
            const transfer = await stripe.transfers.create({
                amount: payout.amountCents,
                currency: 'usd',
                destination: artist.stripeAccountId,
                description: `Payout for SeeMe Marketplace sales`,
                metadata: {
                    payout_id: payoutId,
                    artist_id: artist.userId
                }
            });
            
            await payout.update({
                status: 'completed',
                stripeTransferId: transfer.id,
                completedAt: new Date()
            });
            
            // Reset artist earnings
            await artist.update({ totalEarningsCents: 0 });
            
            console.log(`Payout ${payoutId} completed: $${(payout.amountCents / 100).toFixed(2)}`);
            
        } catch (error) {
            console.error('Payout processing error:', error);
            
            await ArtistPayout.update(
                {
                    status: 'failed',
                    failureReason: error.message
                },
                { where: { id: payoutId } }
            );
        }
    }
}
```

---

### **Task 5.1.3: Marketplace API Endpoints**

**Artist Routes:**
```typescript
// backend/src/routes/marketplace/artists.ts
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { ArtistController } from '../../controllers/marketplace/ArtistController';

const router = Router();

// Apply to become artist
router.post('/apply', authenticateToken, ArtistController.applyToBeArtist);

// Get artist profile
router.get('/:artistId', ArtistController.getArtist);

// Update artist profile
router.put('/me', authenticateToken, ArtistController.updateArtistProfile);

// Connect Stripe account
router.post('/stripe/onboard', authenticateToken, ArtistController.createStripeOnboarding);

// Get earnings
router.get('/me/earnings', authenticateToken, ArtistController.getEarnings);

// Request payout
router.post('/me/payout', authenticateToken, ArtistController.requestPayout);

export default router;
```

**Item Routes:**
```typescript
// backend/src/routes/marketplace/items.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../../middleware/auth';
import { ItemController } from '../../controllers/marketplace/ItemController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Browse marketplace
router.get('/', ItemController.browseItems);

// Get item details
router.get('/:itemId', ItemController.getItem);

// Submit new item (artist only)
router.post(
    '/',
    authenticateToken,
    upload.fields([
        { name: 'preview', maxCount: 1 },
        { name: 'asset_cartoon', maxCount: 1 },
        { name: 'asset_anime', maxCount: 1 },
        { name: 'asset_minimalist', maxCount: 1 }
    ]),
    ItemController.submitItem
);

// Update item
router.put('/:itemId', authenticateToken, ItemController.updateItem);

// Delete item
router.delete('/:itemId', authenticateToken, ItemController.deleteItem);

// Purchase item
router.post('/:itemId/purchase', authenticateToken, ItemController.purchaseItem);

// Review item
router.post('/:itemId/review', authenticateToken, ItemController.reviewItem);

export default router;
```

**Admin Routes:**
```typescript
// backend/src/routes/marketplace/admin.ts
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { MarketplaceAdminController } from '../../controllers/marketplace/MarketplaceAdminController';

const router = Router();

// All routes require admin
router.use(authenticateToken, requireAdmin);

// Pending artist applications
router.get('/artists/pending', MarketplaceAdminController.getPendingArtists);

// Approve/reject artist
router.put('/artists/:artistId/approve', MarketplaceAdminController.approveArtist);
router.put('/artists/:artistId/reject', MarketplaceAdminController.rejectArtist);

// Pending item submissions
router.get('/items/pending', MarketplaceAdminController.getPendingItems);

// Approve/reject item
router.put('/items/:itemId/approve', MarketplaceAdminController.approveItem);
router.put('/items/:itemId/reject', MarketplaceAdminController.rejectItem);

// Marketplace analytics
router.get('/analytics', MarketplaceAdminController.getAnalytics);

export default router;
```

---

## WORKSTREAM 5.2: ARTIST TOOLS

**Agent:** Artist Experience Agent
**Duration:** Weeks 31-33 (3 weeks)
**Dependencies:** Workstream 5.1 complete
**Output:** Complete artist onboarding and submission system

---

### **Task 5.2.1: Artist Application & Onboarding**

**Artist Application Flow:**
```typescript
// backend/src/controllers/marketplace/ArtistController.ts

export class ArtistController {
    static async applyToBeArtist(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { artistName, bio, portfolioUrl, socialLinks } = req.body;
            
            // Validation
            if (!artistName || artistName.length < 3) {
                return res.status(400).json({ error: 'Artist name required (min 3 characters)' });
            }
            
            // Check if already applied
            const existing = await Artist.findByPk(userId);
            if (existing) {
                return res.status(400).json({ error: 'Already applied as artist' });
            }
            
            // Create artist application
            const artist = await Artist.create({
                userId,
                artistName,
                bio,
                portfolioUrl,
                socialLinks,
                status: 'pending'
            });
            
            // Notify admin (email or dashboard notification)
            // await notifyAdminNewArtistApplication(artist);
            
            res.status(201).json({
                message: 'Artist application submitted',
                artist,
                nextSteps: 'We will review your application within 2-3 business days'
            });
            
        } catch (error) {
            console.error('Error submitting artist application:', error);
            res.status(500).json({ error: 'Failed to submit application' });
        }
    }
}
```

**Mobile Artist Application Screen:**
```typescript
// mobile/src/screens/marketplace/BecomeArtistScreen.tsx

export default function BecomeArtistScreen() {
    const [artistName, setArtistName] = useState('');
    const [bio, setBio] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [socialLinks, setSocialLinks] = useState({
        instagram: '',
        twitter: '',
        website: ''
    });
    const [submitting, setSubmitting] = useState(false);
    
    const handleSubmit = async () => {
        if (!artistName) {
            Alert.alert('Error', 'Please enter your artist name');
            return;
        }
        
        setSubmitting(true);
        
        try {
            await api.applyToBeArtist({
                artistName,
                bio,
                portfolioUrl,
                socialLinks
            });
            
            Alert.alert(
                'Application Submitted!',
                'We will review your application within 2-3 business days. You will receive an email once approved.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to submit application. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Become a SeeMe Artist</Text>
                <Text style={styles.subtitle}>
                    Create and sell avatar accessories to thousands of users
                </Text>
            </View>
            
            <View style={styles.benefits}>
                <BenefitItem
                    icon="cash-outline"
                    title="Earn 70% Revenue"
                    description="Keep 70% of every sale"
                />
                <BenefitItem
                    icon="people-outline"
                    title="Reach Thousands"
                    description="Access to growing user base"
                />
                <BenefitItem
                    icon="trending-up-outline"
                    title="Passive Income"
                    description="Earn while you sleep"
                />
            </View>
            
            <View style={styles.form}>
                <Text style={styles.label}>Artist Name *</Text>
                <TextInput
                    style={styles.input}
                    value={artistName}
                    onChangeText={setArtistName}
                    placeholder="Your name or studio name"
                />
                
                <Text style={styles.label}>Bio</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself and your work..."
                    multiline
                    numberOfLines={4}
                />
                
                <Text style={styles.label}>Portfolio URL</Text>
                <TextInput
                    style={styles.input}
                    value={portfolioUrl}
                    onChangeText={setPortfolioUrl}
                    placeholder="https://yourportfolio.com"
                    keyboardType="url"
                />
                
                <Text style={styles.label}>Social Links (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={socialLinks.instagram}
                    onChangeText={(text) => setSocialLinks({ ...socialLinks, instagram: text })}
                    placeholder="Instagram username"
                />
                <TextInput
                    style={styles.input}
                    value={socialLinks.twitter}
                    onChangeText={(text) => setSocialLinks({ ...socialLinks, twitter: text })}
                    placeholder="Twitter username"
                />
                <TextInput
                    style={styles.input}
                    value={socialLinks.website}
                    onChangeText={(text) => setSocialLinks({ ...socialLinks, website: text })}
                    placeholder="Website URL"
                    keyboardType="url"
                />
                
                <Button
                    title="Submit Application"
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={!artistName || submitting}
                    style={styles.submitButton}
                />
            </View>
        </ScrollView>
    );
}
```

**Admin Review Dashboard:**
```typescript
// backend/src/controllers/marketplace/MarketplaceAdminController.ts

export class MarketplaceAdminController {
    static async getPendingArtists(req: Request, res: Response) {
        try {
            const pendingArtists = await Artist.findAll({
                where: { status: 'pending' },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['username', 'email']
                }],
                order: [['createdAt', 'ASC']]
            });
            
            res.json({ artists: pendingArtists });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get pending artists' });
        }
    }
    
    static async approveArtist(req: Request, res: Response) {
        try {
            const { artistId } = req.params;
            
            const artist = await Artist.findByPk(artistId);
            if (!artist) {
                return res.status(404).json({ error: 'Artist not found' });
            }
            
            await artist.update({ status: 'approved' });
            
            // Send approval email to artist
            // await sendArtistApprovalEmail(artist);
            
            res.json({ message: 'Artist approved', artist });
        } catch (error) {
            res.status(500).json({ error: 'Failed to approve artist' });
        }
    }
    
    static async rejectArtist(req: Request, res: Response) {
        try {
            const { artistId } = req.params;
            const { reason } = req.body;
            
            const artist = await Artist.findByPk(artistId);
            if (!artist) {
                return res.status(404).json({ error: 'Artist not found' });
            }
            
            await artist.update({
                status: 'suspended',  // Use 'suspended' for rejected
                bio: reason  // Store rejection reason in bio temporarily
            });
            
            // Send rejection email
            // await sendArtistRejectionEmail(artist, reason);
            
            res.json({ message: 'Artist application rejected' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to reject artist' });
        }
    }
}
```

---

### **Task 5.2.2: Item Submission System**

**Asset Requirements Documentation:**
```markdown
# SeeMe Marketplace Asset Guidelines

## File Requirements

### Preview Image
- **Format:** PNG with transparency
- **Size:** 512x512px
- **File Size:** <500KB
- **Content:** Item shown clearly on neutral background

### Asset Files (Per Style)
Each item must include assets for all compatible styles:

#### Glasses
- **Format:** PNG with alpha channel (transparency)
- **Size:** 400x200px
- **Angles:** Front-facing only (Phase 1)
- **Positioning:** Centered on horizontal axis, positioned for standard eye level

#### Hats
- **Format:** PNG with alpha channel
- **Size:** 600x600px (to fit over avatar head)
- **Positioning:** Centered, top-aligned

#### Hairstyles
- **Format:** PNG with alpha channel
- **Size:** 800x1000px
- **Positioning:** Replace default hair region

#### Earrings
- **Format:** PNG with alpha channel
- **Size:** 200x400px (pair)
- **Positioning:** Left and right separated

#### Outfits
- **Format:** PNG with alpha channel
- **Size:** 800x1200px
- **Positioning:** Covers torso region

## Style Requirements

### Cartoon Style
- Bold outlines (3-5px)
- Flat colors or simple cell shading
- High contrast
- Clear, simple shapes

### Anime Style
- Softer outlines (2-3px)
- Gradient shading allowed
- Detailed highlights
- Expressive details

### Minimalist Style
- Thick outlines (4-6px)
- Geometric shapes
- Limited color palette (2-4 colors)
- Abstract/stylized

## Quality Standards

✅ **Approved:**
- Clean edges (no jagged pixels)
- Proper transparency
- Consistent style
- Original artwork
- Appropriate content

❌ **Rejected:**
- Copyrighted characters/logos
- Low resolution/pixelated
- Offensive/inappropriate content
- Poor quality (visible artifacts)
- Inconsistent with style guides

## Pricing Guidelines

**Recommended Pricing:**
- Glasses: $0.99 - $1.99
- Hats: $1.99 - $2.99
- Hairstyles: $2.99 - $4.99
- Earrings: $0.99 - $1.99
- Outfits: $3.99 - $9.99

Platform commission: 30% of sale price
```

**Item Submission Form:**
```typescript
// mobile/src/screens/marketplace/SubmitItemScreen.tsx

export default function SubmitItemScreen() {
    const [itemType, setItemType] = useState<ItemType | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('1.99');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [assetFiles, setAssetFiles] = useState<{
        cartoon?: string;
        anime?: string;
        minimalist?: string;
    }>({});
    const [compatibleStyles, setCompatibleStyles] = useState<string[]>(['cartoon', 'anime', 'minimalist']);
    const [submitting, setSubmitting] = useState(false);
    
    const pickImage = async (assetType: 'preview' | 'cartoon' | 'anime' | 'minimalist') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1
        });
        
        if (!result.canceled) {
            if (assetType === 'preview') {
                setPreviewImage(result.assets[0].uri);
            } else {
                setAssetFiles({
                    ...assetFiles,
                    [assetType]: result.assets[0].uri
                });
            }
        }
    };
    
    const handleSubmit = async () => {
        // Validation
        if (!itemType || !name || !previewImage) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        
        if (compatibleStyles.length === 0) {
            Alert.alert('Error', 'Select at least one compatible style');
            return;
        }
        
        for (const style of compatibleStyles) {
            if (!assetFiles[style]) {
                Alert.alert('Error', `Missing asset file for ${style} style`);
                return;
            }
        }
        
        setSubmitting(true);
        
        try {
            const formData = new FormData();
            formData.append('itemType', itemType);
            formData.append('name', name);
            formData.append('description', description);
            formData.append('price', (parseFloat(price) * 100).toString());  // Convert to cents
            formData.append('compatibleStyles', JSON.stringify(compatibleStyles));
            
            // Append files
            formData.append('preview', {
                uri: previewImage,
                type: 'image/png',
                name: 'preview.png'
            } as any);
            
            for (const style of compatibleStyles) {
                formData.append(`asset_${style}`, {
                    uri: assetFiles[style],
                    type: 'image/png',
                    name: `asset_${style}.png`
                } as any);
            }
            
            await api.submitMarketplaceItem(formData);
            
            Alert.alert(
                'Submitted!',
                'Your item has been submitted for review. You will be notified once it is approved.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to submit item. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Submit New Item</Text>
            
            {/* Item Type Selection */}
            <Text style={styles.label}>Item Type *</Text>
            <View style={styles.typeGrid}>
                {['glasses', 'hat', 'hairstyle', 'earrings', 'outfit'].map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.typeCard,
                            itemType === type && styles.typeCardSelected
                        ]}
                        onPress={() => setItemType(type as ItemType)}
                    >
                        <Ionicons
                            name={getIconForType(type)}
                            size={32}
                            color={itemType === type ? '#007AFF' : '#666'}
                        />
                        <Text style={styles.typeName}>{capitalize(type)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            {/* Basic Info */}
            <Text style={styles.label}>Name *</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Round Glasses - Black"
                maxLength={100}
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your item..."
                multiline
                numberOfLines={4}
            />
            
            <Text style={styles.label}>Price (USD) *</Text>
            <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="1.99"
                keyboardType="decimal-pad"
            />
            <Text style={styles.helper}>
                You will earn 70% (${(parseFloat(price) * 0.7).toFixed(2)}) per sale
            </Text>
            
            {/* Compatible Styles */}
            <Text style={styles.label}>Compatible Styles *</Text>
            <View style={styles.checkboxGroup}>
                {['cartoon', 'anime', 'minimalist'].map((style) => (
                    <TouchableOpacity
                        key={style}
                        style={styles.checkbox}
                        onPress={() => {
                            if (compatibleStyles.includes(style)) {
                                setCompatibleStyles(compatibleStyles.filter(s => s !== style));
                            } else {
                                setCompatibleStyles([...compatibleStyles, style]);
                            }
                        }}
                    >
                        <Ionicons
                            name={compatibleStyles.includes(style) ? "checkbox" : "square-outline"}
                            size={24}
                            color="#007AFF"
                        />
                        <Text style={styles.checkboxLabel}>{capitalize(style)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            {/* File Uploads */}
            <Text style={styles.label}>Preview Image *</Text>
            <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('preview')}
            >
                {previewImage ? (
                    <Image source={{ uri: previewImage }} style={styles.previewImage} />
                ) : (
                    <View style={styles.uploadPlaceholder}>
                        <Ionicons name="cloud-upload-outline" size={48} color="#999" />
                        <Text style={styles.uploadText}>Tap to upload (512x512px)</Text>
                    </View>
                )}
            </TouchableOpacity>
            
            {/* Asset Files */}
            {compatibleStyles.map((style) => (
                <View key={style}>
                    <Text style={styles.label}>{capitalize(style)} Asset *</Text>
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => pickImage(style as any)}
                    >
                        {assetFiles[style] ? (
                            <Image source={{ uri: assetFiles[style] }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="cloud-upload-outline" size={32} color="#999" />
                                <Text style={styles.uploadText}>Upload {style} version</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            ))}
            
            <Button
                title="Submit for Review"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={styles.submitButton}
            />
            
            <Text style={styles.reviewNote}>
                Items are typically reviewed within 1-2 business days
            </Text>
        </ScrollView>
    );
}
```

**Backend Item Submission Handler:**
```typescript
// backend/src/controllers/marketplace/ItemController.ts

export class ItemController {
    static async submitItem(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { itemType, name, description, price, compatibleStyles } = req.body;
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            
            // Verify user is approved artist
            const artist = await Artist.findByPk(userId);
            if (!artist || artist.status !== 'approved') {
                return res.status(403).json({ error: 'Must be approved artist to submit items' });
            }
            
            // Validation
            if (!itemType || !name || !files['preview']) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            const priceCents = parseInt(price);
            if (priceCents < 99 || priceCents > 9999) {
                return res.status(400).json({ error: 'Price must be between $0.99 and $99.99' });
            }
            
            const styles = JSON.parse(compatibleStyles);
            for (const style of styles) {
                if (!files[`asset_${style}`]) {
                    return res.status(400).json({ error: `Missing asset for ${style} style` });
                }
            }
            
            // Upload preview image
            const previewBuffer = files['preview'][0].buffer;
            const previewKey = `marketplace/previews/${userId}/${Date.now()}_preview.png`;
            const previewUrl = await S3Service.uploadImage(previewBuffer, previewKey, 'image/png');
            
            // Upload asset files
            const assetFiles: any = {};
            for (const style of styles) {
                const assetBuffer = files[`asset_${style}`][0].buffer;
                const assetKey = `marketplace/assets/${userId}/${Date.now()}_${style}.png`;
                assetFiles[style] = await S3Service.uploadImage(assetBuffer, assetKey, 'image/png');
            }
            
            // Create item
            const item = await MarketplaceItem.create({
                artistId: userId,
                itemType,
                name,
                description,
                priceCents,
                previewImageUrl: previewUrl,
                assetFiles,
                compatibleStyles: styles,
                status: 'pending_review'
            });
            
            // Notify admin
            // await notifyAdminNewItemSubmission(item);
            
            res.status(201).json({
                message: 'Item submitted for review',
                item
            });
            
        } catch (error) {
            console.error('Error submitting item:', error);
            res.status(500).json({ error: 'Failed to submit item' });
        }
    }
}
```

---

## WORKSTREAM 5.3: USER MARKETPLACE EXPERIENCE

**Agent:** User Marketplace Agent
**Duration:** Weeks 34-35 (2 weeks)
**Dependencies:** Workstreams 5.1 and 5.2 complete
**Output:** Complete user-facing marketplace

---

### **Task 5.3.1: Marketplace Storefront**

**Mobile Marketplace Tab:**
```typescript
// mobile/src/screens/marketplace/MarketplaceScreen.tsx

export default function MarketplaceScreen() {
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<ItemType | 'all'>('all');
    const [sortBy, setSortBy] = useState<'popular' | 'new' | 'price_low' | 'price_high'>('popular');
    
    useEffect(() => {
        loadItems();
    }, [selectedCategory, sortBy]);
    
    const loadItems = async () => {
        setLoading(true);
        try {
            const response = await api.browseMarketplace({
                category: selectedCategory !== 'all' ? selectedCategory : undefined,
                sortBy
            });
            setItems(response.items);
        } catch (error) {
            console.error('Error loading marketplace:', error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Marketplace</Text>
                <TouchableOpacity onPress={() => navigation.navigate('BecomeArtist')}>
                    <Text style={styles.becomeArtist}>Become an Artist</Text>
                </TouchableOpacity>
            </View>
            
            {/* Category Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categories}
            >
                <CategoryChip
                    label="All"
                    selected={selectedCategory === 'all'}
                    onPress={() => setSelectedCategory('all')}
                />
                <CategoryChip
                    label="Glasses"
                    icon="glasses-outline"
                    selected={selectedCategory === 'glasses'}
                    onPress={() => setSelectedCategory('glasses')}
                />
                <CategoryChip
                    label="Hats"
                    icon="hat"
                    selected={selectedCategory === 'hat'}
                    onPress={() => setSelectedCategory('hat')}
                />
                <CategoryChip
                    label="Hair"
                    icon="cut-outline"
                    selected={selectedCategory === 'hairstyle'}
                    onPress={() => setSelectedCategory('hairstyle')}
                />
                <CategoryChip
                    label="Earrings"
                    icon="ear-outline"
                    selected={selectedCategory === 'earrings'}
                    onPress={() => setSelectedCategory('earrings')}
                />
                <CategoryChip
                    label="Outfits"
                    icon="shirt-outline"
                    selected={selectedCategory === 'outfit'}
                    onPress={() => setSelectedCategory('outfit')}
                />
            </ScrollView>
            
            {/* Sort Options */}
            <View style={styles.sortBar}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <TouchableOpacity onPress={() => setSortBy('popular')}>
                    <Text style={[styles.sortOption, sortBy === 'popular' && styles.sortOptionActive]}>
                        Popular
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSortBy('new')}>
                    <Text style={[styles.sortOption, sortBy === 'new' && styles.sortOptionActive]}>
                        New
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSortBy('price_low')}>
                    <Text style={[styles.sortOption, sortBy === 'price_low' && styles.sortOptionActive]}>
                        Price: Low
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSortBy('price_high')}>
                    <Text style={[styles.sortOption, sortBy === 'price_high' && styles.sortOptionActive]}>
                        Price: High
                    </Text>
                </TouchableOpacity>
            </View>
            
            {/* Items Grid */}
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <MarketplaceItemCard item={item} />}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.grid}
                    onRefresh={loadItems}
                    refreshing={loading}
                />
            )}
        </View>
    );
}

// Item Card Component
function MarketplaceItemCard({ item }: { item: MarketplaceItem }) {
    const navigation = useNavigation();
    
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('MarketplaceItemDetail', { itemId: item.id })}
        >
            <Image
                source={{ uri: item.previewImageUrl }}
                style={styles.cardImage}
            />
            
            <View style={styles.cardContent}>
                <Text style={styles.cardName} numberOfLines={2}>
                    {item.name}
                </Text>
                
                <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>
                        ${(item.priceCents / 100).toFixed(2)}
                    </Text>
                    
                    {item.ratingAvg > 0 && (
                        <View style={styles.rating}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={styles.ratingText}>
                                {item.ratingAvg.toFixed(1)}
                            </Text>
                        </View>
                    )}
                </View>
                
                <Text style={styles.cardArtist}>
                    by {item.artist.artistName}
                </Text>
            </View>
        </TouchableOpacity>
    );
}
```

---

### **Task 5.3.2: Item Detail & Purchase Flow**

**Item Detail Screen:**
```typescript
// mobile/src/screens/marketplace/MarketplaceItemDetailScreen.tsx

export default function MarketplaceItemDetailScreen({ route }: any) {
    const { itemId } = route.params;
    const [item, setItem] = useState<MarketplaceItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [owned, setOwned] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    
    useEffect(() => {
        loadItem();
    }, []);
    
    const loadItem = async () => {
        try {
            const response = await api.getMarketplaceItem(itemId);
            setItem(response.item);
            setOwned(response.owned);
        } catch (error) {
            console.error('Error loading item:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handlePurchase = async () => {
        if (!item) return;
        
        Alert.alert(
            'Purchase Item',
            `Buy "${item.name}" for $${(item.priceCents / 100).toFixed(2)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Purchase',
                    onPress: async () => {
                        setPurchasing(true);
                        try {
                            await api.purchaseMarketplaceItem(itemId);
                            setOwned(true);
                            Alert.alert('Success!', 'Item added to your collection');
                        } catch (error) {
                            Alert.alert('Error', 'Purchase failed. Please try again.');
                        } finally {
                            setPurchasing(false);
                        }
                    }
                }
            ]
        );
    };
    
    if (loading) {
        return <LoadingScreen />;
    }
    
    if (!item) {
        return <ErrorScreen message="Item not found" />;
    }
    
    return (
        <ScrollView style={styles.container}>
            {/* Preview Image */}
            <Image
                source={{ uri: item.previewImageUrl }}
                style={styles.previewImage}
                resizeMode="contain"
            />
            
            {/* Item Info */}
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                
                <TouchableOpacity onPress={() => navigation.navigate('ArtistProfile', { artistId: item.artistId })}>
                    <Text style={styles.artist}>by {item.artist.artistName}</Text>
                </TouchableOpacity>
                
                <View style={styles.meta}>
                    <View style={styles.rating}>
                        <Ionicons name="star" size={20} color="#FFD700" />
                        <Text style={styles.ratingText}>
                            {item.ratingAvg > 0 ? item.ratingAvg.toFixed(1) : 'No ratings yet'}
                        </Text>
                        {item.ratingCount > 0 && (
                            <Text style={styles.ratingCount}>({item.ratingCount})</Text>
                        )}
                    </View>
                    
                    <Text style={styles.downloads}>
                        {item.downloadsCount} downloads
                    </Text>
                </View>
                
                <Text style={styles.price}>
                    ${(item.priceCents / 100).toFixed(2)}
                </Text>
                
                {item.description && (
                    <Text style={styles.description}>{item.description}</Text>
                )}
                
                {/* Compatible Styles */}
                <View style={styles.compatibility}>
                    <Text style={styles.compatibilityTitle}>Compatible with:</Text>
                    <View style={styles.stylesList}>
                        {item.compatibleStyles.map((style) => (
                            <View key={style} style={styles.styleBadge}>
                                <Text style={styles.styleBadgeText}>{capitalize(style)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                
                {/* Preview on Avatar Button */}
                <Button
                    title="Preview on My Avatar"
                    onPress={() => navigation.navigate('AvatarPreview', { itemId })}
                    variant="outline"
                    style={styles.previewButton}
                />
                
                {/* Purchase Button */}
                {owned ? (
                    <View style={styles.ownedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <Text style={styles.ownedText}>You own this item</Text>
                    </View>
                ) : (
                    <Button
                        title={`Purchase for $${(item.priceCents / 100).toFixed(2)}`}
                        onPress={handlePurchase}
                        loading={purchasing}
                        disabled={purchasing}
                        style={styles.purchaseButton}
                    />
                )}
            </View>
            
            {/* Reviews Section */}
            <View style={styles.reviews}>
                <Text style={styles.reviewsTitle}>Reviews</Text>
                {/* Reviews list would go here */}
            </View>
        </ScrollView>
    );
}
```

**Avatar Preview Screen:**
```typescript
// mobile/src/screens/marketplace/AvatarPreviewScreen.tsx

export default function AvatarPreviewScreen({ route }: any) {
    const { itemId } = route.params;
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
    useEffect(() => {
        generatePreview();
    }, []);
    
    const generatePreview = async () => {
        setLoading(true);
        try {
            // Request backend to generate preview with item applied to user's avatar
            const response = await api.generateAvatarPreview(itemId);
            setPreviewImage(response.previewUrl);
        } catch (error) {
            console.error('Error generating preview:', error);
            Alert.alert('Error', 'Failed to generate preview');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>Generating preview...</Text>
                </View>
            ) : (
                <Image
                    source={{ uri: previewImage! }}
                    style={styles.previewImage}
                    resizeMode="contain"
                />
            )}
            
            <Text style={styles.hint}>
                This is how the item will look on your avatar
            </Text>
        </View>
    );
}
```

**Purchase Backend:**
```typescript
// backend/src/controllers/marketplace/ItemController.ts (continued)

export class ItemController {
    static async purchaseItem(req: AuthRequest, res: Response) {
        try {
            const { itemId } = req.params;
            const userId = req.user!.id;
            
            const item = await MarketplaceItem.findByPk(itemId, {
                include: [{ model: Artist, as: 'artist' }]
            });
            
            if (!item || item.status !== 'approved') {
                return res.status(404).json({ error: 'Item not available' });
            }
            
            // Check if already owned
            const existing = await UserInventory.findOne({
                where: { userId, itemId }
            });
            
            if (existing) {
                return res.status(400).json({ error: 'You already own this item' });
            }
            
            // Process purchase via Stripe
            const purchase = await StripeConnectService.processPurchase(userId, itemId);
            
            res.json({
                message: 'Purchase successful',
                purchase,
                item
            });
            
        } catch (error) {
            console.error('Error purchasing item:', error);
            res.status(500).json({ error: 'Purchase failed' });
        }
    }
}
```

---

### **Task 5.3.3: User Inventory & Avatar Customization Integration**

**Update Avatar Editor to Include Marketplace Items:**
```typescript
// mobile/src/screens/avatar/AvatarEditorScreen.tsx (updated)

export default function AvatarEditorScreen() {
    const [ownedItems, setOwnedItems] = useState<{
        glasses: MarketplaceItem[];
        hats: MarketplaceItem[];
        hairstyles: MarketplaceItem[];
        earrings: MarketplaceItem[];
        outfits: MarketplaceItem[];
    }>({
        glasses: [],
        hats: [],
        hairstyles: [],
        earrings: [],
        outfits: []
    });
    
    const [selectedItems, setSelectedItems] = useState<{
        glasses: string | null;
        hat: string | null;
        hairstyle: string | null;
        earrings: string | null;
        outfit: string | null;
    }>({
        glasses: null,
        hat: null,
        hairstyle: null,
        earrings: null,
        outfit: null
    });
    
    useEffect(() => {
        loadOwnedItems();
    }, []);
    
    const loadOwnedItems = async () => {
        try {
            const response = await api.getUserInventory();
            
            // Group items by type
            const grouped = response.items.reduce((acc, item) => {
                if (!acc[item.itemType + 's']) acc[item.itemType + 's'] = [];
                acc[item.itemType + 's'].push(item);
                return acc;
            }, {} as any);
            
            setOwnedItems(grouped);
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    };
    
    return (
        <View style={styles.container}>
            {/* Avatar Preview */}
            <AvatarPreviewRenderer
                baseAvatar={userAvatar}
                appliedItems={selectedItems}
            />
            
            {/* Customization Sections */}
            <ScrollView style={styles.customization}>
                {/* Glasses */}
                <CustomizationSection
                    title="Glasses"
                    items={ownedItems.glasses}
                    selected={selectedItems.glasses}
                    onSelect={(id) => setSelectedItems({ ...selectedItems, glasses: id })}
                    onShop={() => navigation.navigate('Marketplace', { category: 'glasses' })}
                />
                
                {/* Hats */}
                <CustomizationSection
                    title="Hats"
                    items={ownedItems.hats}
                    selected={selectedItems.hat}
                    onSelect={(id) => setSelectedItems({ ...selectedItems, hat: id })}
                    onShop={() => navigation.navigate('Marketplace', { category: 'hat' })}
                />
                
                {/* Continue for other categories... */}
            </ScrollView>
            
            {/* Save Button */}
            <Button
                title="Save Avatar"
                onPress={handleSave}
                style={styles.saveButton}
            />
        </View>
    );
}

function CustomizationSection({ title, items, selected, onSelect, onShop }: Props) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <TouchableOpacity onPress={onShop}>
                    <Text style={styles.shopLink}>Shop +</Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {/* None option */}
                <TouchableOpacity
                    style={[styles.itemCard, selected === null && styles.itemCardSelected]}
                    onPress={() => onSelect(null)}
                >
                    <View style={styles.noneIcon}>
                        <Ionicons name="close" size={24} color="#999" />
                    </View>
                    <Text style={styles.itemName}>None</Text>
                </TouchableOpacity>
                
                {/* Owned items */}
                {items.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.itemCard, selected === item.id && styles.itemCardSelected]}
                        onPress={() => onSelect(item.id)}
                    >
                        <Image
                            source={{ uri: item.previewImageUrl }}
                            style={styles.itemPreview}
                        />
                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
```

**Update ML Pipeline to Apply Marketplace Items:**
```python
# ml-service/src/pipeline/marketplace_integration.py

class MarketplaceItemApplicator:
    """Apply purchased marketplace items to avatar"""
    
    def __init__(self):
        self.s3_client = boto3.client('s3')
    
    def apply_items_to_avatar(
        self,
        styled_avatar: np.ndarray,
        user_items: List[Dict],
        avatar_style: str,
        landmarks: List[Tuple]
    ) -> np.ndarray:
        """
        Apply purchased marketplace items to styled avatar
        
        Args:
            styled_avatar: Avatar after style application
            user_items: List of item configurations
                       [{ type: 'glasses', asset_url: '...' }, ...]
            avatar_style: Current avatar style (cartoon/anime/minimalist)
            landmarks: Facial landmarks for positioning
        
        Returns:
            Avatar with items applied
        """
        result = styled_avatar.copy()
        
        # Apply in correct layer order (back to front)
        item_order = ['outfit', 'hairstyle', 'hat', 'glasses', 'earrings']
        
        for item_type in item_order:
            # Find item of this type
            item = next((i for i in user_items if i['type'] == item_type), None)
            if not item:
                continue
            
            # Get asset URL for current style
            asset_url = item['asset_urls'].get(avatar_style)
            if not asset_url:
                continue
            
            # Download asset
            asset_image = self.download_asset(asset_url)
            
            # Apply based on type
            if item_type == 'glasses':
                result = self.apply_glasses(result, asset_image, landmarks)
            elif item_type == 'hat':
                result = self.apply_hat(result, asset_image, landmarks)
            elif item_type == 'hairstyle':
                result = self.apply_hairstyle(result, asset_image, landmarks)
            elif item_type == 'earrings':
                result = self.apply_earrings(result, asset_image, landmarks)
            elif item_type == 'outfit':
                result = self.apply_outfit(result, asset_image, landmarks)
        
        return result
    
    def download_asset(self, s3_url: str) -> np.ndarray:
        """Download marketplace asset from S3"""
        # Extract bucket and key from URL
        # Download from S3
        # Decode image
        # Return as numpy array
        pass
    
    def apply_glasses(
        self,
        avatar: np.ndarray,
        glasses: np.ndarray,
        landmarks: List[Tuple]
    ) -> np.ndarray:
        """
        Apply glasses to avatar at correct position
        """
        # Get eye landmarks
        left_eye = landmarks[33]
        right_eye = landmarks[263]
        
        # Calculate glasses position and size
        eye_distance = np.linalg.norm(
            np.array(left_eye[:2]) - np.array(right_eye[:2])
        )
        
        glasses_width = int(eye_distance * 2.5)
        glasses_height = int(glasses_width * (glasses.shape[0] / glasses.shape[1]))
        
        # Resize glasses
        glasses_resized = cv2.resize(glasses, (glasses_width, glasses_height))
        
        # Calculate center position
        eye_center_x = int((left_eye[0] + right_eye[0]) / 2)
        eye_center_y = int((left_eye[1] + right_eye[1]) / 2)
        
        # Overlay glasses
        x1 = eye_center_x - glasses_width // 2
        y1 = eye_center_y - glasses_height // 2
        x2 = x1 + glasses_width
        y2 = y1 + glasses_height
        
        # Ensure within bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2 = min(avatar.shape[1], x2)
        y2 = min(avatar.shape[0], y2)
        
        # Alpha blend
        if glasses_resized.shape[2] == 4:  # Has alpha channel
            alpha = glasses_resized[:, :, 3] / 255.0
            alpha_3ch = np.stack([alpha] * 3, axis=-1)
            
            roi = avatar[y1:y2, x1:x2]
            blended = (
                glasses_resized[:, :, :3] * alpha_3ch +
                roi * (1 - alpha_3ch)
            ).astype(np.uint8)
            
            avatar[y1:y2, x1:x2] = blended
        
        return avatar
    
    # Similar methods for hat, hairstyle, earrings, outfit...
```

**Integration into Main Pipeline:**
```python
# ml-service/src/tasks/process_avatar.py (updated)

def run(self, task_data):
    # ... existing processing ...
    
    # After style application and expression preservation:
    
    # Apply marketplace items if user has any
    if task_data.get('marketplace_items'):
        from pipeline.marketplace_integration import MarketplaceItemApplicator
        
        item_applicator = MarketplaceItemApplicator()
        styled_face = item_applicator.apply_items_to_avatar(
            styled_face,
            task_data['marketplace_items'],
            task_data['avatar_style'],
            face_data['landmarks']
        )
    
    # Continue with final compositing...
```

---

## PHASE 5 COMPLETION CRITERIA

**Required Features:**

### **Artist Experience:**
- [ ] Artists can apply to join marketplace
- [ ] Admin can approve/reject applications
- [ ] Artists can connect Stripe account
- [ ] Artists can submit items with assets
- [ ] Artists can view earnings dashboard
- [ ] Artists can request payouts (>$50)
- [ ] Payouts process automatically

### **Marketplace:**
- [ ] Users can browse items by category
- [ ] Items display with preview, price, ratings
- [ ] Users can purchase items via Stripe
- [ ] 30% platform commission automatic
- [ ] 70% transferred to artist
- [ ] Users can preview items on their avatar
- [ ] Purchased items added to inventory

### **Integration:**
- [ ] Marketplace items apply to avatars
- [ ] Items work with all compatible styles
- [ ] Items render correctly in photos
- [ ] Avatar editor shows owned items
- [ ] "Shop +" button links to marketplace

### **Quality:**
- [ ] Asset quality guidelines enforced
- [ ] Manual review process working
- [ ] Poor quality items rejected
- [ ] Offensive content blocked
- [ ] Pricing within acceptable range

**Economics Validation:**
```
Test Scenario (10 transactions):
- 10 users purchase items (avg $2.50)
- Total revenue: $25.00
- Platform commission: $7.50 (30%)
- Artist payouts: $17.50 (70%)
- Stripe fees: ~$1.00 (4%)
- Net platform revenue: $6.50

Validates:
- Commission split working
- Stripe Connect integration
- Payout calculations correct
```

**Exit Criteria:** Marketplace functional, first transactions processed successfully

---

# PHASE 6: PUBLIC BETA LAUNCH

**Duration:** 4 weeks (Weeks 36-39)
**Goal:** Open beta to wider audience, prepare for public launch
**Target:** 1,000-5,000 beta users

---

## WEEK 36: PRE-LAUNCH PREPARATION

### **App Store Submission**

**iOS App Store:**
```
Required Materials:
✅ App Icon (1024x1024)
✅ Screenshots (6.5", 5.5" iPhones + 12.9" iPad)
✅ App Preview Video (15-30 seconds)
✅ App Description
✅ Keywords
✅ Privacy Policy URL
✅ Support URL
✅ Age Rating (12+)
✅ App Category (Social Networking)

App Review Information:
✅ Demo account credentials
✅ Notes on special features
✅ Explanation of avatar processing

Estimated Review Time: 1-3 days
```

**Android Play Store:**
```
Required Materials:
✅ App Icon (512x512)
✅ Feature Graphic (1024x500)
✅ Screenshots (Phone + Tablet)
✅ App Description
✅ Privacy Policy URL
✅ Content Rating Questionnaire
✅ App Category (Social)

Estimated Review Time: 1-7 days
```

**App Store Optimization (ASO):**
```
App Name: SeeMe - Avatar Social Network
Subtitle: Be yourself without judgment

Description:
SeeMe is a revolutionary social network where everyone uses avatars instead of real photos. Share moments, connect with friends, and express yourself freely—all while maintaining your privacy and avoiding appearance-based judgment.

🎭 HOW IT WORKS
1. Create your custom avatar in seconds
2. Take photos or upload from your library
3. Watch as our AI turns you into your avatar
4. Share with friends who see the real you, not just your looks

✨ KEY FEATURES
• Express yourself with custom avatars
• Advanced AI preserves your facial expressions
• Choose from Cartoon, Anime, or Minimalist styles
• Shop for unique accessories from artists
• Connect with friends without appearance pressure

🔒 PRIVACY FIRST
• Your real photos are never stored
• All faces automatically avatarized
• Age-verified community (15+)
• Safe, judgment-free environment

Keywords:
avatar, social media, privacy, expression, AI, photo editor, face filter, custom avatar, social network, friends, creative, art, anime, cartoon

Category: Social Networking
Age Rating: 12+ (some mature themes possible in user content)
```

---

### **Legal & Compliance Finalization**

**Privacy Policy:**
```markdown
# SeeMe Privacy Policy

Last Updated: [Date]

## What We Collect
- Account information (email, username, date of birth)
- Photos you upload (temporarily, for processing only)
- Avatar configurations
- Posts, comments, likes, follows
- Payment information (via Stripe, we don't store card details)
- Usage analytics

## How We Use Your Data
- Process photos into avatar versions
- Provide social networking features
- Improve our AI and services
- Process marketplace transactions
- Communicate important updates

## What We DON'T Do
- Store your original photos after processing
- Sell your data to third parties
- Use your photos for AI training without consent
- Share personal information publicly

## Your Rights (GDPR)
- Access your data
- Delete your account and data
- Export your data
- Opt out of analytics
- Request data correction

## Age Requirements
You must be at least 15 years old to use SeeMe. We verify age via payment method.

## Data Retention
- Account data: Until account deletion
- Original photos: Deleted after 24 hours
- Processed photos: Stored as long as posts exist
- Deleted posts: Removed within 30 days

## Contact
For privacy questions: privacy@seeme.app
For data requests: data@seeme.app

Full policy: https://seeme.app/privacy
```

**Terms of Service:**
```markdown
# SeeMe Terms of Service

## Acceptance
By using SeeMe, you agree to these terms.

## Age Requirement
You must be 15+ and provide age verification.

## User Content
- You own your content
- You grant SeeMe license to display your content
- No illegal, harmful, or offensive content
- No copyrighted material without permission
- We may remove content violating these terms

## Avatar Processing
- We process your photos into avatars using AI
- Original photos deleted within 24 hours
- No guarantee of perfect expression preservation

## Marketplace
- Artists keep 70% of sales
- Platform takes 30% commission
- Refunds at platform discretion
- Items must be original work

## Account Termination
- We may terminate accounts violating terms
- You may delete your account anytime
- Deleted data removed within 30 days

## Liability
- Service provided "as is"
- No guarantee of availability
- Not liable for user content
- Not liable for lost revenue (artists)

## Changes
We may update these terms. Continued use = acceptance.

Full terms: https://seeme.app/terms
```

**Community Guidelines:**
```markdown
# SeeMe Community Guidelines

## Be Kind
- Treat everyone with respect
- No bullying, harassment, or hate speech
- Celebrate differences

## Be Authentic
- Use SeeMe for real connections
- Don't impersonate others
- Express yourself genuinely

## Be Safe
- Don't share personal information publicly
- Report suspicious behavior
- Block users who make you uncomfortable

## Content Rules
✅ Allowed:
- Avatar-processed photos
- Original creative content
- Respectful discussions
- Marketplace items (original work)

❌ Not Allowed:
- Real faces (all faces must be avatarized)
- Nudity or sexual content
- Violence or gore
- Hate speech or discrimination
- Spam or scams
- Copyrighted material
- Illegal content

## Marketplace Rules
- Only submit original artwork
- No copyrighted characters
- Appropriate content only
- Accurate descriptions
- Fair pricing

## Consequences
- First violation: Warning
- Repeated violations: Temporary suspension
- Severe violations: Permanent ban

## Reporting
See something wrong? Report it:
- Tap "..." on post → "Report"
- We review all reports within 24 hours

Questions? community@seeme.app
```

---

### **Marketing Assets**

**Landing Page (seeme.app):**
```html
<!DOCTYPE html>
<html>
<head>
    <title>SeeMe - Avatar Social Network</title>
    <meta name="description" content="Social media where everyone uses avatars. Be yourself without judgment.">
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <h1>Be yourself. Without judgment.</h1>
        <p>The social network where faces don't matter, expressions do.</p>
        
        <!-- Demo Video -->
        <video autoplay loop muted>
            <source src="demo.mp4" type="video/mp4">
        </video>
        
        <!-- App Store Badges -->
        <div class="download-buttons">
            <a href="[App Store URL]">
                <img src="app-store-badge.svg" alt="Download on App Store">
            </a>
            <a href="[Play Store URL]">
                <img src="google-play-badge.svg" alt="Get it on Google Play">
            </a>
        </div>
    </section>
    
    <!-- How It Works -->
    <section class="how-it-works">
        <h2>How SeeMe Works</h2>
        
        <div class="step">
            <img src="step1.gif" alt="Create Avatar">
            <h3>1. Create Your Avatar</h3>
            <p>Choose your style in seconds</p>
        </div>
        
        <div class="step">
            <img src="step2.gif" alt="Take Photo">
            <h3>2. Take a Photo</h3>
            <p>Our AI turns you into your avatar</p>
        </div>
        
        <div class="step">
            <img src="step3.gif" alt="Share">
            <h3>3. Share & Connect</h3>
            <p>Post without appearance pressure</p>
        </div>
    </section>
    
    <!-- Features -->
    <section class="features">
        <h2>Why SeeMe?</h2>
        
        <div class="feature">
            <h3>🎭 Express Yourself</h3>
            <p>Your avatar captures your real expressions—smiles, frowns, everything</p>
        </div>
        
        <div class="feature">
            <h3>🔒 Privacy First</h3>
            <p>Real photos never stored. Age-verified community.</p>
        </div>
        
        <div class="feature">
            <h3>🎨 Customize</h3>
            <p>Shop unique accessories from talented artists</p>
        </div>
        
        <div class="feature">
            <h3>🌍 Be Yourself</h3>
            <p>Connect based on who you are, not how you look</p>
        </div>
    </section>
    
    <!-- Social Proof (if available) -->
    <section class="testimonials">
        <h2>What Beta Users Say</h2>
        <blockquote>
            "Finally, a social network where I don't feel judged on my looks!"
        </blockquote>
        <blockquote>
            "The avatar actually looks like me when I smile. It's incredible."
        </blockquote>
    </section>
    
    <!-- Footer -->
    <footer>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="mailto:support@seeme.app">Contact</a>
    </footer>
</body>
</html>
```

**Press Kit:**
```
SeeMe Press Kit
https://seeme.app/press

Contents:
- High-res logo (PNG, SVG)
- App screenshots (various devices)
- Demo videos
- Founder photo
- Company description
- Key features
- Target audience
- Press contact

One-line description:
"SeeMe is a social network where AI-powered avatars replace real faces, eliminating appearance-based judgment while preserving authentic expressions."

Founder statement:
"We created SeeMe because social media has become too focused on physical appearance. SeeMe lets people connect based on who they are, not how they look, while still maintaining the expressiveness of real photos through our AI technology."
```

---

## WEEK 37-38: BETA EXPANSION

### **Beta User Recruitment**

**Target: 1,000+ beta users**

**Channels:**

**1. Product Hunt Launch:**
```
Headline: SeeMe - Avatar social network powered by AI

Tagline: Be yourself without judgment

Description:
SeeMe is social media reimagined. Instead of real photos, everyone uses AI-powered avatars that preserve your actual facial expressions. Connect with friends, share moments, and express yourself freely—without the pressure of appearance-based judgment.

🎭 Your avatar, your expression
🔒 Privacy-first, age-verified community
🎨 Marketplace with artist-created accessories
📱 Available on iOS and Android

We're in public beta! Join us in building a kinder social network.

Maker: [Your Name], [Your Title]
Website: https://seeme.app

First Comment (from maker):
"Hey Product Hunt! 👋

I built SeeMe because I was tired of social media being all about looks. As someone who's struggled with appearance anxiety, I wanted to create a space where people could be themselves without that pressure.

The twist? Our AI preserves your facial expressions when creating your avatar. So you still get the authenticity of real photos (your smile is your avatar's smile) but without the judgment.

We're in public beta and would love your feedback! Try it out and let me know what you think. 

Special launch offer: First 1000 users get $5 marketplace credit!

AMA about the tech, the vision, or anything else!"
```

**2. Social Media Campaign:**
```
Twitter/X Thread:

1/ Introducing SeeMe: The social network where faces don't matter, but expressions do 🎭

2/ Here's the problem: Social media has become a beauty contest. We're more concerned about looking good than being ourselves.

3/ SeeMe's solution: Everyone uses AI-powered avatars. But here's the magic—the avatar actually captures YOUR expressions.

4/ When you smile, your avatar smiles. When you frown, it frowns. You get authenticity without appearance pressure.

5/ [Demo GIF showing transformation]

6/ We built this because...
[Personal story]

7/ Features:
- 3 avatar styles (Cartoon, Anime, Minimalist)
- Expression preservation via AI
- Artist marketplace for accessories
- Age-verified, privacy-first

8/ We're in public beta! iOS and Android available now.

First 1000 users get $5 marketplace credit 🎁

Download: https://seeme.app

9/ Questions? Thoughts? I'm here to answer everything! 

Thanks for reading. Let's build a kinder internet together ❤️

Instagram:
[Carousel post showing transformation]

Caption:
What if social media wasn't about how you look? 🤔

Introducing SeeMe—where everyone uses AI-powered avatars that preserve your real expressions.

Swipe to see:
1. The problem with current social media
2. How SeeMe works
3. Avatar transformation demo
4. Why it matters

Link in bio to join the beta! First 1000 users get $5 free credit 🎁

#SeeMe #SocialMedia #AI #Privacy #Authenticity

TikTok:
[Video showing real-time transformation]
[Text overlay: "POV: You find a social network where looks don't matter"]
[Demo of taking photo → avatar transformation]
[Show browsing feed with avatars]

Caption:
Finally, a social network where you can be yourself 🎭

Beta link in bio! #SeeMe #AI #SocialMedia
```

**3. Reddit Posts:**
```
r/SideProject:
Title: "I built a social network where AI turns everyone into avatars"

Body:
Hey r/SideProject!

After 9 months of development, I'm launching SeeMe—a social network where everyone uses AI-powered avatars instead of real photos.

**The Why:**
I was tired of social media being a beauty contest. SeeMe lets people connect based on who they are, not how they look.

**The How:**
- Users create custom avatars
- Take photos like normal
- Our AI processes faces into avatar versions
- Expressions are preserved (smile = avatar smiles)

**Tech Stack:**
- React Native (mobile)
- Node.js + Python (backend)
- PyTorch (computer vision)
- PostgreSQL + MongoDB
- AWS

**Current Status:**
Public beta on iOS and Android. ~500 users from friends/family testing.

**What I Need:**
Feedback! I'd love for you to try it and tell me:
- What's confusing?
- What's broken?
- What's missing?

First 100 redditors get $5 marketplace credit (use code REDDIT100)

Download: https://seeme.app

Happy to answer any questions about the tech or the business!

r/socialmedia:
Title: "Tired of appearance pressure on social media? I built an alternative"

[Similar format, focus on user benefits over tech]

r/privacy:
Title: "Privacy-first social network: Real photos deleted after processing"

[Focus on privacy features]
```

**4. Email Campaign:**
```
Subject: You're invited to try SeeMe (beta)

Hey [Name],

Remember when social media was about connecting with friends, not competing on looks?

I've been working on something that brings that back: SeeMe.

It's a social network where everyone uses AI-powered avatars. You take photos like normal, but faces are turned into avatars before posting.

The cool part? The avatars preserve your actual facial expressions. So you still get authenticity, just without the appearance pressure.

We just opened public beta and I thought you might be interested.

Check it out: https://seeme.app

Use code EARLY50 for $5 marketplace credit.

Would love your feedback!

[Your Name]

P.S. We're age-verified (15+) and privacy-first. Original photos are deleted after processing.
```

**5. Beta User Incentives:**
```
Early Access Rewards:

✅ First 100 users: $10 marketplace credit
✅ First 500 users: $5 marketplace credit
✅ First 1000 users: $3 marketplace credit
✅ All beta users: Beta Tester badge on profile
✅ Top 10 most active: Featured in launch announcement

Referral Program:
- Refer a friend → $2 credit (both you and friend)
- Refer 5 friends → $15 credit
- Refer 10 friends → $35 credit + Featured Artist consideration
```

---

### **Beta Monitoring Dashboard**

**Key Metrics to Track:**

```typescript
// Real-time dashboard showing:

ACQUISITION
- Sign-ups per day
- Traffic sources (Product Hunt, Reddit, etc.)
- Conversion rate (landing page → download)

ACTIVATION  
- Avatar creation rate
- First post rate
- Time to first post
- Age verification completion

ENGAGEMENT
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Posts per user
- Likes per user
- Comments per user
- Average session time

RETENTION
- Day 1, 7, 30 retention
- Cohort analysis

MARKETPLACE
- Browse rate (% who visit marketplace)
- Purchase rate (% who buy)
- Revenue per user
- Artist applications
- Items submitted

TECHNICAL
- Processing success rate
- Average processing time
- Crash-free rate
- API error rates
- Page load times

SUPPORT
- Support tickets
- Bug reports
- Feature requests
- App store reviews
```

**Automated Alerts:**
```javascript
alerts = {
    // Critical
    crash_rate_above_2_percent: 'page_immediately',
    processing_success_below_85_percent: 'page_immediately',
    api_down: 'page_immediately',
    
    // High Priority
    signup_rate_drops_50_percent: 'email_within_hour',
    retention_day1_below_30_percent: 'email_within_hour',
    negative_reviews_spike: 'email_within_hour',
    
    // Medium Priority
    marketplace_purchase_rate_below_5_percent: 'email_daily_summary',
    processing_time_above_10_seconds: 'email_daily_summary',
    
    // Positive Alerts
    viral_growth_detected: 'email_celebrate',
    positive_review_streak: 'email_celebrate'
}

## PHASE 6 COMPLETION CRITERIA

**Required Metrics:**

### **Acquisition (First Week):**
- [ ] 1,000+ sign-ups
- [ ] 500+ from Product Hunt
- [ ] 3+ traffic sources (diversified)
- [ ] <$5 cost per acquisition (if spending)

### **Activation:**
- [ ] 70%+ create avatar
- [ ] 50%+ make first post
- [ ] <5 minute time to first post
- [ ] 80%+ complete age verification

### **Engagement:**
- [ ] 40%+ Day 1 retention
- [ ] 25%+ Day 7 retention
- [ ] 3+ posts per user (first week)
- [ ] 10+ likes per user (first week)
- [ ] 3+ follows per user (first week)

### **Marketplace:**
- [ ] 20%+ visit marketplace
- [ ] 5%+ make purchase
- [ ] $2.50+ average transaction
- [ ] 5+ artists approved
- [ ] 30+ items available

### **Quality:**
- [ ] 4.0+ App Store rating (if sufficient reviews)
- [ ] >95% crash-free rate
- [ ] >90% processing success rate
- [ ] <5 seconds average processing time
- [ ] <24 hour support response time

### **Financial:**
- [ ] $1,000+ marketplace revenue (target)
- [ ] $300+ platform commission
- [ ] Artist payouts processed successfully
- [ ] Infrastructure costs <$1,000/month

**Exit Criteria:** Healthy growth, stable product, ready for public launch announcement

---

# PHASE 7: PUBLIC LAUNCH & SCALE

**Duration:** Ongoing (Months 10+)
**Goal:** Grow to 10,000+ MAU, achieve sustainability

---

## MONTH 1: POST-BETA TRANSITION

### **Week 1-2: Remove Beta Label**

**App Updates:**

**Changes:**
- Remove "Beta" from app name
- Remove beta badges/labels in UI
- Update App Store descriptions
- Announce "Official Launch"
- Version bump: 0.9.x → 1.0.0

**Release Notes:**
```
🎉 SeeMe 1.0 - Official Launch

After months of beta testing with thousands of users, we're officially launching!

What's new:
✨ Removed beta limitations
✨ Improved processing speed (now 3-5 seconds!)
✨ 50+ new marketplace items
✨ Enhanced avatar customization
✨ Better performance and stability

Thanks to all our beta testers for helping us get here!

Known issues:
- Videos not yet supported (coming soon)
- Some Android devices may experience slower processing

Happy avatar-ing! 🎭
```

**Public Announcement:**

**Press Release:**

```
FOR IMMEDIATE RELEASE

SeeMe Launches Publicly: AI-Powered Avatar Social Network Goes Live

[City, Date] - SeeMe, the social network that replaces users' faces with AI-generated avatars, today announced its public launch after a successful beta period with over 2,000 users.

Unlike traditional social media platforms that emphasize physical appearance, SeeMe uses advanced computer vision to transform users into customizable avatars while preserving their authentic facial expressions. This unique approach addresses growing concerns about appearance-based judgment and mental health impacts of traditional social media.

"We built SeeMe because social media has become too focused on looks," said [Founder Name], Creator of SeeMe. "Our platform lets people connect based on who they are, not how they look, while still maintaining the expressiveness and authenticity of real photos."

Key features include:
- AI-powered avatar processing that preserves facial expressions
- Three distinct art styles (Cartoon, Anime, Minimalist)
- Artist marketplace with community-created accessories
- Privacy-first approach with age verification
- Available on iOS and Android

During beta testing, SeeMe processed over 10,000 photos and facilitated more than 50,000 social interactions. The platform's unique approach has resonated particularly with Gen Z users concerned about social media's impact on mental health and self-esteem.

SeeMe is free to download with optional in-app purchases for premium avatar accessories. The platform operates on a creator economy model, enabling artists to design and sell custom avatar items while keeping 70% of revenue.
```

---

**Note:** Additional content for Phase 7 (Week 3-4 of Month 1, and Months 2+) was truncated in the original file generation. The document should be extended to include:
- Week 3-4: Post-launch optimization and growth campaigns
- Month 2-3: Scaling and feature expansion
- Month 4-6: Market validation and sustainability
- Month 7+: Long-term growth and ecosystem development