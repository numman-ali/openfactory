#!/usr/bin/env bash
# OpenFactory - Clean Reset Script
#
# Stops all services, removes volumes (data), and optionally restarts fresh.
# WARNING: This destroys all data in PostgreSQL and Redis.
#
# Usage:
#   ./scripts/reset.sh           # Reset and restart
#   ./scripts/reset.sh --no-start # Reset only, don't restart

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[reset]${NC} $1"; }
warn() { echo -e "${YELLOW}[reset]${NC} $1"; }
error() { echo -e "${RED}[reset]${NC} $1" >&2; }

warn "This will destroy ALL data (PostgreSQL, Redis). This cannot be undone."
read -rp "Are you sure? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    log "Reset cancelled."
    exit 0
fi

log "Stopping all services..."
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true

log "Removing build cache..."
docker compose -f "$COMPOSE_FILE" rm -f 2>/dev/null || true

log "All data has been removed."

if [[ "${1:-}" != "--no-start" ]]; then
    log "Rebuilding and starting fresh..."
    "$SCRIPT_DIR/dev.sh"
else
    log "Reset complete. Run './scripts/dev.sh' to start fresh."
fi
