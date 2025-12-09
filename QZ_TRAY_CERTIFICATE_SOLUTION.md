# QZ Tray Certificate Error - Complete Solution

## Current Status

✅ Certificate files created in `C:\Users\IRWIN\.qz\`
✅ QZ Tray stopped
✅ Frontend code updated

## The Real Issue

QZ Tray shows "Invalid Certificate" and "Untrusted website" because it's using **certificate-based authentication**, and your self-signed certificate is not in its trust store.

## Solution: Two Approaches

### Approach 1: Click "Allow" in QZ Tray Dialog (Recommended)

Even with override.crt, **QZ Tray will show the warning dialog on first connection**. This is normal behavior.

**What to do:**

1. Start QZ Tray (search in Start Menu)
2. Open your POS app and try to print
3. **When QZ Tray shows the certificate warning:**
   - ✅ **Click "Allow"** or **"Advanced" → "Allow this website"**
   - ✅ **Check "Remember this decision"** or **"Always allow"**
4. The error will not appear again

This is the expected workflow for self-signed certificates.

---

### Approach 2: Disable Certificate Validation (Development Only)

If you want to completely bypass certificate validation for development:

**Manual QZ Tray Configuration:**

1. Close QZ Tray completely
2. Edit QZ Tray preferences:
   - Windows: `C:\Users\<Username>\.qz\qz-tray.properties`
3. Add this line:
   ```
   security.require.certificate=false
   ```
4. Save and restart QZ Tray

**WARNING:** Only use this for local development. Never in production.

---

### Approach 3: Use QZ Tray's Community Certificate (Production)

For production use without warnings:

1. Go to https://qz.io/developers/
2. Sign up for free community certificate
3. Download their certificate
4. Replace your current keys with QZ's certificate
5. Update `digital-certificate.txt`

**No more warnings ever!**

---

## Why override.crt Alone Isn't Enough

The `override.crt` file tells QZ Tray "I trust this certificate" but QZ Tray **still shows a warning dialog** for security. You must:

1. Have the override file (✅ done)
2. **Manually click "Allow" on first connection** ← YOU NEED TO DO THIS

After clicking "Allow" once, QZ Tray remembers your choice and won't ask again.

---

## Summary

**The "Invalid Certificate" error is expected** with self-signed certificates.

**What you must do:**

1. ✅ Start QZ Tray
2. ✅ Open POS app
3. ✅ Try to print
4. ✅ **Click "Allow" in the QZ Tray dialog**
5. ✅ Check "Remember this decision"

**That's it!** The error won't appear again.

---

## Alternative: Check if QZ Tray is Blocking

Run this command to check QZ Tray status:

```powershell
Test-NetConnection localhost -Port 8182
```

If it fails, QZ Tray is not running or blocked by firewall.

---

## Still Having Issues?

Check browser console (F12) for specific errors:

- "Failed to sign request" → Backend issue
- "Certificate not valid" → Need to click Allow
- "QZ Tray not connected" → QZ Tray not running
- "Signature verification failed" → Wrong certificate
