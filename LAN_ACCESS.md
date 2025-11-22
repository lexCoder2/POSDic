# LAN Access Configuration Guide

## Network Configuration

Your POS system is now configured for LAN access!

### Access URLs

**From any device on your network:**

- **Frontend (Angular App)**: `http://192.168.160.1:4200`
- **Backend API**: `http://192.168.160.1:3001/api`
- **Product Images**: `http://192.168.160.1:3001/product_images`

**From the host machine:**

- **Frontend**: `http://localhost:4200`
- **Backend API**: `http://localhost:3001/api`

---

## Configuration Details

### Backend Server (Node.js/Express)

- **Port**: 3001
- **Binding**: 0.0.0.0 (all network interfaces)
- **Location**: `server/index.js`

### Frontend (Angular)

- **Port**: 4200 (default)
- **Configuration**: `--host 0.0.0.0 --disable-host-check`
- **Start command**: `npm start`

### Environment Variables

- **File**: `src/environments/environment.ts`
- **API URL**: `http://192.168.160.1:3001/api`
- **Image URL**: `http://192.168.160.1:3001`

---

## How to Test LAN Access

### 1. Start the Backend Server

```powershell
cd c:\Users\IRWIN\Documents\pdev\server
node index.js
```

You should see:

```
Server is running on port 3001
Local: http://localhost:3001
LAN: http://192.168.160.1:3001
```

### 2. Start the Frontend

```powershell
cd c:\Users\IRWIN\Documents\pdev
npm start
```

You should see:

```
** Angular Live Development Server is listening on 0.0.0.0:4200 **
```

### 3. Test from Another Device

On your phone, tablet, or another computer connected to the same network:

1. Open a web browser
2. Navigate to: `http://192.168.160.1:4200`
3. You should see the POS login screen

---

## Troubleshooting

### Can't Access from Other Devices?

#### Check Windows Firewall

Run this command in PowerShell as Administrator:

```powershell
# Allow inbound connections on port 3001 (Node.js)
New-NetFirewallRule -DisplayName "Node.js Server (Port 3001)" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Allow inbound connections on port 4200 (Angular)
New-NetFirewallRule -DisplayName "Angular Dev Server (Port 4200)" -Direction Inbound -LocalPort 4200 -Protocol TCP -Action Allow
```

Or manually:

1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules**
3. Click **New Rule...**
4. Select **Port**, click **Next**
5. Select **TCP**, enter **3001** and **4200** (comma-separated)
6. Select **Allow the connection**
7. Check all profiles (Domain, Private, Public)
8. Name it "POS System Ports"
9. Click **Finish**

#### Check Your IP Address

Your IP might have changed. Get your current IP:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
```

If it's different from `192.168.160.1`, update:

- `src/environments/environment.ts`
- `server/index.js` (startup message)

#### Verify Network Connection

Make sure both devices are on the same network:

- Same WiFi network
- Same subnet (usually 192.168.x.x)

#### Test Connectivity

From another device, try pinging the server:

```bash
ping 192.168.160.1
```

#### Check if Ports are Open

From the host machine:

```powershell
# Check if Node.js is listening on port 3001
netstat -ano | findstr :3001

# Check if Angular is listening on port 4200
netstat -ano | findstr :4200
```

---

## Security Considerations

### For Development

- Current setup is perfect for local network testing
- `--disable-host-check` allows any hostname to access the dev server

### For Production

When deploying to production:

1. **Remove `--disable-host-check`**
2. **Configure proper CORS** in `server/index.js`
3. **Use environment-specific configs**
4. **Enable HTTPS**
5. **Add authentication middleware**
6. **Use a reverse proxy** (nginx/Apache)
7. **Set proper firewall rules**

---

## Network Diagram

```
┌─────────────────────────────────────────┐
│     Your Local Network (192.168.160.x)  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Host PC (192.168.160.1)           │ │
│  │                                    │ │
│  │  ┌─────────────┐  ┌─────────────┐│ │
│  │  │ Node.js     │  │ Angular     ││ │
│  │  │ Port: 3001  │  │ Port: 4200  ││ │
│  │  │ (Backend)   │  │ (Frontend)  ││ │
│  │  └─────────────┘  └─────────────┘│ │
│  └────────────────────────────────────┘ │
│           ▲                              │
│           │                              │
│  ┌────────┴───────┐   ┌───────────────┐│
│  │  Phone/Tablet  │   │  Other PC     ││
│  │  Access via    │   │  Access via   ││
│  │  192.168.160.1 │   │  192.168.160.1││
│  └────────────────┘   └───────────────┘│
└─────────────────────────────────────────┘
```

---

## Quick Reference Commands

### Start Both Services

```powershell
# Terminal 1 - Backend
cd c:\Users\IRWIN\Documents\pdev\server
node index.js

# Terminal 2 - Frontend
cd c:\Users\IRWIN\Documents\pdev
npm start
```

### Or use concurrent mode (recommended)

```powershell
cd c:\Users\IRWIN\Documents\pdev
npm run dev
```

### Find Your IP

```powershell
ipconfig | findstr IPv4
```

### Test API from Command Line

```powershell
# Test health endpoint
curl http://192.168.160.1:3001/api/health

# Test from another device
curl http://192.168.160.1:3001/api/products
```

---

## Mobile Device Configuration

### For Best Performance on Tablets/Phones

1. **Use Chrome or Safari** - Best compatibility
2. **Add to Home Screen** - For app-like experience
3. **Enable Landscape Mode** - Optimal for POS interface
4. **Disable Auto-Lock** - Keep screen active during operation

### Barcode Scanner Integration

If using a Bluetooth barcode scanner:

1. Pair the scanner with your device
2. The scanner will type into the search field automatically
3. Auto-focus ensures the search bar is always ready
4. Products will be added to cart instantly

---

## Next Steps

- ✅ Test access from another device
- ✅ Configure firewall rules if needed
- ✅ Set up tablets/phones for POS use
- ⬜ Configure production environment
- ⬜ Set up HTTPS for production
- ⬜ Add user authentication for remote access
