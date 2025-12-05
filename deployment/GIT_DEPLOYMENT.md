# Git-Based Deployment - Quick Start

This deployment method uses Git to clone/pull directly on the server and builds there.

## 🚀 Initial Deployment

### On Server (Ubuntu 20.04+)

```bash
# 1. Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx mongodb-org

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# 2. Clone and deploy
cd /tmp
git clone https://github.com/lexCoder2/POSDic.git
cd POSDic
chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/deploy.sh

# 3. Configure backend
sudo nano /var/www/posdic/backend/.env
# Set: MONGODB_URI, JWT_SECRET (use: openssl rand -base64 32), CORS_ORIGIN

# 4. Configure Nginx
sudo nano /etc/nginx/sites-available/posdic
# Replace: your-domain.com with actual domain

# 5. Restart services
sudo systemctl restart posdic-backend
sudo nginx -t && sudo systemctl reload nginx

# 6. Setup SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔄 Updates

```bash
# Simple update (pulls latest from main branch)
ssh user@server
sudo /var/www/posdic/repo/deployment/scripts/update.sh
```

## 📁 What Gets Created

```
/var/www/posdic/
├── repo/          # Git repository (for pulling updates)
├── frontend/      # Built Angular app (served by Nginx)
├── backend/       # Production Node.js app
└── certs/         # SSL certificates (if using self-signed)

/var/log/posdic/
├── backend.log
└── backend-error.log
```

## 🔐 Private Repository Setup

If your repo is private:

```bash
# 1. Generate deploy key on server
cd /tmp/POSDic
sudo ./deployment/scripts/setup-ssh-key.sh

# 2. Add the displayed public key to GitHub:
#    Settings → Deploy keys → Add deploy key

# 3. Update deploy.sh to use SSH URL
sudo nano deployment/scripts/deploy.sh
# Change: GIT_REPO="git@github.com:lexCoder2/POSDic.git"

# 4. Run deployment
sudo ./deployment/scripts/deploy.sh
```

## 🎯 Key Differences from Archive Method

| Archive Method           | Git Method               |
| ------------------------ | ------------------------ |
| Build locally            | Build on server          |
| Upload via SCP           | Pull via Git             |
| Manual file management   | Git handles versioning   |
| Need local build machine | Server builds everything |
| Larger uploads           | Only pulls changes       |

## 📝 Common Commands

```bash
# Check deployed version
cd /var/www/posdic/repo && git log -1 --oneline

# Switch to specific version
cd /var/www/posdic/repo
sudo -u www-data git checkout v1.2.0
sudo ./deployment/scripts/update.sh

# Switch to different branch
cd /var/www/posdic/repo
sudo -u www-data git checkout develop
sudo ./deployment/scripts/update.sh

# View recent commits
cd /var/www/posdic/repo && git log --oneline -10

# Rebuild frontend only
sudo /var/www/posdic/repo/deployment/scripts/build-on-server.sh

# Check service status
sudo systemctl status posdic-backend

# View logs
tail -f /var/log/posdic/backend.log
journalctl -u posdic-backend -f
```

## 🐛 Troubleshooting

### Build fails with "Permission denied"

```bash
sudo chown -R www-data:www-data /var/www/posdic
```

### Git pull fails with authentication error

```bash
# For HTTPS (public repos)
cd /var/www/posdic/repo
sudo -u www-data git config --global credential.helper store

# For SSH (private repos)
sudo ./deployment/scripts/setup-ssh-key.sh
```

### Frontend changes not showing

```bash
# Clear browser cache (Ctrl+Shift+R)
# Or rebuild and force nginx reload
sudo /var/www/posdic/repo/deployment/scripts/build-on-server.sh
sudo systemctl reload nginx
```

### Backend won't start after update

```bash
# Check logs
sudo journalctl -u posdic-backend -n 50

# Verify .env file
cat /var/www/posdic/backend/.env

# Check MongoDB
sudo systemctl status mongod

# Reinstall dependencies
cd /var/www/posdic/backend
sudo npm install --production
sudo systemctl restart posdic-backend
```

## 🔒 Security Notes

- The deploy key (if used) has read-only access to your repository
- Backend runs as `www-data` user (limited permissions)
- Frontend is served as static files by Nginx
- Always use HTTPS in production
- Keep JWT_SECRET secure and random (min 32 chars)

## 📚 More Info

- Full guide: `deployment/DEPLOYMENT_GUIDE.md`
- Command reference: `deployment/QUICK_REFERENCE.md`
- Configuration: `deployment/README.md`
