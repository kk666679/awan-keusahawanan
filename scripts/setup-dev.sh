#!/bin/bash

# Awan Keusahawanan Development Setup Script

set -e

echo "🚀 Setting up Awan Keusahawanan development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start infrastructure services
echo "🐳 Starting infrastructure services with Docker Compose..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️  Pushing database schema..."
npx prisma db push

# Check service health
echo "🏥 Checking service health..."
echo "Redis:"
docker-compose -f docker-compose.dev.yml exec redis redis-cli ping || echo "❌ Redis not ready"

echo "MinIO:"
curl -f http://localhost:9000/minio/health/live || echo "❌ MinIO not ready"

echo "Prometheus:"
curl -f http://localhost:9090/-/healthy || echo "❌ Prometheus not ready"

echo "Grafana:"
curl -f http://localhost:3001/api/health || echo "❌ Grafana not ready"

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "  - Application: http://localhost:3000"
echo "  - Grafana: http://localhost:3001 (admin:admin)"
echo "  - Prometheus: http://localhost:9090"
echo "  - MinIO Console: http://localhost:9001 (minioadmin:minioadmin)"
echo ""
echo "🚀 Start the development server:"
echo "  npm run dev"
echo ""
echo "📊 Monitor services:"
echo "  docker-compose -f docker-compose.dev.yml logs -f"