#!/bin/bash
#
# Deployment script for POS System on Ubuntu Server
# Run this on the server after uploading the build archive
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
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"
LOG_DIR="/var/log/posdic"
NGINX_AVAILABLE="/etc/nginx/sites-available/posdic"
NGINX_ENABLED="/etc/nginx/sites-enabled/posdic"

echo -e "${BLUE}=========================================="
echo "POS System Deployment Script"
echo "==========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Find the latest archive
ARCHIVE=$(ls -t posdic-*.tar.gz 2>/dev/null | head -n1)
if [ -z "$ARCHIVE" ]; then
    echo -e "${RED}Error: No deployment archive found (posdic-*.tar.gz)${NC}"
    exit 1
fi

echo -e "${YELLOW}Using archive: $ARCHIVE${NC}"

# Create directories
echo -e "\n${YELLOW}[1/8] Creating directories...${NC}"
mkdir -p "$FRONTEND_DIR" "$BACKEND_DIR" "$LOG_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR" "$LOG_DIR"

# Extract archive
echo -e "\n${YELLOW}[2/8] Extracting archive...${NC}"
tar -xzf "$ARCHIVE" -C /tmp/

# Deploy frontend
echo -e "\n${YELLOW}[3/8] Deploying frontend...${NC}"
rm -rf "$FRONTEND_DIR"/*
cp -r /tmp/dist/pos-system/browser/* "$FRONTEND_DIR/"
chown -R $DEPLOY_USER:$DEPLOY_USER "$FRONTEND_DIR"
echo -e "${GREEN}✓ Frontend deployed${NC}"

# Deploy backend
echo -e "\n${YELLOW}[4/8] Deploying backend...${NC}"
# Backup .env if it exists
if [ -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env" "/tmp/.env.backup"
    echo -e "${GREEN}✓ Backed up .env file${NC}"
fi

rm -rf "$BACKEND_DIR"/*
cp -r /tmp/server/* "$BACKEND_DIR/"

# Restore .env
if [ -f "/tmp/.env.backup" ]; then
    cp "/tmp/.env.backup" "$BACKEND_DIR/.env"
    echo -e "${GREEN}✓ Restored .env file${NC}"
else
    echo -e "${YELLOW}! No .env file found - you'll need to create one${NC}"
fi

# Install backend dependencies
cd "$BACKEND_DIR"
npm install --production
chown -R $DEPLOY_USER:$DEPLOY_USER "$BACKEND_DIR"
echo -e "${GREEN}✓ Backend deployed${NC}"

# Setup systemd service
echo -e "\n${YELLOW}[5/8] Setting up systemd service...${NC}"
if [ -f "../deployment/systemd/posdic-backend.service" ]; then
    cp "../deployment/systemd/posdic-backend.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable posdic-backend
    echo -e "${GREEN}✓ Systemd service configured${NC}"
else
    echo -e "${YELLOW}! Systemd service file not found - skipping${NC}"
fi

# Setup Nginx
echo -e "\n${YELLOW}[6/8] Configuring Nginx...${NC}"
if [ -f "../deployment/nginx/posdic.conf" ]; then
    cp "../deployment/nginx/posdic.conf" "$NGINX_AVAILABLE"
    
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
echo -e "\n${YELLOW}[7/8] Starting services...${NC}"
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
echo -e "\n${YELLOW}[8/8] Cleaning up...${NC}"
rm -rf /tmp/dist /tmp/server /tmp/.env.backup
echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "\n${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Services:"
echo "  Backend:  systemctl status posdic-backend"
echo "  Nginx:    systemctl status nginx"
echo ""
echo "Logs:"
echo "  Backend:  tail -f $LOG_DIR/backend.log"
echo "  Nginx:    tail -f /var/log/nginx/posdic-access.log"
echo ""
echo "Next steps:"
echo "  1. Configure .env file in $BACKEND_DIR"
echo "  2. Update domain in /etc/nginx/sites-available/posdic"
echo "  3. Setup SSL certificate (certbot --nginx -d yourdomain.com)"
echo "  4. Visit https://yourdomain.com"
