# Quick Deployment Reference

Fast reference for deploying updates and common operations.

## Quick Commands

### Initial Deployment (Git-based)

```bash
# On server - First time setup
ssh user@server
sudo apt update && sudo apt install -y git nodejs npm nginx mongodb-org

# Clone and deploy
git clone https://github.com/lexCoder2/POSDic.git /tmp/posdic-deploy
cd /tmp/posdic-deploy
chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/deploy.sh

# For private repos, setup SSH key first:
# sudo ./deployment/scripts/setup-ssh-key.sh
```

### Update Existing Deployment

```bash
# SSH to server
ssh user@server

# Pull latest and rebuild
sudo /var/www/posdic/repo/deployment/scripts/update.sh

# Or from any location
cd /tmp
git clone https://github.com/lexCoder2/POSDic.git posdic-latest
cd posdic-latest
sudo ./deployment/scripts/update.sh
```

### Alternative: Local Build & Upload

```bash
# On local machine
./deployment/scripts/build.sh
scp posdic-*.tar.gz user@server:/tmp/

# Note: deploy.sh now uses Git, not archives
# Use the Git-based workflow instead
```

## Service Management

```bash
# Start/Stop/Restart
sudo systemctl start posdic-backend
sudo systemctl stop posdic-backend
sudo systemctl restart posdic-backend
sudo systemctl status posdic-backend

# Nginx
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo nginx -t  # Test config
```

## Logs

```bash
# Backend
tail -f /var/log/posdic/backend.log
journalctl -u posdic-backend -f

# Nginx
tail -f /var/log/nginx/posdic-access.log
tail -f /var/log/nginx/posdic-error.log
```

## Backup & Restore

```bash
# Backup
sudo ./deployment/scripts/backup.sh

# Rollback
sudo ./deployment/scripts/rollback.sh
```

## Common Issues

### Backend not starting

```bash
sudo journalctl -u posdic-backend -n 50
sudo systemctl status mongod
```

### 502 Bad Gateway

```bash
sudo systemctl status posdic-backend
sudo netstat -tlnp | grep 3000
```

### SSL Issues

```bash
sudo certbot renew
sudo nginx -t
```

## File Locations

- **Repository**: `/var/www/posdic/repo` (Git working directory)
- **Frontend**: `/var/www/posdic/frontend` (Built files served by Nginx)
- **Backend**: `/var/www/posdic/backend` (Production Node.js app)
- **Logs**: `/var/log/posdic/`
- **Nginx Config**: `/etc/nginx/sites-available/posdic`
- **Service**: `/etc/systemd/system/posdic-backend.service`
- **Backups**: `/var/backups/posdic/`

## Git Operations

```bash
# Check current commit
cd /var/www/posdic/repo && git log -1 --oneline

# Switch branch
cd /var/www/posdic/repo
sudo -u www-data git checkout develop
sudo ./deployment/scripts/update.sh

# View deployment history
cd /var/www/posdic/repo && git log --oneline -10
```
