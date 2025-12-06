# GitHub Actions Deployment Setup

This guide explains how to set up automated deployment to your local Ubuntu server using GitHub Actions.

## Table of Contents

- [Option 1: Self-Hosted Runner (Recommended for Local Servers)](#option-1-self-hosted-runner-recommended)
- [Option 2: SSH-Based Deployment](#option-2-ssh-based-deployment)
- [Testing the Deployment](#testing-the-deployment)
- [Troubleshooting](#troubleshooting)

---

## Option 1: Self-Hosted Runner (Recommended)

**Best for:** Local servers on your network that cannot be accessed from the internet.

### Advantages
- No need to expose your server to the internet
- Faster deployment (no file transfer over internet)
- Direct access to server resources
- No SSH configuration needed

### Setup Steps

#### 1. Install GitHub Actions Runner on Your Ubuntu Server

```bash
# SSH into your Ubuntu server
ssh user@your-local-server

# Create a directory for the runner
mkdir -p ~/actions-runner && cd ~/actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
```

#### 2. Configure the Runner

Go to your GitHub repository:
1. Click **Settings** → **Actions** → **Runners** → **New self-hosted runner**
2. Choose **Linux** as the operating system
3. Copy the configuration command shown (it includes a unique token)

Run the configuration command on your server:

```bash
./config.sh --url https://github.com/YOUR_USERNAME/POSDic --token YOUR_TOKEN

# When prompted:
# - Enter runner name: posdic-production (or any name you prefer)
# - Enter runner group: Default (press Enter)
# - Enter labels: self-hosted,Linux,X64,production (or customize)
# - Enter work folder: _work (press Enter)
```

#### 3. Install Runner as a Service

```bash
# Install the service
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

#### 4. Grant Sudo Permissions (Required for Deployment)

The runner needs sudo access to run deployment scripts:

```bash
# Edit sudoers file
sudo visudo

# Add this line at the end (replace 'runner_user' with your runner's username)
# The runner typically runs as the user who configured it
runner_user ALL=(ALL) NOPASSWD: /var/www/posdic/repo/deployment/scripts/update.sh, /usr/bin/systemctl
```

#### 5. Enable the Workflow

The workflow file is already created at `.github/workflows/deploy-self-hosted.yml`.

To enable it:
1. Commit and push the workflow file to your repository
2. The workflow will trigger automatically on pushes to `main` or `production` branches
3. You can also trigger it manually from the GitHub Actions tab

#### 6. Test the Deployment

```bash
# Make a small change and push to main
git add .
git commit -m "test: trigger deployment"
git push origin main
```

Go to your repository on GitHub → **Actions** tab to see the deployment in progress.

---

## Option 2: SSH-Based Deployment

**Best for:** Servers that can be accessed via SSH from the internet (or through a VPN/tunnel).

### Prerequisites

- Your Ubuntu server must be accessible via SSH from GitHub's servers
- For local servers, you'll need:
  - Port forwarding configured on your router (port 22 or custom SSH port)
  - OR a VPN/tunnel solution (Tailscale, Cloudflare Tunnel, etc.)
  - OR ngrok for temporary testing

### Setup Steps

#### 1. Generate SSH Key Pair

On your local machine:

```bash
# Generate a new SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# This creates:
# - Private key: ~/.ssh/github_actions_deploy
# - Public key: ~/.ssh/github_actions_deploy.pub
```

#### 2. Add Public Key to Your Server

```bash
# Copy the public key
cat ~/.ssh/github_actions_deploy.pub

# SSH into your server
ssh user@your-server

# Add the public key to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

#### 3. Configure GitHub Secrets

Go to your GitHub repository:
1. Click **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `SSH_HOST` | Your server's IP or domain | `192.168.1.100` or `myserver.example.com` |
| `SSH_USER` | SSH username | `ubuntu` or your username |
| `SSH_KEY` | Private key content | Copy entire content of `~/.ssh/github_actions_deploy` |
| `SSH_PORT` | SSH port (optional) | `22` (default) or custom port |

To copy the private key:

```bash
cat ~/.ssh/github_actions_deploy
# Copy the entire output, including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

#### 4. Configure Sudo Permissions

On your Ubuntu server:

```bash
# Edit sudoers file
sudo visudo

# Add this line (replace 'your_ssh_user' with your actual SSH username)
your_ssh_user ALL=(ALL) NOPASSWD: /var/www/posdic/repo/deployment/scripts/update.sh, /usr/bin/systemctl, /usr/bin/git
```

#### 5. Enable SSH Access for Local Servers

If your server is on a local network, you need to make it accessible:

**Option A: Port Forwarding (Permanent)**

Configure your router to forward port 22 (or custom port) to your server's local IP.

**Option B: Tailscale (Recommended for Security)**

```bash
# Install Tailscale on your Ubuntu server
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Get your Tailscale IP
tailscale ip -4
```

Use the Tailscale IP as `SSH_HOST` in GitHub secrets.

**Option C: ngrok (Testing Only)**

```bash
# On your Ubuntu server
ngrok tcp 22

# Use the ngrok URL and port as SSH_HOST and SSH_PORT
# Example: 0.tcp.ngrok.io:12345
```

#### 6. Test SSH Connection

From your local machine:

```bash
# Test the connection
ssh -i ~/.ssh/github_actions_deploy -p 22 user@your-server-ip "echo 'Connection successful'"
```

#### 7. Enable the Workflow

The workflow file is at `.github/workflows/deploy-ssh.yml`.

To use it instead of the self-hosted runner:

```bash
# Disable self-hosted workflow (rename or delete)
mv .github/workflows/deploy-self-hosted.yml .github/workflows/deploy-self-hosted.yml.disabled

# Commit and push
git add .
git commit -m "chore: configure SSH-based deployment"
git push origin main
```

---

## Testing the Deployment

### Manual Trigger

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select the workflow (Deploy to Local Ubuntu Server)
4. Click **Run workflow** → **Run workflow**

### Automatic Trigger

Push any change to the `main` or `production` branch:

```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

### Monitor Deployment

1. Go to **Actions** tab on GitHub
2. Click on the running workflow
3. Click on the job to see real-time logs
4. Check each step for success/failure

---

## Workflow Files Reference

### deploy-self-hosted.yml

Workflow for self-hosted runners. Triggers on:
- Push to `main` or `production` branches
- Manual trigger via GitHub Actions UI

Steps:
1. Checkout code
2. Set up Node.js
3. Run update script
4. Check service status
5. Display deployment info

### deploy-ssh.yml

Workflow for SSH-based deployment. Triggers on:
- Push to `main` or `production` branches
- Manual trigger via GitHub Actions UI

Steps:
1. Checkout code
2. Setup SSH connection
3. Pull latest changes on server
4. Run deployment script
5. Check service status
6. Cleanup credentials

---

## Customization

### Deploy Only Specific Branches

Edit the workflow file:

```yaml
on:
  push:
    branches:
      - main          # Deploy from main
      - production    # Deploy from production
      # - develop     # Add more branches as needed
```

### Add Deployment Notifications

#### Slack Notification

Add to the end of your workflow:

```yaml
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

#### Email Notification

```yaml
      - name: Send Email
        if: failure()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 465
          username: ${{ secrets.EMAIL_USERNAME }}
          password: ${{ secrets.EMAIL_PASSWORD }}
          subject: Deployment Failed
          to: admin@example.com
          from: github-actions@example.com
          body: Deployment failed for commit ${{ github.sha }}
```

### Run Tests Before Deployment

Add before the deployment step:

```yaml
      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Run linter
        run: npm run lint
```

### Create Backups Before Deployment

Add to the deployment script step:

```yaml
      - name: Create backup
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.SSH_PORT || 22 }} ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'EOF'
            sudo /var/www/posdic/repo/deployment/scripts/backup.sh
          EOF
```

---

## Troubleshooting

### Self-Hosted Runner Issues

**Runner not appearing in GitHub**

```bash
# Check runner status
sudo ./svc.sh status

# View runner logs
sudo journalctl -u actions.runner.* -f
```

**Permission denied errors**

```bash
# Verify sudo permissions
sudo -l

# Should show the commands the runner can execute without password
```

**Runner offline after server reboot**

```bash
# Restart the runner service
sudo ./svc.sh start
```

### SSH Deployment Issues

**Authentication failed**

- Verify the private key in GitHub secrets matches the public key on server
- Check SSH key permissions on server: `chmod 600 ~/.ssh/authorized_keys`
- Test SSH manually: `ssh -i ~/.ssh/github_actions_deploy user@host`

**Connection timeout**

- Verify server is accessible from internet
- Check firewall rules: `sudo ufw status`
- For local servers, verify port forwarding or VPN is working

**Permission denied during deployment**

- Check sudo permissions: `sudo visudo`
- Verify the SSH user has correct permissions on `/var/www/posdic/`

### Deployment Script Failures

**Build errors**

```bash
# SSH into server and check logs
sudo journalctl -u posdic-backend -n 50

# Check Node.js version
node --version  # Should be 20.x

# Manually test build
cd /var/www/posdic/repo
sudo -u www-data npm run build
```

**Service won't start**

```bash
# Check service status
sudo systemctl status posdic-backend

# View detailed logs
sudo journalctl -u posdic-backend -xe

# Check .env file exists
ls -la /var/www/posdic/backend/.env
```

**MongoDB connection errors**

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Test connection
mongosh --eval "db.adminCommand('ping')"

# Verify connection string in .env
cat /var/www/posdic/backend/.env | grep MONGODB_URI
```

### GitHub Actions Workflow Errors

**Workflow not triggering**

- Check the branch name matches the workflow configuration
- Verify workflow file is in `.github/workflows/` directory
- Check Actions are enabled in repository settings

**"No runner available" error**

- Check self-hosted runner is online in repository settings
- Verify runner labels match the `runs-on` in workflow
- Restart runner service on server

**Secrets not found**

- Verify secrets are configured in repository settings
- Secret names must match exactly (case-sensitive)
- Secrets are only available on the branches/events specified in workflow

---

## Security Best Practices

### For Self-Hosted Runners

1. **Run runner as dedicated user** (not root)
2. **Limit sudo permissions** to only required commands
3. **Keep runner updated**: `./config.sh --check-update`
4. **Monitor runner logs** regularly
5. **Use firewall** to restrict network access

### For SSH Deployment

1. **Use dedicated SSH key** (not your personal key)
2. **Use strong passphrase** on SSH keys (optional but recommended)
3. **Limit SSH key permissions** in `authorized_keys`:
   ```bash
   command="/var/www/posdic/repo/deployment/scripts/update.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
   ```
4. **Use non-standard SSH port** if exposing to internet
5. **Enable fail2ban** to prevent brute force attacks:
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```
6. **Use VPN or Tailscale** instead of port forwarding for better security

### General

1. **Never commit secrets** to repository
2. **Use GitHub's secret management** for all credentials
3. **Enable branch protection** on `main`/`production` branches
4. **Require code review** before merging to protected branches
5. **Monitor deployment logs** for suspicious activity

---

## Maintenance

### Update Runner (Self-Hosted)

```bash
cd ~/actions-runner
sudo ./svc.sh stop
./config.sh remove
# Download new version and reconfigure
sudo ./svc.sh install
sudo ./svc.sh start
```

### Rotate SSH Keys (SSH Deployment)

```bash
# Generate new key pair
ssh-keygen -t ed25519 -C "github-actions-deploy-2024" -f ~/.ssh/github_actions_deploy_new

# Add new public key to server
ssh-copy-id -i ~/.ssh/github_actions_deploy_new.pub user@server

# Update GitHub secret with new private key
# Test deployment
# Remove old public key from server
```

### Clean Up Old Deployments

```bash
# On server, clean old backups (keeps last 5)
sudo /var/www/posdic/repo/deployment/scripts/backup.sh

# Clean old logs
sudo journalctl --vacuum-time=30d
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Self-hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Tailscale Setup Guide](https://tailscale.com/kb/1017/install/)
- [Deployment Scripts](../deployment/README.md)

---

## Support

For issues specific to:
- **GitHub Actions**: Check GitHub Actions tab for error logs
- **Deployment Scripts**: See `deployment/README.md` and `deployment/DEPLOYMENT_GUIDE.md`
- **POS System**: See main README.md or create an issue on GitHub
