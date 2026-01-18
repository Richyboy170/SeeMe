# SeeMe Quick Start Guide

Get the SeeMe social media platform running in under 5 minutes.

## Prerequisites

- **Node.js** 18+
- **Docker Desktop** (for databases)
- **Expo Go** app on your phone (for mobile testing)

## 1. Start Infrastructure

```bash
cd infrastructure
docker-compose up -d
```

Wait ~30 seconds for services to be healthy:
```bash
docker-compose ps
```

**Services started:**
| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Main database |
| MongoDB | 27017 | Avatar configs |
| Redis | 6379 | Sessions/cache |
| RabbitMQ | 5672 | Message queue |

## 2. Start Backend

```bash
cd backend
npm install
cp .env.example .env   # First time only
npm run dev
```

Backend runs at: `http://localhost:3000`

## 3. Start Mobile App

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go app on your phone.

## Quick Verification

**Test the API:**
```bash
curl http://localhost:3000/health
```

**Register a test user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!@#"}'
```

## Environment Variables

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seeme_db
DB_USER=postgres
DB_PASSWORD=postgres

# MongoDB
MONGODB_URI=mongodb://localhost:27017/seeme_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_EXPIRES_IN=7d
```

## Mobile App Configuration

If running on a physical device, update the API URL in:
- `mobile/src/services/api.ts` (line 5)
- `mobile/src/services/socket.ts` (line 6)

Replace `localhost` with your computer's local IP address.

## Common Commands

| Task | Command |
|------|---------|
| Run backend tests | `cd backend && npm test` |
| Lint backend | `cd backend && npm run lint` |
| Stop infrastructure | `cd infrastructure && docker-compose down` |
| View logs | `cd infrastructure && docker-compose logs -f` |
| Reset databases | `cd infrastructure && docker-compose down -v && docker-compose up -d` |

## Project Structure

```
SeeMe/
├── backend/          # Node.js/Express API (TypeScript)
├── mobile/           # React Native/Expo app
├── ml-service/       # Python FastAPI for image processing
└── infrastructure/   # Docker compose for databases
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `npx kill-port 3000` |
| Docker services unhealthy | `docker-compose logs <service>` |
| Mobile can't connect | Use your local IP instead of localhost |
| Database connection failed | Ensure Docker is running |

## Next Steps

- Read `README.md` for full documentation
- See `MASTER.md` for complete technical specification
- Check `backend/README_TESTING.md` for test guides

---

Happy coding!
