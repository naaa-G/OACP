# Tag an OACP release after verify. Does not push — review output before running git push.
param(
    [string]$Version = "v1.0.0-rc.1"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Running RC verify (pnpm verify:rc)..."
pnpm verify:rc
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "==> Ready to tag $Version"
Write-Host ""
Write-Host "Run these commands after reviewing CHANGELOG and .github/RELEASE_$Version.md:"
Write-Host ""
Write-Host "  git tag -a $Version -m `"OACP $Version release candidate`""
Write-Host "  git push origin $Version"
Write-Host ""

$NotesFile = ".github/RELEASE_$Version.md"
if (Test-Path $NotesFile) {
    Write-Host "  gh release create $Version ``"
    Write-Host "    --title `"OACP $Version — release candidate`" ``"
    Write-Host "    --notes-file $NotesFile ``"
    Write-Host "    --prerelease"
} else {
    Write-Host "  (No $NotesFile — create release notes in GitHub UI)"
}
Write-Host ""
