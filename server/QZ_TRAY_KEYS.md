# QZ Tray Signing Keys

These keys are used for secure communication with QZ Tray for receipt printing.

## Files Generated

- `private-key.pem` - Private key (server-side, never share!)
- `public-key.pem` - Public key (used by QZ Tray client)

## How to Use

### Server Setup (Already Done)
The server uses `private-key.pem` to sign requests at the `/api/sign` endpoint.

### QZ Tray Client Setup
When setting up QZ Tray in the frontend:

1. The public key needs to be added to QZ Tray's trusted certificates
2. This is done in the `qz-tray.service.ts` or when initializing QZ Tray
3. The public key content should be read and passed to QZ Tray

### Getting the Public Key
To view the public key content:
```bash
cat server/public-key.pem
```

### Security Notes
- ✅ These files are in `.gitignore` and won't be committed
- ⚠️ Never commit or share the private key
- ✅ The public key can be shared with clients
- 🔄 Regenerate if compromised:
  ```bash
  cd server
  openssl genrsa -out private-key.pem 2048
  openssl rsa -in private-key.pem -outform PEM -pubout -out public-key.pem
  ```

## What This Enables
- Secure receipt printing via QZ Tray
- Signed communication between your POS app and physical printers
- Protection against unauthorized print requests
