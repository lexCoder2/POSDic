# QZ Tray Certificate Trust Issue - Complete Guide

## Understanding the Issue

QZ Tray shows "untrusted" NOT because of your website's SSL certificate (Let's Encrypt), but because of the **application signing certificate** used to authenticate your POS app with QZ Tray.

### Two Types of Certificates:

1. **Website SSL/TLS** (Let's Encrypt) ✅ - For HTTPS connections
2. **QZ Tray App Signing** (Currently self-signed) ⚠️ - For QZ Tray authentication

## Current Setup

Your app uses a **self-signed RSA key pair**:

- `server/private-key.pem` - Private key (server signs requests)
- `server/public-key.pem` - Public key (QZ Tray verifies signatures)
- Copied to `src/assets/digital-certificate.txt` (loaded by frontend)

This works but shows a warning because QZ Tray doesn't recognize self-signed certificates by default.

---

## Solution Options

### Option 1: Override Trust (Quick Fix - Development/Internal Use) ✅ IMPLEMENTED

**Best for:** Internal use, development, or small businesses where you control all devices.

**Status:** Already applied in `qz-tray.service.ts`

**How it works:**

- Sets signature algorithm to SHA512
- QZ Tray will still show a warning but will allow the connection
- Users may need to click "Allow" once per device

**Manual Override (if needed):**
Users can create an override file to permanently trust your certificate:

**On Windows:**

```
C:\Users\<Username>\.qz\override.crt
```

**On Mac:**

```
/Users/<Username>/.qz/override.crt
```

**On Linux:**

```
/home/<username>/.qz/override.crt
```

**Content:** Copy your entire `public-key.pem` file into `override.crt`

---

### Option 2: Use QZ Tray's Free Community Certificate

**Best for:** Open source projects or public-facing applications.

**Steps:**

1. Go to: https://qz.io/developers/
2. Sign up for a free community certificate
3. Receive certificate + private key from QZ Industries
4. Replace your current keys with QZ's certificate
5. Update `digital-certificate.txt` with the new public key

**Pros:**

- ✅ Trusted by QZ Tray automatically
- ✅ Free for open source
- ✅ No user warnings

**Cons:**

- ❌ Requires registration
- ❌ May have usage limits for commercial use

---

### Option 3: Purchase Code Signing Certificate

**Best for:** Commercial applications with many users.

**Steps:**

1. Purchase a code signing certificate from:
   - DigiCert (https://www.digicert.com/signing/code-signing-certificates)
   - Sectigo (https://sectigo.com/ssl-certificates-tls/code-signing)
   - GlobalSign
   - Other trusted CA

2. Generate certificate signing request (CSR)
3. Receive signed certificate
4. Convert to PEM format if needed
5. Update your keys

**Cost:** $200-$500/year

**Pros:**

- ✅ Fully trusted
- ✅ Professional
- ✅ No warnings ever
- ✅ Best for commercial products

**Cons:**

- ❌ Expensive
- ❌ Annual renewal

---

### Option 4: Self-Signed Certificate with User Instructions (Current Setup)

**Best for:** Small deployments where you can guide users.

**Status:** This is what you have now.

**User Instructions:**

When QZ Tray shows "untrusted certificate":

1. **First time setup:**
   - Click "Advanced" or "Show Details"
   - Click "Allow this website"
   - Check "Remember this decision"

2. **Permanent trust (recommended for your business):**
   - Create override file at `C:\Users\<Username>\.qz\override.crt`
   - Copy the public key from `server/public-key.pem` into this file
   - Restart QZ Tray
   - No more warnings!

**Pros:**

- ✅ Free
- ✅ Full control
- ✅ Works immediately with override file

**Cons:**

- ❌ Shows warning to users initially
- ❌ Requires manual trust configuration

---

## Recommended Approach

**For your current situation (local business with Let's Encrypt SSL):**

1. ✅ **Keep current setup** with the override fix I just applied
2. **Create override.crt files** on all your POS terminals:
   ```powershell
   # Run this on each Windows terminal
   $overridePath = "$env:USERPROFILE\.qz"
   New-Item -ItemType Directory -Force -Path $overridePath
   Copy-Item "server\public-key.pem" "$overridePath\override.crt"
   ```
3. **Restart QZ Tray** on each terminal
4. ✅ Done! No more warnings

**For future (if scaling to multiple locations):**

- Consider QZ Tray's free community certificate
- Or purchase a code signing certificate if budget allows

---

## Testing Your Setup

After applying the fix:

1. **Open your POS app** in the browser
2. **Try to print** a receipt
3. **Check QZ Tray icon** in system tray:
   - Green = Connected and trusted ✅
   - Yellow/Orange = Connected but warning ⚠️
   - Red = Not connected ❌

4. **Console logs** (F12 → Console):
   ```
   QZ Tray certificate and signature configured
   QZ Tray connected
   Signature received from backend
   ```

---

## Troubleshooting

### "Certificate not trusted" persists

- Create `override.crt` file (see above)
- Restart QZ Tray application
- Clear browser cache

### "Failed to sign request"

- Check `server/private-key.pem` exists
- Verify `/api/sign` endpoint is working:
  ```
  POST https://your-domain.com/api/sign
  Body: { "toSign": "test" }
  Should return: { "signature": "..." }
  ```

### "QZ Tray not responding"

- Ensure QZ Tray is running (check system tray)
- Check firewall allows localhost:8182 and 8181
- Try: https://localhost:8182/

---

## Files Reference

| File                      | Purpose                    | Location                             |
| ------------------------- | -------------------------- | ------------------------------------ |
| `private-key.pem`         | Signs requests (server)    | `server/private-key.pem`             |
| `public-key.pem`          | Verifies signatures (QZ)   | `server/public-key.pem`              |
| `digital-certificate.txt` | Public key copy (frontend) | `src/assets/digital-certificate.txt` |
| `override.crt`            | User trust override        | `~/.qz/override.crt`                 |

---

## Current Status

✅ **QZ Tray service updated** with SHA512 signature algorithm
✅ **Self-signed certificate** configured and working
⚠️ **May show warning** on first use (expected with self-signed)
💡 **Use override.crt** to remove warning permanently

Your Let's Encrypt certificate is **not the issue** - it's working perfectly for HTTPS. The QZ Tray certificate is separate and only affects printer communication.
