#!/bin/bash
# Quick local test on the Raspberry Pi (does not need PHP server)
# Usage: bash scripts/test_highlight.sh

set -euo pipefail

HOST="${1:-127.0.0.1}"
PORT="${2:-8080}"
KEY="${IO_API_KEY:-}"

BODY='{
  "action": "highlight",
  "duration_sec": 5,
  "device_name": "local-test",
  "location": {"box_id": 1, "box_code": "TEST", "slot_no": 1, "level_no": 1, "rack_name": "A"},
  "outputs": [
    {"pin": 1, "state": 1, "role": "green"},
    {"pin": 2, "state": 1, "role": "box"}
  ]
}'

CURL_ARGS=(-sS -X POST "http://${HOST}:${PORT}/api/io/highlight" -H "Content-Type: application/json" -d "${BODY}")
if [[ -n "${KEY}" ]]; then
  CURL_ARGS+=(-H "X-IO-Key: ${KEY}")
fi

echo "POST http://${HOST}:${PORT}/api/io/highlight"
curl "${CURL_ARGS[@]}"
echo ""
