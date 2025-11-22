# Run this script as Administrator to configure Windows Firewall for LAN access
# Right-click PowerShell and select "Run as Administrator", then run this script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  POS System - Firewall Configuration  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "Running with Administrator privileges..." -ForegroundColor Green
Write-Host ""

# Function to create or update firewall rule
function Add-FirewallRuleIfNeeded {
    param(
        [string]$DisplayName,
        [int]$Port,
        [string]$Description
    )
    
    Write-Host "Configuring firewall rule for $DisplayName (Port $Port)..." -ForegroundColor Yellow
    
    # Check if rule already exists
    $existingRule = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "  Rule already exists. Enabling it..." -ForegroundColor Cyan
        Enable-NetFirewallRule -DisplayName $DisplayName
        Set-NetFirewallRule -DisplayName $DisplayName -Action Allow -Enabled True
        Write-Host "  ✓ Rule updated and enabled" -ForegroundColor Green
    } else {
        Write-Host "  Creating new rule..." -ForegroundColor Cyan
        New-NetFirewallRule `
            -DisplayName $DisplayName `
            -Description $Description `
            -Direction Inbound `
            -LocalPort $Port `
            -Protocol TCP `
            -Action Allow `
            -Enabled True `
            -Profile Any | Out-Null
        Write-Host "  ✓ Rule created successfully" -ForegroundColor Green
    }
    Write-Host ""
}

# Configure firewall rules
Add-FirewallRuleIfNeeded `
    -DisplayName "POS Node.js Server (Port 3001)" `
    -Port 3001 `
    -Description "Allow inbound connections to POS backend API on port 3001"

Add-FirewallRuleIfNeeded `
    -DisplayName "POS Angular Dev Server (Port 4200)" `
    -Port 4200 `
    -Description "Allow inbound connections to POS frontend on port 4200"

# Get local IP address
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Network Configuration                " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and 
    $_.IPAddress -notlike "169.254.*" 
} | Select-Object -First 1).IPAddress

Write-Host "Your local IP address: $localIP" -ForegroundColor Green
Write-Host ""
Write-Host "Access your POS system from any device on the network:" -ForegroundColor Cyan
Write-Host "  Frontend: http://${localIP}:4200" -ForegroundColor White
Write-Host "  Backend:  http://${localIP}:3001/api" -ForegroundColor White
Write-Host ""

# Display verification instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps                           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start the backend server:" -ForegroundColor Yellow
Write-Host "   cd c:\Users\IRWIN\Documents\pdev\server" -ForegroundColor White
Write-Host "   node index.js" -ForegroundColor White
Write-Host ""
Write-Host "2. Start the frontend (in a new terminal):" -ForegroundColor Yellow
Write-Host "   cd c:\Users\IRWIN\Documents\pdev" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
Write-Host ""
Write-Host "3. Test from another device:" -ForegroundColor Yellow
Write-Host "   Open browser and go to: http://${localIP}:4200" -ForegroundColor White
Write-Host ""
Write-Host "Firewall configuration complete!" -ForegroundColor Green
Write-Host ""
pause
