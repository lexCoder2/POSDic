#!/bin/bash
#
# Rollback script - Restore from backup
#

set -e

BACKUP_DIR="/var/backups/posdic"
APP_DIR="/var/www/posdic"

echo "Available backups:"
ls -lh "$BACKUP_DIR"

read -p "Enter backup timestamp to restore (YYYYMMDD_HHMMSS): " TIMESTAMP

if [ ! -f "$BACKUP_DIR/posdic-backup-${TIMESTAMP}.tar.gz" ]; then
    echo "Backup not found!"
    exit 1
fi

echo "Restoring from backup..."
systemctl stop posdic-backend
tar -xzf "$BACKUP_DIR/posdic-backup-${TIMESTAMP}.tar.gz" -C "$APP_DIR"
systemctl start posdic-backend
systemctl reload nginx

echo "Rollback complete!"
