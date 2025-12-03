#!/bin/bash
#
# Deployment script for POS System on Ubuntu Server
# Clones/pulls from Git repository and builds on server
#

set -e  # Exit on error

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
LOG_DIR="/var/log/posdic"
NGINX_AVAILABLE="/etc/nginx/sites-available/posdic"
NGINX_ENABLED="/etc/nginx/sites-enabled/posdic"
GIT_REPO="https://github.com/lexCoder2/POSDic.git"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo -e "${BLUE}=========================================="
echo "POS System Deployment Script (Git-based)"
echo "==========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed${NC}"
    echo "Install with: sudo apt install git"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi

echo -e "${YELLOW}Repository: $GIT_REPO${NC}"
echo -e "${YELLOW}Branch: $GIT_BRANCH${NC}"

# Create directories
echo -e "\n${YELLOW}[1/9] Creating directories...${NC}"
mkdir -p "$FRONTEND_DIR" "$BACKEND_DIR" "$LOG_DIR" "$REPO_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR" "$LOG_DIR"

# Fix npm cache permissions
NPM_CACHE_DIR="/var/www/.npm"
if [ -d "$NPM_CACHE_DIR" ]; then
    echo "Fixing npm cache permissions..."
    chown -R $DEPLOY_USER:$DEPLOY_USER "$NPM_CACHE_DIR"
fi

# Configure Git safe directory
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

# Clone or pull repository
echo -e "\n${YELLOW}[2/9] Getting code from Git...${NC}"
if [ -d "$REPO_DIR/.git" ]; then
    echo "Repository exists, pulling latest changes..."
    cd "$REPO_DIR"
    # Ensure ownership is correct
    chown -R $DEPLOY_USER:$DEPLOY_USER "$REPO_DIR"
    sudo -u $DEPLOY_USER git fetch origin
    sudo -u $DEPLOY_USER git checkout $GIT_BRANCH
    sudo -u $DEPLOY_USER git pull origin $GIT_BRANCH
    echo -e "${GREEN}✓ Repository updated${NC}"
else
    echo "Cloning repository..."
    rm -rf "$REPO_DIR"
    sudo -u $DEPLOY_USER git clone -b $GIT_BRANCH "$GIT_REPO" "$REPO_DIR"
    echo -e "${GREEN}✓ Repository cloned${NC}"
fi

cd "$REPO_DIR"
COMMIT_HASH=$(sudo -u $DEPLOY_USER git rev-parse --short HEAD)
echo -e "${BLUE}Current commit: $COMMIT_HASH${NC}"

# Build frontend
echo -e "\n${YELLOW}[3/9] Building frontend...${NC}"
cd "$REPO_DIR"
# Install dependencies if node_modules doesn't exist or package.json changed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "Installing frontend dependencies..."
    # Set HOME for www-data to avoid cache permission issues
    sudo -u $DEPLOY_USER HOME=/var/www npm install --prefer-offline --no-audit 2>&1 | grep -v "npm warn tar" || true
fi
echo "Building Angular application..."
sudo -u $DEPLOY_USER HOME=/var/www npm run build -- --configuration production
echo -e "${GREEN}✓ Frontend built${NC}"

# Deploy frontend
echo -e "\n${YELLOW}[4/9] Deploying frontend...${NC}"
rm -rf "$FRONTEND_DIR"/*
cp -r "$REPO_DIR/dist/pos-system/browser"/* "$FRONTEND_DIR/"
chown -R $DEPLOY_USER:$DEPLOY_USER "$FRONTEND_DIR"
echo -e "${GREEN}✓ Frontend deployed${NC}"

# Deploy backend
echo -e "\n${YELLOW}[5/9] Deploying backend...${NC}"
# Backup .env if it exists
if [ -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env" "/tmp/.env.backup"
    echo -e "${GREEN}✓ Backed up .env file${NC}"
fi

# Copy backend files (excluding node_modules)
rsync -av --delete --exclude='node_modules' --exclude='.env' "$REPO_DIR/server/" "$BACKEND_DIR/"

# Restore .env
if [ -f "/tmp/.env.backup" ]; then
    cp "/tmp/.env.backup" "$BACKEND_DIR/.env"
    echo -e "${GREEN}✓ Restored .env file${NC}"
else
    echo -e "${YELLOW}! No .env file found - you'll need to create one${NC}"
    # Copy example if available
    if [ -f "$REPO_DIR/deployment/.env.production.example" ]; then
        cp "$REPO_DIR/deployment/.env.production.example" "$BACKEND_DIR/.env.example"
        echo -e "${YELLOW}! Example .env file copied to $BACKEND_DIR/.env.example${NC}"
    fi
fi

# Install backend dependencies
cd "$BACKEND_DIR"
echo "Installing backend dependencies..."
sudo -u $DEPLOY_USER HOME=/var/www npm install --production --prefer-offline --no-audit 2>&1 | grep -v "npm warn tar" || true
chown -R $DEPLOY_USER:$DEPLOY_USER "$BACKEND_DIR"
echo -e "${GREEN}✓ Backend deployed${NC}"

# Setup systemd service
echo -e "\n${YELLOW}[6/9] Setting up systemd service...${NC}"
if [ -f "$REPO_DIR/deployment/systemd/posdic-backend.service" ]; then
    cp "$REPO_DIR/deployment/systemd/posdic-backend.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable posdic-backend
    echo -e "${GREEN}✓ Systemd service configured${NC}"
else
    echo -e "${YELLOW}! Systemd service file not found - skipping${NC}"
fi

# Setup Nginx
echo -e "\n${YELLOW}[7/9] Configuring Nginx...${NC}"
if [ -f "$REPO_DIR/deployment/nginx/posdic.conf" ]; then
    cp "$REPO_DIR/deployment/nginx/posdic.conf" "$NGINX_AVAILABLE"
    
    # Create symbolic link if it doesn't exist
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    fi
    
    # Test nginx configuration
    nginx -t
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Nginx configured${NC}"
    else
        echo -e "${RED}✗ Nginx configuration error${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}! Nginx config not found - skipping${NC}"
fi

# Start services
echo -e "\n${YELLOW}[8/9] Starting services...${NC}"
systemctl restart posdic-backend
systemctl reload nginx

if systemctl is-active --quiet posdic-backend; then
    echo -e "${GREEN}✓ Backend service started${NC}"
else
    echo -e "${RED}✗ Backend service failed to start${NC}"
    echo "Check logs: journalctl -u posdic-backend -n 50"
    exit 1
fi

# Cleanup
echo -e "\n${YELLOW}[9/9] Cleaning up...${NC}"
rm -f /tmp/.env.backup
echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "\n${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Deployed commit: $COMMIT_HASH"
echo ""
echo "Services:"
echo "  Backend:  systemctl status posdic-backend"
echo "  Nginx:    systemctl status nginx"
echo ""
echo "Logs:"
echo "  Backend:  tail -f $LOG_DIR/backend.log"
echo "  Nginx:    tail -f /var/log/nginx/posdic-access.log"
echo ""
echo "Repository:"
echo "  Location: $REPO_DIR"
echo "  To update: sudo $0"
echo ""
echo "Next steps:"
echo "  1. Configure .env file in $BACKEND_DIR"
echo "  2. Update domain in /etc/nginx/sites-available/posdic"
echo "  3. Setup SSL certificate (certbot --nginx -d yourdomain.com)"
echo "  4. Visit https://yourdomain.com"
