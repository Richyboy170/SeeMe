# Infrastructure

Docker Compose configuration for local development environment.

## Services

### PostgreSQL 15
- **Port:** 5432
- **Database:** seeme_dev
- **User:** seeme
- **Password:** seeme_dev_password_2026
- **Purpose:** Relational data (users, posts, social graph)

**Connection String:**
```
postgresql://seeme:seeme_dev_password_2026@localhost:5432/seeme_dev
```

### MongoDB 6
- **Port:** 27017
- **Database:** seeme
- **Purpose:** Document data (avatar configs, marketplace)

**Connection String:**
```
mongodb://localhost:27017/seeme
```

### Redis 7
- **Port:** 6379
- **Password:** seeme_redis_2026
- **Purpose:** Caching and session storage

**Connection String:**
```
redis://:seeme_redis_2026@localhost:6379
```

### RabbitMQ 3.12
- **AMQP Port:** 5672
- **Management UI:** http://localhost:15672
- **User:** seeme
- **Password:** seeme_rabbit_2026
- **Virtual Host:** seeme_vhost
- **Purpose:** Async job processing (image processing, emails)

**Connection String:**
```
amqp://seeme:seeme_rabbit_2026@localhost:5672/seeme_vhost
```

---

## Quick Start

### Start All Services
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f mongodb
docker-compose logs -f redis
docker-compose logs -f rabbitmq
```

### Check Service Status
```bash
docker-compose ps
```

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Data (CAUTION)
```bash
# This will delete all data in volumes
docker-compose down -v
```

---

## Health Checks

All services have health checks configured:

```bash
# Check health status
docker-compose ps

# Services show "healthy" when ready
```

**Health Check Endpoints:**
- PostgreSQL: `pg_isready` command
- MongoDB: `mongosh ping` command
- Redis: `redis-cli ping` command
- RabbitMQ: `rabbitmq-diagnostics ping` command

---

## Data Persistence

Data is persisted in named Docker volumes:

- `seeme-postgres-data` - PostgreSQL database files
- `seeme-mongo-data` - MongoDB database files
- `seeme-mongo-config` - MongoDB configuration
- `seeme-redis-data` - Redis data files
- `seeme-rabbitmq-data` - RabbitMQ data
- `seeme-rabbitmq-logs` - RabbitMQ logs

**View Volumes:**
```bash
docker volume ls | grep seeme
```

**Inspect Volume:**
```bash
docker volume inspect seeme-postgres-data
```

---

## Accessing Services

### PostgreSQL
```bash
# Using psql
docker-compose exec postgres psql -U seeme -d seeme_dev

# Using any PostgreSQL client
Host: localhost
Port: 5432
Database: seeme_dev
User: seeme
Password: seeme_dev_password_2026
```

### MongoDB
```bash
# Using mongosh
docker-compose exec mongodb mongosh seeme

# Using any MongoDB client
mongodb://localhost:27017/seeme
```

### Redis
```bash
# Using redis-cli
docker-compose exec redis redis-cli -a seeme_redis_2026

# Test connection
docker-compose exec redis redis-cli -a seeme_redis_2026 ping
```

### RabbitMQ Management UI
Open browser: http://localhost:15672
- Username: seeme
- Password: seeme_rabbit_2026

---

## Troubleshooting

### Services Won't Start
```bash
# Check Docker is running
docker info

# Check for port conflicts
netstat -an | grep 5432  # PostgreSQL
netstat -an | grep 27017 # MongoDB
netstat -an | grep 6379  # Redis
netstat -an | grep 5672  # RabbitMQ
```

### Service is Unhealthy
```bash
# View specific service logs
docker-compose logs rabbitmq

# Restart specific service
docker-compose restart rabbitmq

# Rebuild and restart
docker-compose up -d --force-recreate rabbitmq
```

### Reset Everything
```bash
# Stop all services
docker-compose down

# Remove all volumes (DELETES ALL DATA)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

### Low Disk Space
```bash
# Remove unused Docker resources
docker system prune -a

# Remove specific volumes
docker volume rm seeme-postgres-data
```

---

## Network Configuration

All services are on the `seeme-network` bridge network.

Services can communicate using container names:
- `postgres:5432`
- `mongodb:27017`
- `redis:6379`
- `rabbitmq:5672`

---

## Security Notes

**Development Environment Only:**
- Default passwords are used for convenience
- Services are exposed on localhost
- No SSL/TLS configured

**Production Deployment:**
- Use strong, unique passwords
- Enable SSL/TLS
- Restrict network access
- Use environment variables for secrets
- Regular backups
- Monitor service health

---

## Resource Limits

Services use default resource limits. For production, add resource constraints:

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Backup & Restore

### PostgreSQL Backup
```bash
# Backup
docker-compose exec postgres pg_dump -U seeme seeme_dev > backup.sql

# Restore
docker-compose exec -T postgres psql -U seeme -d seeme_dev < backup.sql
```

### MongoDB Backup
```bash
# Backup
docker-compose exec mongodb mongodump --db seeme --out /tmp/backup
docker-compose cp mongodb:/tmp/backup ./mongo-backup

# Restore
docker-compose exec mongodb mongorestore --db seeme /tmp/backup/seeme
```

### Redis Backup
```bash
# Trigger save
docker-compose exec redis redis-cli -a seeme_redis_2026 SAVE

# Copy RDB file
docker-compose cp redis:/data/dump.rdb ./redis-backup.rdb
```

---

## Service Versions

- PostgreSQL: 15-alpine
- MongoDB: 6-jammy
- Redis: 7-alpine
- RabbitMQ: 3.12-management-alpine

**Update Services:**
```bash
docker-compose pull
docker-compose up -d
```
