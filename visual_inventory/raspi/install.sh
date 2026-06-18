#!/bin/bash
# Install Visual Inventory IO gateway on Raspberry Pi 3 / 4 / 5
# Run on the Pi: sudo bash install.sh

set -euo pipefail

INSTALL_DIR="/opt/visual-inventory-io"
ENV_DIR="/etc/visual-inventory-io"
ENV_FILE="${ENV_DIR}/env"
SERVICE_NAME="visual-inventory-io.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash install.sh"
  exit 1
fi

echo "==> Installing system packages..."
apt-get update -qq
apt-get install -y python3 python3-venv python3-pip

echo "==> Copying application to ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
rsync -a --delete \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  "${SCRIPT_DIR}/" "${INSTALL_DIR}/"

echo "==> Creating Python virtualenv..."
python3 -m venv "${INSTALL_DIR}/venv"
"${INSTALL_DIR}/venv/bin/pip" install --upgrade pip
"${INSTALL_DIR}/venv/bin/pip" install -r "${INSTALL_DIR}/requirements.txt"

echo "==> Installing config..."
mkdir -p "${ENV_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${INSTALL_DIR}/config.example.env" "${ENV_FILE}"
  echo "Created ${ENV_FILE} — edit MODBUS_HOST and IO_API_KEY before use."
else
  echo "Keeping existing ${ENV_FILE}"
fi
chmod 600 "${ENV_FILE}"

echo "==> Installing systemd service..."
cp "${INSTALL_DIR}/systemd/${SERVICE_NAME}" "/etc/systemd/system/${SERVICE_NAME}"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo ""
echo "Installation complete."
echo "  Config : ${ENV_FILE}"
echo "  Logs   : journalctl -u visual-inventory-io -f"
echo "  Health : curl http://127.0.0.1:8080/health"
echo ""
systemctl --no-pager status "${SERVICE_NAME}" || true
