#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/visual-location-raspi}"
SERVICE_NAME="visual-location-raspi"
NODE_VERSION="${NODE_VERSION:-20}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

apt-get update
apt-get install -y curl git

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi

mkdir -p "${APP_DIR}"
rsync -a --delete ./ "${APP_DIR}/"
cd "${APP_DIR}"
npm ci --omit=dev

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Edit ${APP_DIR}/.env with DEVICE_ID and MQTT_BROKER_URL"
fi

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Visual Location Raspberry MQTT Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
WatchdogSec=60

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager

echo "Raspberry client installed and started."
