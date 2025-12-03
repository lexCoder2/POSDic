# Deployment Configuration Variables

# These variables can be customized before running deploy.sh

## Git Repository Configuration
# Default: https://github.com/lexCoder2/POSDic.git
# For private repos with SSH: git@github.com:lexCoder2/POSDic.git
export GIT_REPO="https://github.com/lexCoder2/POSDic.git"

## Git Branch
# Default: main
# Can be changed to: develop, staging, etc.
export GIT_BRANCH="main"

## Server Directories
# Where the application will be installed
export APP_DIR="/var/www/posdic"
export REPO_DIR="$APP_DIR/repo"
export FRONTEND_DIR="$APP_DIR/frontend"
export BACKEND_DIR="$APP_DIR/backend"
export LOG_DIR="/var/log/posdic"

## User Configuration
# User that will run the application
export DEPLOY_USER="www-data"

## Usage:
# Source this file before running deploy.sh to customize:
# source deployment/config.sh
# sudo -E ./deployment/scripts/deploy.sh
