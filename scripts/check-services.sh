#!/bin/bash
# Service Health Check Script

echo "========================================="
echo "SeeMe Infrastructure Health Check"
echo "========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Navigate to infrastructure directory
cd "$(dirname "$0")/../infrastructure" || exit 1

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: docker-compose.yml not found"
    exit 1
fi

echo "Checking service status..."
echo ""

# Get service status
services=("postgres" "mongodb" "redis" "rabbitmq")
all_healthy=true

for service in "${services[@]}"; do
    echo -n "Checking $service... "

    # Check if container is running
    if ! docker-compose ps | grep -q "$service.*Up"; then
        echo "NOT RUNNING"
        all_healthy=false
        continue
    fi

    # Check health status
    health=$(docker inspect "seeme-$service" --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")

    if [ "$health" = "healthy" ]; then
        echo "HEALTHY ✓"
    elif [ "$health" = "no-health-check" ]; then
        echo "RUNNING (no health check)"
    else
        echo "UNHEALTHY ($health)"
        all_healthy=false
    fi
done

echo ""
echo "========================================="

if [ "$all_healthy" = true ]; then
    echo "All services are healthy!"
    echo ""
    echo "Service URLs:"
    echo "  PostgreSQL:  localhost:5432"
    echo "  MongoDB:     localhost:27017"
    echo "  Redis:       localhost:6379"
    echo "  RabbitMQ:    localhost:5672"
    echo "  RabbitMQ UI: http://localhost:15672"
    echo ""
    exit 0
else
    echo "Some services are not healthy."
    echo "Run 'docker-compose logs' to view logs."
    echo ""
    exit 1
fi
