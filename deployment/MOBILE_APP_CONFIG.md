# Mobile App Configuration Guide

This guide explains how to configure mobile applications to connect to your POSDic server.

---

## Server Configuration Requirements

### 1. Update Your LAN IP Address

Before deploying, update the nginx configuration with your server's actual IP address:

**File**: `deployment/nginx/posdic-local.conf`

Replace `192.168.160.1` with your server's actual LAN IP:

```nginx
server_name server.local localhost YOUR_SERVER_IP;
```

To find your server's IP:

```bash
# On Linux/Ubuntu
ip addr show | grep "inet "

# On Windows
ipconfig
```

### 2. CORS Configuration

The nginx configuration now includes CORS headers to support mobile apps. These are already configured in:

- `deployment/nginx/posdic.conf` (production)
- `deployment/nginx/posdic-local.conf` (local/development)

**CORS headers included:**

- `Access-Control-Allow-Origin: *` (or specific origin)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Allow-Credentials: true`

---

## Mobile App Configuration

### API Endpoint URL

Your mobile app should use one of these API URLs:

#### Development/Local Network (Self-Signed SSL)

```
https://YOUR_SERVER_IP/api
```

Example: `https://192.168.160.1/api`

**Note**: Mobile apps will need to trust the self-signed certificate or use HTTP instead.

#### Development/Local Network (HTTP - No SSL)

```
http://YOUR_SERVER_IP:3000/api
```

Example: `http://192.168.160.1:3000/api`

**Note**: Direct Node.js connection, bypassing nginx. Good for development.

#### Production (Public Domain with Let's Encrypt)

```
https://your-domain.com/api
```

Example: `https://posdic.yourdomain.com/api`

---

## SSL Certificate Considerations

### Option 1: Use HTTP (Development Only)

Simplest for mobile app development:

1. **Configure mobile app to use HTTP:**

   ```
   http://YOUR_SERVER_IP:3000/api
   ```

2. **Start backend in HTTP mode:**

   ```bash
   cd server
   NODE_ENV=production node index.js
   ```

3. **No SSL certificate issues** - Works immediately on mobile

### Option 2: Trust Self-Signed Certificate (Local Network)

If using `https://YOUR_SERVER_IP/api`:

#### iOS Apps

1. Download certificate: `https://YOUR_SERVER_IP/api/health`
2. Settings → General → VPN & Device Management
3. Install and trust the certificate

#### Android Apps

1. Download certificate: `https://YOUR_SERVER_IP/api/health`
2. Settings → Security → Install from storage
3. Select certificate file and install

#### React Native / Flutter

Configure to accept self-signed certificates (development only):

**React Native:**

```javascript
// For development only
if (__DEV__) {
  // Disable SSL validation
}
```

**Flutter:**

```dart
// For development only
HttpClient client = HttpClient()
  ..badCertificateCallback = ((X509Certificate cert, String host, int port) => true);
```

### Option 3: Use Let's Encrypt (Production)

Best for production deployment:

1. **Get a public domain name**
2. **Point domain to your server's public IP**
3. **Install Let's Encrypt certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```
4. **Mobile app uses:**
   ```
   https://your-domain.com/api
   ```

---

## Network Configuration

### Firewall Rules

Ensure these ports are open:

```bash
# For HTTP (development)
sudo ufw allow 3000/tcp

# For HTTPS (production with nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Router Configuration (Local Network)

If accessing from outside your local network:

1. **Port Forwarding** on your router:

   - Forward port 443 → Your server's local IP:443 (HTTPS)
   - Forward port 80 → Your server's local IP:80 (HTTP redirect)
   - Or port 3000 → Your server's local IP:3000 (Direct API)

2. **Use Dynamic DNS** if you don't have a static public IP

---

## Testing Mobile App Connection

### 1. Test API Health Endpoint

From mobile app or browser:

```
http://YOUR_SERVER_IP:3000/api/health
```

Expected response:

```json
{
  "status": "OK",
  "message": "POS API is running"
}
```

### 2. Test Login Endpoint

From mobile app:

```
POST http://YOUR_SERVER_IP:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Expected: JWT token response

### 3. Check CORS Headers

Use curl to verify CORS:

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS --verbose \
     http://YOUR_SERVER_IP:3000/api/auth/login
```

Should see CORS headers in response.

---

## Common Issues & Solutions

### Issue: "0 Unknown Error" / Network Error

**Causes:**

- Server not reachable from mobile device
- Wrong IP address
- Firewall blocking connection
- CORS issues

**Solutions:**

1. Verify server is running: `curl http://YOUR_SERVER_IP:3000/api/health`
2. Check mobile device is on same network
3. Disable firewall temporarily to test
4. Use IP address instead of `server.local`

### Issue: SSL Certificate Error

**Solutions:**

1. Use HTTP instead of HTTPS for development
2. Trust self-signed certificate on device
3. Use Let's Encrypt for production

### Issue: CORS Error

**Solutions:**

1. Check nginx configuration has CORS headers
2. Restart nginx: `sudo systemctl restart nginx`
3. Verify backend CORS settings in `server/index.js`

### Issue: Connection Timeout

**Solutions:**

1. Increase timeout in mobile app
2. Check server logs: `sudo journalctl -u posdic-backend -f`
3. Verify nginx proxy timeout settings

---

## Environment Variables for Mobile Apps

Configure these in your mobile app:

```javascript
// Development
export const API_BASE_URL = "http://192.168.160.1:3000/api";

// Production
export const API_BASE_URL = "https://your-domain.com/api";
```

Or use environment-specific configs:

```javascript
const config = {
  development: {
    apiUrl: "http://192.168.160.1:3000/api",
    imageUrl: "http://192.168.160.1:3000",
  },
  production: {
    apiUrl: "https://your-domain.com/api",
    imageUrl: "https://your-domain.com",
  },
};

export default config[process.env.NODE_ENV || "development"];
```

---

## Deployment Checklist for Mobile App Support

- [ ] Update nginx config with correct server IP
- [ ] Add CORS headers to nginx
- [ ] Open firewall ports (80, 443, or 3000)
- [ ] Test API health endpoint from mobile device
- [ ] Configure SSL (Let's Encrypt or self-signed)
- [ ] Update mobile app API URL
- [ ] Test login from mobile app
- [ ] Test product listing from mobile app
- [ ] Test sales creation from mobile app

---

## Security Recommendations

### Development

- ✅ Use HTTP on local network only
- ✅ Restrict access to local network
- ✅ Use self-signed certificates for testing

### Production

- ✅ Always use HTTPS with valid certificates
- ✅ Configure CORS to allow specific origins only
- ✅ Use strong JWT secrets
- ✅ Enable rate limiting
- ✅ Use firewall rules
- ✅ Regular security updates

---

## Additional Resources

- [Nginx CORS Configuration](https://enable-cors.org/server_nginx.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [POSDic Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [POSDic LAN Access Guide](../LAN_ACCESS.md)

---

## Support

For issues specific to mobile app connectivity:

1. Check server logs: `sudo journalctl -u posdic-backend -f`
2. Check nginx logs: `sudo tail -f /var/log/nginx/posdic-error.log`
3. Verify firewall: `sudo ufw status`
4. Test with curl from another device on the network
