#!/bin/sh
set -eu

DB_PATH="${DB_PATH:-./data/club.db}"
BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"

if [ ! -f "$DB_PATH" ]; then
    echo "Database not found at $DB_PATH" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/club_${TIMESTAMP}.db"

sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

echo "Backup written to $BACKUP_FILE"

find "$BACKUP_DIR" -name 'club_*.db' -mtime "+$KEEP_DAYS" -delete
