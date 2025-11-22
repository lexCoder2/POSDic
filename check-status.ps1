# POS System Status Checker

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  POS System - Status Check            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and 
    $_.IPAddress -notlike "169.254.*" 
} | Select-Object -First 1).IPAddress

Write-Host "Network Configuration" -ForegroundColor Yellow
Write-Host "  Local IP: $localIP" -ForegroundColor White
Write-Host ""

# Check if MongoDB is running
Write-Host "MongoDB Status" -ForegroundColor Yellow
$mongoContainer = docker ps --filter "name=mongodb" --format "{{.Names}}" 2>$null
if ($mongoContainer) {
    Write-Host "  ✓ MongoDB container is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ MongoDB container is NOT running" -ForegroundColor Red
    Write-Host "    Start it with: docker start mongodb" -ForegroundColor Yellow
}
Write-Host ""

# Check if backend is running
Write-Host "Backend Server (Port 3001)" -ForegroundColor Yellow
$backendPort = netstat -ano | Select-String ":3001" | Select-String "LISTENING"
if ($backendPort) {
    Write-Host "  ✓ Backend is running" -ForegroundColor Green
    Write-Host "    Access: http://localhost:3001/api" -ForegroundColor White
    Write-Host "    LAN:    http://${localIP}:3001/api" -ForegroundColor White
} else {
    Write-Host "  ✗ Backend is NOT running" -ForegroundColor Red
    Write-Host "    Start it with:" -ForegroundColor Yellow
    Write-Host "    cd c:\Users\IRWIN\Documents\pdev\server" -ForegroundColor White
    Write-Host "    node index.js" -ForegroundColor White
}
Write-Host ""

# Check if frontend is running
Write-Host "Frontend Server (Port 4200)" -ForegroundColor Yellow
$frontendPort = netstat -ano | Select-String ":4200" | Select-String "LISTENING"
if ($frontendPort) {
    Write-Host "  ✓ Frontend is running" -ForegroundColor Green
    Write-Host "    Access: http://localhost:4200" -ForegroundColor White
    Write-Host "    LAN:    http://${localIP}:4200" -ForegroundColor White
} else {
    Write-Host "  ✗ Frontend is NOT running" -ForegroundColor Red
    Write-Host "    Start it with:" -ForegroundColor Yellow
    Write-Host "    cd c:\Users\IRWIN\Documents\pdev" -ForegroundColor White
    Write-Host "    npm start" -ForegroundColor White
}
Write-Host ""

# Check firewall rules
Write-Host "Firewall Rules" -ForegroundColor Yellow
$rule3001 = Get-NetFirewallRule -DisplayName "*3001*" -ErrorAction SilentlyContinue
$rule4200 = Get-NetFirewallRule -DisplayName "*4200*" -ErrorAction SilentlyContinue

if ($rule3001) {
    $status3001 = if ($rule3001.Enabled) { "Enabled" } else { "Disabled" }
    Write-Host "  ✓ Port 3001 rule exists ($status3001)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Port 3001 rule not found" -ForegroundColor Red
    Write-Host "    Run setup-firewall.ps1 as Administrator" -ForegroundColor Yellow
}

if ($rule4200) {
    $status4200 = if ($rule4200.Enabled) { "Enabled" } else { "Disabled" }
    Write-Host "  ✓ Port 4200 rule exists ($status4200)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Port 4200 rule not found" -ForegroundColor Red
    Write-Host "    Run setup-firewall.ps1 as Administrator" -ForegroundColor Yellow
}
Write-Host ""

# Test connectivity
Write-Host "Connectivity Tests" -ForegroundColor Yellow

if ($backendPort) {
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✓ Backend API responding: $($healthResponse.status)" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Backend API not responding" -ForegroundColor Red
    }
}
else {
    Write-Host "  ⊝ Backend not running - skipping API test" -ForegroundColor Gray
}

if ($frontendPort) {
    try {
        $webResponse = Invoke-WebRequest -Uri "http://localhost:4200" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✓ Frontend responding (HTTP $($webResponse.StatusCode))" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⊝ Frontend loading (may still be starting)" -ForegroundColor Yellow
    }
}
else {
    Write-Host "  ⊝ Frontend not running - skipping test" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary                               " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mongoCheck = [bool]$mongoContainer
$backendCheck = [bool]$backendPort
$frontendCheck = [bool]$frontendPort
$firewallCheck = [bool]($rule3001 -and $rule4200)

$allGood = $mongoCheck -and $backendCheck -and $frontendCheck -and $firewallCheck

if ($allGood) {
    Write-Host "✓ All systems operational!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your POS system:" -ForegroundColor Cyan
    Write-Host "  Local:  http://localhost:4200" -ForegroundColor White
    Write-Host "  LAN:    http://${localIP}:4200" -ForegroundColor White
    Write-Host ""
    Write-Host "Test from another device on your network!" -ForegroundColor Yellow
}
else {
    Write-Host "⚠ Some issues detected" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick fixes:" -ForegroundColor Cyan
    
    if (-not $mongoCheck) {
        Write-Host "  • Start MongoDB: docker start mongodb" -ForegroundColor White
    }
    if (-not $backendCheck -or -not $frontendCheck) {
        Write-Host "  • Start servers: .\start-pos.ps1" -ForegroundColor White
    }
    if (-not $firewallCheck) {
        Write-Host "  • Configure firewall: .\setup-firewall.ps1 (as Admin)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "For detailed help, see: SETUP_COMPLETE.md" -ForegroundColor Cyan
Write-Host ""
