#!/bin/bash
#
# Build script for POS System
# Builds both frontend (Angular) and backend (Node.js) for production
#

set -e  # Exit on error

echo "=========================================="
echo "Building POS System for Production"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Build Frontend
echo -e "\n${YELLOW}[1/3] Building Angular Frontend...${NC}"
npm install --production=false
npm run build -- --configuration production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
    echo "Output: dist/pos-system/browser/"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

# Build/Prepare Backend
echo -e "\n${YELLOW}[2/3] Preparing Backend...${NC}"
cd server
npm install --production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Backend setup failed${NC}"
    exit 1
fi
cd ..

# Create deployment archive
echo -e "\n${YELLOW}[3/3] Creating deployment archive...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="posdic-${TIMESTAMP}.tar.gz"

tar -czf "$ARCHIVE_NAME" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.angular' \
    dist/pos-system/browser \
    server

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment archive created: ${ARCHIVE_NAME}${NC}"
    echo "Size: $(du -h $ARCHIVE_NAME | cut -f1)"
else
    echo -e "${RED}✗ Archive creation failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}=========================================="
echo "Build Complete!"
echo "==========================================${NC}"
echo "Archive: $ARCHIVE_NAME"
echo ""
echo "Next steps:"
echo "  1. Upload $ARCHIVE_NAME to your server"
echo "  2. Run ./deploy.sh on the server"
