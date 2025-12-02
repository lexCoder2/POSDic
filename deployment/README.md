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
│   ├── build.sh                 # Build application for deployment
│   ├── deploy.sh                # Initial deployment script
│   ├── update.sh                # Quick update script
│   ├── backup.sh                # Backup current deployment
│   └── rollback.sh              # Restore from backup
├── .env.production.example      # Backend environment template
├── environment.prod.example.ts  # Frontend environment template
├── DEPLOYMENT_GUIDE.md          # Complete deployment guide
└── QUICK_REFERENCE.md           # Quick command reference
```

## Quick Start

### 1. Build the Application

```bash
./deployment/scripts/build.sh
```

This creates a timestamped archive file ready for deployment.

### 2. Upload to Server

```bash
scp posdic-*.tar.gz user@your-server:/tmp/
scp -r deployment user@your-server:/tmp/
```

### 3. Deploy on Server

```bash
ssh user@your-server
cd /tmp
chmod +x deployment/scripts/*.sh
sudo ./deployment/scripts/deploy.sh
```

### 4. Configure

- Edit `/var/www/posdic/backend/.env` with your settings
- Edit `/etc/nginx/sites-available/posdic` with your domain
- Setup SSL: `sudo certbot --nginx -d yourdomain.com`

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

### Initial Deployment

1. **Prepare server** (install Node.js, Nginx, MongoDB)
2. **Configure environments** (update templates with your values)
3. **Build locally**: `./deployment/scripts/build.sh`
4. **Upload to server**: `scp` files
5. **Deploy**: `sudo ./deployment/scripts/deploy.sh`
6. **Setup SSL**: `sudo certbot --nginx -d domain.com`
7. **Test**: Visit https://yourdomain.com

### Regular Updates

1. **Make code changes**
2. **Build**: `./deployment/scripts/build.sh`
3. **Upload**: `scp posdic-*.tar.gz server:/tmp/`
4. **Backup**: `sudo ./deployment/scripts/backup.sh`
5. **Update**: `sudo ./deployment/scripts/update.sh`
6. **Verify**: Check logs and test site

### Emergency Rollback

1. **SSH to server**
2. **Run rollback**: `sudo ./deployment/scripts/rollback.sh`
3. **Select backup timestamp**
4. **Services restart automatically**

## Key Directories on Server

After deployment:
- `/var/www/posdic/frontend/` - Angular built files (Nginx serves these)
- `/var/www/posdic/backend/` - Node.js application
- `/var/log/posdic/` - Application logs
- `/var/backups/posdic/` - Backup archives
- `/etc/nginx/sites-available/posdic` - Nginx config
- `/etc/systemd/system/posdic-backend.service` - Service definition

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
