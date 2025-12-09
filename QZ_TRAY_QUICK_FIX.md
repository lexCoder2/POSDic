# QZ Tray "Untrusted" Error - Quick Fix

## TL;DR - The Issue

Your **Let's Encrypt SSL certificate is fine** ✅

The warning is about QZ Tray's **application signing certificate** (separate system) ⚠️

---

## Quick Fix (2 Minutes)

### On Each POS Terminal:

1. **Run the setup script:**

   ```powershell
   cd C:\Users\IRWIN\Documents\pdev
   .\setup-qz-override.ps1
   ```

2. **Restart QZ Tray** (script will prompt)

3. **Done!** No more warnings ✅

---

## What This Does

Creates `C:\Users\<Username>\.qz\override.crt` which tells QZ Tray to permanently trust your POS app's certificate.

---

## Manual Alternative

If script doesn't work:

1. Copy `server\public-key.pem` to `C:\Users\<YourUsername>\.qz\override.crt`
2. Restart QZ Tray
3. Done

---

## Why This Happens

- **Website HTTPS** uses Let's Encrypt (trusted by browsers) ✅
- **QZ Tray authentication** uses your RSA key (not automatically trusted) ⚠️
- Both are **completely separate** security systems
- The override file tells QZ Tray "trust this specific app"

---

## Already Fixed in Code

The `qz-tray.service.ts` has been updated with:

- SHA512 signature algorithm
- Better error handling
- Proper initialization flow

---

## Verify It's Working

1. Open POS app
2. Try to print a test receipt
3. Check QZ Tray icon (should be **green**)
4. Console should show: `QZ Tray connected`

---

## Still Having Issues?

See full guide: `QZ_TRAY_CERTIFICATE_GUIDE.md`

Or check:

- QZ Tray is running (system tray icon)
- `/api/sign` endpoint works (test in browser console)
- Browser console shows no certificate errors
- Firewall allows localhost:8182

---

**Bottom Line:** Your Let's Encrypt cert is perfect for HTTPS. QZ Tray needs a separate app certificate which we've now configured to be trusted. Run the script on each terminal and you're good to go! 🎉
