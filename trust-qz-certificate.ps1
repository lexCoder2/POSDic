# Quick QZ Tray Certificate Trust - Run this NOW
# This will permanently trust your certificate in QZ Tray

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QZ Tray Certificate Trust Setup" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create .qz directory
$qzDir = Join-Path $env:USERPROFILE ".qz"
if (-not (Test-Path $qzDir)) {
    New-Item -ItemType Directory -Path $qzDir -Force | Out-Null
    Write-Host "✓ Created .qz directory" -ForegroundColor Green
}

# Copy certificate
$source = Join-Path $PSScriptRoot "server\public-key.pem"
$dest = Join-Path $qzDir "override.crt"

if (Test-Path $source) {
    Copy-Item $source $dest -Force
    Write-Host "✓ Certificate copied to: $dest" -ForegroundColor Green
    Write-Host ""
    Write-Host "Certificate content:" -ForegroundColor Yellow
    Get-Content $dest
    Write-Host ""
    Write-Host "Override certificate created!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Cannot find $source" -ForegroundColor Red
    Write-Host "Current directory: $PSScriptRoot" -ForegroundColor Yellow
    Write-Host "Looking for: $source" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMPORTANT - RESTART QZ TRAY NOW!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Right-click QZ Tray icon in system tray" -ForegroundColor White
Write-Host "2. Click Exit" -ForegroundColor White
Write-Host "3. Start QZ Tray again from Start Menu" -ForegroundColor White
Write-Host "4. Reload your browser (Ctrl+Shift+R)" -ForegroundColor White
Write-Host ""
Write-Host "The Untrusted website error will be gone!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
