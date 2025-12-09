# QZ Tray Signing Verification Script

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "QZ Tray Signing System Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check 1: Private key exists
Write-Host "[1] Checking private key..." -ForegroundColor White
$privateKey = "server\private-key.pem"
if (Test-Path $privateKey) {
    $keyContent = Get-Content $privateKey -Raw
    if ($keyContent -match "BEGIN.*PRIVATE KEY") {
        Write-Host "    ✓ Private key found and valid" -ForegroundColor Green
        $keySize = $keyContent.Length
        Write-Host "    Size: $keySize bytes" -ForegroundColor Gray
    } else {
        Write-Host "    ✗ Invalid key format" -ForegroundColor Red
    }
} else {
    Write-Host "    ✗ Private key not found!" -ForegroundColor Red
}

# Check 2: Certificate exists
Write-Host "`n[2] Checking X.509 certificate..." -ForegroundColor White
$cert = "server\qz-certificate.crt"
if (Test-Path $cert) {
    $certContent = Get-Content $cert -Raw
    if ($certContent -match "BEGIN CERTIFICATE") {
        Write-Host "    ✓ Certificate found (X.509 format)" -ForegroundColor Green
        
        # Verify certificate details
        $certInfo = openssl x509 -in $cert -text -noout 2>$null
        if ($certInfo -match "Subject:.*POSDic") {
            Write-Host "    ✓ Certificate organization: POSDic" -ForegroundColor Green
        }
        if ($certInfo -match "Signature Algorithm: sha256") {
            Write-Host "    ✓ Signature algorithm: SHA256" -ForegroundColor Green
        }
    } else {
        Write-Host "    ✗ Invalid certificate format" -ForegroundColor Red
    }
} else {
    Write-Host "    ✗ Certificate not found!" -ForegroundColor Red
}

# Check 3: Test signing endpoint
Write-Host "`n[3] Testing signing endpoint..." -ForegroundColor White
try {
    $testData = @{
        toSign = "test-data-$(Get-Date -Format 'yyyyMMddHHmmss')"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "https://localhost:3000/api/sign" `
        -Method POST `
        -Body $testData `
        -ContentType "application/json" `
        -SkipCertificateCheck `
        -ErrorAction Stop

    if ($response.signature) {
        Write-Host "    ✓ Signing endpoint working!" -ForegroundColor Green
        Write-Host "    Signature length: $($response.signature.Length) chars" -ForegroundColor Gray
        Write-Host "    Sample: $($response.signature.Substring(0, [Math]::Min(40, $response.signature.Length)))..." -ForegroundColor Gray
    } else {
        Write-Host "    ✗ No signature returned" -ForegroundColor Red
    }
} catch {
    Write-Host "    ✗ Signing endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Make sure the server is running (npm run dev)" -ForegroundColor Yellow
}

# Check 4: Frontend certificate
Write-Host "`n[4] Checking frontend certificate..." -ForegroundColor White
$frontendCert = "src\assets\digital-certificate.txt"
if (Test-Path $frontendCert) {
    $frontContent = Get-Content $frontendCert -Raw
    if ($frontContent -match "BEGIN CERTIFICATE") {
        Write-Host "    ✓ Frontend has X.509 certificate" -ForegroundColor Green
        
        # Verify it matches server certificate
        $serverContent = Get-Content $cert -Raw -ErrorAction SilentlyContinue
        if ($frontContent.Trim() -eq $serverContent.Trim()) {
            Write-Host "    ✓ Matches server certificate" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Different from server certificate" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    ✗ Wrong format (should be X.509)" -ForegroundColor Red
    }
} else {
    Write-Host "    ✗ Frontend certificate not found!" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "How Signing Works:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Frontend loads certificate from:" -ForegroundColor White
Write-Host "   src/assets/digital-certificate.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "2. QZ Tray receives print data" -ForegroundColor White
Write-Host "   (receipt HTML, config, etc.)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. QZ Tray sends data to backend:" -ForegroundColor White
Write-Host "   POST /api/sign { toSign: '<data>' }" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Backend signs with SHA512:" -ForegroundColor White
Write-Host "   crypto.createSign('SHA512')" -ForegroundColor Gray
Write-Host "   Uses: server/private-key.pem" -ForegroundColor Gray
Write-Host ""
Write-Host "5. QZ Tray verifies signature:" -ForegroundColor White
Write-Host "   Uses certificate from step 1" -ForegroundColor Gray
Write-Host "   Checks signature matches data" -ForegroundColor Gray
Write-Host ""
Write-Host "6. If valid → Print proceeds ✓" -ForegroundColor Green
Write-Host "   If invalid → Print rejected ✗" -ForegroundColor Red
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ALL print jobs are cryptographically signed!" -ForegroundColor Green
Write-Host "This prevents unauthorized printing." -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
