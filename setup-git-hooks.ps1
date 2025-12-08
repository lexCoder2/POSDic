# Setup Git Pre-commit Hook for POSDic
# This script installs husky and sets up pre-commit checks

Write-Host "🔧 Setting up Git pre-commit hooks..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: Not a git repository!" -ForegroundColor Red
    Write-Host "Run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies (husky, lint-staged, prettier)..." -ForegroundColor Yellow
npm install --save-dev husky@^9.0.11 lint-staged@^15.2.0 prettier@^3.1.1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

# Initialize husky
Write-Host ""
Write-Host "🐕 Initializing husky..." -ForegroundColor Yellow
npx husky install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to initialize husky!" -ForegroundColor Red
    exit 1
}

# Set prepare script
Write-Host ""
Write-Host "📝 Setting up prepare script..." -ForegroundColor Yellow
npm pkg set scripts.prepare="husky install"

# Create pre-commit hook
Write-Host ""
Write-Host "🪝 Creating pre-commit hook..." -ForegroundColor Yellow
npx husky add .husky/pre-commit "npm run format:check && npx tsc --noEmit && npx lint-staged"

# Make the hook executable (for Git Bash/WSL compatibility)
if (Test-Path ".husky/pre-commit") {
    # Add shebang if not present
    $hookContent = Get-Content ".husky/pre-commit" -Raw
    if ($hookContent -notmatch "^#!/") {
        $newContent = "#!/usr/bin/env sh`n" + $hookContent
        Set-Content ".husky/pre-commit" -Value $newContent
    }
}

Write-Host ""
Write-Host "✅ Pre-commit hooks setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 What happens now:" -ForegroundColor Cyan
Write-Host "  • Before each commit, the following checks will run:" -ForegroundColor White
Write-Host "    1. Code formatting check (Prettier)" -ForegroundColor Gray
Write-Host "    2. TypeScript compilation check" -ForegroundColor Gray
Write-Host "    3. Auto-format staged files" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Useful commands:" -ForegroundColor Cyan
Write-Host "  npm run format        - Auto-fix formatting in all files" -ForegroundColor White
Write-Host "  npm run format:check  - Check formatting without fixing" -ForegroundColor White
Write-Host ""
Write-Host "🎉 You're all set!" -ForegroundColor Green
