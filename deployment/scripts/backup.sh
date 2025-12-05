#!/bin/bash
#
# Backup script - Create backup before deployment
# Backs up frontend, backend, and optionally MongoDB
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="/var/backups/posdic"
APP_DIR="/var/www/posdic"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_MONGO="${BACKUP_MONGO:-false}"

echo -e "${BLUE}POS System Backup${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# Verify source directories exist
if [ ! -d "$APP_DIR/frontend" ] && [ ! -d "$APP_DIR/backend" ]; then
    echo -e "${RED}Error: No application directories found at $APP_DIR${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[1/3] Creating application backup...${NC}"

BACKUP_ITEMS=""
if [ -d "$APP_DIR/frontend" ]; then
    BACKUP_ITEMS="$BACKUP_ITEMS frontend"
fi
if [ -d "$APP_DIR/backend" ]; then
    BACKUP_ITEMS="$BACKUP_ITEMS backend"
fi
if [ -d "$APP_DIR/certs" ]; then
    BACKUP_ITEMS="$BACKUP_ITEMS certs"
fi

tar -czf "$BACKUP_DIR/posdic-backup-${TIMESTAMP}.tar.gz" \
    -C "$APP_DIR" \
    --exclude='node_modules' \
    --exclude='*.log' \
    $BACKUP_ITEMS

BACKUP_SIZE=$(du -h "$BACKUP_DIR/posdic-backup-${TIMESTAMP}.tar.gz" | cut -f1)
echo -e "${GREEN} Backup created: posdic-backup-${TIMESTAMP}.tar.gz ($BACKUP_SIZE)${NC}"

# MongoDB backup (optional)
if [ "$BACKUP_MONGO" = "true" ] && command -v mongodump &> /dev/null; then
    echo -e "\n${YELLOW}[2/3] Creating MongoDB backup...${NC}"
    
    MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb-${TIMESTAMP}"
    mkdir -p "$MONGO_BACKUP_DIR"
    
    if [ -f "$APP_DIR/backend/.env" ]; then
        MONGODB_URI=$(grep -E "^MONGODB_URI=" "$APP_DIR/backend/.env" | cut -d'=' -f2-)
    fi
    
    if [ -n "$MONGODB_URI" ]; then
        mongodump --uri="$MONGODB_URI" --out="$MONGO_BACKUP_DIR" 2>/dev/null || true
    else
        mongodump --db=posdic --out="$MONGO_BACKUP_DIR" 2>/dev/null || true
    fi
    
    if [ -d "$MONGO_BACKUP_DIR" ] && [ "$(ls -A $MONGO_BACKUP_DIR 2>/dev/null)" ]; then
        tar -czf "$BACKUP_DIR/mongodb-${TIMESTAMP}.tar.gz" -C "$BACKUP_DIR" "mongodb-${TIMESTAMP}"
        rm -rf "$MONGO_BACKUP_DIR"
        MONGO_SIZE=$(du -h "$BACKUP_DIR/mongodb-${TIMESTAMP}.tar.gz" | cut -f1)
        echo -e "${GREEN} MongoDB backup: mongodb-${TIMESTAMP}.tar.gz ($MONGO_SIZE)${NC}"
    fi
else
    echo -e "\n${YELLOW}[2/3] Skipping MongoDB backup${NC}"
fi

# Cleanup old backups
echo -e "\n${YELLOW}[3/3] Cleaning up old backups...${NC}"
cd "$BACKUP_DIR"

APP_BACKUPS=$(ls -t posdic-backup-*.tar.gz 2>/dev/null | tail -n +6)
if [ -n "$APP_BACKUPS" ]; then
    echo "$APP_BACKUPS" | xargs -r rm -f
fi

MONGO_BACKUPS=$(ls -t mongodb-*.tar.gz 2>/dev/null | tail -n +6)
if [ -n "$MONGO_BACKUPS" ]; then
    echo "$MONGO_BACKUPS" | xargs -r rm -f
fi

echo -e "${GREEN} Old backups cleaned (keeping last 5)${NC}"

echo -e "\n${BLUE}Available backups:${NC}"
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backups found"

echo -e "\n${GREEN}Backup complete!${NC}"
echo "For MongoDB backup: sudo BACKUP_MONGO=true $0"
