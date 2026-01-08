#!/bin/bash
# SeeMe Development Environment Setup Script

set -e

echo "========================================="
echo "SeeMe Development Environment Setup"
echo "========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "ERROR: Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
echo "✓ Node.js $(node -v) found"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed. Please install Python 3.10+ from https://python.org/"
    exit 1
fi
echo "✓ Python $(python3 --version) found"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker Desktop from https://docker.com/"
    exit 1
fi
echo "✓ Docker $(docker --version) found"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose is not installed."
    exit 1
fi
echo "✓ Docker Compose found"

# Check Git
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed."
    exit 1
fi
echo "✓ Git $(git --version) found"

echo ""
echo "All prerequisites satisfied!"
echo ""

# Set up environment file
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "⚠️  IMPORTANT: Edit .env file and add your actual credentials"
else
    echo "✓ .env file already exists"
fi

# Make Git hooks executable (Unix/Linux/Mac)
if [ -f .git/hooks/pre-commit ]; then
    chmod +x .git/hooks/pre-commit
    echo "✓ Pre-commit hook made executable"
fi

if [ -f .git/hooks/pre-push ]; then
    chmod +x .git/hooks/pre-push
    echo "✓ Pre-push hook made executable"
fi

echo ""
echo "========================================="
echo "Starting Docker services..."
echo "========================================="

# Start Docker services
cd infrastructure
docker-compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
docker-compose ps

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual credentials"
echo "2. Verify services are running: cd infrastructure && docker-compose ps"
echo "3. View service logs: cd infrastructure && docker-compose logs -f"
echo "4. Access RabbitMQ management: http://localhost:15672 (guest/guest)"
echo ""
echo "To stop services: cd infrastructure && docker-compose down"
echo ""
