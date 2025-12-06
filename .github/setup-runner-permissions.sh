#!/bin/bash
#
# Setup script for GitHub Actions self-hosted runner permissions
# Run this on your Ubuntu server after installing the runner
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "GitHub Actions Runner Permission Setup"
echo "==========================================${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    echo "Usage: sudo ./.github/setup-runner-permissions.sh"
    exit 1
fi

# Detect runner user
echo -e "${YELLOW}Detecting GitHub Actions runner user...${NC}"

RUNNER_USER=""

# Method 1: Check for running runner service
if systemctl list-units --type=service | grep -q "actions.runner"; then
    SERVICE_NAME=$(systemctl list-units --type=service | grep "actions.runner" | awk '{print $1}' | head -n 1)
    RUNNER_USER=$(systemctl show -p User "$SERVICE_NAME" | cut -d= -f2)
    echo -e "${GREEN}✓ Found runner service: $SERVICE_NAME${NC}"
fi

# Method 2: Ask user to confirm
if [ -z "$RUNNER_USER" ] || [ "$RUNNER_USER" = "root" ]; then
    echo -e "${YELLOW}Could not auto-detect runner user.${NC}"
    echo -e "Please enter the username that runs the GitHub Actions runner:"
    echo -e "(Usually the user you used to run ${BLUE}./config.sh${NC})"
    read -p "Runner username: " RUNNER_USER
fi

if [ -z "$RUNNER_USER" ]; then
    echo -e "${RED}Error: Runner user not specified${NC}"
    exit 1
fi

# Verify user exists
if ! id "$RUNNER_USER" >/dev/null 2>&1; then
    echo -e "${RED}Error: User '$RUNNER_USER' does not exist${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Runner user: $RUNNER_USER${NC}\n"

# Create sudoers file for runner
SUDOERS_FILE="/etc/sudoers.d/github-actions-runner"

echo -e "${YELLOW}Creating sudoers configuration...${NC}"

cat > "$SUDOERS_FILE" << EOF
# GitHub Actions Runner - Passwordless sudo for deployment
# Created: $(date)
# User: $RUNNER_USER

# Allow deployment script execution
$RUNNER_USER ALL=(ALL) NOPASSWD: /var/www/posdic/repo/deployment/scripts/update.sh
$RUNNER_USER ALL=(ALL) NOPASSWD: /var/www/posdic/repo/deployment/scripts/deploy.sh
$RUNNER_USER ALL=(ALL) NOPASSWD: /var/www/posdic/repo/deployment/scripts/backup.sh

# Allow service management
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart posdic-backend
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload posdic-backend
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl start posdic-backend
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop posdic-backend
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl status posdic-backend
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl status nginx

# Allow git operations in repo directory
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/git -C /var/www/posdic/repo *
EOF

# Set correct permissions
chmod 0440 "$SUDOERS_FILE"

# Validate sudoers file
if visudo -c -f "$SUDOERS_FILE" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Sudoers file created successfully${NC}"
else
    echo -e "${RED}✗ Sudoers file validation failed${NC}"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

# Test sudo access
echo -e "\n${YELLOW}Testing sudo access for user '$RUNNER_USER'...${NC}"

if sudo -u "$RUNNER_USER" sudo -n systemctl status nginx >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Passwordless sudo is working correctly${NC}"
else
    echo -e "${RED}✗ Passwordless sudo test failed${NC}"
    echo -e "${YELLOW}This might be normal if nginx is not running${NC}"
fi

# Ensure runner user has access to deployment directory
echo -e "\n${YELLOW}Setting up directory permissions...${NC}"

if [ -d "/var/www/posdic" ]; then
    # Add runner user to www-data group
    usermod -a -G www-data "$RUNNER_USER" 2>/dev/null || true
    echo -e "${GREEN}✓ Added $RUNNER_USER to www-data group${NC}"

    # Ensure proper ownership
    chown -R www-data:www-data /var/www/posdic
    chmod -R g+rw /var/www/posdic
    echo -e "${GREEN}✓ Directory permissions updated${NC}"
else
    echo -e "${YELLOW}! Directory /var/www/posdic does not exist yet${NC}"
    echo -e "${YELLOW}! Run deploy.sh first to create it${NC}"
fi

# Show summary
echo -e "\n${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}\n"

echo "Runner user: $RUNNER_USER"
echo "Sudoers file: $SUDOERS_FILE"
echo ""
echo "The runner can now execute:"
echo "  • Deployment scripts (update.sh, deploy.sh, backup.sh)"
echo "  • Service management (systemctl for posdic-backend and nginx)"
echo "  • Git operations in /var/www/posdic/repo"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "  • User '$RUNNER_USER' has been added to 'www-data' group"
echo "  • The user may need to log out and back in for group changes to take effect"
echo "  • OR restart the runner service:"
echo -e "    ${BLUE}sudo systemctl restart actions.runner.*${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart the runner service to apply group membership"
echo "  2. Push a commit to trigger the deployment"
echo "  3. Check the Actions tab in GitHub to verify deployment"
echo ""
