# GitHub Actions Deployment - Troubleshooting Guide

## Common Issues and Solutions

### 1. "sudo: a password is required" Error

**Error message:**
```
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: a password is required
Error: Process completed with exit code 1
```

**Cause:** The GitHub Actions runner doesn't have passwordless sudo permissions.

**Solution:**

#### Quick Fix (Automated)

On your Ubuntu server, run the setup script:

```bash
# SSH into your server
ssh user@your-ubuntu-server

# Navigate to the repo
cd /var/www/posdic/repo

# Pull latest changes (includes the setup script)
git pull

# Run the setup script
sudo ./.github/setup-runner-permissions.sh

# Restart the runner service
sudo systemctl restart actions.runner.*

# Verify runner is running
sudo systemctl status actions.runner.*
```

#### Manual Fix

If you prefer to configure manually:

1. **Find the runner username:**
   ```bash
   # Check running runner services
   systemctl list-units --type=service | grep actions.runner

   # Check which user runs the service
   systemctl show -p User actions.runner.*.service
   ```

2. **Create sudoers file:**
   ```bash
   sudo visudo -f /etc/sudoers.d/github-actions-runner
   ```

3. **Add these lines** (replace `runner_user` with your actual runner username):
   ```
   # GitHub Actions Runner - Passwordless sudo
   runner_user ALL=(ALL) NOPASSWD: /var/www/posdic/repo/deployment/scripts/update.sh
   runner_user ALL=(ALL) NOPASSWD: /var/www/posdic/repo/deployment/scripts/deploy.sh
   runner_user ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart posdic-backend
   runner_user ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload posdic-backend
   runner_user ALL=(ALL) NOPASSWD: /usr/bin/systemctl status posdic-backend
   runner_user ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
   runner_user ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
   runner_user ALL=(ALL) NOPASSWD: /usr/bin/systemctl status nginx
   ```

4. **Save and test:**
   ```bash
   # Test passwordless sudo (as the runner user)
   sudo -u runner_user sudo -n systemctl status nginx

   # If successful, no password prompt should appear
   ```

5. **Restart runner:**
   ```bash
   sudo systemctl restart actions.runner.*
   ```

---

### 2. Runner Not Appearing in GitHub

**Symptoms:** Runner doesn't show up in GitHub Settings → Actions → Runners

**Solutions:**

1. **Check runner status:**
   ```bash
   cd ~/actions-runner
   sudo ./svc.sh status
   ```

2. **If stopped, start it:**
   ```bash
   sudo ./svc.sh start
   ```

3. **Check runner logs:**
   ```bash
   sudo journalctl -u actions.runner.* -f
   ```

4. **Reconfigure runner:**
   ```bash
   cd ~/actions-runner
   sudo ./svc.sh stop
   sudo ./svc.sh uninstall
   ./config.sh remove

   # Get new token from GitHub and reconfigure
   ./config.sh --url https://github.com/YOUR_USERNAME/POSDic --token YOUR_NEW_TOKEN

   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

---

### 3. "Repository not found" or "Git pull failed"

**Error message:**
```
Error: Repository not found
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

**Solution:**

The runner needs access to your repository. For private repositories:

1. **Create a GitHub Personal Access Token:**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Copy the token

2. **Configure Git credentials on server:**
   ```bash
   # As the runner user
   sudo -u runner_user git config --global credential.helper store

   # Clone once to save credentials
   cd /tmp
   git clone https://github.com/YOUR_USERNAME/POSDic.git
   # Enter username and paste token as password
   ```

**OR** use SSH instead:

1. **Generate SSH key on server:**
   ```bash
   sudo -u runner_user ssh-keygen -t ed25519 -C "github-runner"
   cat /home/runner_user/.ssh/id_ed25519.pub
   ```

2. **Add to GitHub:**
   - Go to repository → Settings → Deploy keys → Add deploy key
   - Paste the public key

3. **Update repository URL:**
   ```bash
   cd /var/www/posdic/repo
   sudo -u www-data git remote set-url origin git@github.com:YOUR_USERNAME/POSDic.git
   ```

---

### 4. "Permission denied" on /var/www/posdic

**Error message:**
```
Permission denied: /var/www/posdic/frontend
rsync: failed to set permissions on ...
```

**Solution:**

1. **Add runner user to www-data group:**
   ```bash
   sudo usermod -a -G www-data runner_user
   ```

2. **Fix directory permissions:**
   ```bash
   sudo chown -R www-data:www-data /var/www/posdic
   sudo chmod -R g+rw /var/www/posdic
   ```

3. **Restart runner to apply group membership:**
   ```bash
   sudo systemctl restart actions.runner.*
   ```

---

### 5. Build Fails - "npm install" errors

**Error message:**
```
npm ERR! EACCES: permission denied, mkdir '/var/www/.npm'
```

**Solution:**

1. **Create and fix npm cache directory:**
   ```bash
   sudo mkdir -p /var/www/.npm
   sudo chown -R runner_user:runner_user /var/www/.npm
   ```

2. **Set npm cache for www-data user:**
   ```bash
   sudo -u www-data npm config set cache /var/www/.npm
   ```

---

### 6. Backend Service Won't Start After Deployment

**Error in logs:**
```
Error: Cannot find module 'express'
Module not found
```

**Solution:**

1. **Check backend dependencies were installed:**
   ```bash
   cd /var/www/posdic/backend
   ls -la node_modules
   ```

2. **Manually install if missing:**
   ```bash
   cd /var/www/posdic/backend
   sudo -u www-data npm install --omit=dev
   sudo systemctl restart posdic-backend
   ```

3. **Check .env file exists:**
   ```bash
   cat /var/www/posdic/backend/.env
   ```

4. **View backend logs:**
   ```bash
   sudo journalctl -u posdic-backend -n 50 -f
   ```

---

### 7. Workflow Not Triggering

**Symptoms:** Pushing to main/production doesn't trigger deployment

**Solutions:**

1. **Check workflow file is in correct location:**
   ```bash
   ls -la .github/workflows/
   # Should show deploy-self-hosted.yml or deploy-ssh.yml
   ```

2. **Verify branch name matches:**
   ```yaml
   # In workflow file, check:
   on:
     push:
       branches:
         - main  # Must match your branch name exactly
   ```

3. **Check Actions are enabled:**
   - GitHub repository → Settings → Actions → General
   - Ensure "Allow all actions and reusable workflows" is selected

4. **Verify runner is online:**
   - GitHub repository → Settings → Actions → Runners
   - Runner should show green "Idle" status

5. **Check workflow syntax:**
   ```bash
   # Validate YAML syntax online at yamllint.com
   # Or use a local YAML linter
   ```

---

### 8. "No space left on device" Error

**Error message:**
```
ENOSPC: no space left on device
```

**Solution:**

1. **Check disk space:**
   ```bash
   df -h
   ```

2. **Clean up old deployments:**
   ```bash
   # Clean npm cache
   sudo npm cache clean --force

   # Clean old logs
   sudo journalctl --vacuum-time=7d

   # Clean old backups (keeps last 5)
   sudo find /var/backups/posdic -type f -mtime +30 -delete

   # Clean old build artifacts
   cd /var/www/posdic/repo
   sudo -u www-data npm run clean
   sudo rm -rf dist/ node_modules/.cache
   ```

3. **Clean Docker if installed:**
   ```bash
   sudo docker system prune -a
   ```

---

### 9. SSL Certificate Errors in Production

**Error message:**
```
SSL certificate problem: self signed certificate
```

**Solution:**

For production, use Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

For local/development, update nginx config to use self-signed certs:

```bash
# Use the local nginx config
sudo cp /var/www/posdic/repo/deployment/nginx/posdic-local.conf /etc/nginx/sites-available/posdic
sudo nginx -t
sudo systemctl reload nginx
```

---

### 10. MongoDB Connection Errors

**Error message:**
```
MongoServerError: Authentication failed
MongooseError: Connection refused
```

**Solutions:**

1. **Check MongoDB is running:**
   ```bash
   sudo systemctl status mongod
   ```

2. **Start MongoDB if stopped:**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. **Verify connection string in .env:**
   ```bash
   cat /var/www/posdic/backend/.env | grep MONGODB_URI
   ```

4. **Test connection:**
   ```bash
   mongosh "$MONGODB_URI"
   ```

5. **Check MongoDB logs:**
   ```bash
   sudo tail -f /var/log/mongodb/mongod.log
   ```

---

## Debug Commands

### Check Overall System Status

```bash
#!/bin/bash
echo "=== System Status ==="
echo "Runner Service:"
sudo systemctl status actions.runner.* --no-pager | head -20
echo ""
echo "Backend Service:"
sudo systemctl status posdic-backend --no-pager | head -20
echo ""
echo "Nginx Service:"
sudo systemctl status nginx --no-pager | head -20
echo ""
echo "MongoDB Service:"
sudo systemctl status mongod --no-pager | head -20
echo ""
echo "Disk Space:"
df -h | grep -E "Filesystem|/var|/home"
echo ""
echo "Recent Backend Logs:"
sudo journalctl -u posdic-backend -n 10 --no-pager
```

### Check Deployment Status

```bash
#!/bin/bash
echo "=== Deployment Status ==="
echo "Repository:"
cd /var/www/posdic/repo && git log -1 --oneline
echo ""
echo "Frontend Deployment:"
ls -lh /var/www/posdic/frontend/index.html
echo ""
echo "Backend Deployment:"
ls -lh /var/www/posdic/backend/index.js
echo ""
echo ".env file exists:"
ls -lh /var/www/posdic/backend/.env
echo ""
echo "Backend Dependencies:"
ls -ld /var/www/posdic/backend/node_modules
```

### Live Log Monitoring

```bash
# Watch all deployment-related logs
sudo journalctl -u posdic-backend -u nginx -u actions.runner.* -f
```

---

## Getting Help

1. **Check GitHub Actions logs:**
   - Go to repository → Actions tab
   - Click on failed workflow
   - Expand failed step to see full error

2. **Check server logs:**
   ```bash
   # Backend logs
   sudo journalctl -u posdic-backend -n 100

   # Nginx error logs
   sudo tail -f /var/log/nginx/posdic-error.log

   # Runner logs
   sudo journalctl -u actions.runner.* -n 100
   ```

3. **Test deployment manually:**
   ```bash
   # SSH into server and run update script manually
   sudo /var/www/posdic/repo/deployment/scripts/update.sh
   ```

4. **Enable verbose logging:**
   Edit workflow file and add:
   ```yaml
   env:
     ACTIONS_STEP_DEBUG: true
     ACTIONS_RUNNER_DEBUG: true
   ```

---

## Prevention Tips

1. **Test locally before pushing:**
   ```bash
   npm run build
   npm test
   ```

2. **Use feature branches:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   # Create PR, merge to main when ready
   ```

3. **Monitor runner health:**
   ```bash
   # Add to crontab for daily check
   0 9 * * * systemctl is-active actions.runner.* || systemctl start actions.runner.*
   ```

4. **Keep backups:**
   ```bash
   # Run backup before major changes
   sudo /var/www/posdic/repo/deployment/scripts/backup.sh
   ```

5. **Monitor disk space:**
   ```bash
   # Alert when disk usage > 80%
   df -h | awk '$5 > 80 {print $0}'
   ```
