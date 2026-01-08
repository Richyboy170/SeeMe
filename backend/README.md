# SeeMe Backend API

Backend API for the SeeMe AI Avatar Platform built with Node.js, Express, TypeScript, and multiple databases.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript (strict mode)
- **Databases:**
  - PostgreSQL (Sequelize ORM) - User data, posts
  - MongoDB (Mongoose) - Avatar configurations
  - Redis - Caching and sessions
- **Authentication:** JWT + Firebase Admin SDK
- **Security:** Helmet, CORS, bcrypt
- **Logging:** Winston
- **Code Quality:** ESLint, Prettier

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database and service configurations
│   │   ├── database.ts  # PostgreSQL/Sequelize setup
│   │   ├── mongodb.ts   # MongoDB/Mongoose setup
│   │   ├── redis.ts     # Redis client setup
│   │   └── firebase.ts  # Firebase Admin SDK
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # JWT authentication
│   │   └── errorHandler.ts  # Error handling
│   ├── models/          # Database models
│   │   ├── User.ts      # User model (PostgreSQL)
│   │   ├── Post.ts      # Post model (PostgreSQL)
│   │   └── AvatarConfig.ts  # Avatar config (MongoDB)
│   ├── routes/          # API route handlers
│   │   └── auth.ts      # Authentication routes
│   ├── utils/           # Utility functions
│   │   ├── logger.ts    # Winston logger
│   │   ├── migrate.ts   # Database migrations
│   │   └── seed.ts      # Development seed data
│   └── index.ts         # Application entry point
├── logs/                # Application logs
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+
- npm or yarn

## Installation

1. **Clone the repository and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure your database connections and secrets.

4. **Ensure databases are running:**
   - PostgreSQL on port 5432
   - MongoDB on port 27017
   - Redis on port 6379

5. **Run database migrations:**
   ```bash
   npm run migrate
   ```

6. **Seed development data (optional):**
   ```bash
   npm run seed
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed development data

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/auth/me` - Get current user info (requires auth)
- `POST /api/auth/verify-age` - Verify user age (requires auth)

### Request Examples

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Current User:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

See `.env.example` for all required environment variables:

- **Server:** PORT, HOST, NODE_ENV, LOG_LEVEL
- **Database:** DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- **MongoDB:** MONGODB_URI
- **Redis:** REDIS_URL
- **JWT:** JWT_SECRET, JWT_EXPIRES_IN
- **Firebase:** FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT
- **CORS:** CORS_ORIGIN

## Database Models

### User (PostgreSQL)
- `id` - UUID primary key
- `username` - Unique username (3-30 chars)
- `email` - Unique email address
- `passwordHash` - Bcrypt hashed password
- `ageVerified` - Boolean age verification status
- `activeAvatarId` - Currently active avatar ID
- `createdAt`, `updatedAt` - Timestamps

### Post (PostgreSQL)
- `id` - UUID primary key
- `userId` - Foreign key to User
- `originalImageUrl` - Original uploaded image
- `processedImageUrl` - AI-processed image
- `thumbnailUrl` - Thumbnail image
- `caption` - Post caption
- `status` - Processing status (processing/completed/failed)
- `likesCount`, `commentsCount` - Engagement metrics
- `imageWidth`, `imageHeight` - Image dimensions
- `facesDetected` - Number of faces detected
- `createdAt`, `updatedAt` - Timestamps

### AvatarConfig (MongoDB)
- `userId` - Reference to User
- `avatarId` - Unique avatar identifier
- `name` - Avatar name (max 50 chars)
- `style` - Avatar style (cartoon/anime/minimalist)
- `customizations` - Detailed appearance settings
- `isActive` - Whether this is the active avatar
- `createdAt`, `updatedAt` - Timestamps

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. Register or login to receive a JWT token
2. Include the token in the Authorization header:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```
3. Tokens expire after 7 days (configurable)

## Error Handling

All errors return JSON:

```json
{
  "error": "Error message",
  "statusCode": 400
}
```

Common status codes: 400, 401, 403, 404, 409, 500

## Logging

Logs are written to:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- Console output in development mode

## Development

### Code Style
- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting
- JSDoc comments for all functions

### Testing Connections

```bash
# Health check
curl http://localhost:3000/health
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production databases
3. Set strong secrets
4. Build: `npm run build`
5. Start: `npm start`

## Completed (WORKSTREAM 0.2)

- ✅ Node.js + Express + TypeScript
- ✅ PostgreSQL, MongoDB, Redis connections
- ✅ User, Post, and AvatarConfig models
- ✅ JWT authentication
- ✅ Error handling and logging
- ✅ Database migrations and seeding

## Next Steps

- User management routes
- Avatar customization routes
- Post upload and processing
- Image processing pipeline
- WebSocket for real-time updates
- Rate limiting
- File upload handling

## License

Private - SeeMe Platform
