# QZ Tray Certificate Override Setup Script
# Run this on each POS terminal to permanently trust your certificate

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "QZ Tray Certificate Override Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as user (not admin needed)
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "Current user: $currentUser" -ForegroundColor Green

# Define paths
$serverPublicKey = Join-Path $PSScriptRoot "server\public-key.pem"
$qzFolder = Join-Path $env:USERPROFILE ".qz"
$overrideFile = Join-Path $qzFolder "override.crt"

# Check if public key exists
if (-not (Test-Path $serverPublicKey)) {
    Write-Host "ERROR: Public key not found at: $serverPublicKey" -ForegroundColor Red
    Write-Host "Make sure you're running this script from the project root directory." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Found public key: $serverPublicKey" -ForegroundColor Green

# Create .qz folder if it doesn't exist
if (-not (Test-Path $qzFolder)) {
    Write-Host "Creating .qz folder: $qzFolder" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $qzFolder | Out-Null
} else {
    Write-Host ".qz folder exists: $qzFolder" -ForegroundColor Green
}

# Copy public key to override.crt
try {
    Copy-Item $serverPublicKey $overrideFile -Force
    Write-Host "Successfully created override certificate!" -ForegroundColor Green
    Write-Host "Location: $overrideFile" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Failed to copy certificate" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Display the certificate content
Write-Host ""
Write-Host "Certificate content:" -ForegroundColor Cyan
Write-Host "--------------------" -ForegroundColor DarkGray
Get-Content $overrideFile | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
Write-Host "--------------------" -ForegroundColor DarkGray
Write-Host ""

# Check if QZ Tray is running (it runs as javaw.exe)
$qzProcess = $null

# First, check for qz-tray.exe
$qzProcess = Get-Process -Name "qz-tray" -ErrorAction SilentlyContinue

# If not found, check javaw processes for QZ Tray
if (-not $qzProcess) {
    $javawProcesses = Get-Process -Name "javaw" -ErrorAction SilentlyContinue
    if ($javawProcesses) {
        foreach ($proc in $javawProcesses) {
            try {
                $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
                if ($cmdLine -like "*qz-tray*") {
                    $qzProcess = $proc
                    break
                }
            } catch {
                # Ignore access denied errors
            }
        }
    }
}

if ($qzProcess) {
    Write-Host "QZ Tray is currently running (as javaw.exe)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To apply the override, you need to restart QZ Tray:" -ForegroundColor Yellow
    Write-Host "  1. Right-click QZ Tray icon in system tray" -ForegroundColor White
    Write-Host "  2. Click 'Exit'" -ForegroundColor White
    Write-Host "  3. Start QZ Tray again" -ForegroundColor White
    Write-Host ""
    
    $restart = Read-Host "Would you like to restart QZ Tray now? (Y/N)"
    
    if ($restart -eq "Y" -or $restart -eq "y") {
        Write-Host "Stopping QZ Tray..." -ForegroundColor Yellow
        
        # Stop qz-tray.exe if running
        Stop-Process -Name "qz-tray" -Force -ErrorAction SilentlyContinue
        
        # Stop javaw processes related to QZ Tray
        $javawProcesses = Get-Process -Name "javaw" -ErrorAction SilentlyContinue
        if ($javawProcesses) {
            foreach ($proc in $javawProcesses) {
                try {
                    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
                    if ($cmdLine -like "*qz-tray*") {
                        Write-Host "  Stopping javaw process (PID: $($proc.Id))..." -ForegroundColor DarkGray
                        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                    }
                } catch {
                    # Ignore errors
                }
            }
        }
        
        Start-Sleep -Seconds 2
        Write-Host "QZ Tray stopped." -ForegroundColor Green
        
        # Try to find and start QZ Tray
        $qzPaths = @(
            "$env:ProgramFiles\QZ Tray\qz-tray.exe",
            "$env:ProgramFiles (x86)\QZ Tray\qz-tray.exe",
            "$env:LOCALAPPDATA\QZ Tray\qz-tray.exe",
            "$env:APPDATA\QZ Tray\qz-tray.exe",
            "$env:ProgramData\QZ Tray\qz-tray.exe"
        )
        
        # Also check for .jar file that javaw runs
        $qzJarPaths = @(
            "$env:ProgramFiles\QZ Tray\qz-tray.jar",
            "$env:ProgramFiles (x86)\QZ Tray\qz-tray.jar",
            "$env:LOCALAPPDATA\QZ Tray\qz-tray.jar",
            "$env:APPDATA\QZ Tray\qz-tray.jar"
        )
        
        $qzFound = $false
        
        # Try .exe first
        foreach ($path in $qzPaths) {
            if (Test-Path $path) {
                Write-Host "Starting QZ Tray from: $path" -ForegroundColor Green
                Start-Process $path
                $qzFound = $true
                break
            }
        }
        
        # If no .exe found, try .jar with javaw
        if (-not $qzFound) {
            foreach ($jarPath in $qzJarPaths) {
                if (Test-Path $jarPath) {
                    Write-Host "Starting QZ Tray JAR: $jarPath" -ForegroundColor Green
                    Start-Process "javaw" -ArgumentList "-jar", "`"$jarPath`""
                    $qzFound = $true
                    break
                }
            }
        }
        
        if (-not $qzFound) {
            Write-Host "Could not find QZ Tray executable or JAR file." -ForegroundColor Yellow
            Write-Host "Please start QZ Tray manually from Start Menu." -ForegroundColor Yellow
        } else {
            Write-Host "QZ Tray started successfully!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "QZ Tray is not running." -ForegroundColor Yellow
    Write-Host "Start QZ Tray to complete the setup." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your certificate is now trusted by QZ Tray." -ForegroundColor Green
Write-Host "The POS app should print without warnings." -ForegroundColor Green
Write-Host ""
Write-Host "If you still see warnings:" -ForegroundColor Cyan
Write-Host "  1. Make sure QZ Tray was restarted after creating override.crt" -ForegroundColor White
Write-Host "  2. Clear your browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  3. Reload the POS app" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
