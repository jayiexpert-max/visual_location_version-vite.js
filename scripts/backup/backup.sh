#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Visual Location daily backup ==="
"${SCRIPT_DIR}/backup-database.sh"
"${SCRIPT_DIR}/backup-files.sh"
echo "=== Backup complete ==="
