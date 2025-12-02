# Deployment Guide - Ubuntu Server with Nginx

Complete guide to deploy the POS System on an Ubuntu server with Nginx as a reverse proxy and static file server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Initial Setup](#initial-setup)
4. [Building the Application](#building-the-application)
5. [Deploying to Server](#deploying-to-server)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Testing the Deployment](#testing-the-deployment)
8. [Maintenance Operations](#maintenance-operations)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Local Machine (Build Machine)
- Node.js 18+ and npm
- Git
- Access to project repository

### Ubuntu Server (20.04 LTS or newer)
- Root or sudo access
- Minimum 2GB RAM, 20GB disk space
- Public IP address (for internet access)
- Domain name (optional but recommended)

---

## Server Preparation

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Required Software

```bash
# Install Node.js (v20.x LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 (alternative to systemd, optional)
sudo npm install -g pm2

# Install certbot for SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Create Application User and Directories

```bash
# Create application directories
sudo mkdir -p /var/www/posdic/{frontend,backend}
sudo mkdir -p /var/log/posdic
sudo mkdir -p /var/backups/posdic

# Set permissions
sudo chown -R www-data:www-data /var/www/posdic
sudo chown -R www-data:www-data /var/log/posdic
sudo chmod -R 755 /var/www/posdic
```

### 4. Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Initial Setup

### 1. Configure MongoDB

```bash
# Secure MongoDB (optional but recommended)
sudo mongosh

# In MongoDB shell:
use admin
db.createUser({
  user: "posdic_admin",
  pwd: "your-strong-password",
  roles: [ { role: "readWrite", db: "posdic" } ]
})
exit
```

### 2. Update MongoDB Configuration (if using authentication)

```bash
sudo nano /etc/mongod.conf
```

Add:
```yaml
security:
  authorization: enabled
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

---

## Building the Application

### 1. Clone Repository (on local machine)

```bash
git clone https://github.com/lexCoder2/POSDic.git
cd POSDic
```

### 2. Configure Production Environment

**Frontend:**
```bash
# Copy and edit production environment
cp deployment/environment.prod.example.ts src/environments/environment.prod.ts
nano src/environments/environment.prod.ts
```

Update `apiUrl` to your domain:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://yourdomain.com/api',  // Change this
  // ... other settings
};
```

### 3. Build the Application

```bash
# Make build script executable
chmod +x deployment/scripts/build.sh

# Run build
./deployment/scripts/build.sh
```

This creates a timestamped archive file (e.g., `posdic-20241202_143022.tar.gz`).

---

## Deploying to Server

### 1. Upload Files to Server

```bash
# Using SCP
scp posdic-*.tar.gz user@your-server-ip:/tmp/

# Upload deployment files
scp -r deployment user@your-server-ip:/tmp/
```

### 2. SSH into Server

```bash
ssh user@your-server-ip
cd /tmp
```

### 3. Configure Backend Environment

```bash
# Create .env file
sudo nano /var/www/posdic/backend/.env
```

Copy content from `deployment/.env.production.example` and update:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `CORS_ORIGIN` - Your domain (e.g., `https://yourdomain.com`)

### 4. Run Deployment Script

```bash
# Make scripts executable
chmod +x deployment/scripts/*.sh

# Run deployment
sudo ./deployment/scripts/deploy.sh
```

The script will:
- Extract the archive
- Deploy frontend to `/var/www/posdic/frontend`
- Deploy backend to `/var/www/posdic/backend`
- Install dependencies
- Configure systemd service
- Configure Nginx
- Start all services

### 5. Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/posdic
```

Update these lines:
- Replace `your-domain.com` with your actual domain
- Comment out SSL lines if not using SSL yet

```nginx
server_name yourdomain.com www.yourdomain.com;  # Change this
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended for public domains)

```bash
# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot automatically updates the Nginx configuration.

### Option 2: Self-Signed Certificate (For local/internal use)

```bash
# Generate certificate
sudo mkdir -p /var/www/posdic/certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /var/www/posdic/certs/server.key \
  -out /var/www/posdic/certs/server.crt

# Use local configuration
sudo cp deployment/nginx/posdic-local.conf /etc/nginx/sites-available/posdic
sudo nginx -t
sudo systemctl reload nginx
```

---

## Testing the Deployment

### 1. Check Service Status

```bash
# Backend service
sudo systemctl status posdic-backend

# Nginx
sudo systemctl status nginx

# MongoDB
sudo systemctl status mongod
```

### 2. Check Logs

```bash
# Backend logs
tail -f /var/log/posdic/backend.log

# Nginx access logs
tail -f /var/log/nginx/posdic-access.log

# Nginx error logs
tail -f /var/log/nginx/posdic-error.log

# Systemd service logs
journalctl -u posdic-backend -f
```

### 3. Test API Endpoint

```bash
curl -k https://yourdomain.com/api/auth/health
```

Should return: `{"status":"ok"}`

### 4. Access Application

Open browser and navigate to: `https://yourdomain.com`

Default login (if using seeded data):
- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`
- **Cashier**: `cashier` / `cashier123`

---

## Maintenance Operations

### Update Application

```bash
# On local machine: build new version
./deployment/scripts/build.sh

# Upload to server
scp posdic-*.tar.gz user@server:/tmp/

# On server: create backup first
cd /tmp
sudo ./deployment/scripts/backup.sh

# Deploy update
sudo ./deployment/scripts/update.sh
```

### Backup Data

```bash
# Automatic backup (keeps last 5)
sudo ./deployment/scripts/backup.sh

# Manual MongoDB backup
mongodump --db posdic --out /var/backups/posdic/mongo-$(date +%Y%m%d)
```

### Rollback to Previous Version

```bash
sudo ./deployment/scripts/rollback.sh
# Follow prompts to select backup
```

### View Logs

```bash
# Real-time backend logs
sudo tail -f /var/log/posdic/backend.log

# Last 100 lines of backend errors
sudo tail -n 100 /var/log/posdic/backend-error.log

# Systemd service logs
sudo journalctl -u posdic-backend -n 100
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart posdic-backend

# Reload Nginx (without dropping connections)
sudo systemctl reload nginx

# Restart Nginx (drops connections)
sudo systemctl restart nginx
```

### Monitor Resources

```bash
# CPU and memory usage
htop

# Disk space
df -h

# Service resource usage
sudo systemctl status posdic-backend
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
sudo journalctl -u posdic-backend -n 50

# Common issues:
# 1. MongoDB not running
sudo systemctl status mongod

# 2. Port 3000 already in use
sudo lsof -i :3000

# 3. Missing .env file
ls -la /var/www/posdic/backend/.env

# 4. Permission issues
sudo chown -R www-data:www-data /var/www/posdic/backend
```

### Nginx 502 Bad Gateway

```bash
# Backend is not running
sudo systemctl status posdic-backend

# Backend is not listening on correct port
sudo netstat -tlnp | grep 3000

# Check Nginx error logs
sudo tail -f /var/log/nginx/posdic-error.log
```

### MongoDB Connection Issues

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Test connection
mongosh --eval "db.adminCommand('ping')"

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Verify connection string in .env
cat /var/www/posdic/backend/.env | grep MONGODB_URI
```

### Cannot Access from Other Devices (LAN)

```bash
# Check firewall
sudo ufw status

# Allow from specific IP
sudo ufw allow from 192.168.1.0/24 to any port 443

# Check Nginx is listening
sudo netstat -tlnp | grep nginx
```

### SSL Certificate Issues

```bash
# Test certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check certificate files
sudo ls -la /etc/letsencrypt/live/yourdomain.com/
```

### High Memory/CPU Usage

```bash
# Check process usage
htop

# Limit Node.js memory
# Edit systemd service:
sudo nano /etc/systemd/system/posdic-backend.service

# Add under [Service]:
Environment=NODE_OPTIONS="--max-old-space-size=512"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart posdic-backend
```

### Clear Cache and Restart

```bash
# Clear frontend cache (served by Nginx)
# Browsers cache aggressively, use hard refresh: Ctrl+Shift+R

# Clear backend cache (if applicable)
sudo systemctl restart posdic-backend

# Clear Nginx cache (if configured)
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

---

## Performance Optimization

### Enable HTTP/2

Already enabled in provided Nginx config:
```nginx
listen 443 ssl http2;
```

### Enable Gzip Compression

Already enabled in provided Nginx config. Verify:
```bash
curl -H "Accept-Encoding: gzip" -I https://yourdomain.com
# Should see: Content-Encoding: gzip
```

### Configure PM2 (Alternative to systemd)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend with PM2
cd /var/www/posdic/backend
pm2 start index.js --name posdic-backend

# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup systemd

# Monitor with PM2
pm2 monit
```

---

## Security Checklist

- [ ] Change default user passwords in database
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable MongoDB authentication
- [ ] Configure firewall (ufw)
- [ ] Install SSL certificate (Let's Encrypt)
- [ ] Regular backups enabled
- [ ] Keep system updated (`apt update && apt upgrade`)
- [ ] Monitor logs regularly
- [ ] Restrict SSH access (disable password auth, use keys)
- [ ] Set up fail2ban for intrusion prevention

---

## Additional Resources

- **Nginx Documentation**: https://nginx.org/en/docs/
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Let's Encrypt**: https://letsencrypt.org/
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

## Support

For issues or questions:
1. Check logs (backend, nginx, mongodb)
2. Review this troubleshooting guide
3. Check GitHub issues: https://github.com/lexCoder2/POSDic/issues
4. Create new issue with logs and error messages

---

**Last Updated**: December 2024  
**Version**: 1.0.0
