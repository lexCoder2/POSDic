# Quick start script for POS system
# This script starts both backend and frontend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  POS System - Quick Start             " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and 
    $_.IPAddress -notlike "169.254.*" 
} | Select-Object -First 1).IPAddress

Write-Host "Local IP: $localIP" -ForegroundColor Green
Write-Host ""
Write-Host "Starting POS System..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Local:  http://localhost:4200" -ForegroundColor White
Write-Host "  LAN:    http://${localIP}:4200" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
$mongoRunning = docker ps --filter "name=product-db" --format "{{.Names}}" 2>$null

if (-not $mongoRunning) {
    Write-Host "  MongoDB container not running. Starting it..." -ForegroundColor Yellow
    docker start product-db 2>$null
    Start-Sleep -Seconds 3
    Write-Host "  ✓ MongoDB started" -ForegroundColor Green
} else {
    Write-Host "  ✓ MongoDB is running" -ForegroundColor Green
}
Write-Host ""

# Change to project directory
Set-Location "c:\Users\IRWIN\Documents\pdev"

# Start both servers using npm run dev (concurrently)
Write-Host "Starting servers..." -ForegroundColor Yellow
npm run dev
