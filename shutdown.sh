#!/bin/bash

# shutdown.sh - Clean shutdown script for development environment
# This script stops all development Docker containers

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}Shutting down development environment...${NC}"

# Stop all containers
echo -e "Stopping all Docker containers (MongoDB, OpenTelemetry, Jaeger)..."
docker-compose down
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to stop Docker containers.${NC}"
  exit 1
fi
echo -e "${GREEN}All containers stopped successfully.${NC}"

echo -e "${GREEN}Development environment shutdown complete.${NC}"