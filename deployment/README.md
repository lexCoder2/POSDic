# Deployment Configuration

This directory contains all files needed to deploy the POS System on an Ubuntu server with Nginx.

## Directory Structure

```
deployment/
├── nginx/
│   ├── posdic.conf              # Production config with Let's Encrypt SSL
│   └── posdic-local.conf        # Local/internal config with self-signed SSL
├── systemd/
│   ├── posdic-backend.service   # Main backend service
│   └── posdic-auto-close.service # Auto-close registers service
├── scripts/
│   ├── deploy.sh                # Initial Git-based deployment
│   ├── update.sh                # Git pull and rebuild
│   ├── build.sh                 # (Optional) Local build for archive
│   ├── build-on-server.sh       # Rebuild frontend on server
│   ├── setup-ssh-key.sh         # Setup deploy key for private repos
│   ├── backup.sh                # Backup current deployment
│   └── rollback.sh              # Restore from backup
├── .env.production.example      # Backend environment template
├── environment.prod.example.ts  # Frontend environment template
├── DEPLOYMENT_GUIDE.md          # Complete deployment guide
└── QUICK_REFERENCE.md           # Quick command reference
```

## Quick Start (Git-based Deployment)

### 1. Prepare Server

```bash
ssh user@your-server
sudo apt update && sudo apt install -y git nodejs npm nginx mongodb-org
```

### 2. Deploy from Git

**For public repositories:**

```bash
cd /tmp
git clone https://github.com/lexCoder2/POSDic.git
cd POSDic
chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/deploy.sh
```

**For private repositories:**

```bash
cd /tmp
git clone https://github.com/lexCoder2/POSDic.git
cd POSDic
chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/setup-ssh-key.sh  # Setup deploy key
# Add the key to GitHub, then edit deploy.sh to use SSH URL
sudo ./deployment/scripts/deploy.sh
```

### 3. Configure

- Edit `/var/www/posdic/backend/.env` with your settings
- Edit `/etc/nginx/sites-available/posdic` with your domain
- Setup SSL: `sudo certbot --nginx -d yourdomain.com`
- Restart: `sudo systemctl restart posdic-backend`

### 4. Update Later

```bash
ssh user@your-server
sudo /var/www/posdic/repo/deployment/scripts/update.sh
```

## Files Overview

### Nginx Configurations

**posdic.conf** - Production configuration

- Reverse proxy to Node.js backend on port 3000
- Serves Angular static files
- SSL/TLS with Let's Encrypt
- Gzip compression
- Security headers
- Caching rules

**posdic-local.conf** - Local/internal configuration

- Same as production but uses self-signed certificates
- For testing or internal deployments

### Systemd Services

**posdic-backend.service** - Main backend service

- Runs Node.js backend as www-data user
- Auto-restart on failure
- Logs to /var/log/posdic/
- Waits for MongoDB to be ready

**posdic-auto-close.service** - Register auto-close (optional)

- Automatically closes registers at midnight
- Runs the auto-close-registers.js utility

### Deployment Scripts

**build.sh**

- Builds Angular frontend (production mode)
- Installs backend dependencies
- Creates deployment archive
- Run on local/build machine

**deploy.sh**

- Full deployment on server
- Extracts archive
- Configures services
- Starts all services
- Run as root on server

**update.sh**

- Quick update without full setup
- Preserves .env and configuration
- Faster than full deployment
- Use for code updates

**backup.sh**

- Creates timestamped backup
- Keeps last 5 backups
- Run before updates

**rollback.sh**

- Restores from backup
- Interactive selection of backup to restore
- Use if update fails

### Environment Templates

**.env.production.example**

- Backend environment variables template
- Copy to `/var/www/posdic/backend/.env`
- Update with your values

**environment.prod.example.ts**

- Frontend environment template
- Copy to `src/environments/environment.prod.ts` before building
- Update API URL with your domain

## Typical Workflow

### Initial Deployment (Git-based)

1. **Prepare server** (install Node.js, Nginx, MongoDB, Git)
2. **Clone deployment scripts**: `git clone https://github.com/lexCoder2/POSDic.git`
3. **Run deploy**: `sudo ./deployment/scripts/deploy.sh`
4. **Configure .env**: Edit `/var/www/posdic/backend/.env`
5. **Configure Nginx**: Update domain in config
6. **Setup SSL**: `sudo certbot --nginx -d domain.com`
7. **Test**: Visit https://yourdomain.com

### Regular Updates (Automatic Build)

1. **Commit and push changes** to GitHub
2. **SSH to server**
3. **Run update**: `sudo /var/www/posdic/repo/deployment/scripts/update.sh`
4. **Verify**: Check logs and test site

The update script automatically:

- Pulls latest changes from Git
- Rebuilds frontend if needed
- Updates backend dependencies if changed
- Restarts services

### Manual Updates (Specific Version)

1. **SSH to server**
2. **Checkout version**: `cd /var/www/posdic/repo && sudo -u www-data git checkout v1.2.0`
3. **Run update**: `sudo ./deployment/scripts/update.sh`

### Emergency Rollback

1. **SSH to server**
2. **Checkout previous commit**: `cd /var/www/posdic/repo && sudo -u www-data git checkout HEAD~1`
3. **Run update**: `sudo ./deployment/scripts/update.sh`

Or use backup rollback:

1. **Run rollback**: `sudo ./deployment/scripts/rollback.sh`
2. **Select backup timestamp**

## Key Directories on Server

After deployment:

- `/var/www/posdic/repo/` - Git repository (working directory for builds)
- `/var/www/posdic/frontend/` - Angular built files (Nginx serves these)
- `/var/www/posdic/backend/` - Node.js production application
- `/var/log/posdic/` - Application logs
- `/var/backups/posdic/` - Backup archives
- `/etc/nginx/sites-available/posdic` - Nginx config
- `/etc/systemd/system/posdic-backend.service` - Service definition

The repository at `/var/www/posdic/repo/` is used for:

- Pulling latest code changes
- Building the Angular frontend
- Source for deploying backend files
- Version control and rollback capabilities

## Security Notes

- Always use HTTPS in production (Let's Encrypt is free)
- Change default passwords in seeded data
- Use strong JWT_SECRET (min 32 chars)
- Enable MongoDB authentication
- Configure firewall (ufw)
- Keep system updated
- Monitor logs regularly

## Documentation

- **DEPLOYMENT_GUIDE.md** - Complete step-by-step guide with troubleshooting
- **QUICK_REFERENCE.md** - Quick command reference

## Support

For detailed instructions, troubleshooting, and best practices, see:

- [Complete Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Quick Reference](./QUICK_REFERENCE.md)

For issues: https://github.com/lexCoder2/POSDic/issues
