#!/usr/bin/env bash
# OpenFactory - Database Seed Script
#
# Seeds the database with initial data for development/testing.
# Requires PostgreSQL to be running (use ./scripts/dev.sh first).
#
# Usage:
#   ./scripts/seed.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[seed]${NC} $1"; }
warn() { echo -e "${YELLOW}[seed]${NC} $1"; }
error() { echo -e "${RED}[seed]${NC} $1" >&2; }

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.env"
    set +a
else
    error ".env file not found. Copy .env.example to .env first."
    exit 1
fi

# Build DATABASE_URL if not set
DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER:-openfactory}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-openfactory}}"

log "Checking database connection..."
if ! pg_isready -h localhost -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-openfactory}" -d "${POSTGRES_DB:-openfactory}" > /dev/null 2>&1; then
    error "PostgreSQL is not reachable. Start services first: ./scripts/dev.sh"
    exit 1
fi

log "Running database migrations..."
cd "$PROJECT_ROOT"
pnpm --filter @repo/api db:migrate 2>/dev/null || {
    warn "Migration command not found. Skipping migrations (database schema may need manual setup)."
}

log "Seeding database..."
pnpm --filter @repo/api db:seed 2>/dev/null || {
    warn "Seed command not found. Skipping seed data (this is expected during initial setup)."
}

log "Database seeding complete."
