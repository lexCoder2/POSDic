# Verify QZ Tray Certificate Setup

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "QZ Tray Certificate Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $true

# Check 1: User directory
$userCert = "$env:USERPROFILE\.qz\override.crt"
Write-Host "[1] User Config: $userCert" -ForegroundColor White
if (Test-Path $userCert) {
    $content = Get-Content $userCert -Raw
    if ($content -match "BEGIN CERTIFICATE") {
        Write-Host "    Status: OK (X.509 Certificate)" -ForegroundColor Green
    } else {
        Write-Host "    Status: WRONG FORMAT (not a certificate)" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "    Status: NOT FOUND" -ForegroundColor Red
    $allGood = $false
}

# Check 2: Program Files
$progCert = "C:\Program Files\QZ Tray\override.crt"
Write-Host "`n[2] Program Files: $progCert" -ForegroundColor White
if (Test-Path $progCert) {
    $content = Get-Content $progCert -Raw
    if ($content -match "BEGIN CERTIFICATE") {
        Write-Host "    Status: OK (X.509 Certificate)" -ForegroundColor Green
    } else {
        Write-Host "    Status: WRONG FORMAT (not a certificate)" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "    Status: NOT FOUND (run admin script to copy)" -ForegroundColor Yellow
}

# Check 3: Frontend asset
$frontendCert = "src\assets\digital-certificate.txt"
Write-Host "`n[3] Frontend Asset: $frontendCert" -ForegroundColor White
if (Test-Path $frontendCert) {
    $content = Get-Content $frontendCert -Raw
    if ($content -match "BEGIN CERTIFICATE") {
        Write-Host "    Status: OK (X.509 Certificate)" -ForegroundColor Green
    } else {
        Write-Host "    Status: WRONG FORMAT" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "    Status: NOT FOUND" -ForegroundColor Red
    $allGood = $false
}

# Check 4: QZ Tray running
Write-Host "`n[4] QZ Tray Process" -ForegroundColor White
$qzRunning = $false
$javaw = Get-Process javaw -ErrorAction SilentlyContinue
if ($javaw) {
    foreach ($proc in $javaw) {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmdLine -like "*qz-tray*") {
            Write-Host "    Status: RUNNING (PID: $($proc.Id))" -ForegroundColor Yellow
            Write-Host "    WARNING: Restart QZ Tray to load new certificate!" -ForegroundColor Red
            $qzRunning = $true
            $allGood = $false
            break
        }
    }
}
if (-not $qzRunning) {
    Write-Host "    Status: Not running (good - start it now)" -ForegroundColor Green
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor White
    Write-Host "1. Start QZ Tray" -ForegroundColor White
    Write-Host "2. Clear browser cache" -ForegroundColor White
    Write-Host "3. Test printing" -ForegroundColor White
} else {
    Write-Host "SOME ISSUES FOUND" -ForegroundColor Yellow
    Write-Host "`nAction required:" -ForegroundColor White
    Write-Host "1. Restart QZ Tray if running" -ForegroundColor White
    Write-Host "2. Verify certificates are in X.509 format" -ForegroundColor White
}
Write-Host "========================================`n" -ForegroundColor Cyan

Read-Host "Press Enter to exit"
