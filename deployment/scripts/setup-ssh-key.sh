#!/bin/bash
#
# Setup SSH deploy key for private repository access
# Run this on the server to configure Git SSH authentication
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_USER="www-data"
SSH_DIR="/var/www/.ssh"

echo -e "${BLUE}Setup Deploy Key for Git Access${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Create SSH directory
echo -e "\n${YELLOW}Creating SSH directory...${NC}"
mkdir -p "$SSH_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Generate SSH key
if [ -f "$SSH_DIR/id_ed25519" ]; then
    echo -e "${YELLOW}SSH key already exists${NC}"
    read -p "Regenerate? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing key"
        cat "$SSH_DIR/id_ed25519.pub"
        exit 0
    fi
fi

echo -e "\n${YELLOW}Generating SSH key...${NC}"
sudo -u $DEPLOY_USER ssh-keygen -t ed25519 -f "$SSH_DIR/id_ed25519" -N "" -C "deploy@posdic"
echo -e "${GREEN}✓ SSH key generated${NC}"

# Configure SSH
echo -e "\n${YELLOW}Configuring SSH...${NC}"
cat > "$SSH_DIR/config" << EOF
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF
chown $DEPLOY_USER:$DEPLOY_USER "$SSH_DIR/config"
chmod 600 "$SSH_DIR/config"
echo -e "${GREEN}✓ SSH configured${NC}"

# Show public key
echo -e "\n${BLUE}========================================"
echo "Add this public key to your GitHub repository:"
echo "========================================${NC}"
echo ""
cat "$SSH_DIR/id_ed25519.pub"
echo ""
echo -e "${YELLOW}Instructions:${NC}"
echo "1. Copy the key above"
echo "2. Go to: https://github.com/lexCoder2/POSDic/settings/keys"
echo "3. Click 'Add deploy key'"
echo "4. Paste the key and give it a name (e.g., 'Production Server')"
echo "5. Check 'Allow write access' if you need it"
echo "6. Click 'Add key'"
echo ""
echo -e "${YELLOW}After adding the key, update GIT_REPO in deploy.sh to use SSH:${NC}"
echo "GIT_REPO=\"git@github.com:lexCoder2/POSDic.git\""
