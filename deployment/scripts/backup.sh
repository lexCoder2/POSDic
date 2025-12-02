#!/bin/bash
#
# Backup script - Create backup before deployment
#

set -e

BACKUP_DIR="/var/backups/posdic"
APP_DIR="/var/www/posdic"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "Creating backup..."
tar -czf "$BACKUP_DIR/posdic-backup-${TIMESTAMP}.tar.gz" \
    -C "$APP_DIR" \
    frontend backend

echo "Backup created: $BACKUP_DIR/posdic-backup-${TIMESTAMP}.tar.gz"

# Keep only last 5 backups
cd "$BACKUP_DIR"
ls -t posdic-backup-*.tar.gz | tail -n +6 | xargs -r rm

echo "Old backups cleaned up (keeping last 5)"
