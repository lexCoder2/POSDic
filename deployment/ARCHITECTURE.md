# Git-Based Deployment Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Ubuntu Server                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Nginx (Port 443)                      │   │
│  │  • SSL/TLS Termination                                   │   │
│  │  • Static File Serving (Frontend)                        │   │
│  │  • Reverse Proxy to Backend                              │   │
│  └─────────┬──────────────────────────┬─────────────────────┘   │
│            │                          │                          │
│            │ /api/* requests          │ Static files (/, /assets) │
│            ▼                          ▼                          │
│  ┌─────────────────────┐   ┌────────────────────────┐          │
│  │  Node.js Backend    │   │  Frontend Directory     │          │
│  │  (Port 3000)        │   │  /var/www/posdic/      │          │
│  │  • Express API      │   │  frontend/              │          │
│  │  • JWT Auth         │   │  ├── index.html         │          │
│  │  • MongoDB          │   │  ├── *.js               │          │
│  │  Systemd Service    │   │  └── assets/            │          │
│  └─────────┬───────────┘   └────────────────────────┘          │
│            │                                                      │
│            ▼                                                      │
│  ┌─────────────────────┐                                        │
│  │   MongoDB           │                                        │
│  │   (Port 27017)      │                                        │
│  │   Database: posdic  │                                        │
│  └─────────────────────┘                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Git Repository (Working Copy)               │   │
│  │              /var/www/posdic/repo/                       │   │
│  │  • Source code from GitHub                               │   │
│  │  • Used for builds and updates                           │   │
│  │  • npm install & npm build runs here                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Flow

```
┌──────────────────┐
│  Developer       │
│  Local Machine   │
└────────┬─────────┘
         │
         │ 1. git commit & push
         ▼
┌──────────────────────────┐
│  GitHub Repository       │
│  github.com/lexCoder2/   │
│  POSDic                  │
└────────┬─────────────────┘
         │
         │ 2. git clone / git pull
         ▼
┌────────────────────────────────────────┐
│  Ubuntu Server                         │
│  /var/www/posdic/repo/                 │
│  ┌──────────────────────────────────┐  │
│  │  Deployment Script               │  │
│  │  • git pull origin main          │  │
│  │  • npm install (if needed)       │  │
│  │  • npm run build --prod          │  │
│  └──────────┬───────────────────────┘  │
│             │                           │
│             │ 3. Copy built files       │
│             ▼                           │
│  ┌──────────────────────────────────┐  │
│  │  Frontend: /var/www/posdic/      │  │
│  │           frontend/               │  │
│  │  (Nginx serves these files)      │  │
│  └──────────────────────────────────┘  │
│             │                           │
│             │ 4. Sync backend files     │
│             ▼                           │
│  ┌──────────────────────────────────┐  │
│  │  Backend: /var/www/posdic/       │  │
│  │          backend/                 │  │
│  │  • npm install --production      │  │
│  │  • systemctl restart backend     │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Update Flow (Simplified)

```
Developer pushes code → GitHub → Server pulls → Builds → Deploys → Restarts
     (local)              (repo)    (git pull)   (npm)    (copy)   (systemd)
```

## Request Flow (Production)

```
User Browser
     │
     │ HTTPS Request (port 443)
     ▼
┌────────────────────┐
│  Nginx             │
│  SSL Termination   │
└────┬───────────────┘
     │
     ├─────────────────────────────┐
     │                             │
     │ /api/*                      │ /, /pos, /dashboard, etc.
     ▼                             ▼
┌────────────────────┐    ┌──────────────────────┐
│  Node.js Backend   │    │  Static Files        │
│  (Express)         │    │  (Angular SPA)       │
│  Port 3000         │    │  /frontend/          │
└────┬───────────────┘    └──────────────────────┘
     │
     │ MongoDB Query
     ▼
┌────────────────────┐
│  MongoDB           │
│  Port 27017        │
│  Database: posdic  │
└────────────────────┘
```

## File Sync Pattern

```
/var/www/posdic/
│
├── repo/                      # Git repository (build source)
│   ├── src/                   # Angular source
│   ├── server/                # Backend source
│   ├── package.json
│   └── .git/
│
├── frontend/                  # Production frontend (copied from repo/dist)
│   ├── index.html             # ← Built from repo/src/
│   ├── main.*.js              # ← Built from repo/src/
│   └── assets/
│
└── backend/                   # Production backend (synced from repo/server)
    ├── index.js               # ← Copied from repo/server/
    ├── models/                # ← Copied from repo/server/
    ├── routes/                # ← Copied from repo/server/
    ├── .env                   # ← NOT in Git (created manually)
    └── node_modules/          # ← Installed on server

Sync flow:
1. repo/ ← git pull (from GitHub)
2. repo/dist/ ← npm build (Angular compiles here)
3. frontend/ ← copy from repo/dist/ (Nginx serves this)
4. backend/ ← rsync from repo/server/ (Node.js runs this)
```

## Directory Permissions

```
/var/www/posdic/
├── repo/           (owner: www-data, rwxr-xr-x)
├── frontend/       (owner: www-data, rwxr-xr-x)
└── backend/        (owner: www-data, rwxr-xr-x)
    └── .env        (owner: www-data, rw-------)

/var/log/posdic/    (owner: www-data, rwxr-xr-x)
```

## Service Dependencies

```
┌─────────────────┐
│  MongoDB        │ ← Must start first
└────────┬────────┘
         │
         │ Depends on
         ▼
┌─────────────────┐
│  Backend        │ ← Starts after MongoDB
│  (systemd)      │
└────────┬────────┘
         │
         │ Proxied by
         ▼
┌─────────────────┐
│  Nginx          │ ← Starts independently
└─────────────────┘
```

## Update Process Detail

```
1. Check current version
   cd /var/www/posdic/repo
   git log -1 --oneline
   Output: abc1234 Latest commit message

2. Fetch and pull
   git fetch origin
   git pull origin main
   Output: Updated abc1234..def5678

3. Check what changed
   git diff abc1234..def5678 --name-only
   Output: src/app/components/pos/pos.component.ts
           server/routes/products.js

4. Install dependencies (if package.json changed)
   npm install
   cd server && npm install --production

5. Build frontend
   npm run build --configuration production
   Output: ✔ Browser bundle generation complete.

6. Deploy built files
   cp -r dist/pos-system/browser/* /var/www/posdic/frontend/
   rsync -av server/ /var/www/posdic/backend/

7. Restart services
   systemctl restart posdic-backend
   systemctl reload nginx

8. Verify
   systemctl status posdic-backend
   curl https://localhost/api/health
```

## Rollback Process

```
Option 1: Git Rollback
   cd /var/www/posdic/repo
   git log --oneline -5           # Find commit to rollback to
   git checkout abc1234           # Checkout previous commit
   ./deployment/scripts/update.sh # Rebuild and deploy

Option 2: Backup Rollback
   ./deployment/scripts/rollback.sh
   Select backup: 20241202_143022
   Restores from /var/backups/posdic/
```

## Security Flow

```
Request → Nginx (SSL) → Backend (JWT Auth) → MongoDB
         ↓
    Static Files
    (no auth needed)

Auth Flow:
1. POST /api/auth/login → Backend validates → Returns JWT
2. All /api/* requests → Include JWT in header
3. Backend middleware validates JWT → Allow/Deny
```
