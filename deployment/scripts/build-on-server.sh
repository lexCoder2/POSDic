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
    exit 1
fi

cd "$REPO_DIR"

# Install dependencies
echo -e "\n${YELLOW}[1/3] Installing dependencies...${NC}"
sudo -u $DEPLOY_USER npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build
echo -e "\n${YELLOW}[2/3] Building Angular application...${NC}"
sudo -u $DEPLOY_USER npm run build -- --configuration production
echo -e "${GREEN}✓ Build complete${NC}"

# Deploy
echo -e "\n${YELLOW}[3/3] Deploying to frontend directory...${NC}"
rm -rf "$FRONTEND_DIR"/*
cp -r "$REPO_DIR/dist/pos-system/browser"/* "$FRONTEND_DIR/"
chown -R $DEPLOY_USER:$DEPLOY_USER "$FRONTEND_DIR"
systemctl reload nginx
echo -e "${GREEN}✓ Deployed${NC}"

echo -e "\n${GREEN}Build and deployment complete!${NC}"
