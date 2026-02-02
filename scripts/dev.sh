#!/usr/bin/env bash
# OpenFactory - Development Environment Launcher
#
# Starts all services for local development using Docker Compose.
# Infrastructure services (PostgreSQL, Redis) run in Docker.
# Application services can run in Docker or natively (see --native flag).
#
# Usage:
#   ./scripts/dev.sh           # Start all services in Docker
#   ./scripts/dev.sh --native  # Start only infra in Docker, run apps natively
#   ./scripts/dev.sh --down    # Stop all services

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev]${NC} $1"; }
error() { echo -e "${RED}[dev]${NC} $1" >&2; }

# Check for .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    error ".env file not found. Copy .env.example to .env and fill in required values:"
    error "  cp .env.example .env"
    exit 1
fi

case "${1:-}" in
    --down)
        log "Stopping all services..."
        docker compose -f "$COMPOSE_FILE" down
        log "All services stopped."
        exit 0
        ;;

    --native)
        log "Starting infrastructure services (PostgreSQL, Redis)..."
        docker compose -f "$COMPOSE_FILE" up -d postgres redis
        log "Waiting for services to be healthy..."
        docker compose -f "$COMPOSE_FILE" wait postgres redis 2>/dev/null || sleep 5

        log "Infrastructure is ready. Start application services natively:"
        echo ""
        echo "  Terminal 1:  pnpm --filter @repo/api dev"
        echo "  Terminal 2:  pnpm --filter @repo/web dev"
        echo ""
        echo "  PostgreSQL:  localhost:${POSTGRES_PORT:-5432}"
        echo "  Redis:       localhost:${REDIS_PORT:-6379}"
        exit 0
        ;;

    --help|-h)
        echo "Usage: ./scripts/dev.sh [option]"
        echo ""
        echo "Options:"
        echo "  (none)     Start all services in Docker"
        echo "  --native   Start only infra (Postgres, Redis) in Docker"
        echo "  --down     Stop all services"
        echo "  --help     Show this help message"
        exit 0
        ;;

    "")
        log "Starting all OpenFactory services..."
        docker compose -f "$COMPOSE_FILE" up --build
        ;;

    *)
        error "Unknown option: $1"
        error "Run './scripts/dev.sh --help' for usage."
        exit 1
        ;;
esac
