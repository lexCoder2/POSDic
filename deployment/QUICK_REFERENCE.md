# Quick Deployment Reference

Fast reference for deploying updates and common operations.

## Quick Commands

### Build & Deploy (First Time)

```bash
# On local machine
./deployment/scripts/build.sh
scp posdic-*.tar.gz user@server:/tmp/
scp -r deployment user@server:/tmp/

# On server
ssh user@server
cd /tmp
chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/deploy.sh
```

### Update Existing Deployment

```bash
# Local: build
./deployment/scripts/build.sh

# Upload
scp posdic-*.tar.gz user@server:/tmp/

# Server: update
ssh user@server
cd /tmp
sudo ./deployment/scripts/update.sh
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

- **Frontend**: `/var/www/posdic/frontend`
- **Backend**: `/var/www/posdic/backend`
- **Logs**: `/var/log/posdic/`
- **Nginx Config**: `/etc/nginx/sites-available/posdic`
- **Service**: `/etc/systemd/system/posdic-backend.service`
- **Backups**: `/var/backups/posdic/`
