#!/usr/bin/env bash
# Copy the SQLite database + receipts dir to a timestamped tar.gz.
# Usage: scripts/backup.sh [dest-dir]
set -euo pipefail

DATA_DIR="${DATA_DIR:-./data}"
DEST="${1:-./backups}"
mkdir -p "$DEST"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DEST/pm-backup-$TS.tar.gz"

tar -C "$(dirname "$DATA_DIR")" -czf "$OUT" "$(basename "$DATA_DIR")"
echo "wrote $OUT"
