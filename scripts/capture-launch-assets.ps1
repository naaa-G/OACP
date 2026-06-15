# Capture launch assets — playground URL + screenshot checklist (Day 29)
# Run from repo root: .\scripts\capture-launch-assets.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host ""
Write-Host "OACP Launch Asset Capture" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "pnpm not found. Install Node 20+ and enable pnpm first."
}

Write-Host "[1/4] Building..." -ForegroundColor Yellow
pnpm build | Out-Null

Write-Host "[2/4] Running flagship demo (keep-alive)..." -ForegroundColor Yellow
Write-Host "      Command: pnpm oacp run `"build todo app`" --keep-alive" -ForegroundColor DarkGray
Write-Host ""
Write-Host "After the server starts:" -ForegroundColor Green
Write-Host "  1. Copy the playground_url from terminal output"
Write-Host "  2. Open it in your browser (1440x900+ viewport)"
Write-Host "  3. Capture screenshots per docs/screenshots.md"
Write-Host "  4. Save PNGs to docs/public/screenshots/"
Write-Host ""
Write-Host "Expected files:" -ForegroundColor Green
Write-Host "  docs/public/screenshots/playground-agents.png"
Write-Host "  docs/public/screenshots/playground-messages.png"
Write-Host "  docs/public/screenshots/cli-run-output.png"
Write-Host ""
Write-Host "Press Ctrl+C in the demo terminal when done capturing."
Write-Host ""

$screenshotDir = Join-Path $PWD "docs\public\screenshots"
if (-not (Test-Path $screenshotDir)) {
    New-Item -ItemType Directory -Path $screenshotDir -Force | Out-Null
}

pnpm oacp run "build todo app" --keep-alive
