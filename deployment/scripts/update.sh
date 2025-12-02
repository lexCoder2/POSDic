#!/bin/bash
#
# Quick update script - Updates only the code without full redeployment
# Use this for quick updates after initial deployment
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/posdic"
BACKEND_DIR="$APP_DIR/backend"

echo -e "${YELLOW}Quick Update - POS System${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Find archive
ARCHIVE=$(ls -t posdic-*.tar.gz 2>/dev/null | head -n1)
if [ -z "$ARCHIVE" ]; then
    echo -e "${RED}Error: No deployment archive found${NC}"
    exit 1
fi

echo "Using: $ARCHIVE"

# Extract
tar -xzf "$ARCHIVE" -C /tmp/

# Update frontend
echo -e "\n${YELLOW}Updating frontend...${NC}"
rm -rf "$APP_DIR/frontend"/*
cp -r /tmp/dist/pos-system/browser/* "$APP_DIR/frontend/"
chown -R www-data:www-data "$APP_DIR/frontend"

# Update backend (preserve .env)
echo -e "${YELLOW}Updating backend...${NC}"
cp "$BACKEND_DIR/.env" "/tmp/.env.backup"
rm -rf "$BACKEND_DIR"/*
cp -r /tmp/server/* "$BACKEND_DIR/"
cp "/tmp/.env.backup" "$BACKEND_DIR/.env"
cd "$BACKEND_DIR"
npm install --production
chown -R www-data:www-data "$BACKEND_DIR"

# Restart services
echo -e "${YELLOW}Restarting services...${NC}"
systemctl restart posdic-backend
systemctl reload nginx

# Cleanup
rm -rf /tmp/dist /tmp/server /tmp/.env.backup

echo -e "${GREEN}✓ Update complete!${NC}"
