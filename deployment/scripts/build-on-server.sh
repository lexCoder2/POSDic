#!/bin/bash
#
# Server-side build script
# Builds frontend on the server without full deployment
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DEPLOY_USER="www-data"
APP_DIR="/var/www/posdic"
REPO_DIR="$APP_DIR/repo"
FRONTEND_DIR="$APP_DIR/frontend"

echo -e "${YELLOW}Building Frontend on Server${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if repository exists
if [ ! -d "$REPO_DIR" ]; then
    echo -e "${RED}Error: Repository not found at $REPO_DIR${NC}"
    echo "Run deploy.sh first to clone the repository."
    exit 1
fi

# Fix npm cache permissions
NPM_CACHE_DIR="/var/www/.npm"
if [ -d "$NPM_CACHE_DIR" ]; then
    chown -R $DEPLOY_USER:$DEPLOY_USER "$NPM_CACHE_DIR" 2>/dev/null || true
fi

# Configure Git safe directory
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

cd "$REPO_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$REPO_DIR"

# Install dependencies
echo -e "\n${YELLOW}[1/3] Installing dependencies...${NC}"
sudo -u $DEPLOY_USER HOME=/var/www npm install --prefer-offline --no-audit 2>&1 | tail -20 || {
    echo -e "${YELLOW}Retrying npm install without cache...${NC}"
    sudo -u $DEPLOY_USER HOME=/var/www npm install --no-audit
}
echo -e "${GREEN} Dependencies installed${NC}"

# Build
echo -e "\n${YELLOW}[2/3] Building Angular application...${NC}"
sudo -u $DEPLOY_USER HOME=/var/www npm run build -- --configuration production

BUILD_OUTPUT="$REPO_DIR/dist/retail-pos/browser"
if [ ! -d "$BUILD_OUTPUT" ]; then
    BUILD_OUTPUT="$REPO_DIR/dist/retail-pos"
    if [ ! -d "$BUILD_OUTPUT" ]; then
        echo -e "${RED}Error: Build output not found${NC}"
        exit 1
    fi
fi
echo -e "${GREEN} Build complete${NC}"

# Deploy
echo -e "\n${YELLOW}[3/3] Deploying to frontend directory...${NC}"
rm -rf "${FRONTEND_DIR:?}"/*
cp -r "$BUILD_OUTPUT"/* "$FRONTEND_DIR/"
chown -R $DEPLOY_USER:$DEPLOY_USER "$FRONTEND_DIR"

if [ ! -f "$FRONTEND_DIR/index.html" ]; then
    echo -e "${RED}Error: index.html not found after deployment${NC}"
    exit 1
fi

systemctl reload nginx
echo -e "${GREEN} Deployed${NC}"

echo -e "\n${GREEN}Build and deployment complete!${NC}"
