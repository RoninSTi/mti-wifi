#!/bin/bash

# dev.sh - Startup script for development environment
# This script starts MongoDB and OpenTelemetry Docker containers
# and runs database migrations before starting the Next.js development server

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}=== Next.js Starter Development Environment ===${NC}"
echo

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Stop existing containers first to ensure clean state
echo -e "${BOLD}Stopping any existing Docker containers...${NC}"
docker-compose down

# Start all Docker containers
echo -e "${BOLD}Starting Docker containers (MongoDB, OpenTelemetry Collector, Jaeger)...${NC}"
docker-compose up -d
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to start Docker containers.${NC}"
  exit 1
fi
echo -e "${GREEN}Docker containers started successfully.${NC}"
echo

# Wait for services to be ready
echo -e "${BOLD}Waiting for services to be ready...${NC}"
sleep 5 # Give services a moment to initialize
echo -e "${GREEN}Services should be ready now.${NC}"
echo

# Display OpenTelemetry information
echo -e "${BOLD}${PURPLE}=== OpenTelemetry Information ===${NC}"
echo -e "${BLUE}Jaeger UI:${NC} http://localhost:16686"
echo -e "${BLUE}OpenTelemetry Collector:${NC} http://localhost:4318"
echo

# Run database migrations
echo -e "${BOLD}Running database migrations...${NC}"
npm run db:migrate
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}Warning: Database migrations failed. You may need to check your database configuration.${NC}"
  echo -e "${YELLOW}Continuing with application startup anyway...${NC}"
else
  echo -e "${GREEN}Database migrations completed successfully.${NC}"
fi
echo

# Start Next.js development server
echo -e "${BOLD}Starting Next.js development server...${NC}"
echo -e "${BLUE}The application will be available at: ${BOLD}http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the development server${NC}"
echo

# Start Next.js development server
exec npm run dev

# Note: The script will not reach this point due to 'exec',
# but if it did, we'd want to clean up:
# docker-compose down