# SeeMe Backend - Third-Party Providers Guide

This guide documents all third-party providers and services used in the backend, including configuration details and troubleshooting tips.

---

## Table of Contents

1. [PostgreSQL Database](#1-postgresql-database)
2. [MongoDB Database](#2-mongodb-database)
3. [Redis Cache](#3-redis-cache)
4. [Celery Task Queue](#4-celery-task-queue)
5. [Firebase (Google Cloud)](#5-firebase-google-cloud)
6. [AWS S3 Storage](#6-aws-s3-storage)
7. [Google Sign-In (OAuth 2.0)](#7-google-sign-in-oauth-20)
8. [JWT Authentication](#8-jwt-authentication)
9. [Socket.io](#9-socketio)
10. [Environment Variables Summary](#10-environment-variables-summary)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. PostgreSQL Database

**Purpose:** Primary relational database for all app data

**Config File:** `src/config/database.ts`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | - | Full connection URL (overrides individual params) |
| `DB_HOST` | No | `localhost` | Database hostname |
| `DB_PORT` | No | `5432` | Database port |
| `DB_NAME` | No | `seeme_db` | Database name |
| `DB_USER` | No | `postgres` | Database username |
| `DB_PASSWORD` | No | `postgres` | Database password |
| `USE_SQLITE` | No | `false` | Set to `true` for SQLite fallback |
| `DB_FORCE_SYNC` | No | `false` | Force recreate tables on startup |

### Setup Instructions

1. **Install PostgreSQL** (Windows):
   ```bash
   # Download from: https://www.postgresql.org/download/windows/
   # Or use chocolatey:
   choco install postgresql
   ```

2. **Create the database:**
   ```sql
   CREATE DATABASE seeme_db;
   ```

3. **Set environment variables:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=seeme_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

### Fallback
If PostgreSQL is unavailable, the app can use SQLite by setting `USE_SQLITE=true`.

---

## 2. MongoDB Database

**Purpose:** Optional NoSQL database (currently minimal usage)

**Config File:** `src/config/mongodb.ts`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | No | `mongodb://localhost:27017/seeme_db` | MongoDB connection URI |

### Setup Instructions

1. **Install MongoDB** (Windows):
   ```bash
   # Download from: https://www.mongodb.com/try/download/community
   # Or use chocolatey:
   choco install mongodb
   ```

2. **Start MongoDB:**
   ```bash
   mongod --dbpath C:\data\db
   ```

3. **Set environment variable:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/seeme_db
   ```

### Note
MongoDB is optional - the server runs without it.

---

## 3. Redis Cache

**Purpose:** Caching, session management, online user status, Celery task queue

**Config File:** `src/config/redis.ts`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |

### Setup Instructions

1. **Install Redis** (Windows - use WSL or Memurai):
   ```bash
   # Option 1: Use WSL (Windows Subsystem for Linux)
   wsl sudo apt install redis-server
   wsl redis-server

   # Option 2: Use Memurai (Redis-compatible for Windows)
   # Download from: https://www.memurai.com/

   # Option 3: Use Docker
   docker run -d -p 6379:6379 redis
   ```

2. **Set environment variable:**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

### Features Using Redis
- User online status (`user:{userId}:online`)
- Celery task metadata
- Socket.io session management

### Note
Redis is optional - the server runs without it but online status won't work.

---

## 4. Celery Task Queue

**Purpose:** Distributed task queue for ML image processing

**Config File:** `src/config/celery.ts`

### How It Works
- Uses Redis as the message broker
- Stores task metadata with key pattern: `celery-task-meta-{taskId}`
- Tasks expire after 1 hour

### Setup
Celery requires a Python worker service to process tasks. The Node.js backend only queues tasks and checks status.

```bash
# On the ML service side (Python):
pip install celery redis
celery -A your_app worker --loglevel=info
```

---

## 5. Firebase (Google Cloud)

**Purpose:** Push notifications (FCM), optional auth, cloud storage

**Config File:** `src/config/firebase.ts`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | No | - | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT` | No | - | Service account JSON (as string) |
| `FIREBASE_STORAGE_BUCKET` | No | - | Cloud Storage bucket name |

### Setup Instructions

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing

2. **Generate Service Account:**
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

3. **Set environment variables:**
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"..."}
   ```

   Note: The service account JSON must be on a single line or properly escaped.

### Features Using Firebase
- Push notifications via FCM (Firebase Cloud Messaging)
- User FCM token storage in User model

---

## 6. AWS S3 Storage

**Purpose:** Cloud storage for images (chat images, avatars)

**Config File:** `src/services/S3Service.ts`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | No | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | No | - | AWS secret key |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `S3_BUCKET_NAME` | No | - | S3 bucket name |
| `CLOUDFRONT_DOMAIN` | No | - | CloudFront CDN domain |

### Setup Instructions

1. **Create S3 Bucket:**
   - Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
   - Create a new bucket
   - Configure CORS:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

2. **Create IAM User:**
   - Go to IAM > Users > Add User
   - Attach policy: `AmazonS3FullAccess` (or create custom policy)
   - Save the Access Key ID and Secret Access Key

3. **Optional: Create CloudFront Distribution:**
   - Go to CloudFront > Create Distribution
   - Set origin to your S3 bucket
   - Note the distribution domain

4. **Set environment variables:**
   ```env
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=seeme-uploads
   CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
   ```

### Fallback
If AWS is not configured, files are stored locally in `backend/storage/`.

---

## 7. Google Sign-In (OAuth 2.0)

**Purpose:** User authentication via Google accounts

**Config File:** `src/utils/googleAuth.ts`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID_ANDROID` | No | - | OAuth client ID for Android |
| `GOOGLE_CLIENT_ID_IOS` | No | - | OAuth client ID for iOS |
| `GOOGLE_CLIENT_ID_WEB` | No | - | OAuth client ID for Web |

### Setup Instructions

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable Google Sign-In API:**
   - Go to APIs & Services > Library
   - Search and enable "Google Identity Services"

3. **Create OAuth Credentials:**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client IDs for:
     - **Android:** Enter your app's package name and SHA-1 fingerprint
     - **iOS:** Enter your app's bundle ID
     - **Web:** Enter authorized JavaScript origins

4. **Set environment variables:**
   ```env
   GOOGLE_CLIENT_ID_ANDROID=123456789.apps.googleusercontent.com
   GOOGLE_CLIENT_ID_IOS=987654321.apps.googleusercontent.com
   GOOGLE_CLIENT_ID_WEB=111222333.apps.googleusercontent.com
   ```

---

## 8. JWT Authentication

**Purpose:** Token-based authentication for API and Socket.io

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret key for signing tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration time |

### Setup

```env
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
```

**Important:** Use a strong, random secret in production!

```bash
# Generate a secure secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 9. Socket.io

**Purpose:** Real-time bidirectional communication (chat, notifications)

**Config File:** `src/socket/index.ts`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLIENT_URL` | No | `*` | CORS allowed origin |

### Configuration
```env
CLIENT_URL=http://localhost:3001
```

For production, set to your actual client domain.

---

## 10. Environment Variables Summary

### Required for Production

```env
# Critical
JWT_SECRET=your-secret-key

# Database (PostgreSQL)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=seeme_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Or use DATABASE_URL instead
DATABASE_URL=postgresql://user:password@host:5432/seeme_db
```

### Recommended for Production

```env
# Redis (for caching and real-time features)
REDIS_URL=redis://your-redis-host:6379

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# AWS S3 (for image storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket

# Google Sign-In
GOOGLE_CLIENT_ID_ANDROID=your-android-client-id
GOOGLE_CLIENT_ID_IOS=your-ios-client-id
```

### Development Defaults

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seeme_db
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/seeme_db
```

---

## 11. Troubleshooting

### PostgreSQL Issues

**Error: "Connection refused"**
```
- Check if PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Start PostgreSQL service (Windows): `net start postgresql-x64-14`
- Verify credentials in .env file
```

**Error: "Database does not exist"**
```sql
-- Connect to PostgreSQL and create database:
CREATE DATABASE seeme_db;
```

**Error: "Authentication failed"**
```
- Verify DB_USER and DB_PASSWORD
- Check pg_hba.conf for authentication method
```

### Redis Issues

**Error: "Redis connection failed"**
```
- Check if Redis is running
- Windows: Use Memurai or Docker instead of native Redis
- Verify REDIS_URL format: redis://host:port
```

**Workaround:** Server runs without Redis but online status won't work.

### Firebase Issues

**Error: "Failed to initialize Firebase"**
```
- Verify FIREBASE_SERVICE_ACCOUNT is valid JSON
- Ensure the JSON is on a single line (no newlines)
- Check FIREBASE_PROJECT_ID matches the service account
```

**Error: "Push notification failed"**
```
- Verify FCM token is valid
- Check if user has notifications enabled
- Ensure Firebase Cloud Messaging is enabled in console
```

### AWS S3 Issues

**Error: "Access Denied"**
```
- Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Check IAM user has S3 permissions
- Verify bucket name and region
```

**Error: "Bucket not found"**
```
- Verify S3_BUCKET_NAME exactly matches your bucket
- Check bucket exists in the specified AWS_REGION
```

**Fallback:** If S3 fails, files are stored locally in `backend/storage/`.

### Google Sign-In Issues

**Error: "Invalid token"**
```
- Verify correct client ID is used for each platform
- Check token hasn't expired
- Ensure app package name/bundle ID matches OAuth config
```

**Error: "Wrong audience"**
```
- Mobile app is using wrong client ID
- Update GOOGLE_CLIENT_ID_ANDROID or GOOGLE_CLIENT_ID_IOS
```

### Socket.io Issues

**Error: "CORS blocked"**
```
- Set CLIENT_URL to your frontend domain
- For development: CLIENT_URL=*
- For production: CLIENT_URL=https://your-domain.com
```

**Error: "Authentication failed"**
```
- Verify JWT token is being sent in handshake
- Check JWT_SECRET matches between auth and socket
```

---

## Quick Start Checklist

1. [ ] Install PostgreSQL and create database
2. [ ] Set `JWT_SECRET` (required)
3. [ ] Set database credentials (`DB_*` variables)
4. [ ] Install Redis (optional but recommended)
5. [ ] Set up Firebase project (optional, for push notifications)
6. [ ] Set up AWS S3 (optional, for cloud storage)
7. [ ] Set up Google OAuth credentials (optional, for Google Sign-In)
8. [ ] Run `npm install` and `npm run dev`

---

## Architecture Overview

```
                           SeeMe Backend
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  PostgreSQL │    │    Redis    │    │   MongoDB   │     │
│  │  (Required) │    │  (Optional) │    │  (Optional) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│  ┌─────────────────────────┴─────────────────────────────┐ │
│  │                    Express.js Server                   │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  Auth: JWT + Google Sign-In + Firebase                │ │
│  │  Real-time: Socket.io                                 │ │
│  │  Storage: AWS S3 / Local                              │ │
│  │  Notifications: Firebase FCM                          │ │
│  │  ML Tasks: Celery via Redis                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
