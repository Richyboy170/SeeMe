# Backend Docker Setup Guide

## Overview

The backend can now run inside Docker, which provides:
- ✅ Seamless connection to PostgreSQL via Docker network
- ✅ No Windows-Docker authentication issues
- ✅ Production-like environment
- ✅ Hot-reload development support
- ✅ Isolated environment

## Files Created

1. **Dockerfile** - Production build
2. **Dockerfile.dev** - Development with hot reload
3. **.dockerignore** - Exclude unnecessary files
4. **.env.docker** - Docker-specific environment variables

## Quick Start

### Option A: Run Backend in Docker (RECOMMENDED)

```bash
# Navigate to infrastructure directory
cd infrastructure

# Build and start all services including backend
docker-compose up -d backend

# View logs
docker-compose logs -f backend

# Check status
docker-compose ps
```

### Option B: Run Backend on Host (Original Method)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

### Docker Environment (.env.docker)
- Uses Docker service names (e.g., `postgres`, `mongodb`, `redis`)
- Automatically loaded when running via docker-compose
- Located at: `backend/.env.docker`

### Host Environment (.env)
- Uses `localhost` for all services
- Used when running backend directly on host
- Located at: `backend/.env`

## Docker Commands

```bash
# Start backend only
docker-compose up -d backend

# Start all services
docker-compose up -d

# Stop backend
docker-compose stop backend

# View backend logs
docker-compose logs -f backend

# Restart backend after code changes
docker-compose restart backend

# Rebuild backend (after dependency changes)
docker-compose build backend
docker-compose up -d backend

# Execute commands in backend container
docker-compose exec backend npm run build
docker-compose exec backend sh

# Remove backend container
docker-compose down backend
```

## Development Workflow

### With Docker (Hot Reload Enabled)

1. Edit code in your IDE
2. Changes are automatically synced to container
3. `ts-node-dev` detects changes and restarts
4. View logs: `docker-compose logs -f backend`

### Accessing Services

When backend runs in Docker:
- Backend API: `http://localhost:3000`
- PostgreSQL: `postgres:5432` (from container) or `localhost:5432` (from host)
- MongoDB: `mongodb:27017` (from container) or `localhost:27017` (from host)
- Redis: `redis:6379` (from container) or `localhost:6379` (from host)
- RabbitMQ: `rabbitmq:5672` (from container) or `localhost:5672` (from host)

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Check if port 3000 is available
netstat -ano | findstr :3000

# Rebuild container
docker-compose build --no-cache backend
docker-compose up -d backend
```

### PostgreSQL connection errors

When running in Docker, PostgreSQL is accessible at `postgres:5432`.
The backend uses `.env.docker` which has the correct hostname.

```bash
# Test PostgreSQL connection from backend container
docker-compose exec backend node -e "const {Client} = require('pg'); const c = new Client({host:'postgres', port:5432, database:'seeme_dev', user:'seeme', password:'seeme_dev_password_2026'}); c.connect().then(() => {console.log('✓ Connected'); c.end();}).catch(e => console.error(e.message));"
```

### Code changes not reflecting

```bash
# Ensure volumes are mounted correctly
docker-compose exec backend ls -la /app

# Restart backend
docker-compose restart backend

# If still not working, rebuild
docker-compose build backend
docker-compose up -d backend
```

### Database migrations

```bash
# Run migrations in Docker
docker-compose exec backend npm run migrate

# Or build and run once
docker-compose exec backend npm run build
docker-compose exec backend node dist/utils/migrate.js
```

## Integration Tests

When backend runs in Docker, integration tests still work:

```bash
# From host machine
cd integration-tests
npm test

# Tests connect to localhost:3000 (Docker port mapping)
```

## Production Deployment

Use the production Dockerfile:

```bash
# Build production image
docker build -f Dockerfile -t seeme-backend:latest .

# Run production container
docker run -d \
  --name seeme-backend \
  --network seeme-network \
  --env-file .env.docker \
  -p 3000:3000 \
  seeme-backend:latest
```

## Comparison: Docker vs Host

| Feature | Docker | Host |
|---------|--------|------|
| PostgreSQL Connection | ✅ Works perfectly | ❌ Auth issues on Windows |
| Hot Reload | ✅ Yes (via volumes) | ✅ Yes |
| Setup Complexity | Medium | Simple |
| Production-Like | ✅ Yes | ❌ No |
| Debugging | Via logs/exec | Direct |
| Performance | Good | Slightly better |

## Recommendation

**For Development:** Use Docker (solves PostgreSQL issues)
**For Quick Testing:** Either works
**For Production:** Always use Docker
