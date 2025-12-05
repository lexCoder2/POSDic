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
GIT_REPO="${GIT_REPO:-https://github.com/lexCoder2/POSDic.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

# Cleanup function for error handling
cleanup() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Deployment failed! Check errors above.${NC}"
        if [ -f "/tmp/.env.backup" ]; then
            cp "/tmp/.env.backup" "$BACKEND_DIR/.env" 2>/dev/null || true
        fi
    fi
    rm -f /tmp/.env.backup
}
trap cleanup EXIT

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

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Error: Nginx is not installed${NC}"
    echo "Install with: sudo apt install nginx"
    exit 1
fi

echo -e "${YELLOW}Repository: $GIT_REPO${NC}"
echo -e "${YELLOW}Branch: $GIT_BRANCH${NC}"

# Create directories
echo -e "\n${YELLOW}[1/9] Creating directories...${NC}"
mkdir -p "$FRONTEND_DIR" "$BACKEND_DIR" "$LOG_DIR" "$REPO_DIR"

mkdir -p /var/www
chown $DEPLOY_USER:$DEPLOY_USER /var/www

NPM_CACHE_DIR="/var/www/.npm"
mkdir -p "$NPM_CACHE_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$NPM_CACHE_DIR"

chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR" "$LOG_DIR"
echo -e "${GREEN} Directories created${NC}"

git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

# Clone or pull repository
echo -e "\n${YELLOW}[2/9] Getting code from Git...${NC}"
if [ -d "$REPO_DIR/.git" ]; then
    echo "Repository exists, pulling latest changes..."
    cd "$REPO_DIR"
    chown -R $DEPLOY_USER:$DEPLOY_USER "$REPO_DIR"
    sudo -u $DEPLOY_USER git fetch origin
    sudo -u $DEPLOY_USER git checkout "$GIT_BRANCH"
    sudo -u $DEPLOY_USER git reset --hard "origin/$GIT_BRANCH"
    echo -e "${GREEN} Repository updated${NC}"
else
    echo "Cloning repository..."
    rm -rf "$REPO_DIR"
    mkdir -p "$REPO_DIR"
    chown $DEPLOY_USER:$DEPLOY_USER "$REPO_DIR"
    sudo -u $DEPLOY_USER git clone -b "$GIT_BRANCH" "$GIT_REPO" "$REPO_DIR"
    echo -e "${GREEN} Repository cloned${NC}"
fi

cd "$REPO_DIR"
COMMIT_HASH=$(sudo -u $DEPLOY_USER git rev-parse --short HEAD)
echo -e "${BLUE}Current commit: $COMMIT_HASH${NC}"

# Build frontend
echo -e "\n${YELLOW}[3/9] Building frontend...${NC}"
cd "$REPO_DIR"

if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "Installing frontend dependencies..."
    sudo -u $DEPLOY_USER HOME=/var/www npm install --prefer-offline --no-audit 2>&1 | tail -20 || {
        echo -e "${YELLOW}Retrying npm install without cache...${NC}"
        sudo -u $DEPLOY_USER HOME=/var/www npm install --no-audit
    }
fi

echo "Building Angular application..."
sudo -u $DEPLOY_USER HOME=/var/www npm run build -- --configuration production

BUILD_OUTPUT="$REPO_DIR/dist/pos-system/browser"
if [ ! -d "$BUILD_OUTPUT" ]; then
    BUILD_OUTPUT="$REPO_DIR/dist/pos-system"
    if [ ! -d "$BUILD_OUTPUT" ]; then
        echo -e "${RED}Error: Build output not found. Expected at dist/pos-system/browser${NC}"
        exit 1
    fi
fi
echo -e "${GREEN} Frontend built${NC}"

# Deploy frontend
echo -e "\n${YELLOW}[4/9] Deploying frontend...${NC}"
rm -rf "${FRONTEND_DIR:?}"/*
cp -r "$BUILD_OUTPUT"/* "$FRONTEND_DIR/"
chown -R $DEPLOY_USER:$DEPLOY_USER "$FRONTEND_DIR"

if [ ! -f "$FRONTEND_DIR/index.html" ]; then
    echo -e "${RED}Error: index.html not found in frontend directory${NC}"
    exit 1
fi
echo -e "${GREEN} Frontend deployed${NC}"

# Deploy backend
echo -e "\n${YELLOW}[5/9] Deploying backend...${NC}"

if [ -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env" "/tmp/.env.backup"
    echo -e "${GREEN} Backed up .env file${NC}"
fi

rsync -av --delete --exclude='node_modules' --exclude='.env' --exclude='product_images' "$REPO_DIR/server/" "$BACKEND_DIR/"

mkdir -p "$BACKEND_DIR/product_images"

if [ -f "/tmp/.env.backup" ]; then
    cp "/tmp/.env.backup" "$BACKEND_DIR/.env"
    rm -f "/tmp/.env.backup"
    echo -e "${GREEN} Restored .env file${NC}"
else
    echo -e "${YELLOW}! No .env file found${NC}"
    echo -e "${YELLOW}! Creating default .env file...${NC}"
    cat > "$BACKEND_DIR/.env" << 'ENVEOF'
# POS System Backend Configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/posdic
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production
ENVEOF
    echo -e "${YELLOW}! Default .env created - PLEASE UPDATE IT${NC}"
fi

cd "$BACKEND_DIR"
echo "Installing backend dependencies..."
sudo -u $DEPLOY_USER HOME=/var/www npm install --omit=dev --prefer-offline --no-audit 2>&1 | tail -20 || {
    echo -e "${YELLOW}Retrying npm install without cache...${NC}"
    sudo -u $DEPLOY_USER HOME=/var/www npm install --omit=dev --no-audit
}
chown -R $DEPLOY_USER:$DEPLOY_USER "$BACKEND_DIR"
echo -e "${GREEN} Backend deployed${NC}"

# Setup systemd service
echo -e "\n${YELLOW}[6/9] Setting up systemd service...${NC}"
if [ -f "$REPO_DIR/deployment/systemd/posdic-backend.service" ]; then
    cp "$REPO_DIR/deployment/systemd/posdic-backend.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable posdic-backend
    echo -e "${GREEN} Systemd service configured${NC}"
else
    echo -e "${YELLOW}! Systemd service file not found - skipping${NC}"
fi

if [ -f "$REPO_DIR/deployment/systemd/posdic-auto-close.service" ]; then
    cp "$REPO_DIR/deployment/systemd/posdic-auto-close.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable posdic-auto-close
    echo -e "${GREEN} Auto-close service configured${NC}"
fi

# Setup Nginx
echo -e "\n${YELLOW}[7/9] Configuring Nginx...${NC}"

NGINX_SOURCE=""
if [ -f "$REPO_DIR/deployment/nginx/posdic-local.conf" ]; then
    NGINX_SOURCE="$REPO_DIR/deployment/nginx/posdic-local.conf"
    echo "Using local nginx configuration"
elif [ -f "$REPO_DIR/deployment/nginx/posdic.conf" ]; then
    NGINX_SOURCE="$REPO_DIR/deployment/nginx/posdic.conf"
    echo "Using production nginx configuration"
fi

if [ -n "$NGINX_SOURCE" ]; then
    cp "$NGINX_SOURCE" "$NGINX_AVAILABLE"
    
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
        rm -f "/etc/nginx/sites-enabled/default"
    fi
    
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    fi
    
    if nginx -t 2>&1; then
        echo -e "${GREEN} Nginx configured${NC}"
    else
        echo -e "${RED} Nginx configuration error${NC}"
        nginx -t
        exit 1
    fi
else
    echo -e "${YELLOW}! Nginx config not found - skipping${NC}"
fi

# Setup SSL certificates
echo -e "\n${YELLOW}[8/9] Setting up SSL certificates...${NC}"
CERTS_DIR="$APP_DIR/certs"
mkdir -p "$CERTS_DIR"

if [ ! -f "$CERTS_DIR/server.crt" ] || [ ! -f "$CERTS_DIR/server.key" ]; then
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERTS_DIR/server.key" \
        -out "$CERTS_DIR/server.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=server.local" \
        2>/dev/null
    chown -R $DEPLOY_USER:$DEPLOY_USER "$CERTS_DIR"
    chmod 600 "$CERTS_DIR/server.key"
    echo -e "${GREEN} Self-signed SSL certificate generated${NC}"
else
    echo -e "${GREEN} SSL certificates already exist${NC}"
fi

# Start services
echo -e "\n${YELLOW}[9/9] Starting services...${NC}"

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found at $BACKEND_DIR/.env${NC}"
    exit 1
fi

systemctl restart posdic-backend || {
    echo -e "${RED} Backend service failed to start${NC}"
    journalctl -u posdic-backend -n 20 --no-pager
    exit 1
}

sleep 2

if systemctl is-active --quiet posdic-backend; then
    echo -e "${GREEN} Backend service started${NC}"
else
    echo -e "${RED} Backend service failed to start${NC}"
    journalctl -u posdic-backend -n 20 --no-pager
    exit 1
fi

systemctl reload nginx || systemctl restart nginx
echo -e "${GREEN} Nginx reloaded${NC}"

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
echo "  Backend:  journalctl -u posdic-backend -f"
echo "  Nginx:    tail -f /var/log/nginx/posdic-error.log"
echo ""
echo "Next steps:"
echo "  1. Verify .env file in $BACKEND_DIR"
echo "  2. Update server_name in $NGINX_AVAILABLE if needed"
echo "  3. For production SSL: certbot --nginx -d yourdomain.com"
echo "  4. Visit https://server.local or https://your-server-ip"
