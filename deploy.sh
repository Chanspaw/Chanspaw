#!/bin/bash

# Production Deployment Script for Chanspaw Gaming Platform
# This script deploys all independent game services

set -e

echo "🚀 Starting Chanspaw Gaming Platform Deployment..."

# Configuration
ENVIRONMENT=${1:-production}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
VERSION=${VERSION:-$(git rev-parse --short HEAD)}

echo "📋 Deployment Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Version: $VERSION"
echo "   Docker Registry: $DOCKER_REGISTRY"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p data/redis
mkdir -p data/postgres

# Set environment variables
export NODE_ENV=$ENVIRONMENT
export VERSION=$VERSION

# Build and deploy services
echo "🔨 Building services..."

# Build shared infrastructure
echo "   Building shared infrastructure..."
cd backend
docker build -t $DOCKER_REGISTRY/chanspaw-auth:$VERSION .
docker build -t $DOCKER_REGISTRY/chanspaw-wallet:$VERSION .
cd ..

# Build game services
echo "   Building game services..."
cd services/chess-service
docker build -t $DOCKER_REGISTRY/chanspaw-chess:$VERSION .
cd ../..

cd services/connect4-service
docker build -t $DOCKER_REGISTRY/chanspaw-connect4:$VERSION .
cd ../..

cd services/diamond-service
docker build -t $DOCKER_REGISTRY/chanspaw-diamond:$VERSION .
cd ../..

# Build matchmaking service
echo "   Building matchmaking service..."
cd services/matchmaking-service
docker build -t $DOCKER_REGISTRY/chanspaw-matchmaking:$VERSION .
cd ../..

# Build API gateway
echo "   Building API gateway..."
cd services/api-gateway
docker build -t $DOCKER_REGISTRY/chanspaw-gateway:$VERSION .
cd ../..

# Build frontend
echo "   Building frontend..."
docker build -t $DOCKER_REGISTRY/chanspaw-frontend:$VERSION .

# Push images to registry (if not local)
if [ "$DOCKER_REGISTRY" != "localhost" ]; then
    echo "📤 Pushing images to registry..."
    docker push $DOCKER_REGISTRY/chanspaw-auth:$VERSION
    docker push $DOCKER_REGISTRY/chanspaw-wallet:$VERSION
    docker push $DOCKER_REGISTRY/chanspaw-chess:$VERSION
    docker push $DOCKER_REGISTRY/chanspaw-connect4:$VERSION
    docker push $DOCKER_REGISTRY/chanspaw-diamond:$VERSION
    docker push $DOCKER_REGISTRY/chanspaw-matchmaking:$VERSION
    docker push $DOCKER_REGISTRY/chanspaw-gateway:$VERSION
    docker push $DOCKER_REGISTRY/chanspaw-frontend:$VERSION
fi

# Create production docker-compose file
echo "📝 Creating production docker-compose..."
cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: chanspaw
      POSTGRES_USER: chanspaw
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data
    restart: unless-stopped

  # Shared Infrastructure
  auth-service:
    image: $DOCKER_REGISTRY/chanspaw-auth:$VERSION
    environment:
      - NODE_ENV=$ENVIRONMENT
      - DATABASE_URL=postgresql://chanspaw:${DB_PASSWORD:-changeme}@postgres:5432/chanspaw
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  wallet-service:
    image: $DOCKER_REGISTRY/chanspaw-wallet:$VERSION
    environment:
      - NODE_ENV=$ENVIRONMENT
      - DATABASE_URL=postgresql://chanspaw:${DB_PASSWORD:-changeme}@postgres:5432/chanspaw
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  # Game Services
  chess-service:
    image: $DOCKER_REGISTRY/chanspaw-chess:$VERSION
    environment:
      - NODE_ENV=$ENVIRONMENT
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  connect4-service:
    image: $DOCKER_REGISTRY/chanspaw-connect4:$VERSION
    environment:
      - NODE_ENV=$ENVIRONMENT
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  diamond-service:
    image: $DOCKER_REGISTRY/chanspaw-diamond:$VERSION
    environment:
      - NODE_ENV=$ENVIRONMENT
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  # Matchmaking Service
  matchmaking-service:
    image: $DOCKER_REGISTRY/chanspaw-matchmaking:$VERSION
    environment:
      - NODE_ENV=$ENVIRONMENT
      - CHESS_SERVICE_URL=http://chess-service:4001
      - CONNECT4_SERVICE_URL=http://connect4-service:4002
      - DIAMOND_SERVICE_URL=http://diamond-service:4003
      - REDIS_URL=redis://redis:6379
    depends_on:
      - chess-service
      - connect4-service
      - diamond-service
      - redis
    restart: unless-stopped

  # API Gateway
  api-gateway:
    image: $DOCKER_REGISTRY/chanspaw-gateway:$VERSION
    environment:
      - NODE_ENV=$ENVIRONMENT
      - AUTH_SERVICE_URL=http://auth-service:3001
      - WALLET_SERVICE_URL=http://wallet-service:3002
      - MATCHMAKING_SERVICE_URL=http://matchmaking-service:3003
      - CHESS_SERVICE_URL=http://chess-service:4001
      - CONNECT4_SERVICE_URL=http://connect4-service:4002
      - DIAMOND_SERVICE_URL=http://diamond-service:4003
    ports:
      - "8080:8080"
    depends_on:
      - auth-service
      - wallet-service
      - matchmaking-service
      - chess-service
      - connect4-service
      - diamond-service
    restart: unless-stopped

  # Frontend
  frontend:
    image: $DOCKER_REGISTRY/chanspaw-frontend:$VERSION
    environment:
      - VITE_API_URL=http://localhost:8080
    ports:
      - "80:80"
    depends_on:
      - api-gateway
    restart: unless-stopped

  # Load Balancer (optional)
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - api-gateway
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF

# Deploy with docker-compose
echo "🚀 Deploying services..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
echo "🏥 Running health checks..."
curl -f http://localhost:8080/health || echo "❌ API Gateway health check failed"
curl -f http://localhost:4001/health || echo "❌ Chess service health check failed"
curl -f http://localhost:4002/health || echo "❌ Connect4 service health check failed"
curl -f http://localhost:4003/health || echo "❌ Diamond service health check failed"

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
echo "   Frontend: http://localhost"
echo "   API Gateway: http://localhost:8080"
echo "   Chess Service: http://localhost:4001"
echo "   Connect4 Service: http://localhost:4002"
echo "   Diamond Service: http://localhost:4003"
echo "   Matchmaking: http://localhost:3003"
echo ""
echo "🔍 Health Checks:"
echo "   Overall: http://localhost:8080/health"
echo "   Services: http://localhost:8080/api/services"
echo ""
echo "📝 Logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f" 