#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/visual-location-raspi}"
SERVICE_NAME="visual-location-raspi"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

cd "${APP_DIR}"
git pull --ff-only || true
npm ci --omit=dev
npm run build
systemctl restart "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager
echo "Raspberry client updated."
