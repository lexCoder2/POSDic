#!/bin/bash
#
# Quick update script - Git pull and rebuild
# Use this for quick updates after initial deployment
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DEPLOY_USER="www-data"
APP_DIR="/var/www/posdic"
REPO_DIR="$APP_DIR/repo"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo -e "${BLUE}Quick Update - POS System${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if repository exists
if [ ! -d "$REPO_DIR/.git" ]; then
    echo -e "${RED}Error: Repository not found. Run deploy.sh first${NC}"
    exit 1
fi

# Fix npm cache permissions
NPM_CACHE_DIR="/var/www/.npm"
if [ -d "$NPM_CACHE_DIR" ]; then
    chown -R $DEPLOY_USER:$DEPLOY_USER "$NPM_CACHE_DIR" 2>/dev/null || true
fi

# Configure Git safe directory
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

# Pull latest changes
echo -e "\n${YELLOW}[1/6] Pulling latest changes from Git...${NC}"
cd "$REPO_DIR"
# Ensure ownership is correct
chown -R $DEPLOY_USER:$DEPLOY_USER "$REPO_DIR"
BEFORE_HASH=$(sudo -u $DEPLOY_USER git rev-parse --short HEAD)
sudo -u $DEPLOY_USER git fetch origin
sudo -u $DEPLOY_USER git checkout $GIT_BRANCH
sudo -u $DEPLOY_USER git pull origin $GIT_BRANCH
AFTER_HASH=$(sudo -u $DEPLOY_USER git rev-parse --short HEAD)

if [ "$BEFORE_HASH" = "$AFTER_HASH" ]; then
    echo -e "${BLUE}No changes detected ($BEFORE_HASH)${NC}"
else
    echo -e "${GREEN}✓ Updated from $BEFORE_HASH to $AFTER_HASH${NC}"
fi

# Build frontend
echo -e "\n${YELLOW}[2/6] Building frontend...${NC}"
cd "$REPO_DIR"
# Check if package.json changed
if ! git diff --quiet $BEFORE_HASH $AFTER_HASH -- package.json package-lock.json 2>/dev/null; then
    echo "Dependencies changed, reinstalling..."
    sudo -u $DEPLOY_USER HOME=/var/www npm install --prefer-offline --no-audit 2>&1 | grep -v "npm warn tar" || true
else
    echo "Dependencies unchanged, skipping npm install"
fi
sudo -u $DEPLOY_USER HOME=/var/www npm run build -- --configuration production
echo -e "${GREEN}✓ Frontend built${NC}"

# Update frontend
echo -e "\n${YELLOW}[3/6] Deploying frontend...${NC}"
rm -rf "$FRONTEND_DIR"/*
cp -r "$REPO_DIR/dist/pos-system/browser"/* "$FRONTEND_DIR/"
chown -R $DEPLOY_USER:$DEPLOY_USER "$FRONTEND_DIR"
echo -e "${GREEN}✓ Frontend deployed${NC}"

# Update backend (preserve .env)
echo -e "\n${YELLOW}[4/6] Deploying backend...${NC}"
cp "$BACKEND_DIR/.env" "/tmp/.env.backup"
rsync -av --delete --exclude='node_modules' --exclude='.env' "$REPO_DIR/server/" "$BACKEND_DIR/"
cp "/tmp/.env.backup" "$BACKEND_DIR/.env"
rm -f "/tmp/.env.backup"

# Check if backend dependencies changed
cd "$BACKEND_DIR"
if ! git -C "$REPO_DIR" diff --quiet $BEFORE_HASH $AFTER_HASH -- server/package.json server/package-lock.json 2>/dev/null; then
    echo "Backend dependencies changed, reinstalling..."
    sudo -u $DEPLOY_USER HOME=/var/www npm install --production --prefer-offline --no-audit 2>&1 | grep -v "npm warn tar" || true
else
    echo "Backend dependencies unchanged, skipping npm install"
fi
chown -R $DEPLOY_USER:$DEPLOY_USER "$BACKEND_DIR"
echo -e "${GREEN}✓ Backend deployed${NC}"

# Restart services
echo -e "\n${YELLOW}[5/6] Restarting services...${NC}"
systemctl restart posdic-backend
systemctl reload nginx

if systemctl is-active --quiet posdic-backend; then
    echo -e "${GREEN}✓ Services restarted${NC}"
else
    echo -e "${RED}✗ Backend service failed to start${NC}"
    echo "Check logs: journalctl -u posdic-backend -n 50"
    exit 1
fi

# Show changes
echo -e "\n${YELLOW}[6/6] Deployment summary...${NC}"
if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
    echo -e "${BLUE}Changes deployed:${NC}"
    sudo -u $DEPLOY_USER git -C "$REPO_DIR" log --oneline $BEFORE_HASH..$AFTER_HASH | head -n 10
fi

echo -e "\n${GREEN}✓ Update complete!${NC}"
echo "Current commit: $AFTER_HASH"
