#!/bin/bash
#
# Rollback script - Restore from backup
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
DEPLOY_USER="www-data"

echo -e "${BLUE}POS System Rollback${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Error: Backup directory not found at $BACKUP_DIR${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Available backups:${NC}"
BACKUPS=$(ls -t "$BACKUP_DIR"/posdic-backup-*.tar.gz 2>/dev/null)

if [ -z "$BACKUPS" ]; then
    echo -e "${RED}No backups found in $BACKUP_DIR${NC}"
    exit 1
fi

i=1
declare -a BACKUP_FILES
while IFS= read -r backup; do
    BACKUP_NAME=$(basename "$backup")
    BACKUP_SIZE=$(du -h "$backup" | cut -f1)
    BACKUP_DATE=$(echo "$BACKUP_NAME" | sed 's/posdic-backup-\([0-9]*\)_\([0-9]*\).*/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
    echo "  $i) $BACKUP_NAME ($BACKUP_SIZE) - $BACKUP_DATE"
    BACKUP_FILES[$i]="$backup"
    ((i++))
done <<< "$BACKUPS"

echo ""
read -p "Enter backup number (1-$((i-1))) or 'q' to quit: " SELECTION

if [ "$SELECTION" = "q" ] || [ "$SELECTION" = "Q" ]; then
    echo "Rollback cancelled."
    exit 0
fi

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -ge "$i" ]; then
    echo -e "${RED}Invalid selection${NC}"
    exit 1
fi

SELECTED_BACKUP="${BACKUP_FILES[$SELECTION]}"
SELECTED_NAME=$(basename "$SELECTED_BACKUP")

echo -e "\n${YELLOW}Selected: $SELECTED_NAME${NC}"
echo -e "${RED}WARNING: This will replace current application files!${NC}"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo -e "\n${YELLOW}[1/4] Backing up current .env file...${NC}"
if [ -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/backend/.env" "/tmp/.env.rollback.backup"
    echo -e "${GREEN} Current .env backed up${NC}"
fi

echo -e "\n${YELLOW}[2/4] Stopping services...${NC}"
systemctl stop posdic-backend 2>/dev/null || true
echo -e "${GREEN} Services stopped${NC}"

echo -e "\n${YELLOW}[3/4] Restoring from backup...${NC}"
tar -xzf "$SELECTED_BACKUP" -C "$APP_DIR"

if [ -f "/tmp/.env.rollback.backup" ]; then
    cp "/tmp/.env.rollback.backup" "$APP_DIR/backend/.env"
    rm -f "/tmp/.env.rollback.backup"
    echo -e "${GREEN} Restored current .env file${NC}"
fi

mkdir -p "$APP_DIR/backend/product_images"
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"

echo "Installing backend dependencies..."
cd "$APP_DIR/backend"
sudo -u $DEPLOY_USER HOME=/var/www npm install --omit=dev --prefer-offline --no-audit 2>&1 | tail -10 || {
    sudo -u $DEPLOY_USER HOME=/var/www npm install --omit=dev --no-audit
}
echo -e "${GREEN} Files restored${NC}"

echo -e "\n${YELLOW}[4/4] Starting services...${NC}"
systemctl start posdic-backend

sleep 2

if systemctl is-active --quiet posdic-backend; then
    echo -e "${GREEN} Backend service started${NC}"
else
    echo -e "${RED} Backend service failed to start${NC}"
    journalctl -u posdic-backend -n 20 --no-pager
    exit 1
fi

systemctl reload nginx
echo -e "${GREEN} Nginx reloaded${NC}"

echo -e "\n${GREEN}=========================================="
echo "Rollback Complete!"
echo "==========================================${NC}"
echo "Restored from: $SELECTED_NAME"
