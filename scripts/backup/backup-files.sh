#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE_STAMP="$(date +%Y%m%d-%H%M%S)"

DEST_DIR="${BACKUP_ROOT}/files"
ARCHIVE="${DEST_DIR}/visual-location-files-${DATE_STAMP}.tar.gz"

mkdir -p "${DEST_DIR}"

tar -czf "${ARCHIVE}" \
  -C "${ROOT_DIR}" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='backups' \
  --exclude='.git' \
  backend/.env \
  frontend/.env \
  backend/docker/data \
  backend/docker/mosquitto \
  raspi-client/.env 2>/dev/null || true

if ! tar -tzf "${ARCHIVE}" >/dev/null 2>&1; then
  echo "File backup verification failed: ${ARCHIVE}" >&2
  exit 1
fi

find "${DEST_DIR}" -name "*.tar.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "File backup created: ${ARCHIVE}"
