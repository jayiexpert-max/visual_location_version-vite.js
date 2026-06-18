#!/usr/bin/env bash
# Sync self-hosted fonts and Font Awesome from PHP project into React frontend public/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/visual_inventory/public/plugins"
DEST="$ROOT/frontend/public/plugins"

if [[ ! -d "$SRC/google-fonts" || ! -d "$SRC/font-awesome" ]]; then
  echo "Missing source plugins at $SRC" >&2
  exit 1
fi

mkdir -p "$DEST"
rsync -a --delete "$SRC/google-fonts/" "$DEST/google-fonts/"
rsync -a --delete "$SRC/font-awesome/" "$DEST/font-awesome/"

echo "Synced offline assets to $DEST"
echo "  google-fonts: $(find "$DEST/google-fonts" -type f | wc -l | tr -d ' ') files"
echo "  font-awesome: $(find "$DEST/font-awesome" -type f | wc -l | tr -d ' ') files"
